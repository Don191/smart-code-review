/** The report works without JavaScript; this adds links between sections, filters and the theme switch. */
export const SCRIPT = `
(function(){
  var $=function(s,r){return (r||document).querySelector(s)};
  var $$=function(s,r){return Array.prototype.slice.call((r||document).querySelectorAll(s))};
  var root=document.documentElement;
  try{var t=localStorage.getItem('scr-theme');if(t)root.dataset.theme=t}catch(e){}
  function openTab(id){var r=document.getElementById(id);if(r)r.checked=true}
  function reveal(el){
    if(!el)return;
    var p=el;while(p){if(p.tagName==='DETAILS')p.open=true;if(p.dataset&&p.dataset.part){var r=document.getElementById(p.dataset.part);if(r)r.checked=true}p=p.parentElement}
    el.scrollIntoView({behavior:'smooth',block:'center'});
    el.classList.remove('flash');void el.offsetWidth;el.classList.add('flash');
  }
  function filter(sev,cat){
    openTab('tab-findings');
    $$('.filters .chip[data-filter-sev]').forEach(function(c){c.classList.toggle('on',c.dataset.filterSev===sev&&c.dataset.filterCat===cat)});var td=$('[data-filter-todo]');if(td)td.classList.remove('on');
    $$('#findings-list>.finding').forEach(function(f){f.classList.toggle('hide',!!((sev&&f.dataset.sev!==sev)||(cat&&f.dataset.cat!==cat)))});
  }
  /* Feedback on findings: status and note per finding, kept in this browser and exportable as JSON or Markdown. */
  var fb=$('.feedback'),LABEL={open:'Open',agreed:'Agreed',fixed:'Fixed','wont-fix':"Won't fix",discuss:'Discuss'};
  var KEY=fb?'scr-notes:'+fb.dataset.key:'';
  function stored(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch(e){return{}}}
  function current(){
    var out={};$$('.anno').forEach(function(a){
      var f=a.closest('.finding'),st=f.dataset.status,note=$('.anno-note',a).value.trim();
      if(st!=='open'||note)out[a.dataset.anno]={findingId:a.dataset.anno,status:st,note:note||undefined,by:a.dataset.by||undefined,at:a.dataset.at||new Date().toISOString()};
    });return out;
  }
  function save(){try{localStorage.setItem(KEY,JSON.stringify(current()))}catch(e){}}
  function counts(){
    if(!fb)return;var n={open:0,agreed:0,fixed:0,'wont-fix':0,discuss:0};
    $$('#findings-list>.finding').forEach(function(f){n[f.dataset.status]++});
    $$('.fb-c',fb).forEach(function(c){$('b',c).textContent=n[c.dataset.fb]});
    var t=$('.todo-n');if(t)t.textContent=n.open+n.discuss;
  }
  function stamp(a){
    var name=$('.fb-name').value.trim();a.dataset.by=name;a.dataset.at=new Date().toISOString();
    $('.anno-by',a).textContent=(name?name+' · ':'')+a.dataset.at.slice(0,16).replace('T',' ');
  }
  function noteMark(f,has){
    var h=$('.anno-has',f);
    if(has&&!h){h=document.createElement('span');h.className='anno-has';h.title='Has a note';h.textContent='✎';$('summary',f).insertBefore(h,$('.tag',f))}
    if(h)h.hidden=!has;
  }
  function setStatus(a,st,quiet){
    var id=a.dataset.anno;
    $$('[data-anno-status]',a).forEach(function(b){b.classList.toggle('on',b.dataset.annoStatus===st)});
    /* The same finding also shows under its area and its file: keep every copy in step. */
    $$('.finding').filter(function(f){return f.id===id}).forEach(function(f){
      f.dataset.status=st;var p=$('.anno-pill',f);p.className='anno-pill st-'+st;p.textContent=st==='open'?'':LABEL[st];
    });
    if(!quiet){stamp(a);save()}counts();
  }
  function apply(list){
    Object.keys(list).forEach(function(id){
      var x=list[id],a=$$('.anno').filter(function(y){return y.dataset.anno===id})[0];if(!a)return;
      $('.anno-note',a).value=x.note||'';a.dataset.by=x.by||'';a.dataset.at=x.at||'';
      $('.anno-by',a).textContent=(x.by?x.by+' · ':'')+(x.at||'').slice(0,16).replace('T',' ');
      noteMark(a.closest('.finding'),!!x.note);setStatus(a,x.status||'open',true);
    });
  }
  function markdown(){
    var NL=String.fromCharCode(10),lines=['# Review notes: '+fb.dataset.title,''];
    $$('#findings-list>.finding').forEach(function(f){
      var a=$('.anno',f),note=$('.anno-note',a).value.trim(),loc=$('summary .loc',f);
      lines.push('- **'+LABEL[f.dataset.status]+'** · '+f.dataset.sev+' · '+$('.f-title',f).textContent+(loc?' ('+loc.textContent+')':'')+(note?NL+'  '+note.split(NL).join(NL+'  '):''));
    });return lines.join(NL)+NL;
  }
  if(fb){
    try{$('.fb-name').value=localStorage.getItem('scr-name')||''}catch(e){}
    $('.fb-name').addEventListener('change',function(){try{localStorage.setItem('scr-name',this.value.trim())}catch(e){}});
    $$('.anno').forEach(function(a){setStatus(a,a.closest('.finding').dataset.status,true)});
    apply(stored());
    $$('.anno-note').forEach(function(t){
      t.addEventListener('change',function(){var a=t.closest('.anno');stamp(a);save();noteMark(a.closest('.finding'),!!t.value.trim())});
    });
    $('[data-fb-import]').addEventListener('change',function(){
      var file=this.files[0];if(!file)return;file.text().then(function(t){
        var j=JSON.parse(t),list={};(j.annotations||j).forEach(function(x){list[x.findingId]=x});apply(list);save();
      });
    });
  }
  document.addEventListener('click',function(e){
    var st=e.target.closest('[data-anno-status]');
    if(st){setStatus(st.closest('.anno'),st.dataset.annoStatus);return}
    if(e.target.closest('[data-fb-export]')){
      var cur=current();
      var blob=new Blob([JSON.stringify({review:fb.dataset.key,title:fb.dataset.title,annotations:Object.keys(cur).map(function(k){return cur[k]})},null,2)],{type:'application/json'});
      var u=URL.createObjectURL(blob),l=document.createElement('a');l.href=u;l.download='review-notes.json';l.click();setTimeout(function(){URL.revokeObjectURL(u)},1000);return;
    }
    var cp=e.target.closest('[data-fb-copy]');
    if(cp){navigator.clipboard.writeText(markdown()).then(function(){cp.textContent='Copied';setTimeout(function(){cp.textContent='Copy as Markdown'},1500)});return}
    var td=e.target.closest('[data-filter-todo]');
    if(td){
      $$('.filters .chip[data-filter-sev],[data-filter-todo]').forEach(function(c){c.classList.toggle('on',c===td)});
      $$('#findings-list>.finding').forEach(function(f){f.classList.toggle('hide',!(f.dataset.status==='open'||f.dataset.status==='discuss'))});return;
    }
    var el=e.target.closest('[data-open-file],[data-open-cfile],[data-target],[data-open-tab],[data-filter-sev],[data-expand],[data-theme-toggle]');
    if(!el)return;
    if(el.hasAttribute('data-theme-toggle')){
      var dark=root.dataset.theme?root.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
      root.dataset.theme=dark?'light':'dark';try{localStorage.setItem('scr-theme',root.dataset.theme)}catch(e){}return;
    }
    if(el.hasAttribute('data-expand')){
      var list=$$('#findings-list>.finding:not(.hide)');var open=!list.every(function(d){return d.open});
      list.forEach(function(d){d.open=open});el.textContent=open?'Collapse all':'Expand all';return;
    }
    if(el.hasAttribute('data-filter-sev')){e.preventDefault();filter(el.dataset.filterSev||'',el.dataset.filterCat||'');if(el.classList.contains('dot'))reveal($('.filters'));return}
    e.preventDefault();
    if(el.hasAttribute('data-open-cfile')){
      var cs=$$('.cfile').filter(function(x){return x.dataset.path===el.dataset.openCfile});
      reveal(cs.filter(function(x){return x.offsetParent!==null})[0]||cs[0]);return;
    }
    if(el.hasAttribute('data-open-file')){
      openTab('tab-files');
      var f=$$('.file').filter(function(x){return x.dataset.path===el.dataset.openFile})[0];
      reveal(f);return;
    }
    if(el.dataset.openTab)openTab(el.dataset.openTab);
    var target=el.dataset.target?document.getElementById(el.dataset.target):$('.tabs');
    if(target&&target.classList.contains('finding'))filter('','');
    reveal(target);
  });
})();
`;
