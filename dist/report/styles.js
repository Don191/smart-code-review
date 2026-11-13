export const CSS = `
:root{
  --bg:#f7f7f8;--panel:#fff;--panel2:#f1f1f3;--fg:#1b1b1f;--muted:#6b6b76;--line:#e3e3e8;--accent:#7c3aed;
  --blocker:#e5484d;--major:#f76b15;--minor:#e2a400;--nit:#8b8d98;
  --met:#30a46c;--partial:#e2a400;--missing:#e5484d;--unclear:#b4b4bd;
  --add-bg:#e6f6ec;--add-fg:#18794e;--del-bg:#fdecec;--del-fg:#c62a2f;--hit:#fff4c2;
  --s-added:#30a46c;--s-changed:#3e63dd;--s-removed:#e5484d;--s-renamed:#8b8d98;
  --k-frontend:#3e63dd;--k-backend:#12a594;--k-shared:#8e4ec6;--k-tests:#e2a400;--k-docs:#8b8d98;--k-config:#d6409f;
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
.keys{margin:10px 0 0;padding:0;list-style:none;display:grid;gap:4px}
.keys li{position:relative;padding-left:16px;color:var(--muted)}
.keys li::before{content:"";position:absolute;left:2px;top:.62em;width:6px;height:6px;border-radius:2px;background:var(--accent)}
.areas{margin:12px 0 0}
.areas h3{margin:20px 0 10px}
.strip{display:flex;gap:3px;height:30px;margin-bottom:10px}
.seg{border-radius:6px;background:color-mix(in srgb,var(--rc) 30%,var(--panel));box-shadow:inset 0 -3px 0 var(--rc);text-decoration:none;display:flex;align-items:center;padding:0 8px;min-width:0;overflow:hidden}
.seg span{font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.seg:hover{outline:1px solid var(--accent)}
.modules{display:grid;gap:8px}
.module{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius)}
.module[open]{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.module>summary{display:flex;align-items:center;gap:14px;padding:14px 16px}
.module>summary::before{content:"";flex:none;width:7px;height:7px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .15s;margin-right:-4px}
.module[open]>summary::before{transform:rotate(45deg)}
.kind{flex:none;fill:none;stroke:var(--accent);stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round}
.m-main{flex:1;min-width:0;display:flex;flex-direction:column;gap:2px}
.m-name{font-weight:650;font-size:16px}
.m-root{font-family:var(--mono);font-size:11px;font-weight:400;color:var(--muted)}
.m-sum{color:var(--muted);font-size:14px;line-height:1.35}
.impact{flex:none;font-size:12px;font-weight:600;padding:2px 9px;border-radius:99px;white-space:nowrap}
.imp-high{background:color-mix(in srgb,var(--blocker) 15%,transparent);color:var(--blocker)}
.imp-medium{background:color-mix(in srgb,var(--minor) 18%,transparent);color:color-mix(in srgb,var(--minor) 70%,var(--fg))}
.imp-low{background:var(--panel2);color:var(--muted)}
.m-marks{flex:none;display:flex;gap:8px;font-size:13px;font-weight:600;min-width:110px;justify-content:flex-end}
.m-marks .muted{font-weight:400;font-size:12px}
.mk-n{display:inline-flex;align-items:center;gap:3px}
.m-size{flex:none;font-size:12px;color:var(--muted);text-align:right;min-width:70px;line-height:1.35}
.m-body{padding:0 16px 14px 50px}
.m-files{display:grid;gap:2px;margin-bottom:8px}
.m-file{display:flex;gap:10px;align-items:center;text-decoration:none;padding:5px 8px;border-radius:7px}
.m-file:hover{background:var(--panel2)}
.m-purpose{font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:45%}
.risk-pill{flex:none;min-width:34px;text-align:center;font-size:12px;font-weight:700;border-radius:6px;padding:1px 6px;background:color-mix(in srgb,var(--rc) 22%,var(--panel));box-shadow:inset 0 -2px 0 var(--rc)}
h2.level{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);font-weight:600;margin:32px 0 10px;display:flex;align-items:center;gap:10px}
h2.level::after{content:"";flex:1;height:1px;background:var(--line)}
.group{position:absolute;border-radius:8px;background:var(--panel2);border:2px solid var(--panel)}
.g-name{position:absolute;left:8px;top:2px;font-size:11px;font-weight:600;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:calc(100% - 12px)}
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
.overview.one{grid-template-columns:1fr}
.overview.one .treemap{aspect-ratio:10/2.4}
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

.parts{display:flex;flex-wrap:wrap;gap:10px;margin-top:4px}
.parts>input{position:absolute;opacity:0;pointer-events:none}
.parts>label{flex:1 1 240px;display:flex;flex-direction:column;gap:2px;padding:12px 16px;border:1px solid var(--line);border-radius:var(--radius);background:var(--panel);cursor:pointer;position:relative}
.parts>label:hover{border-color:color-mix(in srgb,var(--accent) 45%,var(--line))}
.parts>input:checked+label{border-color:var(--accent);box-shadow:inset 0 -3px 0 var(--accent)}
.parts>input:focus-visible+label{outline:2px solid var(--accent)}
.p-t{font-weight:650;font-size:17px;display:flex;align-items:center;gap:10px}
.p-t .pill{font-size:12px;padding:1px 10px}
.p-s{font-size:13px;color:var(--muted)}
.part{display:none;order:9;width:100%;padding-top:8px}
#part-change:checked~[data-part=part-change],#part-review:checked~[data-part=part-review]{display:block}
.part>.verdict{margin-top:6px}

.hero{background:var(--panel);border:1px solid var(--line);border-radius:var(--radius);padding:20px 24px;margin-top:6px}
.c-sum{font-size:21px;line-height:1.4;margin:0;font-weight:550;text-wrap:pretty}
.hero .keys{margin-top:12px}
.facts{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}
.chip-f{display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:5px 11px;border-radius:99px;background:var(--panel2);white-space:nowrap}
.chip-f b{font-size:14px}
.pips{display:inline-flex;gap:3px}.pips i{width:8px;height:14px;border-radius:2px;background:var(--line)}.pips i.on{background:var(--accent)}

.act{display:inline-block;font-size:11px;font-weight:600;padding:1px 8px;border-radius:99px;white-space:nowrap}
.act-added{background:color-mix(in srgb,var(--s-added) 16%,transparent);color:var(--add-fg)}
.act-changed{background:color-mix(in srgb,var(--s-changed) 16%,transparent);color:color-mix(in srgb,var(--s-changed) 75%,var(--fg))}
.act-removed{background:color-mix(in srgb,var(--s-removed) 16%,transparent);color:var(--del-fg)}
.chip-f .act{font-size:12px}
.st-badge{flex:none;font-size:11px;font-weight:600;padding:1px 0;width:62px;text-align:center;border-radius:6px;background:color-mix(in srgb,var(--sc) 15%,transparent);color:color-mix(in srgb,var(--sc) 75%,var(--fg))}
.st-added{--sc:var(--s-added)}.st-changed{--sc:var(--s-changed)}.st-removed{--sc:var(--s-removed)}.st-renamed{--sc:var(--s-renamed)}

.flow-panel{margin-top:12px}
.flow-wrap{overflow-x:auto}
.flow{width:100%;min-width:640px;display:block}
.fl-life{stroke:var(--line);stroke-width:1.5;stroke-dasharray:4 4}
.fl-box{fill:var(--panel2);stroke:var(--line)}
.fl-name{font:600 14px system-ui,sans-serif;text-anchor:middle;fill:var(--fg)}
.fl-arrow{stroke:var(--accent);stroke-width:1.8;fill:none}
.fl-tip{fill:var(--accent)}
.fl-num{fill:var(--accent)}
.fl-numt{font:700 11px system-ui,sans-serif;text-anchor:middle;fill:#fff}
.fl-label{font:13px system-ui,sans-serif;text-anchor:middle;fill:var(--fg)}

.seg.k-frontend{--rc:var(--k-frontend)}.seg.k-backend{--rc:var(--k-backend)}.seg.k-shared{--rc:var(--k-shared)}.seg.k-tests{--rc:var(--k-tests)}.seg.k-docs{--rc:var(--k-docs)}.seg.k-config{--rc:var(--k-config)}
.sw{display:inline-block;width:12px;height:12px;border-radius:3px}
.sw.k-frontend{background:var(--k-frontend)}.sw.k-backend{background:var(--k-backend)}.sw.k-shared{background:var(--k-shared)}.sw.k-tests{background:var(--k-tests)}.sw.k-docs{background:var(--k-docs)}.sw.k-config{background:var(--k-config)}
.legend.kinds{margin:-2px 0 10px}
.m-acts{flex:none;display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end;max-width:240px}
.m-body .keys{margin:0 0 12px}
.cfile{background:var(--panel2);border:1px solid transparent;border-radius:10px}
.cfile[open]{border-color:color-mix(in srgb,var(--accent) 40%,var(--line));background:var(--panel)}
.cfile>summary{display:flex;align-items:center;gap:10px;padding:8px 12px;min-width:0}
.cfile>summary::before,.sym>summary::before{content:"";flex:none;width:7px;height:7px;border-right:1.5px solid var(--muted);border-bottom:1.5px solid var(--muted);transform:rotate(-45deg);transition:transform .15s;margin-right:-2px}
.cfile[open]>summary::before,.sym[open]>summary::before{transform:rotate(45deg)}
.cfile .path{flex:0 1 auto}
.cfile .m-purpose{flex:1;max-width:none}
.sym-n{flex:none;display:flex;gap:3px}
.dotn{font-style:normal;font-size:11px;font-weight:700;min-width:20px;height:20px;border-radius:10px;display:inline-grid;place-items:center;padding:0 5px}
.cfile .m-size{min-width:80px}
.syms{display:grid;gap:4px;margin:4px 0 8px}
.sym{border-radius:8px;border:1px solid var(--line);background:var(--panel)}
.sym>summary{display:flex;align-items:center;gap:8px;padding:7px 10px;min-width:0}
.s-kind{flex:none;font-size:12px;color:var(--muted);width:62px}
.s-name{flex:none;font-weight:600;font-size:13px}
.s-desc{flex:1;min-width:0;font-size:13px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sym[open] .s-desc{white-space:normal}
.s-body{padding:0 10px 10px}
.facts-inline{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:8px}
.fact{display:inline-flex;align-items:center;gap:7px;text-decoration:none;font-size:13px;padding:4px 8px;border-radius:8px;background:var(--panel2);min-width:0}
.fact:hover{outline:1px solid var(--accent)}
.fact code{font-size:12.5px;font-weight:600}
.fact .loc{margin-left:auto}
.fact-groups{display:grid;gap:12px}
.fact-group{display:grid;gap:4px}
.fact-group .fact{display:flex}
.fg-name{font-size:12px;color:var(--muted)}
.overview.later{margin-top:16px}
.areas+.overview{margin-top:12px}

@media (max-width:820px){
  .overview,.overview.one{grid-template-columns:1fr}
.overview.one .treemap{aspect-ratio:10/2.4}
.overview.two{grid-template-columns:1fr}
  .signals{grid-template-columns:repeat(2,1fr)}
  .verdict{flex-direction:column;align-items:flex-start;gap:8px;padding:16px}
  .g{width:120px}.gauge{width:120px}
  .headline{font-size:19px}
  .role,.churn{display:none}
  .treemap{aspect-ratio:4/3}
  .f-body{padding-left:14px}
  .module>summary{flex-wrap:wrap;gap:8px 12px}
  .m-main{flex-basis:calc(100% - 50px)}
  .impact{margin-left:34px}
  .m-marks{min-width:0;justify-content:flex-start}
  .m-body{padding-left:16px}
  .m-purpose{display:none}
  .finding>summary{flex-wrap:wrap;row-gap:4px}
  .finding .f-title{flex-basis:calc(100% - 50px)}
  .finding>summary .tag{margin-left:35px}
  .tabs>label{padding:8px 10px}
  .hero{padding:16px}
  .c-sum{font-size:18px}
  .cfile .m-purpose,.s-kind,.cfile .m-size{display:none}
  .m-acts{max-width:none;justify-content:flex-start;margin-left:34px}
  .s-desc{flex-basis:100%}
  .sym>summary{flex-wrap:wrap;row-gap:2px}
}
`;
