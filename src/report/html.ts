import { excerpt } from '../diff.ts'
import { CATEGORIES, SEVERITIES, type Category, type ModuleSummary, type DiffFile, type DiffLine, type Finding, type RequirementCheck, type Review, type Severity } from '../types.ts'
import { CSS } from './styles.ts'
import { SCRIPT } from './script.ts'
import { squarify } from './treemap.ts'

const esc = (s: unknown) =>
  String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const base = (p: string) => p.split('/').pop() ?? p
const dir = (p: string) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '')
const fileId = (p: string) => `file-${p.replace(/[^a-zA-Z0-9]+/g, '-')}`

const SEV_LABEL: Record<Severity, string> = { blocker: 'Blocker', major: 'Major', minor: 'Minor', nit: 'Nit' }
const CAT_LABEL: Record<Category, string> = {
  bug: 'Bug',
  security: 'Security',
  performance: 'Performance',
  maintainability: 'Maintainability',
  tests: 'Tests',
  accessibility: 'Accessibility',
  requirements: 'Requirements',
  style: 'Style'
}
const STATUS_LABEL: Record<RequirementCheck['status'], string> = { met: 'Met', partial: 'Partly met', missing: 'Missing', unclear: 'Unclear' }
const VERDICT: Record<Review['verdict'], { label: string; cls: string }> = {
  approve: { label: 'Looks good', cls: 'ok' },
  comment: { label: 'Has comments', cls: 'warn' },
  'request-changes': { label: 'Changes needed', cls: 'bad' }
}

/** A shape per severity, so it reads without colour too. */
export function sevIcon(s: Severity, size = 14): string {
  const shapes: Record<Severity, string> = {
    blocker: '<polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5"/>',
    major: '<polygon points="8,1.5 15,14.5 1,14.5"/>',
    minor: '<circle cx="8" cy="8" r="6"/>',
    nit: '<circle cx="8" cy="8" r="3.5"/>'
  }
  return `<svg class="sev sev-${s}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-label="${SEV_LABEL[s]}" role="img">${shapes[s]}</svg>`
}

function statusIcon(s: RequirementCheck['status'], size = 16): string {
  const inner: Record<RequirementCheck['status'], string> = {
    met: '<circle cx="8" cy="8" r="7"/><path d="M4.5 8.2l2.3 2.3 4.7-4.9" class="mark"/>',
    partial: '<circle cx="8" cy="8" r="7"/><path d="M8 1a7 7 0 0 1 0 14z" class="half"/>',
    missing: '<circle cx="8" cy="8" r="7"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" class="mark"/>',
    unclear: '<circle cx="8" cy="8" r="7"/><path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.3M8 11.3v.2" class="mark"/>'
  }
  return `<svg class="st st-${s}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-label="${STATUS_LABEL[s]}" role="img">${inner[s]}</svg>`
}

/** Green to amber to red. */
export function riskColor(r: number): string {
  const stops = [[0, [48, 164, 108]], [45, [255, 178, 36]], [75, [247, 107, 21]], [100, [229, 72, 77]]] as const
  let i = 0
  while (i < stops.length - 2 && r > stops[i + 1]![0]) i++
  const [a, ca] = stops[i]!
  const [b, cb] = stops[i + 1]!
  const t = Math.max(0, Math.min(1, (r - a) / (b - a)))
  const c = ca.map((v, k) => Math.round(v + (cb[k]! - v) * t))
  return `rgb(${c.join(' ')})`
}

const riskWord = (r: number) => (r >= 75 ? 'High' : r >= 45 ? 'Medium' : r >= 20 ? 'Low' : 'Very low')

function gauge(risk: number): string {
  const r = 52
  const len = Math.PI * r
  const val = (Math.max(0, Math.min(100, risk)) / 100) * len
  return `<svg class="gauge" viewBox="0 0 128 76" role="img" aria-label="Risk ${risk} out of 100">
  <path d="M12 68 A52 52 0 0 1 116 68" class="gauge-track"/>
  <path d="M12 68 A52 52 0 0 1 116 68" class="gauge-val" style="stroke:${riskColor(risk)};stroke-dasharray:${val.toFixed(1)} ${len.toFixed(1)}"/>
  <text x="64" y="60" class="gauge-num">${risk}</text>
</svg>
<div class="gauge-label">${riskWord(risk)} risk</div>`
}

function ring(parts: { value: number; cls: string }[], label: string, size = 56): string {
  const total = parts.reduce((s, p) => s + p.value, 0)
  const r = 22
  const c = 2 * Math.PI * r
  let off = 0
  const arcs = total
    ? parts.filter(p => p.value).map(p => {
      const l = (p.value / total) * c
      const s = `<circle r="${r}" cx="28" cy="28" class="ring-seg ${p.cls}" style="stroke-dasharray:${l.toFixed(2)} ${(c - l).toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"/>`
      off += l
      return s
    }).join('')
    : ''
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 56 56" role="img" aria-label="${esc(label)}"><circle r="${r}" cx="28" cy="28" class="ring-track"/>${arcs}<text x="28" y="32.5" class="ring-num">${esc(label)}</text></svg>`
}

function diffLines(lines: DiffLine[], focus?: number): string {
  return `<div class="code">${lines.map(l => {
    const mark = l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' '
    const hit = focus !== undefined && l.newLine === focus && l.type !== 'del'
    return `<div class="ln ln-${l.type}${hit ? ' ln-hit' : ''}"><span class="no">${l.type === 'del' ? l.oldLine ?? '' : l.newLine ?? ''}</span><span class="mk">${mark}</span><span class="tx">${esc(l.content) || ' '}</span></div>`
  }).join('')}</div>`
}

function suggestion(f: Finding): string {
  if (!f.suggestion) return ''
  const before = f.suggestion.before?.split('\n') ?? []
  const after = f.suggestion.after.split('\n')
  return `<div class="fix"><div class="fix-label">Suggested change</div><div class="code">${before.map(l => `<div class="ln ln-del"><span class="mk">−</span><span class="tx">${esc(l) || ' '}</span></div>`).join('')}${after.map(l => `<div class="ln ln-add"><span class="mk">+</span><span class="tx">${esc(l) || ' '}</span></div>`).join('')}</div></div>`
}

function findingRow(f: Finding, files: Map<string, DiffFile>): string {
  const file = f.file ? files.get(f.file) : undefined
  const ex = file && f.line ? excerpt(file, f.line, 3) : []
  return `<details class="finding" id="${f.id}" data-sev="${f.severity}" data-cat="${f.category}">
  <summary>${sevIcon(f.severity)}<span class="f-title">${esc(f.title)}</span><span class="tag cat-${f.category}">${CAT_LABEL[f.category] ?? esc(f.category)}</span>${f.file ? `<span class="loc">${esc(base(f.file))}${f.line ? `:${f.line}` : ''}</span>` : ''}</summary>
  <div class="f-body">
    <p>${esc(f.detail)}</p>
    ${ex.length ? diffLines(ex, f.line) : ''}
    ${suggestion(f)}
    <div class="f-meta">${SEV_LABEL[f.severity]} · ${f.file ? `<a href="#${fileId(f.file)}" data-open-file="${esc(f.file)}">${esc(f.file)}${f.line ? `:${f.line}` : ''}</a> · ` : ''}${f.source === 'ai' ? 'Found by AI review' : `Static check <code>${esc(f.ruleId)}</code>`}</div>
  </div>
</details>`
}

function fileTiles(files: Review['files'], counts: Map<string, Finding[]>, box: { x: number; y: number; w: number; h: number }, W: number, H: number): string {
  return squarify(files.map(f => ({ item: f, value: f.additions + f.deletions + 6 })), box.w, box.h).map(({ item: f, x, y, w, h }) => {
    const fs = counts.get(f.path) ?? []
    const small = w < 90 || h < 46
    const tiny = w < 46 || h < 26
    const marks = SEVERITIES.flatMap(s => fs.filter(x => x.severity === s).slice(0, 4).map(() => sevIcon(s, 10))).slice(0, 6).join('')
    return `<button class="tile${small ? ' small' : ''}${tiny ? ' tiny' : ''}" data-open-file="${esc(f.path)}" style="left:${((box.x + x) / W) * 100}%;top:${((box.y + y) / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%;--rc:${riskColor(f.risk)}" title="${esc(f.path)} · risk ${f.risk} · +${f.additions} −${f.deletions}${fs.length ? ` · ${fs.length} finding${fs.length > 1 ? 's' : ''}` : ''}">
      ${tiny ? '' : `<span class="t-name">${esc(base(f.path))}</span><span class="t-marks">${marks}</span>`}
    </button>`
  }).join('')
}

/** Files grouped by module, sized by lines changed and coloured by risk. */
function treemap(review: Review): string {
  const live = review.files.filter(f => f.role !== 'Lockfile' && f.role !== 'Generated' && f.role !== 'Binary')
  const W = 1000
  const H = 320
  const LABEL = 36
  const counts = new Map<string, Finding[]>()
  for (const f of review.findings) if (f.file) counts.set(f.file, [...(counts.get(f.file) ?? []), f])
  const groups = review.modules
    .map(m => ({ m, files: live.filter(f => f.module === m.name) }))
    .filter(g => g.files.length)
  const out: string[] = []
  if (groups.length < 2) {
    out.push(fileTiles(live, counts, { x: 0, y: 0, w: W, h: H }, W, H))
  } else {
    for (const { item: g, x, y, w, h } of squarify(groups.map(g => ({ item: g, value: g.files.reduce((s, f) => s + f.additions + f.deletions + 6, 0) })), W, H)) {
      const pad = 3
      out.push(`<div class="group" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%"><span class="g-name">${esc(g.m.name)}</span></div>`)
      if (h > LABEL + 12) out.push(fileTiles(g.files, counts, { x: x + pad, y: y + LABEL, w: w - pad * 2, h: h - LABEL - pad }, W, H))
    }
  }
  return `<div class="treemap" role="group" aria-label="Changed files grouped by module, sized by lines changed and coloured by risk">${out.join('')}</div>
  <div class="legend"><span>Size: lines changed</span><span class="scale"><i style="background:${riskColor(5)}"></i><i style="background:${riskColor(40)}"></i><i style="background:${riskColor(65)}"></i><i style="background:${riskColor(95)}"></i></span><span>Colour: risk</span></div>`
}

const KIND_ICON: Record<ModuleSummary['kind'], string> = {
  frontend: '<rect x="2" y="3" width="16" height="11" rx="1.5"/><path d="M7 17h6M10 14v3"/>',
  backend: '<rect x="3" y="3" width="14" height="5.5" rx="1.2"/><rect x="3" y="11" width="14" height="5.5" rx="1.2"/><path d="M6 5.8h.01M6 13.8h.01"/>',
  shared: '<path d="M10 2.5l7 3.8v7.4l-7 3.8-7-3.8V6.3z"/><path d="M3 6.3l7 3.8 7-3.8M10 10.1v7.4"/>',
  tests: '<path d="M7.5 2.5h5M8.5 2.5v5L4 15.5a1.4 1.4 0 0 0 1.2 2h9.6a1.4 1.4 0 0 0 1.2-2L11.5 7.5v-5"/><path d="M6 12.5h8"/>',
  docs: '<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5"/>',
  config: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M4.7 15.3l1.6-1.6M13.7 6.3l1.6-1.6"/>'
}
const KIND_LABEL: Record<ModuleSummary['kind'], string> = { frontend: 'Frontend', backend: 'Backend', shared: 'Shared', tests: 'Tests', docs: 'Docs', config: 'Config' }

function kindIcon(k: ModuleSummary['kind']): string {
  return `<svg class="kind k-${k}" width="20" height="20" viewBox="0 0 20 20" aria-label="${KIND_LABEL[k]}" role="img">${KIND_ICON[k]}</svg>`
}

/** The areas the change touches: a bar of modules, then one short section per module. */
function areas(review: Review, diffByPath: Map<string, DiffFile>): string {
  // Lockfiles and generated files would swamp the bar, so they don't count towards its size.
  const sized = new Map(review.modules.map(m => [m.name, review.files.filter(f => f.module === m.name && !['Lockfile', 'Generated', 'Binary'].includes(f.role)).reduce((s, f) => s + f.additions + f.deletions, 0) + 2]))
  const total = [...sized.values()].reduce((a, b) => a + b, 0) || 1
  const strip = review.modules.map(m => {
    const pct = (sized.get(m.name)! / total) * 100
    return `<a class="seg" href="#mod-${slug(m.name)}" data-target="mod-${slug(m.name)}" data-open-tab="" style="flex:${Math.max(pct, 4)};--rc:${riskColor(m.risk)}" title="${esc(m.name)} · ${m.files.length} file${m.files.length > 1 ? 's' : ''} · +${m.additions} −${m.deletions}">${pct > 9 ? `<span>${esc(m.name)}</span>` : ''}</a>`
  }).join('')
  const rows = review.modules.map(m => {
    const fs = review.findings.filter(f => f.file && m.files.includes(f.file))
    const files = review.files.filter(f => f.module === m.name)
    const marks = SEVERITIES.map(s => fs.filter(x => x.severity === s).length ? `<span class="mk-n">${sevIcon(s, 12)}${fs.filter(x => x.severity === s).length}</span>` : '').join('')
    return `<details class="module" id="mod-${slug(m.name)}">
      <summary>
        ${kindIcon(m.kind)}
        <span class="m-main"><span class="m-name">${esc(m.name)}${m.root ? ` <span class="m-root">${esc(m.root)}</span>` : ''}</span>${m.summary ? `<span class="m-sum">${esc(m.summary)}</span>` : ''}</span>
        <span class="impact imp-${m.impact}" title="Risk ${m.risk}">${m.impact[0]!.toUpperCase()}${m.impact.slice(1)} impact</span>
        <span class="m-marks">${marks || '<span class="muted">No findings</span>'}</span>
        <span class="m-size">${files.length} file${files.length > 1 ? 's' : ''}<br><span class="plus">+${m.additions}</span> <span class="minus">−${m.deletions}</span></span>
      </summary>
      <div class="m-body">
        <div class="m-files">${files.map(f => `<a class="m-file" href="#${fileId(f.path)}" data-open-file="${esc(f.path)}"><span class="risk-pill" style="--rc:${riskColor(f.risk)}">${f.risk}</span><span class="path"><span class="dir">${esc(m.root && f.path.startsWith(m.root) ? dir(f.path).slice(m.root.length) : dir(f.path))}</span>${esc(base(f.path))}</span><span class="m-purpose">${esc(f.purpose ?? f.role)}</span></a>`).join('')}</div>
        ${fs.length ? `<div class="list nested">${fs.map(x => findingRow(x, diffByPath)).join('')}</div>` : ''}
      </div>
    </details>`
  }).join('')
  return `<section class="areas"><h3>Areas changed</h3><div class="strip">${strip}</div><div class="modules">${rows}</div></section>`
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-')

function reqStrip(review: Review): string {
  if (!review.context.length && !review.requirements.length) return ''
  const byItem = new Map<string, RequirementCheck[]>()
  for (const r of review.requirements) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r])
  const rows = review.context.map(c => {
    const checks = byItem.get(c.id) ?? []
    return `<a class="req-row" href="#req-${esc(c.id)}" data-open-tab="tab-req" data-target="req-${esc(c.id)}">
      <span class="src src-${esc(c.source.toLowerCase().replace(/\s+/g, '-'))}">${esc(c.source)}</span>
      <span class="req-name"><b>${esc(c.id)}</b> ${esc(c.title)}</span>
      <span class="cells">${checks.length ? checks.map(r => `<i class="cell c-${r.status}" title="${esc(STATUS_LABEL[r.status])}: ${esc(r.criterion)}"></i>`).join('') : '<em>no criteria</em>'}</span>
    </a>`
  }).join('')
  return `<div class="panel"><h3>Requirements</h3><div class="req-strip">${rows}</div>
  <div class="legend">${(['met', 'partial', 'missing', 'unclear'] as const).map(s => `<span><i class="cell c-${s}"></i>${STATUS_LABEL[s]}</span>`).join('')}</div></div>`
}

function heatGrid(review: Review): string {
  const cats = CATEGORIES.filter(c => review.findings.some(f => f.category === c))
  if (!cats.length) return ''
  const max = Math.max(1, ...cats.flatMap(c => SEVERITIES.map(s => review.findings.filter(f => f.category === c && f.severity === s).length)))
  return `<div class="panel"><h3>Findings by kind</h3><table class="heat"><thead><tr><th></th>${SEVERITIES.map(s => `<th title="${SEV_LABEL[s]}">${sevIcon(s, 12)}</th>`).join('')}</tr></thead><tbody>${cats.map(c => `<tr><th>${CAT_LABEL[c]}</th>${SEVERITIES.map(s => {
    const n = review.findings.filter(f => f.category === c && f.severity === s).length
    const d = n ? 10 + (n / max) * 18 : 0
    return `<td>${n ? `<button class="dot sevbg-${s}" style="width:${d}px;height:${d}px" data-filter-sev="${s}" data-filter-cat="${c}" title="${n} ${SEV_LABEL[s].toLowerCase()} ${CAT_LABEL[c].toLowerCase()}">${n > 1 ? n : ''}</button>` : ''}</td>`
  }).join('')}</tr>`).join('')}</tbody></table></div>`
}

function bar(add: number, del: number, maxTotal: number): string {
  const w = 90
  const scale = maxTotal ? w / maxTotal : 0
  return `<span class="churn" title="+${add} −${del}"><i class="a" style="width:${Math.max(add ? 2 : 0, add * scale)}px"></i><i class="d" style="width:${Math.max(del ? 2 : 0, del * scale)}px"></i></span>`
}

export interface RenderOptions {
  /** Include the review JSON in the page so tools can read it back. Default true. */
  embedData?: boolean
}

/** Renders a review as one self-contained HTML page. */
export function renderHtml(review: Review, opts: RenderOptions = {}): string {
  const diffByPath = new Map(review.diff.map(d => [d.path, d]))
  const counts = Object.fromEntries(SEVERITIES.map(s => [s, review.findings.filter(f => f.severity === s).length])) as Record<Severity, number>
  const v = VERDICT[review.verdict]
  const add = review.diff.reduce((s, f) => s + f.additions, 0)
  const del = review.diff.reduce((s, f) => s + f.deletions, 0)
  const reqCounts = { met: 0, partial: 0, missing: 0, unclear: 0 }
  for (const r of review.requirements) reqCounts[r.status]++
  const reqTotal = review.requirements.length
  const top = review.findings.filter(f => f.severity === 'blocker' || f.severity === 'major').slice(0, 3)
  const topList = top.length ? top : review.findings.slice(0, 3)
  const maxChurn = Math.max(1, ...review.files.map(f => f.additions + f.deletions))
  const m = review.meta
  const testIssues = review.findings.filter(f => f.category === 'tests').length
  const testState: RequirementCheck['status'] = review.tests.changed ? (testIssues ? 'partial' : 'met') : add > 40 ? 'missing' : 'unclear'

  const signals = `<div class="signals">
    <a class="signal" href="#tab-findings" data-open-tab="tab-findings"><div class="sig-label">Findings</div><div class="sig-sevs">${SEVERITIES.map(s => `<span class="sig-sev${counts[s] ? '' : ' zero'}" title="${SEV_LABEL[s]}">${sevIcon(s, 16)}<b>${counts[s]}</b></span>`).join('')}</div></a>
    <a class="signal" href="#tab-req" data-open-tab="tab-req"><div class="sig-label">Requirements</div>${reqTotal ? `<div class="sig-row">${ring([{ value: reqCounts.met, cls: 'c-met' }, { value: reqCounts.partial, cls: 'c-partial' }, { value: reqCounts.missing, cls: 'c-missing' }, { value: reqCounts.unclear, cls: 'c-unclear' }], `${reqCounts.met}/${reqTotal}`, 46)}<span class="sig-note">${reqCounts.missing ? `${reqCounts.missing} missing` : reqCounts.partial ? `${reqCounts.partial} partly met` : 'all met'}</span></div>` : '<div class="sig-note muted">None linked</div>'}</a>
    <a class="signal" href="#tab-files" data-open-tab="tab-files"><div class="sig-label">Tests</div><div class="sig-row">${statusIcon(testState, 26)}<span class="sig-note">${review.tests.changed ? (testIssues ? `Tests changed, ${testIssues} issue${testIssues > 1 ? 's' : ''}` : 'Tests changed') : 'No test changes'}</span></div></a>
    <a class="signal" href="#tab-files" data-open-tab="tab-files"><div class="sig-label">Size</div><div class="sig-row"><span class="big">${review.diff.length}</span><span class="sig-note">file${review.diff.length === 1 ? '' : 's'}<br><span class="plus">+${add}</span> <span class="minus">−${del}</span></span></div></a>
  </div>`

  const findingsTab = review.findings.length
    ? `<div class="filters" role="toolbar" aria-label="Filter findings">
        <button class="chip on" data-filter-sev="" data-filter-cat="">All <b>${review.findings.length}</b></button>
        ${SEVERITIES.filter(s => counts[s]).map(s => `<button class="chip" data-filter-sev="${s}" data-filter-cat="">${sevIcon(s, 12)} ${SEV_LABEL[s]} <b>${counts[s]}</b></button>`).join('')}
        <span class="sp"></span><button class="chip ghost" data-expand="findings">Expand all</button>
      </div>
      <div class="list" id="findings-list">${review.findings.map(f => findingRow(f, diffByPath)).join('')}</div>`
    : '<p class="empty">No findings.</p>'

  const filesTab = `<div class="list">${review.files.map(f => {
    const fs = review.findings.filter(x => x.file === f.path)
    const d = diffByPath.get(f.path)
    return `<details class="file" id="${fileId(f.path)}" data-path="${esc(f.path)}">
      <summary>
        <span class="risk-pill" style="--rc:${riskColor(f.risk)}" title="Risk ${f.risk}">${f.risk}</span>
        <span class="lang" style="--lc:${f.languageColor}" title="${esc(f.language)}"></span>
        <span class="path"><span class="dir">${esc(dir(f.path))}</span>${esc(base(f.path))}${f.status !== 'modified' ? ` <span class="tag">${f.status}</span>` : ''}</span>
        <span class="role">${esc(f.role)}</span>
        <span class="f-sevs">${SEVERITIES.map(s => fs.filter(x => x.severity === s).map(() => sevIcon(s, 11)).join('')).join('')}</span>
        ${bar(f.additions, f.deletions, maxChurn)}
      </summary>
      <div class="f-body">
        ${f.purpose ? `<p class="purpose">${esc(f.purpose)}</p>` : ''}
        ${fs.length ? `<div class="list nested">${fs.map(x => findingRow(x, diffByPath)).join('')}</div>` : '<p class="muted">No findings in this file.</p>'}
        ${d && d.hunks.length && !['Lockfile', 'Generated', 'Binary'].includes(f.role) ? `<details class="raw"><summary>Diff</summary>${d.hunks.map(h => `<div class="hunk-h">@@ ${esc(h.header)}</div>${diffLines(h.lines)}`).join('')}</details>` : ''}
      </div>
    </details>`
  }).join('')}</div>`

  const byItem = new Map<string, RequirementCheck[]>()
  for (const r of review.requirements) byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r])
  const reqTab = review.context.length
    ? review.context.map(c => {
      const checks = byItem.get(c.id) ?? []
      return `<section class="req" id="req-${esc(c.id)}">
        <header><span class="src src-${esc(c.source.toLowerCase().replace(/\s+/g, '-'))}">${esc(c.source)}</span><span class="tag">${esc(c.kind)}</span>${c.status ? `<span class="tag">${esc(c.status)}</span>` : ''}<h4>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.id)} ${esc(c.title)}</a>` : `${esc(c.id)} ${esc(c.title)}`}</h4></header>
        ${checks.length ? `<div class="list">${checks.map(r => `<details class="crit"><summary>${statusIcon(r.status)}<span>${esc(r.criterion)}</span><span class="tag st-tag-${r.status}">${STATUS_LABEL[r.status]}</span></summary><div class="f-body">${r.evidence ? `<p>${esc(r.evidence)}</p>` : ''}${r.files?.length ? `<p class="muted">${r.files.map(p => `<a href="#${fileId(p)}" data-open-file="${esc(p)}">${esc(p)}</a>`).join(', ')}</p>` : ''}</div></details>`).join('')}</div>` : '<p class="muted">No acceptance criteria found.</p>'}
        ${c.summary || c.reproSteps ? `<details class="raw"><summary>Original text</summary>${c.summary ? `<p>${esc(c.summary)}</p>` : ''}${c.reproSteps ? `<p><b>Repro steps</b><br>${esc(c.reproSteps)}</p>` : ''}</details>` : ''}
      </section>`
    }).join('')
    : `<p class="empty">No requirements or bugs were linked. Mention a work item in the PR (AB#123, a Notion link, #12 or PROJ-123), or pass them in with --context.</p>`

  const aboutTab = `<dl class="about">
    ${m.model ? `<dt>Model</dt><dd>${esc(m.provider)} · ${esc(m.model)}</dd>` : '<dt>Model</dt><dd>None (static checks only)</dd>'}
    <dt>Plugins</dt><dd>${esc(m.plugins.join(', ') || 'none')}</dd>
    <dt>Connectors</dt><dd>${esc(m.connectors.join(', ') || 'none')}</dd>
    <dt>Generated</dt><dd>${esc(new Date(m.generatedAt).toUTCString())}${m.durationMs ? ` in ${(m.durationMs / 1000).toFixed(1)}s` : ''}</dd>
    ${review.warnings.length ? `<dt>Notes</dt><dd><ul>${review.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></dd>` : ''}
  </dl>`

  const title = `Review: ${m.title}`
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="smart-code-review">
<title>${esc(title)}</title>
<style>${CSS}</style>
</head>
<body>
<main>
  <header class="top">
    <div class="crumbs">${m.repo ? `<span>${esc(m.repo)}</span>` : ''}${m.head ? `<span class="branch">${esc(m.head)}${m.base ? ` → ${esc(m.base)}` : ''}</span>` : ''}${m.author ? `<span>by ${esc(m.author)}</span>` : ''}</div>
    <h1>${m.url ? `<a href="${esc(m.url)}" target="_blank" rel="noopener">${esc(m.title)}</a>` : esc(m.title)}</h1>
    <button class="theme" type="button" aria-label="Switch light and dark" data-theme-toggle><svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M8 1.5a6.5 6.5 0 0 1 0 13z" fill="currentColor"/></svg></button>
  </header>

  <section class="verdict v-${v.cls}" aria-label="Verdict">
    <div class="g">${gauge(review.risk)}</div>
    <div class="v-text">
      <span class="pill">${v.label}</span>
      <p class="headline">${esc(review.headline)}</p>
      ${review.summary.length ? `<ul class="keys">${review.summary.map(s => `<li>${esc(s)}</li>`).join('')}</ul>` : ''}
    </div>
  </section>

  ${areas(review, diffByPath)}

  <h2 class="level">Details</h2>
  ${signals}

  <section class="overview${topList.length ? '' : ' one'}">
    <div class="panel"><h3>Where the risk is</h3>${treemap(review)}</div>
    ${topList.length ? `<div class="panel"><h3>Look here first</h3><ol class="first">${topList.map(f => `<li><a href="#${f.id}" data-open-tab="tab-findings" data-target="${f.id}">${sevIcon(f.severity, 16)}<span><b>${esc(f.title)}</b><small>${f.file ? `${esc(base(f.file))}${f.line ? `:${f.line}` : ''}` : ''}</small></span></a></li>`).join('')}</ol></div>` : ''}
  </section>
  <section class="overview two">
    ${reqStrip(review)}
    ${heatGrid(review)}
  </section>

  <section class="tabs">
    <input type="radio" name="tab" id="tab-findings" checked><label for="tab-findings">Findings <b>${review.findings.length}</b></label>
    <input type="radio" name="tab" id="tab-files"><label for="tab-files">Files <b>${review.files.length}</b></label>
    <input type="radio" name="tab" id="tab-req"><label for="tab-req">Requirements <b>${reqTotal}</b></label>
    <input type="radio" name="tab" id="tab-about"><label for="tab-about">About</label>
    <div class="tab-body" data-for="tab-findings">${findingsTab}</div>
    <div class="tab-body" data-for="tab-files">${filesTab}</div>
    <div class="tab-body" data-for="tab-req">${reqTab}</div>
    <div class="tab-body" data-for="tab-about">${aboutTab}</div>
  </section>
  <footer>Made with smart-code-review</footer>
</main>
${opts.embedData === false ? '' : `<script type="application/json" id="review-data">${JSON.stringify({ ...review, diff: undefined }).replace(/</g, '\\u003c')}</script>`}
<script>${SCRIPT}</script>
</body>
</html>`
}
