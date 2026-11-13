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
    $$('.filters .chip[data-filter-sev]').forEach(function(c){c.classList.toggle('on',c.dataset.filterSev===sev&&c.dataset.filterCat===cat)});
    $$('#findings-list>.finding').forEach(function(f){f.classList.toggle('hide',!!((sev&&f.dataset.sev!==sev)||(cat&&f.dataset.cat!==cat)))});
  }
  document.addEventListener('click',function(e){
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
      reveal($$('.cfile').filter(function(x){return x.dataset.path===el.dataset.openCfile})[0]);return;
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
`
