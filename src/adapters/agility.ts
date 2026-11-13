import { excerpt } from '../diff.ts'
import { renderHtml } from '../report/html.ts'
import { SEVERITY_LEVEL, type Review } from '../types.ts'

/**
 * smart-code-review is the PR review step of AGIlity, a private multi-agent
 * platform for the whole software lifecycle. These are the shapes AGIlity's
 * `reviewer` agent works with, and the mapping from a Review to them.
 */
export interface AgilityFinding {
  id: string
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info'
  title: string
  detail: string
  category: string
  file?: string
  line?: number
  evidence?: { kind: string; label: string; content: string }[]
  fix?: string
  agent: string
  /** What people said about it in the report: agreed, fixed, won't fix or discuss, with their note. */
  feedback?: { status: string; note?: string; by?: string; at: string }
}

export interface AgilityReviewResult {
  agent: 'reviewer'
  verdict: 'pass' | 'warn' | 'fail'
  summary: string
  findings: AgilityFinding[]
  artifacts: { label: string; ref: string; html?: string }[]
  /** Acceptance criteria the change doesn't clearly meet, as questions for the person who owns the work item. */
  questions: string[]
  model?: string
  ms?: number
  /** The HTML report, also in artifacts. */
  html: string
}

const VERDICT = { approve: 'pass', comment: 'warn', 'request-changes': 'fail' } as const

export function toAgilityResult(review: Review, opts: { html?: boolean } = {}): AgilityReviewResult {
  const diffByPath = new Map(review.diff.map(d => [d.path, d]))
  const notes = new Map((review.annotations ?? []).map(a => [a.findingId, a]))
  const findings: AgilityFinding[] = review.findings.map(f => {
    const file = f.file ? diffByPath.get(f.file) : undefined
    const lines = file && f.line ? excerpt(file, f.line, 2) : []
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
      agent: 'reviewer',
      feedback: notes.has(f.id) ? (({ findingId, ...rest }) => rest)(notes.get(f.id)!) : undefined
    }
  })
  const titles = new Map(review.context.map(c => [c.id, c.title]))
  const questions = review.requirements
    .filter(r => r.status !== 'met')
    .map(r => `${r.itemId}${titles.get(r.itemId) ? ` (${titles.get(r.itemId)})` : ''}: "${r.criterion}" looks ${r.status === 'partial' ? 'partly met' : r.status}.${r.evidence ? ` ${r.evidence}` : ''}`)
  const html = opts.html === false ? '' : renderHtml(review)
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
  }
}
