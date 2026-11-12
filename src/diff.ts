import type { DiffFile, DiffLine, Hunk } from './types.ts'

const HUNK = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/

function stripPrefix(path: string): string {
  const p = path.trim().replace(/^"(.*)"$/, '$1')
  if (p === '/dev/null') return p
  return p.replace(/^[ab]\//, '')
}

/** Parses a unified diff (git diff, GitHub's .diff, `diff -u`) into files and hunks. */
export function parseDiff(text: string): DiffFile[] {
  const files: DiffFile[] = []
  let file: DiffFile | undefined
  let hunk: Hunk | undefined
  let oldLine = 0
  let newLine = 0

  const start = (path: string): DiffFile => {
    file = { path, status: 'modified', binary: false, additions: 0, deletions: 0, hunks: [] }
    files.push(file)
    hunk = undefined
    return file
  }

  for (const raw of text.replace(/\r\n/g, '\n').split('\n')) {
    if (raw.startsWith('diff --git ')) {
      const m = raw.match(/^diff --git (?:"?a\/(.+?)"?) (?:"?b\/(.+?)"?)$/)
      start(m ? m[2]! : raw.slice(11))
      if (m && m[1] !== m[2]) file!.oldPath = m[1]
      continue
    }
    if (raw.startsWith('--- ') && (!hunk || (hunk && oldLine >= hunk.oldStart + hunk.oldLines && newLine >= hunk.newStart + hunk.newLines))) {
      const p = stripPrefix(raw.slice(4).split('\t')[0]!)
      if (!file || file.hunks.length) start(p)
      if (p === '/dev/null') file!.status = 'added'
      else if (!file!.oldPath && p !== file!.path) file!.oldPath = p
      continue
    }
    if (raw.startsWith('+++ ') && file && !hunk) {
      const p = stripPrefix(raw.slice(4).split('\t')[0]!)
      if (p === '/dev/null') file.status = 'deleted'
      else file.path = p
      continue
    }
    if (!file) continue
    if (raw.startsWith('new file mode')) { file.status = 'added'; continue }
    if (raw.startsWith('deleted file mode')) { file.status = 'deleted'; continue }
    if (raw.startsWith('rename from ')) { file.oldPath = raw.slice(12); file.status = 'renamed'; continue }
    if (raw.startsWith('rename to ')) { file.path = raw.slice(10); file.status = 'renamed'; continue }
    if (raw.startsWith('Binary files ') || raw.startsWith('GIT binary patch')) { file.binary = true; continue }

    const h = raw.match(HUNK)
    if (h) {
      hunk = {
        header: (h[5] ?? '').trim(),
        oldStart: Number(h[1]),
        oldLines: h[2] === undefined ? 1 : Number(h[2]),
        newStart: Number(h[3]),
        newLines: h[4] === undefined ? 1 : Number(h[4]),
        lines: []
      }
      oldLine = hunk.oldStart
      newLine = hunk.newStart
      file.hunks.push(hunk)
      continue
    }
    if (!hunk) continue
    const c = raw[0]
    let line: DiffLine | undefined
    if (c === '+') { line = { type: 'add', content: raw.slice(1), newLine: newLine++ }; file.additions++ }
    else if (c === '-') { line = { type: 'del', content: raw.slice(1), oldLine: oldLine++ }; file.deletions++ }
    else if (c === ' ' || raw === '') {
      // A blank line past the end of the hunk is the gap between files, not context.
      if (raw === '' && oldLine >= hunk.oldStart + hunk.oldLines && newLine >= hunk.newStart + hunk.newLines) continue
      line = { type: 'ctx', content: raw.slice(1), oldLine: oldLine++, newLine: newLine++ }
    }
    if (line) hunk.lines.push(line)
  }

  for (const f of files) {
    if (f.oldPath === f.path) delete f.oldPath
    if (f.oldPath && f.status === 'modified') f.status = 'renamed'
  }
  return files.filter(f => f.path && f.path !== '/dev/null')
}

/** The lines a change adds, with their line numbers in the new file. */
export function addedLines(file: DiffFile): { line: number; content: string }[] {
  const out: { line: number; content: string }[] = []
  for (const h of file.hunks) for (const l of h.lines) if (l.type === 'add') out.push({ line: l.newLine!, content: l.content })
  return out
}

/** A diff back as text, for prompts and the full diff view. */
export function formatFile(file: DiffFile, withNumbers = false): string {
  const out = [`--- ${file.oldPath ?? file.path}`, `+++ ${file.path}`]
  for (const h of file.hunks) {
    out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@ ${h.header}`.trimEnd())
    for (const l of h.lines) {
      const mark = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '
      out.push(withNumbers && l.newLine !== undefined && l.type !== 'del' ? `${String(l.newLine).padStart(5)} ${mark}${l.content}` : withNumbers ? `      ${mark}${l.content}` : `${mark}${l.content}`)
    }
  }
  return out.join('\n')
}

/** The diff lines around a line in the new file, for showing a finding in place. */
export function excerpt(file: DiffFile, line: number, radius = 3): DiffLine[] {
  for (const h of file.hunks) {
    const idx = h.lines.findIndex(l => l.newLine === line && l.type !== 'del')
    if (idx === -1) continue
    return h.lines.slice(Math.max(0, idx - radius), idx + radius + 1)
  }
  return []
}
