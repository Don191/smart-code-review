# smart-code-review

AI code review that writes a visual HTML report, built so a pull request can be decided in seconds. The report opens on the call (merge, check these first, or send back), how much of the diff is routine and can be skipped, and up to three places to check with their code shown. Below that are two parts you click into only where you need more.

![The top of a report: the call, the share of the diff to read, and the places to check with their code](docs/report.png)

**The change** describes what the change does, without judgement.

- **Summary first.** What the change does in one sentence, then counts: files, areas, functions added, changed and removed, API routes, dependencies, environment variables, and how long it will take to review.
- **By feature.** A large PR is split into the features and chores it contains (gift cards, order history, dependency upgrades, agent setup), each with its areas, its findings and its files down to the functions that belong to it. Switch to **By area** to see the same change by workspace or layer.
- **How it fits together.** A diagram of the main path through the change, from the UI to the API, for example.
- **Areas changed.** One short section per module: each workspace in a monorepo (portal, api, ui...) or each layer (frontend, backend, shared, tests, config). Each opens to its files, each file to the functions, components and templates it changes, and each of those to its lines.
- **AI agent setup.** Changes to CLAUDE.md, AGENTS.md, `.claude/` skills, subagents, commands, hooks and settings, MCP servers, Copilot and Cursor rules get their own section. The review flags agent permissions that allow any shell command, permission checks turned off, and secrets in agent config.
- **Outside the code.** API routes, pages, dependencies, environment variables, config keys and migrations that were added, changed or removed.

**Review** gives the reviewer's assessment.

- **Verdict first.** A verdict, a risk score and one sentence, then findings by severity, requirements met, tests and size.
- **Impact by area.** The same areas, with their impact and findings.
- **Where to look.** A map of the changed files coloured by risk, the three findings to read first, and a grid of findings by kind.
- **The detail.** Each finding opens to show the lines it is about and a suggested change. Each requirement opens to show the evidence.

It also:

- **Knows what the change was for.** Linked Azure DevOps work items, Notion pages, GitHub issues and Jira tickets are fetched, and every acceptance criterion is checked against the diff.
- **Is built for JS, TS, Vue, Node and Nuxt**, with plugins for other languages.
- **Is one file.** The report has no external assets, so it can be attached to a CI run, emailed or opened offline.

Sample reports: [a large PR with several features](examples/acme-release.html), [saved carts (planted problems, with requirements)](examples/saved-carts.html) and [a real change from webcontainers-demo](examples/webcontainers-tui.html). Download and open them in a browser.

## Run it

Requires Node 22.18 or later.

```bash
# This branch against main
npx github:Don191/smart-code-review

# A GitHub pull request
npx github:Don191/smart-code-review --pr https://github.com/owner/repo/pull/123

# Uncommitted changes, with requirements kept in a file
npx github:Don191/smart-code-review --working --context requirements.md --open
```

The report is written to `reviews/<branch>.html`. Run with `--help` for every option.

### AI provider

| Provider | Env var | Default model |
| --- | --- | --- |
| Claude (default) | `ANTHROPIC_API_KEY` | `claude-opus-5-5` at high effort |
| Gemini API | `GEMINI_API_KEY` or `GOOGLE_VERTEX_API_KEY` | `gemini-3.1-flash-lite` (free tier works) |
| OpenAI | `OPENAI_API_KEY` | `gpt-5-mini` |
| Any OpenAI-compatible server | `OPENAI_API_KEY` + `OPENAI_BASE_URL` | set with `--model` |
| None | | static checks only |

Pick one with `--provider` and `--model`, and set Claude's effort with `--effort` (low, medium, high, xhigh or max). Without `--provider`, the first key found is used, in the order above. Without a key the static checks still run.

Claude runs with adaptive thinking and structured output. If Claude's safety checks decline a review, the API reruns it on Anthropic's recommended fallback model.

## Requirements and bugs

The reviewer looks for references in the PR title, description, branch name and commit messages, and fetches the ones it has credentials for.

| Source | Finds | Env vars |
| --- | --- | --- |
| Azure DevOps | `AB#1234`, work item URLs | `AZURE_DEVOPS_ORG`, `AZURE_DEVOPS_PAT` |
| Notion | `notion.so` and `notion.site` links | `NOTION_TOKEN` (share the page with the integration) |
| GitHub Issues | `#12`, `owner/repo#12`, issue URLs | `GITHUB_TOKEN` (optional for public repos) |
| Jira | `PROJ-123`, browse URLs | `JIRA_BASE_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN` |

Acceptance criteria come from the work item's acceptance criteria field, or from checklists, bullet lists and Given/When/Then lines in the text. Bugs bring their repro steps. Each criterion is marked met, partly met, missing or unclear, with the evidence.

You can also pass requirements in with `--context`, as Markdown (one `#` heading per item, bullets for criteria) or JSON. This is how an agent that already has Notion or Azure DevOps tools hands over what it found without this package holding any tokens. See [skill/SKILL.md](skill/SKILL.md).

## Checks for JS, TS, Vue, Node and Nuxt

Static checks run first and are passed to the model so it doesn't repeat them. They cover:

- **JavaScript and TypeScript:** debugger, eval, HTML set from strings, loose equality, `forEach(async`, empty catch, unhandled promise chains, `.only` and skipped tests, hard-coded secrets, `any`, `@ts-ignore`, non-null assertions.
- **Vue:** `v-html`, `v-for` without a key, `v-if` with `v-for`, props changed in the child, destructuring that loses reactivity, images without alt text, click handlers on non-buttons.
- **Nuxt:** plain fetch in components, `process.env` in app code, unvalidated request bodies, browser globals during server render, secrets in public runtime config.
- **Node:** blocking file calls in handlers, shell commands and SQL built from strings.

Files also get a role (API route, page, composable, store, config, migration, test...) that weights their risk, and each language adds review notes to the prompt.

## Plugins

A plugin is a plain object. Add one with `--plugin ./my-plugin.js` or in code:

```ts
import { lineRule, type ReviewPlugin } from 'smart-code-review'

const go: ReviewPlugin = {
  name: 'go',
  kind: 'language',
  label: 'Go',
  color: '#00add8',
  extensions: ['.go'],
  classify: (path) => (path.endsWith('_test.go') ? 'Test' : undefined),
  rules: [
    lineRule({
      id: 'go/ignored-error',
      title: 'Error ignored',
      severity: 'minor',
      category: 'bug',
      pattern: /,\s*_\s*:?=\s*\w+\(/,
      detail: 'The error from this call is thrown away.'
    })
  ],
  guidance: 'Ignored errors, goroutine leaks, and missing context cancellation.'
}

export default go
```

`kind: 'framework'` plugins layer on top of a language (Nuxt and Node are built this way) and can switch on only when `detect(paths)` sees their kind of project. The built-in Python plugin is a small worked example.

## Connectors

A connector finds references in text and fetches them:

```ts
import type { Connector } from 'smart-code-review'

const linear: Connector = {
  name: 'linear',
  label: 'Linear',
  requires: ['LINEAR_API_KEY'],
  findRefs: (text) => [...text.matchAll(/\b([A-Z]{2,5}-\d+)\b/g)].map(m => ({ connector: 'linear', id: m[1]! })),
  fetch: async (ref, { env }) => ({ /* ...a ContextItem */ })
}
```

Pass it with `review(input, { connectors: [...BUILT_IN_CONNECTORS, linear] })`.

## Use it in code

```ts
import { review, renderHtml, fromGitHubPr, claude } from 'smart-code-review'

const input = await fromGitHubPr('https://github.com/owner/repo/pull/123')
const result = await review(input, {
  provider: claude({ apiKey: process.env.ANTHROPIC_API_KEY, effort: 'high' }),
  env: process.env // tokens for the connectors
})
const html = renderHtml(result)
```

Claude calls go through the official Anthropic SDK, which is loaded only when Claude is used. The other providers use `fetch`, so the core runs in Node, serverless functions and edge runtimes. `smart-code-review/node` adds `fromGit` for local repos. The review is also embedded in the report as JSON (`<script id="review-data">`), so other tools can read it back.

## Part of AGIlity

smart-code-review is the PR review step of AGIlity, a private multi-agent platform for the whole software lifecycle: shaping work, development, verification, performance, security, PR review, testing and penetration testing. The name blends agile and AGI. AGIlity isn't public yet, but smart-code-review is designed to fit into it and also works on its own.

In AGIlity, the `reviewer` agent runs this package in the `pr-review` stage, alongside the performance and security agents:

```ts
import { review, toAgilityResult } from 'smart-code-review'

const r = await review({ diff, head, base }, { provider, env, context })
const result = toAgilityResult(r)
// { agent: 'reviewer', verdict: 'pass' | 'warn' | 'fail', summary, findings, artifacts: [{ ref: 'review.html', html }], questions }
```

- Severities map to critical, high, medium and low (`SEVERITY_LEVEL`).
- Finding ids are stable across runs of the same change, so a finding can be tracked from one review to the next.
- Acceptance criteria that aren't clearly met become `questions` for the owner of the work item.
- With `env.AGILITY_MODE = 'lite'`, or `offline: true`, nothing is fetched. Work items are passed in as `context`, and the model is whatever `provider` is passed in, or none for static checks only.

## GitHub Action

```yaml
on: pull_request
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: Don191/smart-code-review@main
        env:
          ANTHROPIC_API_KEY: ${{ secrets.ANTHROPIC_API_KEY }}
          AZURE_DEVOPS_ORG: my-org
          AZURE_DEVOPS_PAT: ${{ secrets.AZURE_DEVOPS_PAT }}
        with:
          fail-on: blocker
```

The verdict and top findings go in the job summary, and the HTML report is uploaded as the `code-review` artifact.

## Modules

In a monorepo each workspace under `apps/`, `packages/`, `services/` or `libs/` is a module. Otherwise files are grouped by layer. To name them yourself, add `.smart-code-review.json`:

```json
{ "modules": [{ "name": "Portal", "kind": "frontend", "paths": ["apps/portal/", "packages/portal-ui/"] }] }
```

## House rules

Put a `.smart-code-review.md` file in the repo root and it is added to the prompt, for rules like "all API routes validate input with zod".

## Develop

```bash
yarn install
yarn test        # node --test
yarn typecheck
yarn build       # writes dist/, which is committed so the package runs straight from GitHub
```

## Licence

MIT
