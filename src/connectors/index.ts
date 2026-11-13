import type { ChangeInput, ContextItem } from '../types.ts'
import { BUILT_IN_CONNECTORS } from './builtin.ts'
import { clip, criteriaFrom, type Connector, type ConnectorOptions } from './types.ts'

export * from './types.ts'
export * from './builtin.ts'

/**
 * Context written by hand or handed over by an agent: Markdown with one
 * "# Heading" per item, or a JSON array of ContextItems. Lets an agent that
 * already has Notion or Azure DevOps tools (e.g. over MCP) pass in what it
 * found without this package holding any tokens.
 */
export function parseContext(text: string, source = 'Provided'): ContextItem[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const data = JSON.parse(trimmed)
    const list: any[] = Array.isArray(data) ? data : data.items ?? [data]
    return list.map((d, i) => ({
      source: d.source ?? source,
      id: String(d.id ?? `R${i + 1}`),
      kind: d.kind ?? 'requirement',
      title: d.title ?? `Item ${i + 1}`,
      url: d.url,
      status: d.status,
      summary: d.summary ?? d.description,
      acceptanceCriteria: Array.isArray(d.acceptanceCriteria) ? d.acceptanceCriteria : criteriaFrom(d.acceptanceCriteria ?? d.description ?? ''),
      reproSteps: d.reproSteps
    }))
  }
  const sections = trimmed.split(/^(?=#\s)/m).filter(s => s.trim())
  return sections.map((s, i) => {
    const [first, ...rest] = s.split('\n')
    const hasHeading = /^#\s/.test(first!)
    const title = hasHeading ? first!.replace(/^#\s*/, '').trim() : 'Requirements'
    const body = (hasHeading ? rest : [first, ...rest]).join('\n')
    const kind: ContextItem['kind'] = /\bbug\b|defect|repro/i.test(title + body.slice(0, 200)) ? 'bug' : 'requirement'
    const url = body.match(/https?:\/\/\S+/)?.[0]
    let criteria = criteriaFrom(body)
    if (!criteria.length) criteria = body.split(/\n+/).map(l => l.trim()).filter(l => l.length > 12).slice(0, 8)
    return {
      source,
      id: title.match(/\b([A-Z]+-\d+|AB#\d+|#\d+)\b/)?.[1] ?? `R${i + 1}`,
      kind,
      title: title.replace(/\s*\(?\b([A-Z]+-\d+|AB#\d+)\b\)?\s*/, ' ').trim() || title,
      url,
      summary: clip(body.split('\n').filter(l => l.trim() && !/^\s*([-*•]|\d+[.)])\s/.test(l)).join(' ').trim(), 400),
      acceptanceCriteria: criteria
    }
  })
}

export interface GatherResult {
  items: ContextItem[]
  connectors: string[]
  warnings: string[]
}

/** Finds references in the change and fetches them from every connector that is set up. */
export async function gatherContext(
  input: ChangeInput,
  opts: ConnectorOptions & { connectors?: Connector[]; max?: number; have?: string[] }
): Promise<GatherResult> {
  // AGIlity's lite mode hands work items in from its local board and makes no outside calls.
  if (opts.env?.AGILITY_MODE === 'lite' || opts.env?.SMART_CODE_REVIEW_OFFLINE === '1') return { items: [], connectors: [], warnings: [] }
  const have = new Set(opts.have ?? [])
  const text = [input.title, input.description, input.head, ...(input.commits ?? [])].filter(Boolean).join('\n')
  const items: ContextItem[] = []
  const used = new Set<string>()
  const warnings: string[] = []
  const tasks: Promise<void>[] = []
  for (const c of opts.connectors ?? BUILT_IN_CONNECTORS) {
    const refs = c.findRefs(text, opts).filter(r => !have.has(r.id) && !have.has(`AB#${r.id}`))
    if (!refs.length) continue
    const missing = c.requires.filter(k => !opts.env[k])
    if (missing.length) {
      if (c.weakRefs) continue
      warnings.push(`${c.label}: found ${refs.length} reference${refs.length > 1 ? 's' : ''} but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set.`)
      continue
    }
    for (const ref of refs.slice(0, opts.max ?? 6)) {
      tasks.push(
        c.fetch(ref, opts)
          .then(item => { if (item) { items.push(item); used.add(c.label) } })
          .catch(err => { warnings.push(`${c.label} ${ref.id}: ${(err as Error).message}`) })
      )
    }
  }
  await Promise.all(tasks)
  return { items, connectors: [...used], warnings }
}
