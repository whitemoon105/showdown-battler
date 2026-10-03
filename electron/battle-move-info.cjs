'use strict';
function install(){
 window.__dfyMoveInfo=({command,battle,descriptions,zh})=>{
  const panel=document.createElement('section'),title=document.createElement('b'),stats=document.createElement('small'),effect=document.createElement('p');
  panel.className='dfy-move-info';panel.popover='manual';panel.setAttribute('role','tooltip');panel.id='dfy-move-info-'+Math.random().toString(36).slice(2);panel.append(title,stats,effect);document.body.append(panel);let anchor=null;
  const hide=()=>{anchor?.removeAttribute('aria-describedby');anchor=null;if(panel.matches(':popover-open'))panel.hidePopover();};
  const reposition=()=>{if(!anchor?.isConnected||!anchor.getClientRects().length){hide();return;}const r=anchor.getBoundingClientRect(),w=Math.min(310,innerWidth-24);panel.style.width=w+'px';const h=panel.offsetHeight;panel.style.left=Math.max(12,Math.min(r.left,innerWidth-w-12))+'px';panel.style.top=Math.max(12,r.top-h-9)+'px';};
  const open=n=>{const move=battle.dex.moves.get(n.dataset.moveId);if(!move.exists)return;hide();anchor=n;const mode=String(battle.tier||'').toLowerCase().includes('champions')?'champions':'gen'+(battle.gen||9),detail=descriptions[mode]?.[move.id]||descriptions.gen9?.[move.id]||'暂无中文效果说明';title.textContent=zh(move.name);stats.textContent=zh(move.type)+' · '+({Physical:'物理',Special:'特殊',Status:'变化'})[move.category]+' · 威力 '+(move.basePower||'—')+' · 命中 '+(move.accuracy===true?'必中':move.accuracy||'—');effect.textContent=detail;n.setAttribute('aria-describedby',panel.id);panel.showPopover();reposition();};
  const target=e=>e.target.closest?.('[data-native-action=chooseMove][data-move-id]');
  const enter=e=>{const n=target(e);if(n&&n!==anchor)open(n);},leave=e=>{if(anchor&&!anchor.contains(e.relatedTarget))hide();},escape=e=>{if(e.key==='Escape')hide();};
  command.addEventListener('pointerover',enter);command.addEventListener('pointerout',leave);command.addEventListener('focusin',enter);command.addEventListener('focusout',leave);command.addEventListener('pointerdown',hide);command.addEventListener('scroll',hide,true);document.addEventListener('keydown',escape);window.addEventListener('resize',reposition);
  return{sync(){if(anchor&&(!anchor.isConnected||!anchor.getClientRects().length))hide();},dispose(){hide();command.removeEventListener('pointerover',enter);command.removeEventListener('pointerout',leave);command.removeEventListener('focusin',enter);command.removeEventListener('focusout',leave);command.removeEventListener('pointerdown',hide);command.removeEventListener('scroll',hide,true);document.removeEventListener('keydown',escape);window.removeEventListener('resize',reposition);panel.remove();}};
 };
}
module.exports={install};
