'use strict';
// The server owns battle start and move targets. This layer only stages local
// choices, then hands the confirmed order/actions back to the native client.
function install(){
 window.__dfyBattleChoice=({room,battle,command,preview,name,local,zh})=>{
  const make=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  const layer=make('div','dfy-custom-choice'),order=make('div','dfy-choice-order'),pool=make('div','dfy-choice-pool'),actions=make('div','dfy-choice-confirm'),note=make('span','dfy-choice-note');
  const clear=make('button','dfy-game-action','撤销选择'),confirm=make('button','dfy-game-action','确认阵容');clear.type=confirm.type='button';clear.dataset.choiceAction='clear';confirm.dataset.choiceAction='confirm';actions.append(note,clear,confirm);layer.append(order,pool,actions);command.append(layer);
  let request=null,selected=[],slot=0,pending=null,submitted=false,renderKey='',disposed=false;
  const endTurn=room.endTurn,clearChoice=room.clearChoice;
  const intercept=function(){if(document.body.dataset.dfyDisplay!=='game'||room.request?.partial||room.request?.teamPreview)return endTurn.call(room);pending={request:room.request,choices:[...(room.choice?.choices||[])]};sync();};
  room.endTurn=intercept;
  function edit(index){pending=null;if(!room.choice)return;room.choice.choices=room.choice.choices.slice(0,index);room.choice.type=index?'move2':'move';delete room.choice.waiting;room.updateControlsForPlayer();sync();}
  const clearWrapped=function(){pending=null;const r=clearChoice.call(room);sync();return r;};room.clearChoice=clearWrapped;
  function choose(index){const prior=selected.indexOf(index);if(prior!==slot&&prior>=0)selected[prior]=selected[slot];selected[slot]=index;const next=selected.findIndex(n=>n===null);if(next>=0)slot=next;sync();}
  const pick=e=>{const b=e.target.closest('[data-preview-pokemon]');if(b&&!submitted)choose(Number(b.dataset.previewPokemon));};preview.addEventListener('click',pick);
  clear.onclick=()=>{if(room.request?.teamPreview){selected[slot]=null;sync();}else room.clearChoice();};
  confirm.onclick=()=>{
   if(submitted)return;
   if(room.request?.teamPreview){if(selected.some(n=>n===null))return;const all=battle.myPokemon||[];room.choice.teamPreview=[...selected,...all.map((p,i)=>i).filter(i=>!selected.includes(i))].map(i=>i+1);room.choice.done=selected.length;room.choice.count=selected.length;submitted=true;endTurn.call(room);}
   else if(pending?.request===room.request){pending=null;endTurn.call(room);}
   sync();
  };
  function labelChoice(value,index){const p=battle.nearSide.active[index],parts=String(value||'').split(' ');if(parts[0]==='move'){const m=room.request?.active?.[index]?.moves?.[Number(parts[1])-1],target=Number(parts.at(-1));let text=zh(m?.move||m?.id||'招式');if(parts.length>2&&target&&Math.abs(target)<=battle.nearSide.active.length)text+=' → '+(target>0?'对方':'我方')+' '+Math.abs(target)+' 号位';return text;}if(parts[0]==='switch')return '换入 '+name(battle.myPokemon[Number(parts[1])-1]);return p?'等待':'无需行动';}
  function sync(){
   if(disposed)return;if(request!==room.request){request=room.request;selected=Array(Math.min(request?.maxTeamSize||6,battle.myPokemon?.length||6)).fill(null);slot=0;pending=null;submitted=false;renderKey='';}
   const preview=!!request?.teamPreview&&!battle.nearSide?.active.some(Boolean),review=!!pending&&pending.request===request;
   layer.hidden=!preview&&!review;const buttons=command.querySelector('.dfy-game-buttons'),tools=command.querySelector('.dfy-choice-tools');if(buttons)buttons.hidden=!layer.hidden;if(tools)tools.hidden=!layer.hidden;
   if(layer.hidden)return;const caption=command.querySelector('.dfy-scene-caption');if(caption)caption.textContent=preview?(submitted?'已确认阵容，等待对手选择完成':'点击位置按钮，安排第 1～'+selected.length+' 只宝可梦'):'确认本回合行动 · 提交前可以修改';
   for(const b of command.parentElement.querySelectorAll('[data-preview-pokemon]')){b.dataset.selected=String(selected.includes(Number(b.dataset.previewPokemon)));b.disabled=submitted;}
   const key=JSON.stringify([preview,selected,slot,submitted,pending?.choices,(battle.myPokemon||[]).map(p=>p.speciesForme)]);if(key===renderKey)return;renderKey=key;order.replaceChildren();pool.replaceChildren();
   if(preview){
    const mons=battle.myPokemon||[];selected.forEach((index,i)=>{const b=make('button','dfy-game-action dfy-order-slot'),p=index===null?null:mons[index];b.type='button';b.dataset.orderSlot=i;b.setAttribute('aria-pressed',String(slot===i));b.disabled=submitted;b.append(make('small','','第 '+(i+1)+' 只'));if(p){const img=make('img','');img.src=local(p);img.alt='';b.append(img,make('b','',name(p)));}else b.append(make('b','','＋ 选择'));b.onclick=()=>{slot=i;sync();};order.append(b);});
    note.textContent=submitted?'已确认，等待对手选择完成':'选择第 '+(slot+1)+' 只 · '+selected.filter(n=>n!==null).length+' / '+selected.length;clear.hidden=submitted;clear.disabled=selected[slot]===null;confirm.textContent='确认阵容';confirm.disabled=submitted||selected.some(n=>n===null);
   }else{
    pending.choices.forEach((value,i)=>{const b=make('button','dfy-game-action dfy-review-slot');b.type='button';b.dataset.editSlot=i;b.append(make('small','','我方 '+(i+1)+' 号位 · '+name(battle.nearSide.active[i])),make('b','',labelChoice(value,i)),make('small','','点击修改'));b.onclick=()=>edit(i);order.append(b);});note.textContent='检查本回合行动，确认后提交';clear.hidden=false;clear.disabled=false;confirm.disabled=false;confirm.textContent='确认行动';
   }
  }
  return{sync,isPending:()=>!!pending,dispose(){disposed=true;if(room.endTurn===intercept)room.endTurn=endTurn;if(room.clearChoice===clearWrapped)room.clearChoice=clearChoice;preview.removeEventListener('click',pick);layer.remove();}};
 };
}
module.exports={install};
