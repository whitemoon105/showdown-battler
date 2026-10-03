'use strict';
function readResult(battle,participantSide){
 if(!battle?.ended||battle.atQueueEnd===false||battle.seeking)return null;
 const line=[...(battle.stepQueue||[])].reverse().find(l=>typeof l==='string'&&/^\|(win\|.+|tie(?:\||$))/.test(l));if(!line)return null;
 const tied=line==='|tie'||line.startsWith('|tie|'),winner=tied?'':line.slice(5),normalize=name=>String(name||'').trim().toLowerCase().replace(/[^a-z0-9]/g,'')||String(name||'').trim();
 const side=(battle.sides||[]).find((s,i)=>(s.id||'p'+(i+1))===participantSide),winnerId=normalize(winner),ownId=normalize(side?.name);
 const kind=!side?'spectator':tied?'tie':winnerId&&winnerId===ownId?'win':'loss';
 return{kind,winner,tied,key:line,label:kind==='win'?'胜利！':kind==='loss'?'本局落败':kind==='tie'?'平局':tied?'观战结束 · 平局':'观战结束 · '+winner+' 获胜'};
}
function install(){
 const states=new WeakMap();
 window.__dfyBattleResult=function({room,battle,arena,header,audio,mark=()=>{}}){
  let state=states.get(room);if(!state){state={participantSide:null,shown:new Set()};states.set(room,state);}let disposed=false,badge,card,expiry;const animations=new Set(),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  function clear(){clearTimeout(expiry);for(const a of animations)a.cancel();animations.clear();card?.remove();card=null;}
  function animate(node,frames,options){const a=node.animate(frames,options);animations.add(a);a.finished.catch(()=>{}).finally(()=>animations.delete(a));}
  function sync(visible=true){
   if(disposed)return null;const side=room.request?.side?.id||room.side;if(/^p[1-4]$/.test(side))state.participantSide=side;
   const result=window.__dfyReadBattleResult(battle,state.participantSide);if(!result){badge?.remove();badge=null;clear();return null;}
   if(!badge){badge=el('span','dfy-result-badge');badge.setAttribute('role','status');header.append(badge);}badge.dataset.result=result.kind;if(badge.textContent!==result.label)badge.textContent=result.label;
   if(!visible||document.hidden||state.shown.has(result.key))return result;
   state.shown.add(result.key);mark('battle-result',result.kind);
   if(result.kind!=='spectator'){
    card=el('div','dfy-result-scene'+(result.kind==='win'?' dfy-victory':''));card.dataset.result=result.kind;card.setAttribute('aria-hidden','true');card.append(el('i','dfy-result-emblem',result.kind==='win'?'✦':result.kind==='tie'?'＝':'◇'),el('small','','对战结束'),el('strong','',result.label),el('span','dfy-result-caption',result.kind==='win'?'漂亮的一战':result.kind==='tie'?'旗鼓相当，再战一场': '回顾这一战，准备下一场'));arena.append(card);if(result.kind==='win')audio.victory();else audio.result?.(result.kind);
    if(!reduced.matches){animate(card,[{opacity:0,transform:'translate(-50%,-45%) scale(.94)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:.18},{opacity:1,offset:.78},{opacity:0,transform:'translate(-50%,-54%) scale(1)'}],{duration:3000,fill:'both'});
     if(result.kind==='win')for(let i=0;i<18;i++){const particle=el('i','dfy-victory-spark'),angle=i*Math.PI*2/18,dist=Math.min(arena.clientWidth||400,arena.clientHeight||300)*(.23+(i%3)*.035);particle.style.setProperty('--spark-color',['#dca563','#eab8cb','#a3cfc5'][i%3]);card.append(particle);animate(particle,[{opacity:0,transform:'translate(-50%,-50%) scale(.3)'},{opacity:1,offset:.16},{opacity:0,transform:'translate(calc(-50% + '+Math.cos(angle)*dist+'px),calc(-50% + '+Math.sin(angle)*dist+'px)) rotate(100deg)'}],{duration:1800,delay:i%3*90,fill:'both'});}
    }expiry=setTimeout(clear,3100);
   }return result;
  }
  const reduce=()=>{if(reduced.matches)clear();};reduced.addEventListener?.('change',reduce);
  return{sync,dispose(){disposed=true;clear();badge?.remove();reduced.removeEventListener?.('change',reduce);}};
 };
}
module.exports={readResult,install};
