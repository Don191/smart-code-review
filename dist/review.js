import { addedLines, parseDiff } from "./diff.js";
import { gatherContext } from "./connectors/index.js";
import { AI_SCHEMA, SYSTEM_PROMPT, buildPrompt, criteriaOf, parseJson } from "./llm/prompt.js";
import { lockfile } from "./plugins/others.js";
import { PluginRegistry } from "./plugins/registry.js";
import { SEVERITIES } from "./types.js";
const SEVERITY_WEIGHT = { blocker: 45, major: 22, minor: 7, nit: 1 };
const GENERATED = /(^|\/)(dist|build|\.output|\.nuxt|coverage|vendor)\/|\.min\.(js|css)$|\.map$|\.snap$/;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, Math.round(n)));
function sortFindings(list) {
    return list.sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || (a.file ?? '').localeCompare(b.file ?? '') || (a.line ?? 0) - (b.line ?? 0));
}
/** Matches a path the model wrote to a real path in the diff. */
function resolvePath(p, paths) {
    if (!p)
        return undefined;
    const clean = p.replace(/^[ab]\//, '').replace(/^\.\//, '');
    return paths.find(x => x === clean) ?? paths.find(x => x.endsWith(`/${clean}`) || clean.endsWith(`/${x}`));
}
export async function review(input, opts = {}) {
    const started = Date.now();
    const progress = opts.onProgress ?? (() => { });
    const warnings = [];
    const registry = opts.registry ?? new PluginRegistry();
    for (const p of opts.plugins ?? [])
        registry.use(p);
    progress('Reading the diff');
    const all = parseDiff(input.diff);
    const diff = all.filter(f => !opts.ignore?.(f.path));
    if (!diff.length)
        throw new Error('The diff has no files to review.');
    const paths = diff.map(f => f.path);
    const frameworks = registry.frameworks(paths);
    // Language, role and checks for each file.
    const roles = {};
    const skip = new Set();
    const findings = [];
    const guidance = new Set();
    const usedPlugins = new Set();
    const summaries = new Map();
    let n = 0;
    for (const f of diff) {
        const plugins = registry.forFile(f.path, frameworks);
        const lang = plugins.find(p => p.kind === 'language');
        // The first framework that knows the file wins, then the language plugin.
        let role = plugins.filter(p => p.kind === 'framework').map(p => p.classify?.(f.path)).find(Boolean) ?? lang?.classify?.(f.path) ?? 'File';
        if (lockfile(f.path)) {
            role = 'Lockfile';
            skip.add(f.path);
        }
        else if (GENERATED.test(f.path) || f.binary) {
            role = f.binary ? 'Binary' : 'Generated';
            skip.add(f.path);
        }
        roles[f.path] = role;
        summaries.set(f.path, {
            path: f.path,
            language: lang?.label ?? 'Other',
            languageColor: lang?.color ?? '#8b949e',
            role,
            risk: 0,
            additions: f.additions,
            deletions: f.deletions,
            status: f.status
        });
        if (skip.has(f.path) || f.status === 'deleted')
            continue;
        const added = addedLines(f);
        for (const p of plugins) {
            if (p.rules?.length || p.guidance)
                usedPlugins.add(p.label);
            if (p.guidance)
                guidance.add(`${p.label}: ${p.guidance}`);
            for (const rule of p.rules ?? []) {
                if (rule.appliesTo && !rule.appliesTo(f.path, role))
                    continue;
                for (const hit of rule.check({ file: f, added, paths, role })) {
                    findings.push({
                        id: `F${++n}`,
                        severity: hit.severity ?? rule.severity,
                        category: hit.category ?? rule.category,
                        file: f.path,
                        line: hit.line,
                        title: hit.title,
                        detail: hit.detail,
                        suggestion: hit.suggestion,
                        source: 'rule',
                        ruleId: rule.id,
                        plugin: p.name
                    });
                }
            }
        }
        if (f.additions > 400 && role !== 'Test') {
            findings.push({ id: `F${++n}`, severity: 'minor', category: 'maintainability', file: f.path, title: 'Large change in one file', detail: `${f.additions} added lines are hard to review well. Consider splitting the change.`, source: 'rule', ruleId: 'size/large-file' });
        }
    }
    // The same rule on many lines of one file is one finding with a count.
    const grouped = [];
    const byKey = new Map();
    for (const f of findings) {
        const k = `${f.file}|${f.ruleId}`;
        byKey.set(k, [...(byKey.get(k) ?? []), f]);
    }
    for (const list of byKey.values()) {
        const first = list[0];
        if (list.length > 3)
            grouped.push({ ...first, title: `${first.title} (${list.length} places)`, detail: `${first.detail} Lines ${list.map(l => l.line).join(', ')}.` });
        else
            grouped.push(...list);
    }
    // Requirements and bugs.
    let context = [...(opts.context ?? [])];
    const connectors = context.length ? [...new Set(context.map(c => c.source))] : [];
    if (opts.fetchContext !== false) {
        progress('Looking for linked requirements and bugs');
        const got = await gatherContext(input, { env: opts.env ?? {}, repo: input.repo, connectors: opts.connectors, have: context.map(c => c.id) });
        context = [...context, ...got.items];
        connectors.push(...got.connectors);
        warnings.push(...got.warnings);
    }
    // The model's review.
    let ai;
    if (opts.provider) {
        progress(`Asking ${opts.provider.name} (${opts.provider.model})`);
        const reviewable = diff
            .filter(f => !skip.has(f.path))
            .sort((a, b) => (b.additions + b.deletions) * (1 + Math.max(0, roleRiskOf(roles[b.path]))) - (a.additions + a.deletions) * (1 + Math.max(0, roleRiskOf(roles[a.path]))));
        const { prompt, truncated } = buildPrompt({ input, files: reviewable, roles, guidance: [...guidance], ruleFindings: grouped, context, extraInstructions: opts.instructions });
        if (truncated.length)
            warnings.push(`The diff was too long, so ${truncated.length} file${truncated.length > 1 ? 's were' : ' was'} not sent to the model: ${truncated.slice(0, 5).join(', ')}${truncated.length > 5 ? '…' : ''}`);
        try {
            ai = parseJson(await opts.provider.complete({ system: SYSTEM_PROMPT, prompt, schema: AI_SCHEMA, signal: opts.signal }));
        }
        catch (err) {
            warnings.push(`AI review failed, so only static checks ran: ${err.message}`);
        }
    }
    progress('Scoring');
    const lineText = (file, line) => {
        if (!file || !line)
            return undefined;
        for (const h of file.hunks)
            for (const l of h.lines)
                if (l.newLine === line && l.type !== 'del')
                    return l.content;
        return undefined;
    };
    if (ai && Array.isArray(ai.findings)) {
        for (const raw of ai.findings) {
            const file = resolvePath(raw.file, paths);
            const sev = SEVERITIES.includes(raw.severity) ? raw.severity : 'minor';
            const cat = raw.category ?? 'bug';
            const line = Number.isFinite(raw.line) && raw.line > 0 ? Math.round(raw.line) : undefined;
            // Skip ones the static checks already reported on the same line.
            if (grouped.some(g => g.source === 'rule' && g.file === file && (line === undefined ? g.category === cat || g.severity === sev && sameTopic(g.title, String(raw.title)) : Math.abs((g.line ?? -99) - line) <= 1 && (g.category === cat || sameTopic(g.title, String(raw.title))))))
                continue;
            const before = lineText(diff.find(d => d.path === file), line);
            grouped.push({
                id: `F${++n}`,
                severity: sev,
                category: cat,
                file,
                line,
                title: String(raw.title ?? 'Issue').replace(/[*`#]/g, ''),
                detail: String(raw.detail ?? ''),
                suggestion: raw.fix && String(raw.fix).trim() ? { before: before?.trim(), after: String(raw.fix).replace(/^```\w*\n?|```$/g, '').trimEnd() } : undefined,
                source: 'ai'
            });
        }
    }
    sortFindings(grouped);
    // File risk: size, how sensitive the file is, what was found, and the model's view.
    const aiFiles = new Map();
    for (const f of ai?.files ?? []) {
        const p = resolvePath(f.path, paths);
        if (p)
            aiFiles.set(p, { purpose: f.purpose, risk: Number(f.risk) });
    }
    for (const s of summaries.values()) {
        if (skip.has(s.path)) {
            s.risk = 2;
            continue;
        }
        const size = Math.min(35, Math.log2(s.additions + s.deletions + 1) * 5);
        const roleW = roleRiskOf(s.role) * 20;
        const found = grouped.filter(g => g.file === s.path).reduce((sum, g) => sum + SEVERITY_WEIGHT[g.severity], 0);
        const computed = clamp(size + roleW + found);
        const a = aiFiles.get(s.path);
        s.purpose = a?.purpose;
        s.risk = a?.risk !== undefined && Number.isFinite(a.risk) ? clamp(computed * 0.5 + a.risk * 0.5) : computed;
        if (grouped.some(g => g.file === s.path && g.severity === 'blocker'))
            s.risk = Math.max(s.risk, 85);
    }
    const files = [...summaries.values()].sort((a, b) => b.risk - a.risk || b.additions + b.deletions - (a.additions + a.deletions));
    // One row per criterion, filled in from the model's answers by id.
    const answers = new Map();
    for (const r of Array.isArray(ai?.requirements) ? ai.requirements : [])
        if (r?.id)
            answers.set(String(r.id).replace(/^\[|\]$/g, ''), r);
    const requirements = [];
    for (const c of context) {
        criteriaOf(c).forEach((crit, i) => {
            const r = answers.get(`${c.id}/${i + 1}`);
            requirements.push({
                itemId: c.id,
                criterion: crit,
                status: ['met', 'partial', 'missing', 'unclear'].includes(r?.status) ? r.status : 'unclear',
                evidence: r?.evidence ?? (ai ? 'The AI review did not judge this one.' : 'Not checked: needs the AI review.'),
                files: Array.isArray(r?.files) ? r.files.map((p) => resolvePath(p, paths) ?? p) : undefined
            });
        });
    }
    const counts = Object.fromEntries(SEVERITIES.map(s => [s, grouped.filter(g => g.severity === s).length]));
    const missing = requirements.filter(r => r.status === 'missing').length;
    const sizeTotal = diff.reduce((s, f) => s + f.additions + f.deletions, 0);
    const weighted = files.reduce((s, f) => s + f.risk * (f.additions + f.deletions + 1), 0) / (sizeTotal + files.length || 1);
    const maxFile = Math.max(0, ...files.map(f => f.risk));
    const computedRisk = clamp(weighted * 0.5 + maxFile * 0.5 + counts.blocker * 10 + missing * 5);
    const risk = Number.isFinite(ai?.risk) ? clamp(computedRisk * 0.4 + ai.risk * 0.6) : computedRisk;
    let verdict = ['approve', 'comment', 'request-changes'].includes(ai?.verdict)
        ? ai.verdict
        : counts.blocker || counts.major ? 'request-changes' : counts.minor ? 'comment' : 'approve';
    if (counts.blocker)
        verdict = 'request-changes';
    if (verdict === 'approve' && (counts.major || missing))
        verdict = 'comment';
    const testChanged = files.some(f => f.role === 'Test');
    const issueCount = grouped.length;
    const headline = typeof ai?.headline === 'string' && ai.headline.trim()
        ? ai.headline.trim()
        : `${diff.length} file${diff.length > 1 ? 's' : ''} changed. Static checks found ${issueCount || 'no'} issue${issueCount === 1 ? '' : 's'}${counts.blocker ? `, ${counts.blocker} blocking` : ''}.`;
    const summary = Array.isArray(ai?.summary) ? ai.summary.slice(0, 3).map(String) : [];
    if (!opts.provider)
        warnings.push('No AI provider was set, so this review is static checks only.');
    return {
        meta: {
            title: input.title ?? 'Code change',
            description: input.description,
            url: input.url,
            repo: input.repo,
            author: input.author,
            base: input.base,
            head: input.head,
            generatedAt: new Date().toISOString(),
            provider: ai ? opts.provider?.name : undefined,
            model: ai ? opts.provider?.model : undefined,
            durationMs: Date.now() - started,
            plugins: [...usedPlugins],
            connectors: [...new Set(connectors)]
        },
        verdict,
        risk,
        headline,
        summary,
        files,
        findings: grouped,
        context,
        requirements,
        tests: { changed: testChanged, note: ai?.tests?.note },
        diff,
        warnings
    };
}
/** Rough check that two titles are about the same thing. */
function sameTopic(a, b) {
    const words = (s) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 3));
    const wa = words(a);
    return [...words(b)].some(w => wa.has(w) || [...wa].some(x => x.startsWith(w.slice(0, 5)) && w.length >= 5));
}
function roleRiskOf(role) {
    return { 'Auth / security': 1, Migration: 0.9, 'API route': 0.8, 'Server middleware': 0.8, 'Route middleware': 0.5, Server: 0.6, Config: 0.4, Store: 0.5, Composable: 0.3, Page: 0.2, Test: -0.4, Types: -0.2, Docs: -0.6, Script: -0.2, Lockfile: -1, Generated: -1 }[role] ?? 0;
}
