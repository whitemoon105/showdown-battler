'use strict';
// 仅阵容预览保留确认；普通行动交由原生客户端提交和撤销。保留理由：原生客户端已处理目标与双打选择进度，无需额外确认。
function install(){
 window.__dfyBattleChoice=({room,battle,command,preview,name,local})=>{
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  const layer=make('div','dfy-custom-choice'),order=make('div','dfy-choice-order'),actions=make('div','dfy-choice-confirm'),note=make('span','dfy-choice-note');
  const clear=make('button','dfy-game-action','撤销选择'),confirm=make('button','dfy-game-action','确认阵容');clear.type=confirm.type='button';clear.dataset.choiceAction='clear';confirm.dataset.choiceAction='confirm';actions.append(note,clear,confirm);layer.append(order,actions);command.append(layer);
  let request=null,selected=[],slot=0,submitted=false,renderKey='',disposed=false;
  function choose(index){const prior=selected.indexOf(index);if(prior!==slot&&prior>=0)selected[prior]=selected[slot];selected[slot]=index;const next=selected.findIndex(n=>n===null);if(next>=0)slot=next;sync();}
  const pick=e=>{const b=e.target.closest('[data-preview-pokemon]');if(b&&!submitted)choose(Number(b.dataset.previewPokemon));};preview.addEventListener('click',pick);
  clear.onclick=()=>{if(room.request?.teamPreview){selected[slot]=null;sync();}else room.clearChoice();};
  confirm.onclick=()=>{
   if(submitted)return;
   if(room.request?.teamPreview){if(selected.some(n=>n===null))return;const all=battle.myPokemon||[];room.choice.teamPreview=[...selected,...all.map((p,i)=>i).filter(i=>!selected.includes(i))].map(i=>i+1);room.choice.done=selected.length;room.choice.count=selected.length;submitted=true;room.endTurn();}
   sync();
  };
  function sync(){
   if(disposed)return;if(request!==room.request){request=room.request;selected=Array(Math.min(request?.maxTeamSize||6,battle.myPokemon?.length||6)).fill(null);slot=0;submitted=false;renderKey='';}
   const preview=!!request?.teamPreview&&!battle.nearSide?.active.some(Boolean);
   layer.hidden=!preview;const buttons=command.querySelector('.dfy-game-buttons'),tools=command.querySelector('.dfy-choice-tools');if(buttons)buttons.hidden=!layer.hidden;if(tools)tools.hidden=!layer.hidden;
   if(layer.hidden)return;const caption=command.querySelector('.dfy-scene-caption');if(caption)caption.textContent=submitted?'已确认阵容，等待对手选择完成':'点击位置按钮，安排第 1～'+selected.length+' 只宝可梦';
   for(const b of command.parentElement.querySelectorAll('[data-preview-pokemon]')){b.dataset.selected=String(selected.includes(Number(b.dataset.previewPokemon)));b.disabled=submitted;}
   const key=JSON.stringify([preview,selected,slot,submitted,(battle.myPokemon||[]).map(p=>p.speciesForme)]);if(key===renderKey)return;renderKey=key;order.replaceChildren();
   if(preview){
    const mons=battle.myPokemon||[];selected.forEach((index,i)=>{const b=make('button','dfy-game-action dfy-order-slot'),p=index===null?null:mons[index];b.type='button';b.dataset.orderSlot=i;b.setAttribute('aria-pressed',String(slot===i));b.disabled=submitted;b.append(make('small','','第 '+(i+1)+' 只'));if(p){const img=make('img','');img.src=local(p);img.alt='';b.append(img,make('b','',name(p)));}else b.append(make('b','','＋ 选择'));b.onclick=()=>{slot=i;sync();};order.append(b);});
    note.textContent=submitted?'已确认，等待对手选择完成':'选择第 '+(slot+1)+' 只 · '+selected.filter(n=>n!==null).length+' / '+selected.length;clear.hidden=submitted;clear.disabled=selected[slot]===null;confirm.textContent='确认阵容';confirm.disabled=submitted||selected.some(n=>n===null);
   }
  }
  return{sync,dispose(){disposed=true;preview.removeEventListener('click',pick);layer.remove();}};
 };
}
module.exports={install};
