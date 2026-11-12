import { formatFile } from "../diff.js";
export const AI_SCHEMA = {
    type: 'object',
    properties: {
        verdict: { type: 'string', enum: ['approve', 'comment', 'request-changes'] },
        risk: { type: 'integer', minimum: 0, maximum: 100, description: 'How risky it is to merge: 0 trivial, 100 likely to break production.' },
        headline: { type: 'string', description: 'One plain sentence, at most 18 words: what the change does, then the main problem if any. E.g. "Adds CSV export, but large exports load every row into memory."' },
        summary: { type: 'array', items: { type: 'string' }, maxItems: 3, description: 'The key changes, up to 3 short points. Each under 14 words. Say what the change does; problems belong in findings.' },
        modules: {
            type: 'array',
            description: 'One entry per module listed under "Modules".',
            items: {
                type: 'object',
                properties: {
                    name: { type: 'string' },
                    summary: { type: 'string', description: 'What changed in this module, under 12 words. Say what it does now; problems belong in findings.' },
                    impact: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How much this module\'s behaviour changes for users or other modules.' }
                },
                required: ['name', 'summary', 'impact']
            }
        },
        files: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    path: { type: 'string' },
                    purpose: { type: 'string', description: 'What changed in this file, under 12 words.' },
                    risk: { type: 'integer', minimum: 0, maximum: 100 }
                },
                required: ['path', 'purpose', 'risk']
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
    required: ['verdict', 'risk', 'headline', 'summary', 'modules', 'files', 'findings', 'requirements', 'tests']
};
export const SYSTEM_PROMPT = `You review code changes like a careful senior engineer.

Report only real problems in the changed lines: bugs, security holes, data loss, performance traps, missing tests for risky logic, accessibility failures, and requirements the change does not meet. Skip style preferences and anything a formatter or linter would fix. Do not praise. If the change is fine, say so and return few or no findings.

Rules for findings:
- Always give the file and the new-file line number, read from the number at the start of each diff line.
- severity: blocker = must not merge (breaks things, security hole, data loss); major = likely bug or clear risk; minor = worth fixing; nit = optional.
- Do not repeat issues listed under "Already found by static checks".
- Write in plain English. Short titles. No markdown in titles.

If requirements, bugs or tickets are given, check every acceptance criterion against the diff. "met" needs code in the diff that does it; "partial" when some of it is there; "missing" when nothing in the diff does it; "unclear" when it can't be told from the diff. Missing criteria count against the verdict.

Reply with JSON only, matching the schema.`;
/** Criteria to check for an item. A bug with none gets one: that it is fixed. */
export function criteriaOf(c) {
    if (c.acceptanceCriteria.length)
        return c.acceptanceCriteria;
    return c.kind === 'bug' ? ['The reported bug is fixed'] : [`Does what "${c.title}" asks for`];
}
const MAX_DIFF_CHARS = 90_000;
export function buildPrompt(args) {
    const { input, files, roles, guidance, ruleFindings, context } = args;
    const parts = [];
    parts.push(`# Change\nTitle: ${input.title ?? '(none)'}`);
    if (input.repo)
        parts.push(`Repo: ${input.repo}`);
    if (input.base || input.head)
        parts.push(`Branch: ${input.head ?? '?'} into ${input.base ?? '?'}`);
    if (input.description)
        parts.push(`Description:\n${input.description.slice(0, 4000)}`);
    if (context.length) {
        parts.push('\n# Requirements, bugs and docs linked to this change');
        for (const c of context) {
            parts.push(`## [${c.id}] ${c.kind.toUpperCase()}: ${c.title}${c.status ? ` (${c.status})` : ''} - from ${c.source}`);
            if (c.summary)
                parts.push(c.summary);
            if (c.reproSteps)
                parts.push(`Repro steps: ${c.reproSteps}`);
            const crit = criteriaOf(c);
            parts.push(`Acceptance criteria:\n${crit.map((a, i) => `- [${c.id}/${i + 1}] ${a}`).join('\n')}`);
        }
        parts.push('Return one "requirements" entry per criterion id above. Judge strictly: "met" only if the diff clearly does it.');
    }
    if (guidance.length)
        parts.push(`\n# What to look for in these files\n${guidance.map(g => `- ${g}`).join('\n')}`);
    if (args.extraInstructions)
        parts.push(`\n# Team review rules\n${args.extraInstructions}`);
    if (ruleFindings.length) {
        parts.push('\n# Already found by static checks (do not repeat)');
        for (const f of ruleFindings.slice(0, 40))
            parts.push(`- ${f.file}:${f.line ?? ''} ${f.title}`);
    }
    parts.push(`\n# Modules\n${args.modules.map(m => `- ${m.name}: ${m.files.slice(0, 12).join(', ')}${m.files.length > 12 ? ` and ${m.files.length - 12} more` : ''}`).join('\n')}`);
    parts.push(`\n# Files\n${files.map(f => `- ${f.path} (${roles[f.path] ?? 'file'}, ${f.status}, +${f.additions} -${f.deletions})`).join('\n')}`);
    // Biggest-risk files first, so if the diff is cut it's the low-value files that go.
    const truncated = [];
    let budget = MAX_DIFF_CHARS;
    const diffs = [];
    for (const f of files) {
        if (f.binary || !f.hunks.length)
            continue;
        const text = formatFile(f, true);
        if (text.length > budget) {
            truncated.push(f.path);
            continue;
        }
        budget -= text.length;
        diffs.push(text);
    }
    parts.push(`\n# Diff (number = line in new file)\n${diffs.join('\n\n')}`);
    if (truncated.length)
        parts.push(`\n(Diff not shown for: ${truncated.join(', ')})`);
    return { prompt: parts.join('\n'), truncated };
}
/** Pulls the JSON object out of a reply, even if the model wrapped it in a code fence. */
export function parseJson(text) {
    const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
    try {
        return JSON.parse(t);
    }
    catch {
        const s = t.indexOf('{');
        const e = t.lastIndexOf('}');
        if (s >= 0 && e > s)
            return JSON.parse(t.slice(s, e + 1));
        throw new Error('The model did not return JSON');
    }
}
