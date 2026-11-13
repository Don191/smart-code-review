import type { Annotation, FeedbackStatus, Review } from './types.ts'

const STATUSES: FeedbackStatus[] = ['open', 'agreed', 'fixed', 'wont-fix', 'discuss']

/**
 * Reads notes exported from a report ("Export notes"), or a plain list of annotations.
 * Unknown statuses become "discuss" so nothing is lost.
 */
export function parseAnnotations(json: string | unknown): Annotation[] {
  const raw: any = typeof json === 'string' ? JSON.parse(json) : json
  const list: any[] = Array.isArray(raw) ? raw : Array.isArray(raw?.annotations) ? raw.annotations : []
  return list
    .filter(x => x && typeof x.findingId === 'string')
    .map(x => ({
      findingId: x.findingId,
      status: STATUSES.includes(x.status) ? x.status : 'discuss',
      note: typeof x.note === 'string' && x.note.trim() ? x.note.trim() : undefined,
      by: typeof x.by === 'string' && x.by ? x.by : undefined,
      at: typeof x.at === 'string' ? x.at : new Date().toISOString()
    }))
}

/**
 * Adds notes to a review, so they're built into the report. Finding ids are stable,
 * so notes from the last review of a change carry over to the next one. The newest
 * note for a finding wins; notes for findings that are gone are dropped.
 */
export function applyAnnotations(review: Review, notes: Annotation[]): Review {
  const ids = new Set(review.findings.map(f => f.id))
  const byId = new Map<string, Annotation>()
  for (const a of [...(review.annotations ?? []), ...notes]) {
    if (!ids.has(a.findingId)) continue
    const prev = byId.get(a.findingId)
    if (!prev || a.at >= prev.at) byId.set(a.findingId, a)
  }
  return { ...review, annotations: [...byId.values()] }
}

/** Findings nobody has dealt with yet: no note, or marked for discussion. */
export function unresolvedFindings(review: Review) {
  const st = new Map((review.annotations ?? []).map(a => [a.findingId, a.status]))
  return review.findings.filter(f => ['open', 'discuss'].includes(st.get(f.id) ?? 'open'))
}
