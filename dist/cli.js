#!/usr/bin/env node
var __rewriteRelativeImportExtension = (this && this.__rewriteRelativeImportExtension) || function (path, preserveJsx) {
    if (typeof path === "string" && /^\.\.?\//.test(path)) {
        return path.replace(/\.(tsx)$|((?:\.d)?)((?:\.[^./]+?)?)\.([cm]?)ts$/i, function (m, tsx, d, ext, cm) {
            return tsx ? preserveJsx ? ".jsx" : ".js" : d && (!ext || !cm) ? m : (d + ext + "." + cm.toLowerCase() + "js");
        });
    }
    return path;
};
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { execFile } from 'node:child_process';
import { fromGit } from "./sources/git.js";
import { fromGitHubPr } from "./sources/github.js";
import { parseContext } from "./connectors/index.js";
import { providerFromEnv } from "./llm/providers.js";
import { applyAnnotations, parseAnnotations } from "./annotations.js";
import { review } from "./review.js";
import { renderHtml } from "./report/html.js";
import { SEVERITIES } from "./types.js";
const HELP = `smart-code-review: AI code review as a visual HTML report

Usage
  smart-code-review                     Review this branch against main
  smart-code-review --pr <github url>   Review a GitHub pull request
  smart-code-review --diff change.diff  Review a diff file (- for stdin)

Options
  --base <branch>        Base branch for the local diff (default: origin's default, main, master)
  --staged               Review staged changes
  --working              Review uncommitted changes
  --context <file>       Requirements or bugs as Markdown or JSON (repeatable)
  --instructions <file>  House review rules (default: .smart-code-review.md if present)
                         Module names can be set in .smart-code-review.json
  --plugin <module>      Load a plugin module (repeatable)
  --provider <name>      claude (default), gemini, openai, vertex or none
  --model <id>           Model id (default for claude: claude-opus-5-5)
  --effort <level>       Claude effort: low, medium, high (default), xhigh, max
  --title <text>         Title for the report
  --body-file <file>     PR description, searched for linked work items
  --annotations <file>   Notes exported from an earlier report, built into this one
  --url <url>            Link for the title
  --out <file>           HTML report path (default: reviews/<branch>.html)
  --json <file>          Also write the review as JSON
  --fail-on <severity>   Exit 1 if there's a finding this bad (blocker, major, minor)
  --open                 Open the report when done
  --quiet                Only print the report path

Environment
  GEMINI_API_KEY or GOOGLE_VERTEX_API_KEY     Gemini API key (free tier works)
  OPENAI_API_KEY or OPENAPI_API_KEY           OpenAI key
  GITHUB_TOKEN                                Private repos, linked issues, rate limits
  AZURE_DEVOPS_ORG, AZURE_DEVOPS_PAT          Azure DevOps work items (AB#123)
  NOTION_TOKEN                                Notion pages linked in the PR
  JIRA_BASE_URL, JIRA_EMAIL, JIRA_API_TOKEN   Jira issues (PROJ-123)
`;
async function main() {
    const { values: a } = parseArgs({
        allowPositionals: true,
        options: {
            pr: { type: 'string' },
            diff: { type: 'string' },
            base: { type: 'string' },
            staged: { type: 'boolean' },
            working: { type: 'boolean' },
            context: { type: 'string', multiple: true },
            instructions: { type: 'string' },
            plugin: { type: 'string', multiple: true },
            provider: { type: 'string' },
            effort: { type: 'string' },
            model: { type: 'string' },
            title: { type: 'string' },
            'body-file': { type: 'string' },
            annotations: { type: 'string' },
            url: { type: 'string' },
            out: { type: 'string' },
            json: { type: 'string' },
            'fail-on': { type: 'string' },
            open: { type: 'boolean' },
            quiet: { type: 'boolean' },
            help: { type: 'boolean', short: 'h' }
        }
    });
    if (a.help) {
        process.stdout.write(HELP);
        return;
    }
    const log = (s) => { if (!a.quiet)
        process.stderr.write(`${s}\n`); };
    const env = process.env;
    let input;
    if (a.pr)
        input = await fromGitHubPr(a.pr, { token: env.GITHUB_TOKEN || env.GH_TOKEN });
    else if (a.diff)
        input = { diff: a.diff === '-' ? readFileSync(0, 'utf8') : readFileSync(a.diff, 'utf8'), title: a.diff === '-' ? 'Diff' : a.diff };
    else
        input = fromGit({ base: a.base, staged: a.staged, working: a.working });
    if (a.title)
        input.title = a.title;
    if (a['body-file'])
        input.description = readFileSync(a['body-file'], 'utf8');
    if (a.url)
        input.url = a.url;
    if (!input.diff.trim()) {
        log('Nothing to review: the diff is empty.');
        return;
    }
    const context = [];
    for (const file of a.context ?? [])
        context.push(...parseContext(readFileSync(file, 'utf8'), 'Provided'));
    const instructionsFile = a.instructions ?? (existsSync('.smart-code-review.md') ? '.smart-code-review.md' : undefined);
    const plugins = [];
    for (const p of a.plugin ?? []) {
        const mod = await import(__rewriteRelativeImportExtension(existsSync(p) ? pathToFileURL(resolve(p)).href : p));
        const exported = mod.default ?? mod.plugin ?? mod.plugins;
        plugins.push(...(Array.isArray(exported) ? exported : [exported]));
    }
    const provider = a.provider === 'none' ? undefined : providerFromEnv(a.effort ? { ...env, SMART_REVIEW_EFFORT: a.effort } : env, a.provider, a.model);
    if (!provider && a.provider !== 'none')
        log('No AI key found (ANTHROPIC_API_KEY, GEMINI_API_KEY or OPENAI_API_KEY), so only static checks will run.');
    // Optional module names, e.g. {"modules": [{"name": "Portal", "paths": ["apps/portal/"]}]}
    const config = existsSync('.smart-code-review.json') ? JSON.parse(readFileSync('.smart-code-review.json', 'utf8')) : {};
    const raw = await review(input, {
        provider,
        modules: config.modules,
        plugins,
        context,
        env,
        instructions: instructionsFile ? readFileSync(instructionsFile, 'utf8') : undefined,
        onProgress: s => log(`· ${s}`)
    });
    const result = a.annotations ? applyAnnotations(raw, parseAnnotations(readFileSync(a.annotations, 'utf8'))) : raw;
    const slug = (input.head ?? 'review').replace(/[^\w.-]+/g, '-');
    const out = resolve(a.out ?? `reviews/${slug}.html`);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, renderHtml(result));
    if (a.json)
        writeFileSync(resolve(a.json), JSON.stringify(result, null, 2));
    const counts = SEVERITIES.map(s => `${result.findings.filter(f => f.severity === s).length} ${s}`).join(', ');
    log(`\n${result.verdict.toUpperCase()} · risk ${result.risk}/100 · ${counts}`);
    log(result.headline);
    for (const w of result.warnings)
        log(`! ${w}`);
    process.stdout.write(`${out}\n`);
    if (a.open) {
        const cmd = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
        execFile(cmd, [out]);
    }
    if (a['fail-on']) {
        const limit = SEVERITIES.indexOf(a['fail-on']);
        if (limit >= 0 && result.findings.some(f => SEVERITIES.indexOf(f.severity) <= limit))
            process.exitCode = 1;
    }
}
main().catch(err => {
    process.stderr.write(`smart-code-review: ${err.message}\n`);
    process.exitCode = 2;
});
