'use strict';
// 保留理由：原客户端只负责连接与操作协议；非对战房间也必须经过统一的界面呈现。
function install({dictionary={}}={}){
 if(window.__dfySurfaces)return;
 const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
 const labels={ladder:'排行榜',battles:'正在进行的对战',rooms:'聊天室',lobby:'大厅聊天',teambuilder:'组队工坊',resources:'分级规则'};
 const translate=text=>dictionary[text]||({'Refresh':'刷新','Search':'查找','Join chat':'加入聊天室','Back':'返回','Loading...':'正在加载…','Format:':'对战规则','Username:':'训练家名称'})[text]||text;
 const rooms=new Map();let queued=false;
 function update(){queued=false;if(document.body.dataset.dfyDisplay!=='game')return;
  for(const room of Object.values(window.app?.rooms||{})){
   if(!room.id||room.id.startsWith('battle-'))continue;const root=room.el;if(!root?.isConnected)continue;
   let state=rooms.get(root);if(!state){const view=make('section','dfy-room-surface'),head=make('header',''),body=make('div','dfy-room-content');head.append(make('h2','',labels[room.id]||room.title||'训练家聊天室'));const back=make('button','','返回大厅');back.onclick=()=>app.focusRoom('');head.append(back);view.append(head,body);root.append(view);state={view,body,key:''};rooms.set(root,state);}
   if(!state.view.isConnected)root.append(state.view);
   const sources=[...root.children].filter(n=>n!==state.view),key=sources.map(n=>n.innerHTML).join('');if(state.key===key)continue;state.key=key;state.body.replaceChildren();
   const page={teambuilder:'teams',resources:'rules'}[room.id];if(page){state.body.append(make('p','','在对战器中查看和编辑。'));const button=make('button','dfy-surface-primary','打开'+labels[room.id]);button.onclick=()=>window.dispatchEvent(new CustomEvent('dfy:navigate',{detail:page}));state.body.append(button);continue;}
   // Reconstruct text, tables and controls; never embed upstream HTML or iframes.
   function copy(native,parent){
    if(native.nodeType===3){const t=native.textContent.trim();if(t)parent.append(document.createTextNode(translate(t)+' '));return;}
    if(native.nodeType!==1||['SCRIPT','STYLE','IFRAME','IMG'].includes(native.tagName)||native.hidden||native.style.display==='none')return;
    const tag=native.tagName;
    if(tag==='BUTTON'||tag==='A'||(tag==='INPUT'&&['button','submit'].includes(native.type))){
     const b=make('button','dfy-surface-action',translate(native.textContent.trim()||native.value)||'打开');b.type='button';b.disabled=native.disabled||native.classList.contains('disabled');if(native.name==='selectFormat'||native.name==='format')b.dataset.ruleFormat=native.value;b.onclick=()=>native.click();parent.append(b);return;
    }
    if(['INPUT','TEXTAREA','SELECT'].includes(tag)){
     if(native.type==='hidden')return;const input=make(tag.toLowerCase(),'dfy-surface-input');if(tag==='SELECT')for(const o of native.options)input.add(new Option(translate(o.text),o.value,o.defaultSelected,o.selected));else if(tag==='INPUT')input.type=native.type;input.value=native.value;input.placeholder=translate(native.placeholder||'');input.disabled=native.disabled;input.setAttribute('aria-label',translate(native.getAttribute('aria-label')||native.name||'输入'));input.oninput=()=>{native.value=input.value;native.checked=input.checked;native.dispatchEvent(new Event('input',{bubbles:true}));};input.onchange=()=>{native.value=input.value;native.checked=input.checked;native.dispatchEvent(new Event('change',{bubbles:true}));};input.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey){native.value=input.value;const event=new KeyboardEvent('keydown',{key:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true});native.dispatchEvent(event);if(!event.defaultPrevented)native.form?.requestSubmit();e.preventDefault();}};if(['checkbox','radio'].includes(native.type))input.checked=native.checked;parent.append(input);return;
    }
    const allowed=['TABLE','THEAD','TBODY','TR','TH','TD','UL','OL','LI','H3','P','STRONG','B','SMALL','BR','LABEL'];const out=make(allowed.includes(tag)?tag.toLowerCase():'div','');parent.append(out);for(const n of native.childNodes)copy(n,out);
   }
   for(const source of sources)copy(source,state.body);if(!state.body.textContent.trim())state.body.prepend(make('p','','正在等待服务器数据…'));
  }
  for(const [root]of rooms)if(!root.isConnected)rooms.delete(root);
 }
 const queue=()=>{if(!queued){queued=true;requestAnimationFrame(update);}};
 const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.dfy-room-surface')))queue();});observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dfy-display']});window.__dfySurfaces={refresh:update};update();
}
module.exports={install};
