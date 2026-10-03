'use strict';
function install(){
 const shown=new WeakSet();
 window.__dfyTrainerIntro=function({room,battle,arena,mark}){
  const reduced=matchMedia('(prefers-reduced-motion: reduce)'),preloaded=new Set(),animations=new Set();let card,timer;
  const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;};
  function avatar(side){
   const source=new URL(Dex.resolveAvatar(String(side?.avatar||'unknown')),location.href);
   const match=source.pathname.match(/^\/sprites\/trainers\/([a-z0-9-]+\.png)$/);
   return source.hostname==='play.pokemonshowdown.com'&&match?'dfy-asset://battle/trainer/'+match[1]:source.protocol==='https:'?source.href:'dfy-asset://battle/trainer/unknown.png';
  }
  function prepare(){for(const side of [battle.nearSide,battle.farSide]){if(!side)continue;const url=avatar(side);if(!preloaded.has(url)){preloaded.add(url);const image=new Image();image.src=url;}}}
  function clear(){clearTimeout(timer);for(const a of animations)a.cancel();animations.clear();card?.remove();card=null;delete arena.dataset.intro;}
  function start({instant=false}={}){
   if(shown.has(room)||!battle.started||battle.ended||battle.turn!==0||instant||!battle.scene.animating||battle.scene.acceleration>=3||!arena.getClientRects().length||document.hidden)return 0;
   shown.add(room);prepare();clear();const duration=reduced.matches?800:1800;
   card=el('section','dfy-entry-title dfy-trainer-intro');card.setAttribute('role','status');card.setAttribute('aria-label',(battle.nearSide.name||'我方')+' 对战 '+(battle.farSide.name||'对手'));
   card.append(el('small','dfy-intro-caption','训练家对战'));
   for(const [i,side]of [battle.nearSide,battle.farSide].entries()){
    const panel=el('div','dfy-intro-trainer'),image=el('img','dfy-intro-avatar');panel.dataset.side=i?'far':'near';image.src=avatar(side);image.alt=(side.name||'训练家')+'的头像';image.onerror=()=>{image.onerror=null;image.src='dfy-asset://battle/trainer/unknown.png';};
    panel.append(image,el('small','',i?'对手':'我方'),el('strong','',side.name||'训练家'));card.append(panel);
   }
   card.append(el('b','dfy-intro-vs','VS'),el('i','dfy-intro-sweep'),el('i','dfy-intro-orbit'));arena.append(card);arena.dataset.intro='true';
   if(!reduced.matches){
    const animate=(node,frames,options)=>{const a=node.animate(frames,{fill:'both',...options});animations.add(a);a.finished.catch(()=>{});};
    animate(card,[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.78},{opacity:0}],{duration});
    for(const panel of card.querySelectorAll('.dfy-intro-trainer'))animate(panel,[{opacity:0,transform:'translateX('+(panel.dataset.side==='near'?'-':'')+'60px)'},{opacity:1,transform:'translateX(0)'}],{duration:380,easing:'cubic-bezier(.15,.85,.25,1)'});
    animate(card.querySelector('.dfy-intro-sweep'),[{opacity:0,transform:'translateX(-160%) skew(-18deg)'},{opacity:.65,offset:.25},{opacity:0,transform:'translateX(240%) skew(-18deg)'}],{duration:780,delay:220});
    animate(card.querySelector('.dfy-intro-orbit'),[{opacity:0,transform:'translate(-50%,-50%) scale(.6)'},{opacity:.4,offset:.35},{opacity:0,transform:'translate(-50%,-50%) scale(1.6)'}],{duration:1000,delay:200});
    animate(card.querySelector('.dfy-intro-vs'),[{opacity:0,transform:'translate(-50%,-50%) scale(1.6)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{delay:120,duration:260,easing:'ease-out'});
   }
   timer=setTimeout(clear,duration);mark('battle-entry',(battle.nearSide.name||'我方')+' VS '+(battle.farSide.name||'对手'));return duration;
  }
  return{prepare,start,dispose:clear};
 };
}
module.exports={install};
