'use strict';
(function(){
const api=(method,payload)=>window.play.invoke(method,payload),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const toast=(text,error=false)=>window.__playToast?.(text,error),render=()=>window.__playRender?.(),modal=html=>window.__playModal?.(html);
const invalidate=S=>{S.teamEditorData=null;S.teamEditorKey=null;S.teamEditorLoading=null;S.teamEditorError='';S.editorRevision=(S.editorRevision||0)+1;};
const payload=S=>({text:S.draft,format:S.format,positions:S.positions,index:S.teamSlot});
window.PlayTeams={
 init(S){if(S.draft!==undefined)return;const d=S.data.teamDraft||{};Object.assign(S,{draft:d.text||'',draftName:d.name||'',format:d.format||'gen9ou',positions:d.positions,editTeamId:d.id||null,teamSlot:0});},
 render(S){this.init(S);return window.DfyTeamEditor.render(S,{esc,header:(title,sub,actions)=>'<header class="page-head"><div><h1>'+title+'</h1><p>按对战规则选择伙伴、配装，保存后即可送入对战。</p></div><div class="head-actions"><button class="ghost" data-page="battle">返回对战</button>'+actions+'</div></header><div class="page-scroll teams-scroll">',field:(label,html)=>'<label><span>'+label+'</span>'+html+'</label>',formatSelect:()=>'<button type="button" id="team-format-button" data-action="team-format-menu" data-rule-format="'+esc(S.format)+'" aria-haspopup="listbox">'+esc(window.__playFormatName?.(S.data.formats.find(f=>f.id===S.format)?.name||S.format))+'<span>⌄</span></button><small class="format-hint">悬停查看规则，展开后可逐项预览</small>'})+'</div>';},
 async prepare(S){await window.DfyTeamEditor.prepare(S,api,render,toast);},
 async capture(S,{tolerant=false}={}){
  if(S.page!=='teams')return;this.init(S);
  S.draftName=document.querySelector('#team-name')?.value??S.draftName;
  try{await window.DfyTeamEditor.flush(S,api);}catch(e){if(!tolerant)throw e;toast('输入尚未应用，已保留当前草稿：'+e.message,true);}
  const text=document.querySelector('#team-text');if(text?.dataset.dirty){S.draft=text.value;S.positions=undefined;invalidate(S);}
  await api('team-draft',{save:true,...payload(S),name:S.draftName,id:S.editTeamId});
 },
 async changeFormat(S,value){
  const revision=S.formatChangeRevision=(S.formatChangeRevision||0)+1;
  await this.capture(S,{tolerant:true});if(revision!==S.formatChangeRevision)return;
  S.format=value;invalidate(S);render();
  await api('team-draft',{save:true,...payload(S),name:S.draftName,id:S.editTeamId});
 },
 async action(S,b){
  const a=b.dataset.action,editor=b.dataset.editor;
  if(!editor&&!a?.startsWith('team-'))return false;
  if(S.teamActionBusy)return true;
  S.teamActionBusy=true;
  try{
   if(a==='team-format-menu'){window.__dfyRuleTips.chooseFormats({options:S.data.formats.filter(f=>!f.random).map(f=>({id:f.id,label:window.__playFormatName(f.name)})),value:S.format,button:b,onChange:value=>this.changeFormat(S,value).catch(e=>toast(e.message,true))});return true;}
   if(a==='team-start-blank'){Object.assign(S,{draft:'',draftName:'',blankTeam:true,positions:[],editTeamId:null,teamSlot:0,pendingEdits:{}});invalidate(S);await api('team-draft',{save:true,...payload(S),name:'',id:null});render();return true;}
   if(a==='team-new'){S.generatingTeam=true;render();try{const format=S.format,t=await api('team-generate',{format,previous:S.draft});if(S.format!==format)return true;Object.assign(S,{draft:t.text,draftName:t.name,positions:undefined,editTeamId:null,teamSlot:0,pendingEdits:{},blankTeam:false});invalidate(S);await api('team-draft',{save:true,...payload(S),name:S.draftName,id:null});toast('已生成完整合法队伍，可直接保存出战');}finally{S.generatingTeam=false;render();}return true;}
   if(editor==='slot'){await this.capture(S,{tolerant:true});S.teamSlot=Number(b.dataset.slot);render();return true;}
   const discard=editor==='remove'||['team-clear-species','team-clear-name','team-new','team-load','team-resource-retry'].includes(a);
   if(!discard)await this.capture(S);
   if(editor==='remove'||a==='team-clear-species'){
    const r=await api('team-editor-update',{...payload(S),remove:true});Object.assign(S,{draft:r.text,positions:r.positions});window.DfyTeamEditor.clearPending(S);invalidate(S);render();return true;
   }
   if(editor==='apply'){render();return true;}
   switch(a){
    case'team-load':{const t=S.data.teams.find(t=>t.id===b.dataset.id);if(!t)throw Error('队伍不存在');Object.assign(S,{draft:t.text,draftName:t.name,format:t.format,positions:t.positions,editTeamId:t.id,teamSlot:0,pendingEdits:{}});invalidate(S);render();break;}
    case'team-delete':await modal('<h2>删除这支队伍？</h2><p>只删除本机队伍盒中的记录。</p><div class="dialog-actions"><button data-action="close">取消</button><button class="danger" data-action="team-delete-confirm" data-id="'+esc(b.dataset.id)+'">删除</button></div>');break;
    case'team-delete-confirm':S.data.teams=await api('team-delete',{id:b.dataset.id});document.querySelector('#dialog').close();render();break;
    case'team-save':case'team-send':{
     const t=await api('team-save',{...payload(S),id:S.editTeamId,name:S.draftName});S.editTeamId=t.id;S.draft=t.text;S.data.teams=await api('teams');
     await api('team-draft',{save:true,...payload(S),name:S.draftName,id:t.id});
     if(a==='team-send'){await api('web-team',{id:t.id});S.page='battle';render();toast('已送入 Showdown，点击开始对战即可使用');}else{render();toast('队伍已保存');}break;
    }
    case'team-validate':{const r=await api('team-validate',payload(S));document.querySelector('#validation').textContent=r.valid?'合法性校验通过':r.errors.join('\n');toast(r.valid?'队伍合法':r.errors.join('\n'),!r.valid);break;}
    case'team-import':{const text=await api('team-import');if(text!==null){Object.assign(S,{draft:text,positions:undefined,editTeamId:null,teamSlot:0,pendingEdits:{}});invalidate(S);render();}break;}
    case'team-export':{const file=await api('team-export',{text:S.draft});if(file)toast('队伍已导出');break;}
    case'team-text-apply':S.positions=undefined;S.teamSlot=0;invalidate(S);render();break;
    case'team-resource-retry':S.forceRefresh=true;window.DfyTeamEditor.refresh(S,api,render,toast);break;
    case'team-clear-name':{
     const input=document.querySelector('[data-team-field=name]');if(input){input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));}
     if(S.teamEditorData?.sets?.[S.teamSlot]){const r=await api('team-editor-update',{...payload(S),patch:{name:''}});S.draft=r.text;S.positions=r.positions;window.DfyTeamEditor.clearPending(S,'name');invalidate(S);render();}break;
    }
    case'team-apply-recommendation':{
     const data=await api('team-editor-data',payload(S)),item=data.sets[S.teamSlot]?.recommendations?.[Number(b.dataset.index)];if(!item)throw Error('当前规则没有这套合法配装，请重新选择');
     const patch={...item};delete patch.name;delete patch.species;
     const r=await api('team-editor-update',{...payload(S),patch});S.draft=r.text;S.positions=r.positions;invalidate(S);render();toast('已应用当前规则的合法配装');break;
    }
   }
   return true;
  }finally{S.teamActionBusy=false;}
 }
};
})();
