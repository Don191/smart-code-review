import { formatFile } from '../diff.ts'
import type { ChangeInput, ContextItem, DiffFile, Finding } from '../types.ts'

export const AI_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['approve', 'comment', 'request-changes'] },
    risk: { type: 'integer', minimum: 0, maximum: 100, description: 'How risky it is to merge: 0 trivial, 100 likely to break production.' },
    change: {
      type: 'object',
      description: 'A neutral description of what the change does. Facts only: no judgement, no problems, no praise.',
      properties: {
        summary: { type: 'string', description: 'One or two plain sentences, under 35 words, on what the change does and why, as a release note would say it.' },
        points: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'The main things it changes, each under 12 words. Start with a verb: Adds, Changes, Removes, Moves.' },
        effort: { type: 'integer', minimum: 1, maximum: 5, description: 'Time a careful reviewer needs: 1 = under 10 minutes, 3 = about an hour, 5 = most of a day.' },
        flow: {
          type: 'array',
          maxItems: 8,
          description: 'The main runtime path the change adds or alters, as calls between parts (user, components, composables, API routes, services, database). Empty if there is no flow, e.g. docs or config only.',
          items: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Short name, e.g. "CartSummary", "useCart", "POST /api/cart", "Database", "User".' },
              to: { type: 'string' },
              label: { type: 'string', description: 'What is called or sent, under 6 words.' }
            },
            required: ['from', 'to', 'label']
          }
        }
      },
      required: ['summary', 'points', 'effort', 'flow']
    },
    headline: { type: 'string', description: 'The review in one plain sentence, under 16 words: is it ready, and the main problem if any.' },
    summary: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'Up to 3 review notes, each under 14 words: the problems or risks that matter most.' },
    modules: {
      type: 'array',
      description: 'One entry per module listed under "Modules".',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          summary: { type: 'string', description: 'What changed in this module, under 14 words. Facts only, no judgement.' },
          points: { type: 'array', items: { type: 'string' }, maxItems: 4, description: 'What changed here, each under 10 words, starting with a verb. Facts only.' },
          impact: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How much this module\'s behaviour changes for users or other modules.' }
        },
        required: ['name', 'summary', 'points', 'impact']
      }
    },
    files: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          purpose: { type: 'string', description: 'What changed in this file, under 12 words. Facts only.' },
          risk: { type: 'integer', minimum: 0, maximum: 100 }
        },
        required: ['path', 'purpose', 'risk']
      }
    },
    symbols: {
      type: 'array',
      description: 'One entry for every item under "Changed functions and components", in the same order. Do not skip any.',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' },
          name: { type: 'string' },
          change: { type: 'string', description: 'One sentence, under 20 words, on what it does; for a changed item, what is different now. Facts only, e.g. "Posts the cart items to /api/cart and sets saving while it waits".' }
        },
        required: ['file', 'name', 'change']
      }
    },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          severity: { type: 'string', enum: ['blocker', 'major', 'minor', 'nit'] },
          category: { type: 'string', enum: ['bug', 'security', 'performance', 'maintainability', 'tests', 'accessibility', 'requirements', 'style'] },
          file: { type: 'string' },
          line: { type: 'integer', description: 'Line number in the new file, from the numbers shown in the diff.' },
          title: { type: 'string', description: 'Under 9 words.' },
          detail: { type: 'string', description: 'What goes wrong and when, in 1 to 3 sentences.' },
          fix: { type: 'string', description: 'Replacement code for that line or block, if a fix is clear. Code only.' }
        },
        required: ['severity', 'category', 'file', 'line', 'title', 'detail']
      }
    },
    requirements: {
      type: 'array',
      description: 'One entry for every criterion id given under the linked requirements and bugs.',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The criterion id, e.g. AB#12/2.' },
          status: { type: 'string', enum: ['met', 'partial', 'missing', 'unclear'] },
          evidence: { type: 'string', description: 'Where in the diff it is done, or what is missing. Under 25 words.' },
          files: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'status', 'evidence']
      }
    },
    tests: {
      type: 'object',
      properties: { adequate: { type: 'boolean' }, note: { type: 'string', description: 'Under 25 words.' } },
      required: ['adequate']
    }
  },
  required: ['change', 'verdict', 'risk', 'headline', 'summary', 'modules', 'files', 'symbols', 'findings', 'requirements', 'tests']
} as const

export const SYSTEM_PROMPT = `You describe and then review code changes, like a careful senior engineer.

Your reply has two separate parts.
1. The description: "change", "modules", "files" and "symbols". Say what the code now does, as plain facts. No judgement, no problems, no praise, no words like "critical", "broken", "improves" or "properly".
2. The review: "verdict", "risk", "headline", "summary", "findings", "requirements" and "tests".

Files under "AI agent setup" (CLAUDE.md, AGENTS.md, .claude/ skills, subagents, commands, hooks and settings, MCP config) instruct AI coding agents. Describe what an agent will now do differently. In the review, flag permissions or hooks that let an agent run commands or reach data more widely, secrets in these files, and instructions that conflict with each other.

Report only real problems in the changed lines: bugs, security holes, data loss, performance traps, missing tests for risky logic, accessibility failures, and requirements the change does not meet. Skip style preferences and anything a formatter or linter would fix. Do not praise. If the change is fine, say so and return few or no findings.

Rules for findings:
- Always give the file and the new-file line number, read from the number at the start of each diff line.
- severity: blocker = must not merge (breaks things, security hole, data loss); major = likely bug or clear risk; minor = worth fixing; nit = optional.
- Do not repeat issues listed under "Already found by static checks".
- Write in plain English. Short titles. No markdown in titles.

If requirements, bugs or tickets are given, check every acceptance criterion against the diff. "met" needs code in the diff that does it; "partial" when some of it is there; "missing" when nothing in the diff does it; "unclear" when it can't be told from the diff. Missing criteria count against the verdict.

Reply with JSON only, matching the schema.`

/** Criteria to check for an item. A bug with none gets one: that it is fixed. */
export function criteriaOf(c: ContextItem): string[] {
  if (c.acceptanceCriteria.length) return c.acceptanceCriteria
  return c.kind === 'bug' ? ['The reported bug is fixed'] : [`Does what "${c.title}" asks for`]
}

const MAX_DIFF_CHARS = 90_000

export function buildPrompt(args: {
  input: ChangeInput
  files: DiffFile[]
  roles: Record<string, string>
  modules: { name: string; files: string[] }[]
  symbols?: { file: string; name: string; action: string }[]
  guidance: string[]
  ruleFindings: Finding[]
  context: ContextItem[]
  extraInstructions?: string
}): { prompt: string; truncated: string[] } {
  const { input, files, roles, guidance, ruleFindings, context } = args
  const parts: string[] = []
  parts.push(`# Change\nTitle: ${input.title ?? '(none)'}`)
  if (input.repo) parts.push(`Repo: ${input.repo}`)
  if (input.base || input.head) parts.push(`Branch: ${input.head ?? '?'} into ${input.base ?? '?'}`)
  if (input.description) parts.push(`Description:\n${input.description.slice(0, 4000)}`)

  if (context.length) {
    parts.push('\n# Requirements, bugs and docs linked to this change')
    for (const c of context) {
      parts.push(`## [${c.id}] ${c.kind.toUpperCase()}: ${c.title}${c.status ? ` (${c.status})` : ''} - from ${c.source}`)
      if (c.summary) parts.push(c.summary)
      if (c.reproSteps) parts.push(`Repro steps: ${c.reproSteps}`)
      const crit = criteriaOf(c)
      parts.push(`Acceptance criteria:\n${crit.map((a, i) => `- [${c.id}/${i + 1}] ${a}`).join('\n')}`)
    }
    parts.push('Return one "requirements" entry per criterion id above. Judge strictly: "met" only if the diff clearly does it.')
  }

  if (guidance.length) parts.push(`\n# What to look for in these files\n${guidance.map(g => `- ${g}`).join('\n')}`)
  if (args.extraInstructions) parts.push(`\n# Team review rules\n${args.extraInstructions}`)

  if (ruleFindings.length) {
    parts.push('\n# Already found by static checks (do not repeat)')
    for (const f of ruleFindings.slice(0, 40)) parts.push(`- ${f.file}:${f.line ?? ''} ${f.title}`)
  }

  parts.push(`\n# Modules\n${args.modules.map(m => `- ${m.name}: ${m.files.slice(0, 12).join(', ')}${m.files.length > 12 ? ` and ${m.files.length - 12} more` : ''}`).join('\n')}`)
  if (args.symbols?.length) parts.push(`\n# Changed functions and components\n${args.symbols.slice(0, 60).map(s => `- ${s.file}: ${s.name} (${s.action})`).join('\n')}`)
  parts.push(`\n# Files\n${files.map(f => `- ${f.path} (${roles[f.path] ?? 'file'}, ${f.status}, +${f.additions} -${f.deletions})`).join('\n')}`)

  // Biggest-risk files first, so if the diff is cut it's the low-value files that go.
  const truncated: string[] = []
  let budget = MAX_DIFF_CHARS
  const diffs: string[] = []
  for (const f of files) {
    if (f.binary || !f.hunks.length) continue
    const text = formatFile(f, true)
    if (text.length > budget) { truncated.push(f.path); continue }
    budget -= text.length
    diffs.push(text)
  }
  parts.push(`\n# Diff (number = line in new file)\n${diffs.join('\n\n')}`)
  if (truncated.length) parts.push(`\n(Diff not shown for: ${truncated.join(', ')})`)
  return { prompt: parts.join('\n'), truncated }
}

/** Pulls the JSON object out of a reply, even if the model wrapped it in a code fence. */
export function parseJson(text: string): any {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '')
  try {
    return JSON.parse(t)
  } catch {
    const s = t.indexOf('{')
    const e = t.lastIndexOf('}')
    if (s >= 0 && e > s) return JSON.parse(t.slice(s, e + 1))
    throw new Error('The model did not return JSON')
  }
}
