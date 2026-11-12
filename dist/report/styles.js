export const CSS = `
:root{
  --bg:#f7f7f8;--panel:#fff;--panel2:#f1f1f3;--fg:#1b1b1f;--muted:#6b6b76;--line:#e3e3e8;--accent:#7c3aed;
  --blocker:#e5484d;--major:#f76b15;--minor:#e2a400;--nit:#8b8d98;
  --met:#30a46c;--partial:#e2a400;--missing:#e5484d;--unclear:#b4b4bd;
  --add-bg:#e6f6ec;--add-fg:#18794e;--del-bg:#fdecec;--del-fg:#c62a2f;--hit:#fff4c2;
  --radius:12px;--mono:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color-scheme:light;
}
@media (prefers-color-scheme:dark){:root:not([data-theme=light]){
  --bg:#111113;--panel:#19191c;--panel2:#212126;--fg:#ececf0;--muted:#9898a3;--line:#2c2c33;--accent:#a78bfa;
  --add-bg:#11291c;--add-fg:#4cc38a;--del-bg:#301417;--del-fg:#ff8589;--hit:#3a3214;--unclear:#5b5b66;color-scheme:dark}}
:root[data-theme=dark]{
  --bg:#111113;--panel:#19191c;--panel2:#212126;--fg:#ececf0;--muted:#9898a3;--line:#2c2c33;--accent:#a78bfa;
  --add-bg:#11291c;--add-fg:#4cc38a;--del-bg:#301417;--del-fg:#ff8589;--hit:#3a3214;--unclear:#5b5b66;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:1120px;margin:0 auto;padding:24px 16px 48px}
a{color:inherit}
code{font-family:var(--mono);font-size:.85em}
.muted{color:var(--muted)}
h3{margin:0 0 12px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600}
.top{position:relative;padding-right:44px;margin-bottom:16px}
.top h1{margin:4px 0 0;font-size:20px;line-height:1.3;font-weight:600}
.top h1 a{text-decoration:none}.top h1 a:hover{text-decoration:underline}
.crumbs{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--muted);font-size:13px}
.branch{font-family:var(--mono);font-size:12px}
.theme{position:absolute;right:0;top:0;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);background:var(--panel);color:var(--fg);cursor:pointer;display:grid;place-items:center}

.verdict{display:flex;gap:24px;align-items:center;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:20px 24px;position:relative;overflow:hidden}
.verdict::before{content:"";position:absolute;inset:0 auto 0 0;width:5px;background:var(--vc)}
.v-ok{--vc:var(--met)}.v-warn{--vc:var(--minor)}.v-bad{--vc:var(--blocker)}
.g{flex:none;width:150px;text-align:center}
.gauge{width:150px;display:block}
.gauge-track{fill:none;stroke:var(--panel2);stroke-width:12;stroke-linecap:round}
.gauge-val{fill:none;stroke-width:12;stroke-linecap:round}
.gauge-num{font:700 30px system-ui,sans-serif;text-anchor:middle;fill:var(--fg)}
.gauge-label{font-size:12px;color:var(--muted);margin-top:-2px}
.pill{display:inline-block;padding:3px 12px;border-radius:99px;font-size:13px;font-weight:600;background:color-mix(in srgb,var(--vc) 16%,transparent);color:var(--vc)}
.v-warn .pill{color:color-mix(in srgb,var(--vc) 70%,var(--fg))}
.headline{font-size:22px;line-height:1.35;margin:8px 0 0;font-weight:600;text-wrap:pretty}
.why{margin-top:10px}
.why summary{cursor:pointer;color:var(--muted);font-size:13px;width:max-content}
.why ul{margin:8px 0 0;padding-left:20px}
.why li{margin:2px 0}

.signals{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:12px 0}
.signal{display:block;text-decoration:none;background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:12px 14px;min-height:96px;transition:border-color .15s}
.signal:hover{border-color:var(--accent)}
.sig-label{font-size:12px;color:var(--muted);margin-bottom:8px}
.sig-sevs{display:flex;gap:14px;flex-wrap:wrap}
.sig-sev{display:inline-flex;align-items:center;gap:5px}.sig-sev b{font-size:20px}
.sig-sev.zero{opacity:.35}
.sig-row{display:flex;align-items:center;gap:10px}
.sig-note{font-size:13px;color:var(--muted);line-height:1.35}
.big{font-size:30px;font-weight:700;line-height:1}
.plus{color:var(--add-fg)}.minus{color:var(--del-fg)}

.overview{display:grid;grid-template-columns:2fr 1fr;gap:12px;margin-bottom:12px}
.overview.two{grid-template-columns:1fr 1fr;margin-bottom:24px}
.overview.two:empty{display:none}
.panel{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;min-width:0}
.treemap{position:relative;width:100%;aspect-ratio:10/3;min-height:180px;border-radius:8px;overflow:hidden}
.tile{position:absolute;border:2px solid var(--panel);border-radius:6px;background:color-mix(in srgb,var(--rc) 24%,var(--panel));color:var(--fg);text-align:left;padding:6px 8px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column;gap:1px;font:inherit;box-shadow:inset 0 3px 0 var(--rc)}
.tile:hover,.tile:focus-visible{background:color-mix(in srgb,var(--rc) 40%,var(--panel));outline:none}
.t-name{font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.t-dir{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%}
.t-marks{display:flex;gap:2px;margin-top:auto}
.tile.small{padding:4px 5px}.tile.small .t-name{font-size:11px}
.legend{display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;font-size:12px;color:var(--muted);margin-top:8px}
.legend span{display:inline-flex;align-items:center;gap:5px}
.scale{gap:0!important}.scale i{width:18px;height:8px;display:inline-block}
.scale i:first-child{border-radius:4px 0 0 4px}.scale i:last-child{border-radius:0 4px 4px 0}

.first{list-style:none;margin:0;padding:0;display:grid;gap:6px}
.first a{display:flex;gap:10px;align-items:flex-start;text-decoration:none;padding:8px 10px;border-radius:8px;background:var(--panel2)}
.first a:hover{outline:1px solid var(--accent)}
.first svg{flex:none;margin-top:2px}
.first b{display:block;font-weight:600;font-size:14px;line-height:1.3}
.first small{color:var(--muted);font-family:var(--mono);font-size:11px}

.req-strip{display:grid;gap:6px}
.req-row{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;text-decoration:none;padding:6px 8px;border-radius:8px;background:var(--panel2)}
.req-row:hover{outline:1px solid var(--accent)}
.req-name{font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.cells{grid-column:1/-1;display:flex;gap:3px;flex-wrap:wrap}
.cell{display:inline-block;width:16px;height:16px;border-radius:4px}
.c-met{background:var(--met);stroke:var(--met)}.c-partial{background:var(--partial);stroke:var(--partial)}.c-missing{background:var(--missing);stroke:var(--missing)}.c-unclear{background:var(--unclear);stroke:var(--unclear)}
.src{font-size:11px;font-weight:600;padding:1px 7px;border-radius:5px;background:var(--panel);border:1px solid var(--line);white-space:nowrap}
.src-azure-devops{color:#0078d4}.src-notion{color:var(--fg)}.src-github{color:var(--fg)}.src-jira{color:#2684ff}

.heat{border-collapse:collapse;width:100%;font-size:13px}
.heat tbody th{width:38%}
.heat th{font-weight:500;color:var(--muted);text-align:left;padding:3px 4px}
.heat thead th{text-align:center}
.heat td{text-align:center;padding:3px;height:34px}
.dot{border-radius:50%;border:0;color:#fff;font:700 10px system-ui;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;padding:0}
.sevbg-blocker{background:var(--blocker)}.sevbg-major{background:var(--major)}.sevbg-minor{background:var(--minor)}.sevbg-nit{background:var(--nit)}

.sev{flex:none;vertical-align:-2px}
.sev-blocker{fill:var(--blocker)}.sev-major{fill:var(--major)}.sev-minor{fill:var(--minor)}.sev-nit{fill:var(--nit)}
.st{flex:none}.st circle{fill:none;stroke-width:1.6}.st .mark{fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
.st-met circle{fill:var(--met);stroke:var(--met)}.st-met .mark{stroke:#fff}
.st-missing circle{fill:var(--missing);stroke:var(--missing)}.st-missing .mark{stroke:#fff}
.st-partial circle{stroke:var(--partial)}.st-partial .half{fill:var(--partial)}
.st-unclear circle{stroke:var(--unclear)}.st-unclear .mark{stroke:var(--muted)}
.ring-track{fill:none;stroke:var(--panel2);stroke-width:7}
.ring-seg{fill:none;stroke-width:7;transform:rotate(-90deg);transform-origin:28px 28px}
.ring-num{font:700 12px system-ui;text-anchor:middle;fill:var(--fg)}

.tabs{display:flex;flex-wrap:wrap;gap:0 4px}
.tabs>input{position:absolute;opacity:0;pointer-events:none}
.tabs>label{padding:8px 14px;border-radius:8px 8px 0 0;cursor:pointer;color:var(--muted);font-weight:500;border-bottom:2px solid transparent}
.tabs>label b{font-weight:600;font-size:12px;background:var(--panel2);border-radius:99px;padding:1px 7px;margin-left:4px}
.tabs>input:checked+label{color:var(--fg);border-bottom-color:var(--accent)}
.tabs>input:focus-visible+label{outline:2px solid var(--accent)}
.tab-body{display:none;order:9;width:100%;border-top:1px solid var(--line);padding-top:14px}
#tab-findings:checked~[data-for=tab-findings],#tab-files:checked~[data-for=tab-files],#tab-req:checked~[data-for=tab-req],#tab-about:checked~[data-for=tab-about]{display:block}

.filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;align-items:center}
.filters .sp{flex:1}
.chip{display:inline-flex;align-items:center;gap:5px;border:1px solid var(--line);background:var(--panel);color:var(--fg);border-radius:99px;padding:4px 11px;font:inherit;font-size:13px;cursor:pointer}
.chip b{font-weight:600}
.chip.on{border-color:var(--accent);background:color-mix(in srgb,var(--accent) 12%,var(--panel))}
.chip.ghost{color:var(--muted)}

.list{display:grid;gap:6px}
.list.nested{margin-top:8px}
details>summary{list-style:none;cursor:pointer}
details>summary::-webkit-details-marker{display:none}
.finding,.file,.crit{background:var(--panel);border:1px solid var(--line);border-radius:10px}
.finding[open],.file[open]{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.finding>summary,.file>summary,.crit>summary{display:flex;align-items:center;gap:10px;padding:10px 12px;min-width:0}
.finding>summary::before,.file>summary::before,.crit>summary::before{content:"";flex:none;width:7px;height:7px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .15s;margin-right:-2px}
.finding[open]>summary::before,.file[open]>summary::before,.crit[open]>summary::before{transform:rotate(45deg)}
.f-title{font-weight:600;flex:1;min-width:0}
.loc{font-family:var(--mono);font-size:12px;color:var(--muted);white-space:nowrap}
.tag{font-size:11px;padding:1px 8px;border-radius:99px;background:var(--panel2);color:var(--muted);white-space:nowrap}
.f-body{padding:0 14px 12px 32px}
.f-body p{margin:0 0 10px}
.f-meta{font-size:12px;color:var(--muted);margin-top:8px}
.f-meta a{color:var(--muted)}
.finding.hide{display:none}
.code{font-family:var(--mono);font-size:12.5px;line-height:1.55;border:1px solid var(--line);border-radius:8px;overflow:auto;background:var(--panel)}
.ln{display:flex;white-space:pre;min-width:max-content}
.ln .no{flex:none;width:44px;text-align:right;padding-right:8px;color:var(--muted);user-select:none;opacity:.7}
.ln .mk{flex:none;width:16px;text-align:center;user-select:none;color:var(--muted)}
.ln .tx{padding-right:12px}
.ln-add{background:var(--add-bg)}.ln-add .mk{color:var(--add-fg)}
.ln-del{background:var(--del-bg)}.ln-del .mk{color:var(--del-fg)}
.ln-hit{background:var(--hit);box-shadow:inset 3px 0 0 var(--minor)}
.fix{margin-top:10px}
.fix-label{font-size:12px;color:var(--muted);margin-bottom:4px}
.fix .ln .mk{width:22px}

.file .risk-pill{flex:none;min-width:34px;text-align:center;font-size:12px;font-weight:700;border-radius:6px;padding:1px 6px;background:color-mix(in srgb,var(--rc) 22%,var(--panel));box-shadow:inset 0 -2px 0 var(--rc)}
.lang{flex:none;width:10px;height:10px;border-radius:50%;background:var(--lc)}
.path{flex:1;min-width:0;font-family:var(--mono);font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.path .dir{color:var(--muted)}
.role{font-size:12px;color:var(--muted);white-space:nowrap}
.f-sevs{display:flex;gap:2px}
.churn{flex:none;display:flex;width:92px;height:8px;border-radius:4px;overflow:hidden;background:var(--panel2)}
.churn .a{background:var(--add-fg)}.churn .d{background:var(--del-fg)}
.purpose{color:var(--muted)}
.raw{margin-top:10px}
.raw>summary{font-size:13px;color:var(--muted);padding:4px 0}
.raw>summary::before{content:"▸ "}.raw[open]>summary::before{content:"▾ "}
.hunk-h{font-family:var(--mono);font-size:12px;color:var(--muted);padding:6px 0 3px}

.req{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:14px 16px;margin-bottom:12px}
.req header{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin-bottom:10px}
.req h4{flex-basis:100%;margin:2px 0 0;font-size:16px}
.req h4 a{text-decoration:none}.req h4 a:hover{text-decoration:underline}
.crit{background:var(--panel2);border-color:transparent}
.crit>summary span:not(.tag){flex:1}
.st-tag-met{color:var(--met)}.st-tag-missing{color:var(--missing)}.st-tag-partial{color:color-mix(in srgb,var(--partial) 70%,var(--fg))}

.about{display:grid;grid-template-columns:max-content 1fr;gap:6px 18px;margin:0}
.about dt{color:var(--muted)}.about dd{margin:0}.about ul{margin:0;padding-left:18px}
.empty{color:var(--muted);padding:20px 0}
footer{margin-top:32px;color:var(--muted);font-size:12px;text-align:center}
.flash{animation:flash 1.2s ease}
@keyframes flash{0%,40%{box-shadow:0 0 0 3px var(--accent)}100%{box-shadow:0 0 0 0 transparent}}

@media (max-width:820px){
  .overview,.overview.two{grid-template-columns:1fr}
  .signals{grid-template-columns:repeat(2,1fr)}
  .verdict{flex-direction:column;align-items:flex-start;gap:8px;padding:16px}
  .g{width:120px}.gauge{width:120px}
  .headline{font-size:19px}
  .role,.churn{display:none}
  .treemap{aspect-ratio:4/3}
  .f-body{padding-left:14px}
  .finding>summary{flex-wrap:wrap;row-gap:4px}
  .finding .f-title{flex-basis:calc(100% - 50px)}
  .finding>summary .tag{margin-left:35px}
  .tabs>label{padding:8px 10px}
}
`;
