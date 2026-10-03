'use strict';
(function(){
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const api=(method,payload)=>window.play.invoke(method,payload);
const fieldKey=S=>S.format+'|'+S.teamSlot;
const dataKey=S=>JSON.stringify([S.format,S.draft,S.positions,S.teamSlot,S.editorRevision||0]);
function sourceLabel(S){
 const cat=S.teamEditorData?.catalog||{},job=S.refreshStates?.[S.format];
 const source=cat.recommendationMonth?'Smogon '+cat.recommendationMonth+' · '+(cat.recommendationRating??0)+' 分段':cat.recommendationSource==='showdown-sets'?'Showdown 示例配装':'本地规则图鉴';
 return source+' · '+(job?.phase==='loading'?'正在检查新统计（可继续编辑）':job?.message||cat.recommendationWarning||(cat.recommendationMonth?'已载入本地统计':'离线可用'));
}
function paintRefresh(S){
 if(S.page!=='teams')return;const status=document.querySelector('#team-data-source'),button=document.querySelector('[data-action=team-resource-retry]'),loading=S.refreshStates?.[S.format]?.phase==='loading';
 if(status){status.textContent=sourceLabel(S);status.setAttribute('aria-busy',String(loading));}
 if(button){button.disabled=loading;button.textContent=loading?'检查中…':'刷新统计';}
}
const tr=n=>window.__playState?.data?.dictionary?.[n]||n||'';
const typeBadge=(t,iconOnly=false)=>'<span class="type-badge badge-'+String(t).toLowerCase()+(iconOnly?' icon-only':'')+'"><i class="type-symbol type-'+String(t).toLowerCase()+'" aria-hidden="true"></i>'+(iconOnly?'':'<span>'+esc(tr(t))+'</span>')+'</span>';
const image=s=>'<img class="party-sprite" loading="lazy" src="dfy-asset://battle/'+esc(s.assetKey||'sprite/'+s.sprite+'/front/normal/M')+'" alt="'+esc(s.label||tr(s.species))+'">';
const itemIcon=item=>item.iconSprite!=null?'<span class="item-thumb"><i class="item-atlas" style="background-position:-'+(item.iconSprite%16)*24+'px -'+Math.floor(item.iconSprite/16)*24+'px"></i></span>':'<span class="item-thumb"><img loading="lazy" src="dfy-asset://battle/'+esc(item.iconKey)+'" alt=""></span>';
const menus=new Map();let active=null,menuSerial=0;
function closeMenu(){document.querySelector('#team-picker')?.remove();active?.input.setAttribute('aria-expanded','false');active=null;}
function option(group,item){
 const desc=item.desc||item.shortDesc||item.reason||'';
 let visual=group==='species'?image(item):group==='items'?itemIcon(item):group==='moves'?typeBadge(item.type):group==='types'?typeBadge(item.name):'';
 const meta=group==='moves'?(item.category+' · 威力 '+(item.power||'—')+' · 命中 '+(item.accuracy===true?'必中':item.accuracy||'—')):group==='natures'?(item.plusLabel?'＋'+item.plusLabel+' / −'+item.minusLabel:'能力不变'):item.shortDesc||'';
 const usage=group==='species'?(item.usage?item.usage*100:null):item.usagePercent;
 return '<button type="button" class="party-option" role="option" '+(item.legal===false?'disabled ':'')+'data-choice="'+esc(item.name)+'" title="'+esc(desc)+'">'+visual+'<span class="option-copy"><b>'+esc(item.label||item.name)+'</b>'+(meta?'<small class="option-meta">'+esc(meta)+'</small>':'')+'</span>'+(usage!=null?'<small class="usage-rate">'+Number(usage).toFixed(1)+'%</small>':'')+(group==='species'?'<em class="tier-tag '+(item.legal?'tier-legal':'tier-illegal')+'">'+esc(item.tierLabel)+'</em>':'')+'</button>';
}
function placeMenu(){
 if(!active)return;const menu=document.querySelector('#team-picker');if(!menu)return;
 const box=active.input.getBoundingClientRect(),width=Math.min(Math.max(box.width,active.group==='moves'?480:360),innerWidth-24);
 const below=innerHeight-box.bottom-12,above=box.top-12,down=below>=240||below>=above;
 const height=Math.min(430,Math.max(140,down?below:above));
 Object.assign(menu.style,{width:width+'px',maxHeight:height+'px',left:Math.min(box.left,innerWidth-width-12)+'px',top:(down?box.bottom+5:Math.max(8,box.top-height-5))+'px'});
}
function paintMenu(reset=false){
 if(!active)return;
 const menu=document.querySelector('#team-picker'),query=active.fixed||!active.searching?'':active.input.value.trim().toLowerCase();
 const items=active.items.filter(x=>!query||(x.name+' '+x.label).toLowerCase().includes(query));active.filtered=items;
 if(reset)active.limit=60;
 let group='',html='';
 for(const item of items.slice(0,active.limit)){
  const next=active.group==='species'?item.group:item.usageRank!==null&&item.usageRank!==undefined?'常用':'其他可选';
  if(next!==group){group=next;html+='<div class="picker-heading">'+esc(group)+'</div>';}
  html+=option(active.group,item);
 }
 menu.innerHTML=html+(items.length>active.limit?'<button type="button" class="picker-more" data-picker-more>继续向下滚动，或点击加载更多（'+active.limit+'/'+items.length+'）</button>':'<div class="picker-end">'+(items.length?'共 '+items.length+' 项':'没有匹配项')+'</div>');
 placeMenu();
}
function openMenu(input,searching=false){
 const config=menus.get(input.dataset.menu);if(!config)return;
 if(active?.input===input){active.searching=searching;paintMenu(true);return;}
 closeMenu();active={...config,input,searching,limit:60};
 const menu=document.createElement('div');menu.id='team-picker';menu.className='party-combobox-menu open';menu.setAttribute('role','listbox');
 document.body.append(menu);input.setAttribute('aria-expanded','true');paintMenu(true);
 menu.addEventListener('scroll',()=>{if(active&&menu.scrollTop+menu.clientHeight>=menu.scrollHeight-60&&active.limit<active.filtered.length){const top=menu.scrollTop;active.limit+=60;paintMenu();menu.scrollTop=top;}});
}
function combo(key,group,value,items,placeholder,disabled=false){
 const selected=items.find(x=>x.name===value||x.label===value);
 const fixed=['abilities','natures','types'].includes(group),id=String(++menuSerial);
 menus.set(id,{group,items,fixed,key});
 const badge=group==='moves'&&selected?typeBadge(selected.type):group==='types'&&selected?typeBadge(selected.name,true):group==='items'&&selected?itemIcon(selected):'';
 return '<div class="party-combobox '+(fixed?'party-combobox-fixed':'')+'">'+badge+'<input data-team-field="'+key+'" data-combo-input data-menu="'+id+'" '+(fixed?'readonly ':'')+(disabled?'disabled ':'')+'autocomplete="off" role="combobox" aria-expanded="false" value="'+esc(selected?.label||value||'')+'" title="'+esc(selected?.desc||selected?.shortDesc||'')+'" placeholder="'+esc(placeholder)+'">'+(value&&group==='species'?'<button type="button" class="combo-clear" data-action="team-clear-species" aria-label="清空宝可梦">×</button>':'')+'<span class="combo-chevron">⌄</span></div>';
}
const row=(name,html,extra='')=>'<label class="party-field '+extra+'"><span>'+name+'</span>'+html+'</label>';
const stats=['hp','atk','def','spa','spd','spe'],statNames=['HP','攻击','防御','特攻','特防','速度'];
window.DfyTeamEditor={
 render(S,{header,field,formatSelect}){
  closeMenu();menus.clear();menuSerial=0;
  const data=S.teamEditorData,cat=data?.catalog||{},p=cat.profile||{},sets=data?.sets||Array(6).fill(null),slot=Math.max(0,Math.min(S.teamSlot||0,5)),set=sets[slot]||{},has=!!set.species,ready=!!data&&(data.activeIndex==null||data.activeIndex===slot);
  const total=Object.values(set.evs||{}).reduce((sum,n)=>sum+Number(n||0),0);
  const refreshing=S.refreshStates?.[S.format]?.phase==='loading';
  const nature=cat.natures?.find(n=>n.name===(set.nature||'Serious'));
  const range=(key,value,min,max)=>'<span class="stat-control"><input data-team-field="'+key+'" type="range" min="'+min+'" max="'+max+'" step="1" value="'+value+'" '+(!has||!ready?'disabled':'')+' aria-label="'+key+'"><output data-range-output="'+key+'">'+value+'</output></span>';
  const raw=S.pendingEdits?.[fieldKey(S)];
  const fields=[
   row('宝可梦',combo('species','species',set.species,cat.species||[],'选择或搜索宝可梦',!ready)),
   row('昵称','<div class="clearable-input"><input data-team-field="name" value="'+esc(set.name===set.species?'':set.name||'')+'" maxlength="18" '+(!has||!ready?'disabled':'')+' placeholder="可选"><button type="button" class="field-clear" data-action="team-clear-name" aria-label="清空昵称">×</button></div>'),
   p.items===false?'':row('携带道具',combo('item','items',set.item,set.itemCatalog||cat.items||[],'选择道具',!has||!ready)),
   p.abilities===false?'':row('特性',combo('ability','abilities',set.ability,set.abilityCatalog||[],'选择特性',!has||!ready)),
   p.natures===false?'':row('性格',combo('nature','natures',set.nature||'Serious',cat.natures||[],'选择性格',!has||!ready)+'<small class="nature-note">'+(nature?.plusLabel?'＋'+nature.plusLabel+' / −'+nature.minusLabel:'能力不变')+'</small>'),
   !p.tera?'':row('太晶属性',combo('teraType','types',set.teraType,set.teraCatalog||cat.types||[],'选择属性',!has||!ready))
  ].join('');
  if(!S.draft.trim()&&!S.blankTeam&&data){
   return header('组队工坊','','<button data-action="team-new" '+(S.generatingTeam?'disabled':'')+'>'+(S.generatingTeam?'正在生成…':'新队伍 · 自动生成')+'</button><button class="ghost" data-action="team-start-blank">空白队伍</button>')+'<section class="party-game"><div class="starter-format">'+field('对战规则',formatSelect())+'</div><article class="starter-card"><h2>一键生成，直接开始</h2><p>选择规则，点击“新队伍”，自动填好伙伴、招式、道具和能力值。生成后可直接保存出战，也可自由修改。</p>'+(S.generatingTeam?'<p role="status">正在按当前规则生成并检查整支队伍…</p>':'<button class="primary" data-action="team-new">生成我的队伍</button>')+'</article><div class="starter-alternatives"><button class="ghost" data-action="team-start-blank">从空白开始</button><button class="ghost" data-action="team-import">导入自己的队伍</button></div></section><section class="party-box"><h2>我的队伍盒</h2><div class="party-saved-grid">'+S.data.teams.map(t=>'<article class="party-saved"><h3>'+esc(t.name)+'</h3><button data-action="team-load" data-id="'+esc(t.id)+'">使用 / 编辑</button></article>').join('')+'</div></section>';
  }
  return header('组队工坊','','<button data-action="team-new" '+(S.generatingTeam?'disabled':'')+'>'+(S.generatingTeam?'正在生成…':'新队伍 · 自动生成')+'</button><button class="ghost" data-action="team-start-blank">空白队伍</button>')+
   (S.generatingTeam?'<p class="generating-team" role="status">正在按当前规则生成新队伍…</p>':'')+'<section class="party-game"><div class="party-toolbar">'+field('队伍名称','<input id="team-name" value="'+esc(S.draftName)+'" placeholder="我的冒险队伍">')+field('对战规则',formatSelect())+'</div>'+
   '<div class="party-data-status"><span id="team-data-source" role="status" aria-busy="'+!!refreshing+'">'+esc(sourceLabel(S))+'</span><button class="small ghost" data-action="team-resource-retry" '+(refreshing?'disabled':'')+'>'+(refreshing?'检查中…':'刷新统计')+'</button></div>'+
   '<nav class="party-slots" aria-label="六个队伍位置">'+sets.map((s,i)=>'<button type="button" data-editor="slot" data-slot="'+i+'" aria-pressed="'+(slot===i)+'" class="party-slot '+(slot===i?'selected':'')+'"><span class="party-slot-number">0'+(i+1)+'</span>'+(s?image(s):'<span class="party-empty-ball">＋</span>')+'<b>'+esc(s?.label||'添加伙伴')+'</b><small>'+esc(s?tr(s.item)||'未携带道具':'空位')+'</small></button>').join('')+'</nav>'+
   '<div class="party-editor" data-slot="'+slot+'"><aside class="party-portrait"><div class="party-habitat">'+(has?image(set):'<span class="party-empty-ball">＋</span>')+'</div><h3>'+esc(set.label||'选择你的伙伴')+'</h3><p>'+(set.types||[]).map(t=>typeBadge(t)).join(' ')+'</p>'+(set.legality?'<p class="tier-tag '+(set.legality.legal?'tier-legal':'tier-illegal')+'" title="'+esc(set.legality.reason)+'">'+esc(set.legality.tierLabel)+'</p>':'')+(has?'<button class="small ghost" data-editor="remove">移出队伍</button>':'')+'</aside>'+
   '<section class="party-loadout"><div class="party-section-heading"><h3>伙伴配置</h3><span>位置 '+(slot+1)+'</span></div><div class="party-fields">'+fields+'</div>'+
   (set.recommendations?.length?'<div class="party-set-recommendations inline"><b>当前规则配装</b>'+set.recommendations.map((r,i)=>'<button class="small" data-action="team-apply-recommendation" data-index="'+i+'">'+esc(/[\u3400-\u9fff]/.test(r.name)?r.name:r.name==='Showdown Usage'?'使用率推荐':'推荐配装 '+(i+1))+'</button>').join('')+'</div>':'')+
   '<div class="party-section-heading"><h3>招式配置</h3><span>按当前配装与队伍筛选 · 按使用率排列</span></div><div class="party-moves">'+Array.from({length:4},(_,i)=>row('0'+(i+1),combo('move'+i,'moves',set.moves?.[i],(set.moveCatalogs?.[i]||set.moveCatalog||[]).filter(m=>!(set.moves||[]).includes(m.name)||m.name===set.moves?.[i]),'选择招式',!has||!ready))).join('')+'</div>'+
   '<section class="party-stats"><div class="party-section-heading"><h3>等级与能力值</h3><span id="ev-budget">'+(p.evLabel||'努力值')+' '+total+' / '+(p.evLimit??'不限总和')+'</span></div>'+row('等级'+(p.battleLevel?' · 对战时调整为 '+p.battleLevel:'') ,range('level',set.level||p.defaultLevel||100,p.minLevel||1,p.maxLevel||100),'party-level-field')+
   '<div class="party-stat-table"><div class="stat-head"><span>能力</span><span>'+esc(p.evLabel||'努力值')+'</span><span>个体值</span></div>'+stats.map((stat,i)=>'<div class="stat-row"><b>'+statNames[i]+(nature?.plusLabel===statNames[i]?'<em class="stat-up">＋</em>':nature?.minusLabel===statNames[i]?'<em class="stat-down">−</em>':'')+'</b>'+range('evs.'+stat,set.evs?.[stat]||0,0,p.evMax||252)+range('ivs.'+stat,set.ivs?.[stat]??31,0,31)+'</div>').join('')+'</div></section>'+
   '<div class="party-editor-footer"><span id="party-edit-status" role="status">'+(raw?'尚有未应用的输入，请修正或清空':'')+'</span><button data-editor="apply" '+(!has||!ready?'disabled':'')+'>应用配装</button></div></section></div>'+
   (data?.validation?'<section class="party-data-status" id="team-rule-status" role="status"><div><strong>'+(data.validation.errors.length?'当前队伍存在规则问题':data.validation.incomplete.length?'草稿尚未完成，可以继续编辑':'当前队伍已通过规则校验')+'</strong>'+(data.validation.errors.length?'<ul>'+data.validation.errors.map(error=>'<li>'+esc(error)+'</li>').join('')+'</ul>':'')+(data.validation.incomplete.length?'<details><summary>待完成 '+data.validation.incomplete.length+' 项 · 保存时再次完整校验</summary><ul>'+data.validation.incomplete.map(error=>'<li>'+esc(error)+'</li>').join('')+'</ul></details>':'')+(data.validation.normalizations.length?'<p>引擎出战时将规范化：'+data.validation.normalizations.map(change=>'位置 '+(data.positions[change.index]+1)+' · '+esc(tr(change.from))+' → '+esc(tr(change.to))).join('；')+'。草稿原值已保留。</p>':'')+'</div></section>':'')+
   '<footer class="party-actions"><div><button class="primary" data-action="team-send">保存并送入 Showdown ↗</button><button data-action="team-save">保存队伍</button><button data-action="team-validate">校验队伍</button></div><span id="validation" role="status">'+(data?'':esc(S.teamEditorError||'正在读取本地图鉴…'))+'</span></footer>'+
   '<details class="party-text"><summary>队伍文本 · 导入 / 导出</summary><div class="row"><button data-action="team-import">导入文件</button><button data-action="team-export">导出文件</button><button data-action="team-text-apply">读取文本到槽位</button></div><textarea id="team-text" spellcheck="false">'+esc(S.draft)+'</textarea></details></section>'+
   '<section class="party-box"><h2>我的队伍盒</h2><div class="party-saved-grid">'+S.data.teams.map(t=>'<article class="party-saved"><h3>'+esc(t.name)+'</h3><p>'+esc(window.__playFormatName?.(t.format)||t.format)+'</p><div class="row"><button data-action="team-load" data-id="'+esc(t.id)+'">使用 / 编辑</button><button class="danger ghost" data-action="team-delete" data-id="'+esc(t.id)+'">删除</button></div></article>').join('')+'</div></section>';
 },
 restore(S){
  const form=document.querySelector('.party-editor'),raw=S.pendingEdits?.[fieldKey(S)];if(!form||!raw)return;
  for(const [key,value] of Object.entries(raw)){const input=form.querySelector('[data-team-field="'+key+'"]');if(input){input.value=value;input.dataset.changed='true';}}
  form.dataset.dirty='true';
 },
 clearPending(S,key){const raw=S.pendingEdits?.[fieldKey(S)];if(key&&raw)delete raw[key];else if(S.pendingEdits)delete S.pendingEdits[fieldKey(S)];},
 async prepare(S,api,render,toast){
  if(S.page!=='teams')return;
  const key=dataKey(S);if(S.teamEditorKey===key||S.teamEditorLoading===key)return;
  const ticket=Symbol();S.teamEditorTicket=ticket;S.teamEditorLoading=key;
  try{
   const data=await api('team-editor-data',{text:S.draft,format:S.format,positions:S.positions,index:S.teamSlot});
   if(S.teamEditorTicket!==ticket||dataKey(S)!==key||S.page!=='teams')return;
   S.teamEditorData=data;S.teamEditorError='';S.teamEditorKey=key;render();this.restore(S);
   this.refresh(S,api,render,toast);
  }catch(error){if(S.teamEditorTicket===ticket&&dataKey(S)===key){S.teamEditorError=error.message;S.teamEditorKey=key;render();toast(error.message,true);}}
  finally{if(S.teamEditorTicket===ticket)S.teamEditorLoading=null;}
 },
 async refresh(S,api,render,toast){
  const format=S.format,key=dataKey(S),force=!!S.forceRefresh;S.forceRefresh=false;S.refreshStates||={};
  if(S.refreshStates[format]?.phase==='loading'||(S.refreshStates[format]&&!force)){paintRefresh(S);return;}
  const job={phase:'loading',message:''};S.refreshStates[format]=job;paintRefresh(S);let timer;
  try{
   const data=await Promise.race([api('team-editor-refresh',{text:S.draft,format,positions:S.positions,index:S.teamSlot,force}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('统计检查超时')),15000);})]);
   job.phase=data.catalog.recommendationWarning?'cached':'ready';job.message=data.catalog.recommendationWarning||'统计已就绪';
   if(S.format!==format||S.page!=='teams')return;
   if(dataKey(S)===key&&!document.querySelector('.party-editor')?.dataset.dirty&&!document.querySelector('#team-text')?.dataset.dirty&&!document.querySelector('.dfy-format-picker:popover-open')&&!active){
    S.draftName=document.querySelector('#team-name')?.value??S.draftName;
    const scroll=document.querySelector('.teams-scroll')?.scrollTop||0;S.teamEditorData=data;render();document.querySelector('.teams-scroll')?.scrollTo(0,scroll);
   }else if(job.phase==='ready')job.message='统计已就绪，下次选择时应用';
  }catch(error){job.phase='cached';job.message='统计暂未更新，已保留本地数据，可手动重试';}
  finally{clearTimeout(timer);if(S.refreshStates[format]===job&&S.format===format)paintRefresh(S);}
 },
 async flush(S,api){
  const form=document.querySelector('.party-editor');if(!form?.dataset.dirty)return;
  if(S.teamFlush)return S.teamFlush;
  const format=S.format,text=S.draft,positions=S.positions,slot=Number(form.dataset.slot),changed=[...form.querySelectorAll('[data-changed]')],patch={};
  for(const input of changed){
   const key=input.dataset.teamField;
   if(key.startsWith('move'))patch.moves=[0,1,2,3].map(i=>form.querySelector('[data-team-field="move'+i+'"]').value);
   else if(key.includes('.')){const group=key.split('.')[0];patch[group]=Object.fromEntries(stats.map(stat=>[stat,form.querySelector('[data-team-field="'+group+'.'+stat+'"]').value]));}
   else patch[key]=input.value;
  }
  if(!Object.keys(patch).length){delete form.dataset.dirty;return;}
  const revision=S.editorRevision||0;
  const job=(async()=>{
   const result=await api('team-editor-update',{text,format,positions,index:slot,patch});
   if(S.format!==format||S.draft!==text||(S.editorRevision||0)!==revision)return;
   S.draft=result.text;S.positions=result.positions;S.teamEditorData=null;S.teamEditorKey=null;
   if(S.pendingEdits)delete S.pendingEdits[format+'|'+slot];
   for(const input of changed)delete input.dataset.changed;
   delete form.dataset.dirty;
   const area=document.querySelector('#team-text');if(area)area.value=result.text;
  })();
  S.teamFlush=job;
  try{await job;}finally{if(S.teamFlush===job)S.teamFlush=null;}
 },
 closeMenu
};
document.addEventListener('focusin',e=>{if(e.target.matches?.('[data-combo-input]'))openMenu(e.target);});
document.addEventListener('input',e=>{
 const input=e.target,S=window.__playState;
 if(input.id==='team-text'){input.dataset.dirty='true';return;}
 if(!input.matches?.('[data-team-field]'))return;
 if(input.dataset.teamField.startsWith('evs.')){
  const limit=S.teamEditorData?.catalog.profile.evLimit,fields=[...document.querySelectorAll('[data-team-field^="evs."]')];
  const other=fields.filter(f=>f!==input).reduce((sum,f)=>sum+Number(f.value),0);
  if(limit!==null&&limit!==undefined)input.value=String(Math.max(0,Math.min(Number(input.value),limit-other)));
  document.querySelector('#ev-budget').textContent=(S.teamEditorData.catalog.profile.evLabel)+' '+(other+Number(input.value))+' / '+(limit??'不限总和');
 }
 input.dataset.changed='true';input.closest('.party-editor').dataset.dirty='true';
 S.pendingEdits||={};S.pendingEdits[fieldKey(S)]||={};S.pendingEdits[fieldKey(S)][input.dataset.teamField]=input.value;
 if(input.type==='range'){const output=document.querySelector('[data-range-output="'+input.dataset.teamField+'"]');if(output)output.textContent=input.value;}
 if(input.matches('[data-combo-input]'))openMenu(input,true);
});
document.addEventListener('click',async e=>{
 if(e.target.closest?.('[data-picker-more]')){active.limit+=60;paintMenu();return;}
 const button=e.target.closest?.('[data-choice]');
 if(button&&active){
  e.preventDefault();const current=active,item=current.items.find(x=>x.name===button.dataset.choice),S=window.__playState;if(!item||item.legal===false)return;
  current.input.value=item.label||item.name;current.input.dispatchEvent(new Event('input',{bubbles:true}));closeMenu();
  try{
   await window.PlayTeams.capture(S);
   const scroll=document.querySelector('.teams-scroll')?.scrollTop||0;window.__playRender?.();document.querySelector('.teams-scroll')?.scrollTo(0,scroll);
  }catch(error){window.__playToast?.(error.message,true);}return;
 }
 const input=e.target.closest?.('[data-combo-input]');if(input){openMenu(input);return;}
 if(!e.target.closest?.('#team-picker'))closeMenu();
});
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'){closeMenu();return;}
 if(!active)return;
 const menu=document.querySelector('#team-picker'),buttons=[...menu.querySelectorAll('.party-option:not(:disabled)')],i=buttons.indexOf(document.activeElement);
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();buttons[Math.max(0,Math.min(buttons.length-1,i+(e.key==='ArrowDown'?1:-1)))]?.focus();}
 if(e.key==='Enter'&&document.activeElement===active.input){e.preventDefault();buttons[0]?.click();}
});
window.addEventListener('resize',placeMenu);
document.addEventListener('scroll',e=>{if(active&&!e.target.closest?.('#team-picker'))placeMenu();},true);
document.addEventListener('error',e=>{const img=e.target;if(!img.matches?.('.party-sprite,.item-thumb img'))return;if(!img.dataset.fallback){img.dataset.fallback='true';img.src='../assets/party-placeholder.svg';}},true);
})();
