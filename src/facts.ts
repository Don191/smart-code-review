import type { ChangeFact, DiffFile, DiffLine, SymbolChange } from './types.ts'

/**
 * What a change does, read straight from the diff with no judgement:
 * functions and components added, changed or removed, routes, dependencies,
 * environment variables and config keys.
 */

interface Decl { name: string; kind: SymbolChange['kind'] }

const JS_DECLS: [RegExp, SymbolChange['kind']][] = [
  [/^\s*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*[(<]/, 'function'],
  [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*(?::\s*[^=]+)?=>/, 'function'],
  [/^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*(?::[^=]+)?=\s*(?:async\s+)?function\b/, 'function'],
  [/^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/, 'class'],
  [/^\s*(?:export\s+)?(?:interface|type)\s+([A-Za-z_$][\w$]*)/, 'type'],
  [/^\s*(?:export\s+)?enum\s+([A-Za-z_$][\w$]*)/, 'type'],
  [/^\s*(?:it|test|describe)(?:\.\w+)?\(\s*['"`](.+?)['"`]/, 'test'],
  [/^\s{2,}(?:public\s+|private\s+|protected\s+|static\s+|async\s+|get\s+|set\s+)*([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*(?::\s*[^{]+)?\{\s*$/, 'method']
]
const NOT_NAMES = new Set(['if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'constructor', 'super', 'else', 'with'])

const PY_DECLS: [RegExp, SymbolChange['kind']][] = [
  [/^\s*(?:async\s+)?def\s+([A-Za-z_]\w*)\s*\(/, 'function'],
  [/^\s*class\s+([A-Za-z_]\w*)/, 'class']
]

function declOf(line: string, path: string): Decl | undefined {
  const table = /\.py$/.test(path) ? PY_DECLS : /\.(m|c)?[jt]sx?$|\.vue$/.test(path) ? JS_DECLS : []
  for (const [re, kind] of table) {
    const m = line.match(re)
    if (m && !NOT_NAMES.has(m[1]!)) return { name: m[1]!, kind }
  }
  return undefined
}

/** The name of the declaration a hunk header points at, e.g. "function useCart() {". */
function headerDecl(header: string, path: string): Decl | undefined {
  return declOf(header, path) ?? (header.match(/([A-Za-z_$][\w$]*)\s*\(/) ? { name: header.match(/([A-Za-z_$][\w$]*)\s*\(/)![1]!, kind: 'function' } : undefined)
}

/** Functions, classes, methods and types that the diff adds, changes or removes. */
export function symbolChanges(file: DiffFile): SymbolChange[] {
  const out = new Map<string, SymbolChange>()
  const isVue = file.path.endsWith('.vue')
  const touch = (d: Decl, action: SymbolChange['action'], line: number | undefined, lines: DiffLine[]) => {
    const prev = out.get(d.name)
    if (prev) {
      if (prev.action !== action) prev.action = 'changed'
      prev.lines.push(...lines.filter(l => !prev.lines.includes(l)))
      return
    }
    out.set(d.name, { name: d.name, kind: d.kind, action, file: file.path, line, lines: [...lines] })
  }

  for (const h of file.hunks) {
    const ls = h.lines
    // Declarations whose own line was added or removed.
    const added = new Map<string, number>()
    const removed = new Map<string, number>()
    ls.forEach((l, i) => {
      if (l.type === 'ctx') return
      const d = declOf(l.content, file.path)
      if (d) (l.type === 'add' ? added : removed).set(d.name, i)
    })
    // Body of a declaration: from its line to the next declaration at the same or lower indent.
    const span = (start: number) => {
      const indent = ls[start]!.content.match(/^\s*/)![0].length
      let end = start + 1
      while (end < ls.length) {
        const c = ls[end]!.content
        if (c.trim() && c.match(/^\s*/)![0].length <= indent && !/^\s*[})\]]/.test(c)) break
        end++
      }
      return ls.slice(start, end)
    }
    for (const [name, i] of added) {
      const d = declOf(ls[i]!.content, file.path)!
      touch(d, removed.has(name) ? 'changed' : 'added', ls[i]!.newLine, span(i))
    }
    for (const [name, i] of removed) if (!added.has(name)) touch(declOf(ls[i]!.content, file.path)!, 'removed', undefined, span(i))

    // Other changed lines belong to the nearest declaration above them.
    let group: { decl: Decl; line?: number; lines: DiffLine[] } | undefined
    const flush = () => {
      if (group && group.lines.some(l => l.type !== 'ctx')) touch(group.decl, 'changed', group.line, group.lines)
      group = undefined
    }
    let current: { decl: Decl; line?: number } | undefined = headerDecl(h.header, file.path) ? { decl: headerDecl(h.header, file.path)! } : undefined
    ls.forEach((l, i) => {
      const d = l.type !== 'del' ? declOf(l.content, file.path) : undefined
      if (d && d.kind !== 'type') {
        flush()
        current = { decl: d, line: l.newLine }
        if (added.has(d.name)) { current = undefined; return }
      }
      if (l.type === 'ctx' || added.has(declOf(l.content, file.path)?.name ?? '') || removed.has(declOf(l.content, file.path)?.name ?? '')) {
        if (group) group.lines.push(l)
        return
      }
      if (!current || added.has(current.decl.name)) return
      if (!group || group.decl.name !== current.decl.name) { flush(); group = { decl: current.decl, line: l.newLine ?? current.line, lines: ls.slice(Math.max(0, i - 2), i) } }
      group.lines.push(l)
    })
    flush()
  }

  // A Vue file's template is its own "symbol".
  if (isVue) {
    let inTemplate = false
    const lines: DiffLine[] = []
    for (const h of file.hunks) {
      for (const l of h.lines) {
        if (/^<template\b/.test(l.content)) inTemplate = true
        else if (/^<\/template>/.test(l.content)) inTemplate = false
        else if (/^<script\b/.test(l.content)) inTemplate = false
        if (inTemplate && l.type !== 'ctx') lines.push(l)
        else if (inTemplate && lines.length && lines.length < 60) lines.push(l)
      }
    }
    if (lines.some(l => l.type !== 'ctx')) {
      const first = lines.find(l => l.type !== 'ctx')
      out.set('<template>', { name: 'template', kind: 'template', action: file.status === 'added' ? 'added' : file.status === 'deleted' ? 'removed' : 'changed', file: file.path, line: first?.newLine, lines })
    }
  }

  // Trim long bodies and leading/trailing context.
  for (const s of out.values()) {
    while (s.lines.length && s.lines[0]!.type === 'ctx' && s.lines.length > 1 && s.lines[1]!.type === 'ctx') s.lines.shift()
    while (s.lines.length && s.lines.at(-1)!.type === 'ctx' && s.lines.at(-2)?.type === 'ctx') s.lines.pop()
    if (s.lines.length > 80) s.lines = s.lines.slice(0, 80)
    if (file.status === 'added') s.action = 'added'
    if (file.status === 'deleted') s.action = 'removed'
  }
  return [...out.values()].sort((a, b) => (a.line ?? 1e9) - (b.line ?? 1e9))
}

const METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

/** Facts about the change that matter outside the file: routes, pages, dependencies, env vars, config. */
export function changeFacts(file: DiffFile): ChangeFact[] {
  const facts: ChangeFact[] = []
  const action: ChangeFact['action'] = file.status === 'added' ? 'added' : file.status === 'deleted' ? 'removed' : 'changed'
  const p = file.path

  // Nuxt and Nitro server routes: server/api/cart/discount.get.ts -> GET /api/cart/discount
  const api = p.match(/(?:^|\/)server\/(api|routes)\/(.+)\.[cm]?[jt]s$/)
  if (api) {
    let route = api[2]!
    let method = 'ANY'
    const m = route.match(/\.([a-z]+)$/)
    if (m && METHODS.includes(m[1]!)) { method = m[1]!.toUpperCase(); route = route.slice(0, -m[0].length) }
    route = route.replace(/(^|\/)index$/, '').replace(/\[\.\.\.(\w+)\]/g, '**').replace(/\[(\w+)\]/g, ':$1')
    facts.push({ kind: 'route', action, label: `${method} ${api[1] === 'api' ? '/api' : ''}${route ? `/${route}` : ''}`, file: p })
  }
  // Pages: app/pages/cart/[id].vue -> /cart/:id
  const page = p.match(/(?:^|\/)pages\/(.+)\.(vue|tsx|jsx)$/)
  if (page) {
    const route = page[1]!.replace(/(^|\/)index$/, '').replace(/\[(\w+)\]/g, ':$1')
    facts.push({ kind: 'page', action, label: `/${route}`, file: p })
  }
  // Components
  if (/\.vue$/.test(p) && /(^|\/)components\//.test(p) && file.status !== 'modified') {
    facts.push({ kind: 'component', action, label: p.split('/').pop()!.replace(/\.vue$/, ''), file: p })
  }
  if (/(^|\/)migrations?\//.test(p)) facts.push({ kind: 'migration', action, label: p.split('/').pop()!, file: p })

  const added = file.hunks.flatMap(h => h.lines.filter(l => l.type === 'add'))
  const removed = file.hunks.flatMap(h => h.lines.filter(l => l.type === 'del'))

  // Dependencies in package.json
  if (/(^|\/)package\.json$/.test(p)) {
    const dep = /^\s*"(@?[\w./-]+)"\s*:\s*"([^"]+)"/
    const before = new Map(removed.map(l => l.content.match(dep)).filter(Boolean).map(m => [m![1]!, m![2]!]))
    const after = new Map(added.map(l => l.content.match(dep)).filter(Boolean).map(m => [m![1]!, m![2]!]))
    const looksLikeDep = (name: string, v: string) => /^[\^~<>=*\d]|^(workspace|npm|file|link|github|https?):/.test(v) && !['name', 'version', 'main', 'type', 'license', 'description', 'packageManager'].includes(name)
    for (const [name, v] of after) {
      if (!looksLikeDep(name, v)) continue
      if (before.get(name) === v) continue
      facts.push({ kind: 'dependency', action: before.has(name) ? 'changed' : 'added', label: name, detail: before.has(name) ? `${before.get(name)} → ${v}` : v, file: p })
    }
    for (const [name, v] of before) if (!after.has(name) && looksLikeDep(name, v)) facts.push({ kind: 'dependency', action: 'removed', label: name, detail: v, file: p })
  }

  // Environment variables read
  const envRe = /\b(?:process\.env|import\.meta\.env)\.([A-Z_][A-Z0-9_]*)/g
  const envBefore = new Set(removed.flatMap(l => [...l.content.matchAll(envRe)].map(m => m[1]!)))
  const envAfter = new Set(added.flatMap(l => [...l.content.matchAll(envRe)].map(m => m[1]!)))
  for (const v of envAfter) if (!envBefore.has(v)) facts.push({ kind: 'env', action: 'added', label: v, file: p })
  for (const v of envBefore) if (!envAfter.has(v)) facts.push({ kind: 'env', action: 'removed', label: v, file: p })

  // Top level keys of config files that changed
  if (/(^|\/)(nuxt|vite|vitest|app)\.config\.[cm]?[jt]s$|(^|\/)tsconfig[^/]*\.json$|\.ya?ml$/.test(p) && file.status === 'modified') {
    const keys = new Set([...added, ...removed].map(l => l.content.match(/^\s*([A-Za-z_][\w-]*)\s*:/)?.[1]).filter(Boolean) as string[])
    for (const k of [...keys].slice(0, 6)) facts.push({ kind: 'config', action: 'changed', label: k, file: p })
  }
  return facts
}
