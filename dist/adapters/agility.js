import { excerpt } from "../diff.js";
import { renderHtml } from "../report/html.js";
import { SEVERITY_LEVEL } from "../types.js";
const VERDICT = { approve: 'pass', comment: 'warn', 'request-changes': 'fail' };
export function toAgilityResult(review, opts = {}) {
    const diffByPath = new Map(review.diff.map(d => [d.path, d]));
    const findings = review.findings.map(f => {
        const file = f.file ? diffByPath.get(f.file) : undefined;
        const lines = file && f.line ? excerpt(file, f.line, 2) : [];
        return {
            id: f.id,
            severity: SEVERITY_LEVEL[f.severity],
            title: f.title,
            detail: f.detail,
            category: f.category,
            file: f.file,
            line: f.line,
            evidence: lines.length ? [{ kind: 'code', label: `${f.file}:${f.line}`, content: lines.map(l => `${l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '} ${l.content}`).join('\n') }] : undefined,
            fix: f.suggestion?.after,
            agent: 'reviewer'
        };
    });
    const titles = new Map(review.context.map(c => [c.id, c.title]));
    const questions = review.requirements
        .filter(r => r.status !== 'met')
        .map(r => `${r.itemId}${titles.get(r.itemId) ? ` (${titles.get(r.itemId)})` : ''}: "${r.criterion}" looks ${r.status === 'partial' ? 'partly met' : r.status}.${r.evidence ? ` ${r.evidence}` : ''}`);
    const html = opts.html === false ? '' : renderHtml(review);
    return {
        agent: 'reviewer',
        verdict: VERDICT[review.verdict],
        summary: `${review.headline} Risk ${review.risk}/100.`,
        findings,
        artifacts: html ? [{ label: 'PR review', ref: 'review.html', html }] : [],
        questions,
        model: review.meta.model,
        ms: review.meta.durationMs,
        html
    };
}
