import { excerpt } from "../diff.js";
import { CATEGORIES, SEVERITIES } from "../types.js";
import { CSS } from "./styles.js";
import { SCRIPT } from "./script.js";
import { squarify } from "./treemap.js";
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const base = (p) => p.split('/').pop() ?? p;
const dir = (p) => (p.includes('/') ? p.slice(0, p.lastIndexOf('/') + 1) : '');
const fileId = (p) => `file-${p.replace(/[^a-zA-Z0-9]+/g, '-')}`;
const SEV_LABEL = { blocker: 'Blocker', major: 'Major', minor: 'Minor', nit: 'Nit' };
const CAT_LABEL = {
    bug: 'Bug',
    security: 'Security',
    performance: 'Performance',
    maintainability: 'Maintainability',
    tests: 'Tests',
    accessibility: 'Accessibility',
    requirements: 'Requirements',
    style: 'Style'
};
const STATUS_LABEL = { met: 'Met', partial: 'Partly met', missing: 'Missing', unclear: 'Unclear' };
const VERDICT = {
    approve: { label: 'Looks good', cls: 'ok' },
    comment: { label: 'Has comments', cls: 'warn' },
    'request-changes': { label: 'Changes needed', cls: 'bad' }
};
/** A shape per severity, so it reads without colour too. */
export function sevIcon(s, size = 14) {
    const shapes = {
        blocker: '<polygon points="5,1 11,1 15,5 15,11 11,15 5,15 1,11 1,5"/>',
        major: '<polygon points="8,1.5 15,14.5 1,14.5"/>',
        minor: '<circle cx="8" cy="8" r="6"/>',
        nit: '<circle cx="8" cy="8" r="3.5"/>'
    };
    return `<svg class="sev sev-${s}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-label="${SEV_LABEL[s]}" role="img">${shapes[s]}</svg>`;
}
function statusIcon(s, size = 16) {
    const inner = {
        met: '<circle cx="8" cy="8" r="7"/><path d="M4.5 8.2l2.3 2.3 4.7-4.9" class="mark"/>',
        partial: '<circle cx="8" cy="8" r="7"/><path d="M8 1a7 7 0 0 1 0 14z" class="half"/>',
        missing: '<circle cx="8" cy="8" r="7"/><path d="M5.2 5.2l5.6 5.6M10.8 5.2l-5.6 5.6" class="mark"/>',
        unclear: '<circle cx="8" cy="8" r="7"/><path d="M6.3 6.2a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.3M8 11.3v.2" class="mark"/>'
    };
    return `<svg class="st st-${s}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-label="${STATUS_LABEL[s]}" role="img">${inner[s]}</svg>`;
}
/** Green to amber to red. */
export function riskColor(r) {
    const stops = [[0, [48, 164, 108]], [45, [255, 178, 36]], [75, [247, 107, 21]], [100, [229, 72, 77]]];
    let i = 0;
    while (i < stops.length - 2 && r > stops[i + 1][0])
        i++;
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    const t = Math.max(0, Math.min(1, (r - a) / (b - a)));
    const c = ca.map((v, k) => Math.round(v + (cb[k] - v) * t));
    return `rgb(${c.join(' ')})`;
}
const riskWord = (r) => (r >= 75 ? 'High' : r >= 45 ? 'Medium' : r >= 20 ? 'Low' : 'Very low');
function gauge(risk) {
    const r = 52;
    const len = Math.PI * r;
    const val = (Math.max(0, Math.min(100, risk)) / 100) * len;
    return `<svg class="gauge" viewBox="0 0 128 76" role="img" aria-label="Risk ${risk} out of 100">
  <path d="M12 68 A52 52 0 0 1 116 68" class="gauge-track"/>
  <path d="M12 68 A52 52 0 0 1 116 68" class="gauge-val" style="stroke:${riskColor(risk)};stroke-dasharray:${val.toFixed(1)} ${len.toFixed(1)}"/>
  <text x="64" y="60" class="gauge-num">${risk}</text>
</svg>
<div class="gauge-label">${riskWord(risk)} risk</div>`;
}
function ring(parts, label, size = 56) {
    const total = parts.reduce((s, p) => s + p.value, 0);
    const r = 22;
    const c = 2 * Math.PI * r;
    let off = 0;
    const arcs = total
        ? parts.filter(p => p.value).map(p => {
            const l = (p.value / total) * c;
            const s = `<circle r="${r}" cx="28" cy="28" class="ring-seg ${p.cls}" style="stroke-dasharray:${l.toFixed(2)} ${(c - l).toFixed(2)};stroke-dashoffset:${(-off).toFixed(2)}"/>`;
            off += l;
            return s;
        }).join('')
        : '';
    return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 56 56" role="img" aria-label="${esc(label)}"><circle r="${r}" cx="28" cy="28" class="ring-track"/>${arcs}<text x="28" y="32.5" class="ring-num">${esc(label)}</text></svg>`;
}
function diffLines(lines, focus) {
    return `<div class="code">${lines.map(l => {
        const mark = l.type === 'add' ? '+' : l.type === 'del' ? '−' : ' ';
        const hit = focus !== undefined && l.newLine === focus && l.type !== 'del';
        return `<div class="ln ln-${l.type}${hit ? ' ln-hit' : ''}"><span class="no">${l.type === 'del' ? l.oldLine ?? '' : l.newLine ?? ''}</span><span class="mk">${mark}</span><span class="tx">${esc(l.content) || ' '}</span></div>`;
    }).join('')}</div>`;
}
function suggestion(f) {
    if (!f.suggestion)
        return '';
    const before = f.suggestion.before?.split('\n') ?? [];
    const after = f.suggestion.after.split('\n');
    return `<div class="fix"><div class="fix-label">Suggested change</div><div class="code">${before.map(l => `<div class="ln ln-del"><span class="mk">−</span><span class="tx">${esc(l) || ' '}</span></div>`).join('')}${after.map(l => `<div class="ln ln-add"><span class="mk">+</span><span class="tx">${esc(l) || ' '}</span></div>`).join('')}</div></div>`;
}
function findingRow(f, files) {
    const file = f.file ? files.get(f.file) : undefined;
    const ex = file && f.line ? excerpt(file, f.line, 3) : [];
    return `<details class="finding" id="${f.id}" data-sev="${f.severity}" data-cat="${f.category}">
  <summary>${sevIcon(f.severity)}<span class="f-title">${esc(f.title)}</span><span class="tag cat-${f.category}">${CAT_LABEL[f.category] ?? esc(f.category)}</span>${f.file ? `<span class="loc">${esc(base(f.file))}${f.line ? `:${f.line}` : ''}</span>` : ''}</summary>
  <div class="f-body">
    <p>${esc(f.detail)}</p>
    ${ex.length ? diffLines(ex, f.line) : ''}
    ${suggestion(f)}
    <div class="f-meta">${SEV_LABEL[f.severity]} · ${f.file ? `<a href="#${fileId(f.file)}" data-open-file="${esc(f.file)}">${esc(f.file)}${f.line ? `:${f.line}` : ''}</a> · ` : ''}${f.source === 'ai' ? 'Found by AI review' : `Static check <code>${esc(f.ruleId)}</code>`}</div>
  </div>
</details>`;
}
function fileTiles(files, counts, box, W, H, style) {
    return squarify(files.map(f => ({ item: f, value: f.additions + f.deletions + 6 })), box.w, box.h).map(({ item: f, x, y, w, h }) => {
        const fs = counts.get(f.path) ?? [];
        const small = w < 90 || h < 46;
        const tiny = w < 46 || h < 26;
        const marks = style ? '' : SEVERITIES.flatMap(s => fs.filter(x => x.severity === s).slice(0, 4).map(() => sevIcon(s, 10))).slice(0, 6).join('');
        return `<button class="tile${small ? ' small' : ''}${tiny ? ' tiny' : ''}" ${style ? style.open : 'data-open-file'}="${esc(f.path)}" style="left:${((box.x + x) / W) * 100}%;top:${((box.y + y) / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%;--rc:${style ? style.color(f) : riskColor(f.risk)}" title="${esc(style ? style.title(f) : `${f.path} · risk ${f.risk} · +${f.additions} −${f.deletions}${fs.length ? ` · ${fs.length} finding${fs.length > 1 ? 's' : ''}` : ''}`)}">
      ${tiny ? '' : `<span class="t-name">${esc(base(f.path))}</span><span class="t-marks">${marks}</span>`}
    </button>`;
    }).join('');
}
/** Files grouped by module, sized by lines changed and coloured by risk (or by `style`). */
function treemap(review, style) {
    const live = review.files.filter(f => f.role !== 'Lockfile' && f.role !== 'Generated' && f.role !== 'Binary');
    const W = 1000;
    const H = 320;
    const LABEL = 36;
    const counts = new Map();
    for (const f of review.findings)
        if (f.file)
            counts.set(f.file, [...(counts.get(f.file) ?? []), f]);
    const groups = review.modules
        .map(m => ({ m, files: live.filter(f => f.module === m.name) }))
        .filter(g => g.files.length);
    const out = [];
    if (groups.length < 2) {
        out.push(fileTiles(live, counts, { x: 0, y: 0, w: W, h: H }, W, H, style));
    }
    else {
        for (const { item: g, x, y, w, h } of squarify(groups.map(g => ({ item: g, value: g.files.reduce((s, f) => s + f.additions + f.deletions + 6, 0) })), W, H)) {
            const pad = 3;
            out.push(`<div class="group" style="left:${(x / W) * 100}%;top:${(y / H) * 100}%;width:${(w / W) * 100}%;height:${(h / H) * 100}%"><span class="g-name">${esc(g.m.name)}</span></div>`);
            if (h > LABEL + 12)
                out.push(fileTiles(g.files, counts, { x: x + pad, y: y + LABEL, w: w - pad * 2, h: h - LABEL - pad }, W, H, style));
        }
    }
    if (style)
        return `<div class="treemap" role="group" aria-label="Changed files grouped by area, sized by lines changed">${out.join('')}</div>`;
    return `<div class="treemap" role="group" aria-label="Changed files grouped by module, sized by lines changed and coloured by risk">${out.join('')}</div>
  <div class="legend"><span>Size: lines changed</span><span class="scale"><i style="background:${riskColor(5)}"></i><i style="background:${riskColor(40)}"></i><i style="background:${riskColor(65)}"></i><i style="background:${riskColor(95)}"></i></span><span>Colour: risk</span></div>`;
}
const KIND_ICON = {
    frontend: '<rect x="2" y="3" width="16" height="11" rx="1.5"/><path d="M7 17h6M10 14v3"/>',
    backend: '<rect x="3" y="3" width="14" height="5.5" rx="1.2"/><rect x="3" y="11" width="14" height="5.5" rx="1.2"/><path d="M6 5.8h.01M6 13.8h.01"/>',
    shared: '<path d="M10 2.5l7 3.8v7.4l-7 3.8-7-3.8V6.3z"/><path d="M3 6.3l7 3.8 7-3.8M10 10.1v7.4"/>',
    tests: '<path d="M7.5 2.5h5M8.5 2.5v5L4 15.5a1.4 1.4 0 0 0 1.2 2h9.6a1.4 1.4 0 0 0 1.2-2L11.5 7.5v-5"/><path d="M6 12.5h8"/>',
    docs: '<path d="M5 2.5h7l3.5 3.5v11.5H5z"/><path d="M12 2.5V6h3.5M7.5 10h5M7.5 13h5"/>',
    agents: '<path d="M10 2.5l1.6 4.4 4.4 1.6-4.4 1.6L10 14.5l-1.6-4.4L4 8.5l4.4-1.6z"/><path d="M15.5 13v4M13.5 15h4"/>',
    config: '<circle cx="10" cy="10" r="2.6"/><path d="M10 2.5v2.2M10 15.3v2.2M2.5 10h2.2M15.3 10h2.2M4.7 4.7l1.6 1.6M13.7 13.7l1.6 1.6M4.7 15.3l1.6-1.6M13.7 6.3l1.6-1.6"/>'
};
const KIND_LABEL = { frontend: 'Frontend', backend: 'Backend', shared: 'Shared', tests: 'Tests', docs: 'Docs', config: 'Config', agents: 'AI agents' };
function kindIcon(k) {
    return `<svg class="kind k-${k}" width="20" height="20" viewBox="0 0 20 20" aria-label="${KIND_LABEL[k]}" role="img">${KIND_ICON[k]}</svg>`;
}
/** The areas the change touches: a bar of modules, then one short section per module. */
function areas(review, diffByPath) {
    // Lockfiles and generated files would swamp the bar, so they don't count towards its size.
    const sized = new Map(review.modules.map(m => [m.name, review.files.filter(f => f.module === m.name && !['Lockfile', 'Generated', 'Binary'].includes(f.role)).reduce((s, f) => s + f.additions + f.deletions, 0) + 2]));
    const total = [...sized.values()].reduce((a, b) => a + b, 0) || 1;
    const strip = review.modules.map(m => {
        const pct = (sized.get(m.name) / total) * 100;
        return `<a class="seg" href="#mod-${slug(m.name)}" data-target="mod-${slug(m.name)}" data-open-tab="" style="flex:${Math.max(pct, 4)};--rc:${riskColor(m.risk)}" title="${esc(m.name)} · ${m.files.length} file${m.files.length > 1 ? 's' : ''} · +${m.additions} −${m.deletions}">${pct > 9 ? `<span>${esc(m.name)}</span>` : ''}</a>`;
    }).join('');
    const rows = review.modules.map(m => {
        const fs = review.findings.filter(f => f.file && m.files.includes(f.file));
        const files = review.files.filter(f => f.module === m.name);
        const marks = SEVERITIES.map(s => fs.filter(x => x.severity === s).length ? `<span class="mk-n">${sevIcon(s, 12)}${fs.filter(x => x.severity === s).length}</span>` : '').join('');
        return `<details class="module" id="mod-${slug(m.name)}">
      <summary>
        ${kindIcon(m.kind)}
        <span class="m-main"><span class="m-name">${esc(m.name)}${m.root ? ` <span class="m-root">${esc(m.root)}</span>` : ''}</span>${m.summary ? `<span class="m-sum">${esc(m.summary)}</span>` : ''}</span>
        <span class="impact imp-${m.impact}" title="Risk ${m.risk}">${m.impact[0].toUpperCase()}${m.impact.slice(1)} impact</span>
        <span class="m-marks">${marks || '<span class="muted">No findings</span>'}</span>
        <span class="m-size">${files.length} file${files.length > 1 ? 's' : ''}<br><span class="plus">+${m.additions}</span> <span class="minus">−${m.deletions}</span></span>
      </summary>
      <div class="m-body">
        <div class="m-files">${files.map(f => `<a class="m-file" href="#${fileId(f.path)}" data-open-file="${esc(f.path)}"><span class="risk-pill" style="--rc:${riskColor(f.risk)}">${f.risk}</span><span class="path"><span class="dir">${esc(m.root && f.path.startsWith(m.root) ? dir(f.path).slice(m.root.length) : dir(f.path))}</span>${esc(base(f.path))}</span><span class="m-purpose">${esc(f.purpose ?? f.role)}</span></a>`).join('')}</div>
        ${fs.length ? `<div class="list nested">${fs.map(x => findingRow(x, diffByPath)).join('')}</div>` : ''}
      </div>
    </details>`;
    }).join('');
    return `<section class="areas"><h3>Impact by area</h3><div class="strip">${strip}</div><div class="modules">${rows}</div></section>`;
}
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-');
function reqStrip(review) {
    if (!review.context.length && !review.requirements.length)
        return '';
    const byItem = new Map();
    for (const r of review.requirements)
        byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);
    const rows = review.context.map(c => {
        const checks = byItem.get(c.id) ?? [];
        return `<a class="req-row" href="#req-${esc(c.id)}" data-open-tab="tab-req" data-target="req-${esc(c.id)}">
      <span class="src src-${esc(c.source.toLowerCase().replace(/\s+/g, '-'))}">${esc(c.source)}</span>
      <span class="req-name"><b>${esc(c.id)}</b> ${esc(c.title)}</span>
      <span class="cells">${checks.length ? checks.map(r => `<i class="cell c-${r.status}" title="${esc(STATUS_LABEL[r.status])}: ${esc(r.criterion)}"></i>`).join('') : '<em>no criteria</em>'}</span>
    </a>`;
    }).join('');
    return `<div class="panel"><h3>Requirements</h3><div class="req-strip">${rows}</div>
  <div class="legend">${['met', 'partial', 'missing', 'unclear'].map(s => `<span><i class="cell c-${s}"></i>${STATUS_LABEL[s]}</span>`).join('')}</div></div>`;
}
function heatGrid(review) {
    const cats = CATEGORIES.filter(c => review.findings.some(f => f.category === c));
    if (!cats.length)
        return '';
    const max = Math.max(1, ...cats.flatMap(c => SEVERITIES.map(s => review.findings.filter(f => f.category === c && f.severity === s).length)));
    return `<div class="panel"><h3>Findings by kind</h3><table class="heat"><thead><tr><th></th>${SEVERITIES.map(s => `<th title="${SEV_LABEL[s]}">${sevIcon(s, 12)}</th>`).join('')}</tr></thead><tbody>${cats.map(c => `<tr><th>${CAT_LABEL[c]}</th>${SEVERITIES.map(s => {
        const n = review.findings.filter(f => f.category === c && f.severity === s).length;
        const d = n ? 10 + (n / max) * 18 : 0;
        return `<td>${n ? `<button class="dot sevbg-${s}" style="width:${d}px;height:${d}px" data-filter-sev="${s}" data-filter-cat="${c}" title="${n} ${SEV_LABEL[s].toLowerCase()} ${CAT_LABEL[c].toLowerCase()}">${n > 1 ? n : ''}</button>` : ''}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table></div>`;
}
function bar(add, del, maxTotal) {
    const w = 90;
    const scale = maxTotal ? w / maxTotal : 0;
    return `<span class="churn" title="+${add} −${del}"><i class="a" style="width:${Math.max(add ? 2 : 0, add * scale)}px"></i><i class="d" style="width:${Math.max(del ? 2 : 0, del * scale)}px"></i></span>`;
}
const NOT_SHOWN = ['Lockfile', 'Generated', 'Binary'];
const ACTION_LABEL = { added: 'Added', changed: 'Changed', removed: 'Removed' };
const FILE_STATUS = {
    added: { label: 'Added', cls: 'added' },
    modified: { label: 'Changed', cls: 'changed' },
    deleted: { label: 'Removed', cls: 'removed' },
    renamed: { label: 'Renamed', cls: 'renamed' }
};
const SYM_KIND = { function: 'Function', class: 'Class', method: 'Method', type: 'Type', template: 'Template', test: 'Test' };
const FACT_GROUP = {
    env: 'Environment variables',
    migration: 'Migrations',
    route: 'API routes',
    page: 'Pages',
    component: 'Components',
    dependency: 'Dependencies',
    config: 'Config',
    agent: 'AI agent setup'
};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
/** Added, changed, removed and renamed as a coloured shape, so the word isn't needed. */
export function actIcon(a, size = 16) {
    const inner = {
        added: '<path d="M8 4.5v7M4.5 8h7"/>',
        changed: '<circle cx="8" cy="8" r="2.2" class="fill"/>',
        removed: '<path d="M4.5 8h7"/>',
        renamed: '<path d="M4.5 8h6.5M8.5 5.2L11.3 8l-2.8 2.8"/>'
    };
    const label = { added: 'Added', changed: 'Changed', removed: 'Removed', renamed: 'Renamed' }[a];
    return `<svg class="ai ai-${a}" width="${size}" height="${size}" viewBox="0 0 16 16" role="img" aria-label="${label}"><title>${label}</title><rect x="1" y="1" width="14" height="14" rx="4"/>${inner[a]}</svg>`;
}
const fileAct = (s) => (s === 'added' ? 'added' : s === 'deleted' ? 'removed' : s === 'renamed' ? 'renamed' : 'changed');
const counted = (acts) => acts.map(([a, n]) => `<span class="cnt">${actIcon(a, 14)}${n}</span>`).join('');
function symbolRow(y) {
    return `<details class="sym">
    <summary>${actIcon(y.action)}<span class="s-kind">${SYM_KIND[y.kind]}</span><code class="s-name">${esc(y.kind === 'template' ? '<template>' : y.name)}</code><span class="s-desc">${esc(y.description ?? '')}</span><span class="s-size"><span class="plus">+${y.lines.filter(l => l.type === 'add').length}</span> <span class="minus">−${y.lines.filter(l => l.type === 'del').length}</span></span>${y.line ? `<span class="loc">line ${y.line}</span>` : ''}</summary>
    <div class="s-body">${y.description ? `<p class="s-what">${esc(y.description)}</p>` : ''}${y.lines.length ? diffLines(y.lines) : '<p class="muted">No lines to show.</p>'}</div>
  </details>`;
}
function factItem(f, withFile = false) {
    return `<a class="fact" href="#c${fileId(f.file)}" data-open-cfile="${esc(f.file)}">${actIcon(f.action)}<code>${esc(f.label)}</code>${f.detail ? `<span class="muted">${esc(f.detail)}</span>` : ''}${withFile ? `<span class="loc">${esc(base(f.file))}</span>` : ''}</a>`;
}
/** One file in "The change": what it is, then the functions and components it changes, then its diff. */
function changeFile(f, d, root, only, idPrefix = 'c') {
    const st = FILE_STATUS[f.status];
    const hidden = NOT_SHOWN.includes(f.role);
    const picked = only?.length ? f.symbols.filter(y => only.includes(y.name) || (y.kind === 'template' && only.some(o => /template/i.test(o)))) : [];
    const syms = picked.length ? picked : f.symbols;
    const acts = ['added', 'changed', 'removed'].map(a => [a, syms.filter(y => y.action === a).length]).filter(([, n]) => n);
    return `<details class="cfile" id="${idPrefix}${fileId(f.path)}" data-path="${esc(f.path)}">
    <summary>
      ${actIcon(fileAct(f.status))}
      <span class="path"><span class="dir">${esc(root && f.path.startsWith(root) ? dir(f.path).slice(root.length) : dir(f.path))}</span>${esc(base(f.path))}</span>
      <span class="m-purpose">${esc(f.purpose ?? f.role)}</span>
      <span class="sym-n">${counted(acts)}</span>
      <span class="m-size"><span class="plus">+${f.additions}</span> <span class="minus">−${f.deletions}</span></span>
    </summary>
    <div class="f-body">
      ${f.facts.length ? `<div class="facts-inline">${f.facts.map(x => factItem(x)).join('')}</div>` : ''}
      ${syms.length ? `<div class="syms">${syms.map(symbolRow).join('')}</div>${picked.length && picked.length < f.symbols.length ? `<p class="muted small">${f.symbols.length - picked.length} more in this file belong to other features.</p>` : ''}` : hidden ? `<p class="muted">${esc(f.role)}, not shown.</p>` : ''}
      ${d && d.hunks.length && !hidden ? `<details class="raw"><summary>Full diff</summary>${d.hunks.map(h => `<div class="hunk-h">@@ ${esc(h.header)}</div>${diffLines(h.lines)}`).join('')}</details>` : ''}
    </div>
  </details>`;
}
/** The areas the change touches, coloured by kind: one section per module, drilling down to files and functions. */
function changeAreas(review, diffByPath) {
    const sized = new Map(review.modules.map(m => [m.name, review.files.filter(f => f.module === m.name && !NOT_SHOWN.includes(f.role)).reduce((s, f) => s + f.additions + f.deletions, 0) + 2]));
    const total = [...sized.values()].reduce((a, b) => a + b, 0) || 1;
    const strip = review.modules.map(m => {
        const pct = (sized.get(m.name) / total) * 100;
        return `<a class="seg k-${m.kind}" href="#cmod-${slug(m.name)}" data-target="cmod-${slug(m.name)}" style="flex:${Math.max(pct, 4)}" title="${esc(m.name)} · ${plural(m.files.length, 'file')} · +${m.additions} −${m.deletions}">${pct > 9 ? `<span>${esc(m.name)}</span>` : ''}</a>`;
    }).join('');
    const kinds = [...new Set(review.modules.map(m => m.kind))];
    const rows = review.modules.map(m => {
        const files = review.files.filter(f => f.module === m.name);
        const syms = files.flatMap(f => f.symbols);
        const acts = ['added', 'changed', 'removed'].map(a => [a, syms.filter(y => y.action === a).length]).filter(([, n]) => n);
        return `<details class="module" id="cmod-${slug(m.name)}">
      <summary>
        ${kindIcon(m.kind)}
        <span class="m-main"><span class="m-name">${esc(m.name)}${m.root ? ` <span class="m-root">${esc(m.root)}</span>` : ''}</span>${m.summary ? `<span class="m-sum">${esc(m.summary)}</span>` : ''}</span>
        <span class="m-acts">${counted(acts)}</span>
        <span class="m-size">${plural(files.length, 'file')}<br><span class="plus">+${m.additions}</span> <span class="minus">−${m.deletions}</span></span>
      </summary>
      <div class="m-body">
        <div class="list">${files.map(f => changeFile(f, diffByPath.get(f.path), m.root)).join('')}</div>
      </div>
    </details>`;
    }).join('');
    return `<section class="areas"><h3>Areas changed</h3><div class="strip">${strip}</div>
  <div class="legend kinds">${kinds.map(k => `<span><i class="sw k-${k}"></i>${KIND_LABEL[k]}</span>`).join('')}<span class="muted">Width: lines changed</span><span class="sep"></span>${['added', 'changed', 'removed'].map(a => `<span>${actIcon(a, 13)}${ACTION_LABEL[a]}</span>`).join('')}</div>
  <div class="modules">${rows}</div></section>`;
}
/** The main path through the change, as a sequence diagram. */
export function flowDiagram(flow) {
    if (!flow.length)
        return '';
    const parts = [];
    for (const s of flow)
        for (const p of [s.from, s.to])
            if (!parts.includes(p))
                parts.push(p);
    const W = 1000;
    const col = W / parts.length;
    const cx = (p) => col * parts.indexOf(p) + col / 2;
    const top = 46;
    const row = 48;
    const H = top + 18 + flow.length * row;
    const max = Math.max(8, Math.floor(col / 8.5));
    const cut = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
    const heads = parts.map(p => {
        const x = cx(p);
        const w = Math.min(col - 16, Math.max(90, cut(p, max).length * 8.4 + 24));
        return `<line x1="${x}" y1="${top}" x2="${x}" y2="${H}" class="fl-life"/><rect x="${x - w / 2}" y="6" width="${w}" height="36" rx="8" class="fl-box"/><text x="${x}" y="29" class="fl-name">${esc(cut(p, max))}</text>`;
    }).join('');
    const steps = flow.map((s, i) => {
        const y = top + 18 + i * row + 26;
        const x1 = cx(s.from);
        const x2 = cx(s.to);
        const num = `<circle cx="${x1}" cy="${y}" r="9" class="fl-num"/><text x="${x1}" y="${y + 4}" class="fl-numt">${i + 1}</text>`;
        if (s.from === s.to) {
            return `<path d="M${x1 + 9} ${y - 4} h34 v14 h-28" class="fl-arrow" marker-end="url(#fl-head)"/>${num}<text x="${x1 + 52}" y="${y + 4}" class="fl-label" text-anchor="start">${esc(cut(s.label, 60))}</text>`;
        }
        const dir = x2 > x1 ? 1 : -1;
        const room = Math.max(12, Math.floor(Math.abs(x2 - x1) / 7));
        return `<line x1="${x1 + dir * 10}" y1="${y}" x2="${x2 - dir * 3}" y2="${y}" class="fl-arrow" marker-end="url(#fl-head)"/>${num}<text x="${(x1 + x2) / 2}" y="${y - 8}" class="fl-label">${esc(cut(s.label, room))}</text>`;
    }).join('');
    return `<div class="flow-wrap"><svg class="flow" viewBox="0 0 ${W} ${H}" role="img" aria-label="How the parts of the change call each other">
  <defs><marker id="fl-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" class="fl-tip"/></marker></defs>
  ${heads}${steps}
  <title>${esc(flow.map((s, i) => `${i + 1}. ${s.from} → ${s.to}: ${s.label}`).join('\n'))}</title>
</svg></div>`;
}
function effortPips(n) {
    const word = ['', 'Quick', 'Short', 'Medium', 'Long', 'Very long'][n] ?? '';
    return `<span class="pips" title="Review effort ${n} of 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span><span>${word} to review</span>`;
}
/** Routes, pages, dependencies, settings: what the change does outside its own files. */
function outside(facts) {
    if (!facts.length)
        return '';
    const groups = Object.keys(FACT_GROUP).map(k => [k, facts.filter(f => f.kind === k)]).filter(([, l]) => l.length);
    return `<div class="panel"><h3>Outside the code</h3><div class="fact-groups">${groups.map(([k, l]) => `<div class="fact-group"><div class="fg-name">${FACT_GROUP[k]}</div>${l.map(f => factItem(f, true)).join('')}</div>`).join('')}</div></div>`;
}
/** Large changes, grouped into the features or fixes they contain. */
function changeFeatures(review, diffByPath) {
    const features = review.change.features ?? [];
    const byPath = new Map(review.files.map(f => [f.path, f]));
    const modKind = new Map(review.modules.map(m => [m.name, m.kind]));
    const sizeOf = (paths) => paths.reduce((s, p) => { const f = byPath.get(p); return s + (f && !NOT_SHOWN.includes(f.role) ? f.additions + f.deletions : 0); }, 0);
    const total = features.reduce((s, x) => s + sizeOf(x.files), 0) || 1;
    const rows = features.map((x, i) => {
        const files = x.files.map(p => byPath.get(p)).filter(Boolean);
        const areas = [...new Set(files.map(f => f.module))];
        const syms = files.flatMap(f => (x.symbols.length ? f.symbols.filter(y => x.symbols.includes(y.name)) : f.symbols));
        const acts = ['added', 'changed', 'removed'].map(a => [a, syms.filter(y => y.action === a).length]).filter(([, n]) => n);
        // A finding counts for this feature when it falls in one of the feature's own functions, or the whole file is the feature's.
        const owns = (f) => {
            if (!f.file || !x.files.includes(f.file))
                return false;
            const file = byPath.get(f.file);
            const mine = file && x.symbols.length ? file.symbols.filter(y => x.symbols.includes(y.name)) : [];
            if (!mine.length || f.line === undefined)
                return true;
            return mine.some(y => y.lines.some(l => l.newLine === f.line));
        };
        const fs = review.findings.filter(f => f.severity !== 'nit' && owns(f));
        const marks = SEVERITIES.map(s => fs.filter(y => y.severity === s).length ? `<span class="mk-n">${sevIcon(s, 12)}${fs.filter(y => y.severity === s).length}</span>` : '').join('');
        const size = sizeOf(x.files);
        const add = files.reduce((s, f) => s + f.additions, 0);
        const del = files.reduce((s, f) => s + f.deletions, 0);
        return `<details class="module feature" id="feat-${i}">
      <summary>
        <span class="f-num">${i + 1}</span>
        <span class="m-main"><span class="m-name">${esc(x.name)}</span>${x.summary ? `<span class="m-sum">${esc(x.summary)}</span>` : ''}
          <span class="f-areas">${areas.map(a => `<span class="f-area"><i class="sw k-${modKind.get(a) ?? 'shared'}"></i>${esc(a)}</span>`).join('')}</span></span>
        <span class="m-acts">${counted(acts)}</span>
        <span class="f-marks" title="Findings in these files">${marks}</span>
        <span class="m-size">${plural(files.length, 'file')}<br><span class="plus">+${add}</span> <span class="minus">−${del}</span><span class="f-bar"><i style="width:${Math.max(3, (size / total) * 100)}%"></i></span></span>
      </summary>
      <div class="m-body"><div class="list">${files.map(f => changeFile(f, diffByPath.get(f.path), undefined, x.symbols, `f${i}-`)).join('')}</div></div>
    </details>`;
    }).join('');
    return `<div class="modules">${rows}</div>`;
}
/** Part one: what the change does, stated as fact. */
function changePart(review, diffByPath, add, del) {
    const c = review.change;
    const syms = review.files.flatMap(f => f.symbols).filter(y => y.kind !== 'template' && y.kind !== 'test');
    const tests = review.files.flatMap(f => f.symbols).filter(y => y.kind === 'test');
    const n = (a) => syms.filter(y => y.action === a).length;
    const count = (k) => c.facts.filter(f => f.kind === k).length;
    const chips = [
        `<span class="chip-f"><b>${review.diff.length}</b> file${review.diff.length === 1 ? '' : 's'} <span class="plus">+${add}</span> <span class="minus">−${del}</span></span>`,
        `<span class="chip-f"><b>${review.modules.length}</b> area${review.modules.length === 1 ? '' : 's'}</span>`,
        syms.length ? `<span class="chip-f">${counted(['added', 'changed', 'removed'].map(a => [a, n(a)]).filter(([, k]) => k))} functions and types</span>` : '',
        tests.length ? `<span class="chip-f"><b>${tests.length}</b> test${tests.length === 1 ? '' : 's'}</span>` : '',
        count('route') ? `<span class="chip-f"><b>${count('route')}</b> API route${count('route') === 1 ? '' : 's'}</span>` : '',
        count('dependency') ? `<span class="chip-f"><b>${count('dependency')}</b> dependenc${count('dependency') === 1 ? 'y' : 'ies'}</span>` : '',
        count('env') ? `<span class="chip-f"><b>${count('env')}</b> env var${count('env') === 1 ? '' : 's'}</span>` : '',
        count('agent') ? `<span class="chip-f"><b>${count('agent')}</b> AI agent change${count('agent') === 1 ? '' : 's'}</span>` : '',
        `<span class="chip-f">${effortPips(c.effort)}</span>`
    ].filter(Boolean).join('');
    const statusMap = treemap(review, {
        color: f => `var(--s-${FILE_STATUS[f.status].cls})`,
        title: f => `${f.path} · ${FILE_STATUS[f.status].label.toLowerCase()} · +${f.additions} −${f.deletions}${f.symbols.length ? ` · ${f.symbols.map(y => y.name).slice(0, 6).join(', ')}` : ''}`,
        open: 'data-open-cfile'
    });
    return `<section class="hero">
      <p class="c-sum">${esc(c.summary)}</p>
      <div class="facts">${chips}</div>
    </section>
    ${c.flow?.length ? `<div class="panel flow-panel"><h3>How it fits together</h3>${flowDiagram(c.flow)}</div>` : ''}
    ${c.features?.length ? `<div class="views">
      <input type="radio" name="cview" id="cview-feature" checked><label for="cview-feature"><span class="p-t">By feature <b>${c.features.length}</b></span></label>
      <input type="radio" name="cview" id="cview-area"><label for="cview-area"><span class="p-t">By area <b>${review.modules.length}</b></span></label>
      <div class="view" data-part="cview-feature">${changeFeatures(review, diffByPath)}</div>
      <div class="view" data-part="cview-area">${changeAreas(review, diffByPath).replace('<h3>Areas changed</h3>', '')}</div>
    </div>` : changeAreas(review, diffByPath)}
    <section class="overview${c.facts.length ? '' : ' one'} later">
      <div class="panel"><h3>Files</h3>${statusMap}<div class="legend">${['added', 'changed', 'removed', 'renamed'].map(s => `<span><i class="sw" style="background:var(--s-${s})"></i>${s[0].toUpperCase()}${s.slice(1)}</span>`).join('')}<span class="muted">Size: lines changed</span></div></div>
      ${outside(c.facts)}
    </section>`;
}
/** Lines a reviewer can skip: lockfiles, generated files, binaries, docs, pure renames and whitespace-only edits. */
export function routine(review) {
    const byPath = new Map(review.files.map(f => [f.path, f]));
    const reasons = new Map();
    let total = 0;
    let skip = 0;
    const add = (label, n) => { if (n) {
        reasons.set(label, (reasons.get(label) ?? 0) + n);
        skip += n;
    } };
    for (const d of review.diff) {
        const f = byPath.get(d.path);
        const n = d.additions + d.deletions;
        total += n;
        if (!f)
            continue;
        if (f.role === 'Lockfile') {
            add('lockfiles', n);
            continue;
        }
        if (f.role === 'Generated') {
            add('generated files', n);
            continue;
        }
        if (f.role === 'Binary') {
            add('binary files', n);
            continue;
        }
        if (f.module === 'Docs' || (f.role === 'Docs' && f.module !== 'AI agent setup')) {
            add('docs', n);
            continue;
        }
        if (d.status === 'renamed' && n === 0) {
            add('renames', 0);
            continue;
        }
        // Hunks whose removed and added lines differ only in whitespace.
        let ws = 0;
        for (const h of d.hunks) {
            const del = h.lines.filter(l => l.type === 'del').map(l => l.content.replace(/\s+/g, '')).sort();
            const ins = h.lines.filter(l => l.type === 'add').map(l => l.content.replace(/\s+/g, '')).sort();
            if (del.length && del.length === ins.length && del.every((c, i) => c === ins[i]))
                ws += del.length * 2;
        }
        add('formatting', ws);
    }
    return { total, skip, reasons: [...reasons].map(([label, lines]) => ({ label, lines })).sort((a, b) => b.lines - a.lines) };
}
const CALL = {
    approve: { verb: 'Merge', cls: 'ok', icon: '<path d="M5 10.5l3.2 3.2L15 6.8"/>' },
    comment: { verb: 'Check these first', cls: 'warn', icon: '<path d="M10 5.5v5.5M10 14.2v.3"/>' },
    'request-changes': { verb: 'Send back', cls: 'bad', icon: '<path d="M6.5 6.5l7 7M13.5 6.5l-7 7"/>' }
};
/** The first thing on the page: what to do with this PR, how much of it to read, and where. */
function decideCard(review, diffByPath) {
    const c = CALL[review.verdict];
    const r = routine(review);
    const read = Math.max(0, r.total - r.skip);
    const readPct = r.total ? Math.round((read / r.total) * 100) : 0;
    const sevRank = (f) => SEVERITIES.indexOf(f.severity);
    const look = [...review.findings].filter(f => f.severity !== 'nit').sort((a, b) => sevRank(a) - sevRank(b)).slice(0, 3);
    const more = review.findings.length - look.length;
    const first = (t) => (t.match(/^.+?[.!?](\s|$)/)?.[0] ?? t).trim();
    const looks = look.map(f => {
        const file = f.file ? diffByPath.get(f.file) : undefined;
        const ex = file && f.line ? excerpt(file, f.line, 2) : [];
        return `<li class="d-item">
      <div class="d-ih">${sevIcon(f.severity, 16)}<b>${esc(f.title)}</b>${f.file ? `<a class="loc" href="#${f.id}" data-open-tab="tab-findings" data-target="${f.id}">${esc(base(f.file))}${f.line ? `:${f.line}` : ''}</a>` : ''}</div>
      <p>${esc(first(f.detail))}</p>
      ${ex.length ? diffLines(ex, f.line) : ''}
    </li>`;
    }).join('');
    const plural2 = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
    return `<section class="decide d-${c.cls}" aria-label="Decision">
    <div class="d-top">
      <div class="d-call"><svg class="d-icon" viewBox="0 0 20 20" width="40" height="40" aria-hidden="true"><circle cx="10" cy="10" r="9"/>${c.icon}</svg><div><div class="d-verb">${c.verb}</div><div class="d-sub">Risk ${review.risk} · ${look.length ? plural2(look.length, 'place') + ' to check' : 'nothing flagged'}</div></div></div>
      <p class="d-head">${esc(review.headline)}</p>
    </div>
    <div class="d-read">
      <div class="d-bar" role="img" aria-label="${readPct}% of changed lines need reading"><i class="need" style="width:${readPct}%"></i><i class="skip" style="width:${100 - readPct}%"></i></div>
      <div class="d-legend"><span><i class="sw need"></i><b>${read}</b> line${read === 1 ? '' : 's'} to read</span>${r.skip ? `<span><i class="sw skip"></i><b>${r.skip}</b> routine: ${r.reasons.map(x => esc(x.label)).join(', ')}</span>` : ''}<span class="muted">${plural2(review.diff.length, 'file')}</span></div>
    </div>
    ${look.length ? `<ol class="d-list">${looks}</ol>${more > 0 ? `<a class="d-more" href="#tab-findings" data-open-tab="tab-findings">${plural2(more, 'more finding')} in Review</a>` : ''}` : ''}
  </section>`;
}
/** Renders a review as one self-contained HTML page. */
export function renderHtml(review, opts = {}) {
    const diffByPath = new Map(review.diff.map(d => [d.path, d]));
    const counts = Object.fromEntries(SEVERITIES.map(s => [s, review.findings.filter(f => f.severity === s).length]));
    const v = VERDICT[review.verdict];
    const add = review.diff.reduce((s, f) => s + f.additions, 0);
    const del = review.diff.reduce((s, f) => s + f.deletions, 0);
    const reqCounts = { met: 0, partial: 0, missing: 0, unclear: 0 };
    for (const r of review.requirements)
        reqCounts[r.status]++;
    const reqTotal = review.requirements.length;
    const top = review.findings.filter(f => f.severity === 'blocker' || f.severity === 'major').slice(0, 3);
    const topList = top.length ? top : review.findings.slice(0, 3);
    const maxChurn = Math.max(1, ...review.files.map(f => f.additions + f.deletions));
    const m = review.meta;
    const testIssues = review.findings.filter(f => f.category === 'tests').length;
    const testState = review.tests.changed ? (testIssues ? 'partial' : 'met') : add > 40 ? 'missing' : 'unclear';
    const signals = `<div class="signals">
    <a class="signal" href="#tab-findings" data-open-tab="tab-findings"><div class="sig-label">Findings</div><div class="sig-sevs">${SEVERITIES.map(s => `<span class="sig-sev${counts[s] ? '' : ' zero'}" title="${SEV_LABEL[s]}">${sevIcon(s, 16)}<b>${counts[s]}</b></span>`).join('')}</div></a>
    <a class="signal" href="#tab-req" data-open-tab="tab-req"><div class="sig-label">Requirements</div>${reqTotal ? `<div class="sig-row">${ring([{ value: reqCounts.met, cls: 'c-met' }, { value: reqCounts.partial, cls: 'c-partial' }, { value: reqCounts.missing, cls: 'c-missing' }, { value: reqCounts.unclear, cls: 'c-unclear' }], `${reqCounts.met}/${reqTotal}`, 46)}<span class="sig-note">${reqCounts.missing ? `${reqCounts.missing} missing` : reqCounts.partial ? `${reqCounts.partial} partly met` : 'all met'}</span></div>` : '<div class="sig-note muted">None linked</div>'}</a>
    <a class="signal" href="#tab-files" data-open-tab="tab-files"><div class="sig-label">Tests</div><div class="sig-row">${statusIcon(testState, 26)}<span class="sig-note">${review.tests.changed ? (testIssues ? `Tests changed, ${testIssues} issue${testIssues > 1 ? 's' : ''}` : 'Tests changed') : 'No test changes'}</span></div></a>
    <a class="signal" href="#tab-files" data-open-tab="tab-files"><div class="sig-label">Size</div><div class="sig-row"><span class="big">${review.diff.length}</span><span class="sig-note">file${review.diff.length === 1 ? '' : 's'}<br><span class="plus">+${add}</span> <span class="minus">−${del}</span></span></div></a>
  </div>`;
    const findingsTab = review.findings.length
        ? `<div class="filters" role="toolbar" aria-label="Filter findings">
        <button class="chip on" data-filter-sev="" data-filter-cat="">All <b>${review.findings.length}</b></button>
        ${SEVERITIES.filter(s => counts[s]).map(s => `<button class="chip" data-filter-sev="${s}" data-filter-cat="">${sevIcon(s, 12)} ${SEV_LABEL[s]} <b>${counts[s]}</b></button>`).join('')}
        <span class="sp"></span><button class="chip ghost" data-expand="findings">Expand all</button>
      </div>
      <div class="list" id="findings-list">${review.findings.map(f => findingRow(f, diffByPath)).join('')}</div>`
        : '<p class="empty">No findings.</p>';
    const filesTab = `<div class="list">${review.files.map(f => {
        const fs = review.findings.filter(x => x.file === f.path);
        const d = diffByPath.get(f.path);
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
    </details>`;
    }).join('')}</div>`;
    const byItem = new Map();
    for (const r of review.requirements)
        byItem.set(r.itemId, [...(byItem.get(r.itemId) ?? []), r]);
    const reqTab = review.context.length
        ? review.context.map(c => {
            const checks = byItem.get(c.id) ?? [];
            return `<section class="req" id="req-${esc(c.id)}">
        <header><span class="src src-${esc(c.source.toLowerCase().replace(/\s+/g, '-'))}">${esc(c.source)}</span><span class="tag">${esc(c.kind)}</span>${c.status ? `<span class="tag">${esc(c.status)}</span>` : ''}<h4>${c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.id)} ${esc(c.title)}</a>` : `${esc(c.id)} ${esc(c.title)}`}</h4></header>
        ${checks.length ? `<div class="list">${checks.map(r => `<details class="crit"><summary>${statusIcon(r.status)}<span>${esc(r.criterion)}</span><span class="tag st-tag-${r.status}">${STATUS_LABEL[r.status]}</span></summary><div class="f-body">${r.evidence ? `<p>${esc(r.evidence)}</p>` : ''}${r.files?.length ? `<p class="muted">${r.files.map(p => `<a href="#${fileId(p)}" data-open-file="${esc(p)}">${esc(p)}</a>`).join(', ')}</p>` : ''}</div></details>`).join('')}</div>` : '<p class="muted">No acceptance criteria found.</p>'}
        ${c.summary || c.reproSteps ? `<details class="raw"><summary>Original text</summary>${c.summary ? `<p>${esc(c.summary)}</p>` : ''}${c.reproSteps ? `<p><b>Repro steps</b><br>${esc(c.reproSteps)}</p>` : ''}</details>` : ''}
      </section>`;
        }).join('')
        : `<p class="empty">No requirements or bugs were linked. Mention a work item in the PR (AB#123, a Notion link, #12 or PROJ-123), or pass them in with --context.</p>`;
    const aboutTab = `<dl class="about">
    ${m.model ? `<dt>Model</dt><dd>${esc(m.provider)} · ${esc(m.model)}</dd>` : '<dt>Model</dt><dd>None (static checks only)</dd>'}
    <dt>Plugins</dt><dd>${esc(m.plugins.join(', ') || 'none')}</dd>
    <dt>Connectors</dt><dd>${esc(m.connectors.join(', ') || 'none')}</dd>
    <dt>Generated</dt><dd>${esc(new Date(m.generatedAt).toUTCString())}${m.durationMs ? ` in ${(m.durationMs / 1000).toFixed(1)}s` : ''}</dd>
    ${review.warnings.length ? `<dt>Notes</dt><dd><ul>${review.warnings.map(w => `<li>${esc(w)}</li>`).join('')}</ul></dd>` : ''}
  </dl>`;
    const title = `Review: ${m.title}`;
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

  ${decideCard(review, diffByPath)}
  <div class="parts">
    <input type="radio" name="part" id="part-change" checked><label for="part-change"><span class="p-t">The change</span><span class="p-s">What it does, area by area</span></label>
    <input type="radio" name="part" id="part-review"><label for="part-review" class="v-${v.cls}"><span class="p-t">Review <span class="pill">${v.label}</span></span><span class="p-s">Risk, issues and requirements</span></label>
    <div class="part" data-part="part-change">
    ${changePart(review, diffByPath, add, del)}
    </div>
    <div class="part" data-part="part-review">
  ${signals}
  ${areas(review, diffByPath)}


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
    </div>
  </div>
  <footer>Made with smart-code-review</footer>
</main>
${opts.embedData === false ? '' : `<script type="application/json" id="review-data">${JSON.stringify({ ...review, diff: undefined }).replace(/</g, '\\u003c')}</script>`}
<script>${SCRIPT}</script>
</body>
</html>`;
}
