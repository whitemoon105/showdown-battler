'use strict';
// A custom game surface around Showdown's animation engine, not its website chrome.
function install({css='',dictionary={},assetMeta={},descriptions={}}={}){
 if(window.__dfyDual)return;window.__dfyDual=true;document.body.dataset.dfyPresentation='dual';
 const style=document.createElement('style');style.id='dfy-dual-theme';style.textContent=css;document.head.append(style);
 const el=(tag,cls,text)=>{const n=document.createElement(tag);n.className=cls;if(text)n.textContent=text;return n;},zh=t=>dictionary[t]||t||'',id=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,''),set=(n,t)=>{if(n.textContent!==String(t))n.textContent=t;};
 const audio=window.__dfyBattleAudio=window.__dfyCreateBattleAudio(assetMeta);
 const local=(p,front=true)=>{let species=typeof p==='string'?p:p.getSpeciesForme?.()||p.speciesForme||p.species;if(p.volatiles?.dynamax?.[1]&&!/-Gmax$/i.test(species))species+='-Gmax';const s=Dex.species.get(species);return'dfy-asset://battle/sprite/'+s.id+'/'+(front?'front':'back')+'/'+(p.shiny?'shiny':'normal')+'/'+(p.gender==='F'?'F':'M');};
 // Native teambuilder portraits use CSS backgrounds, independently of battle sprites.
 Dex.getTeambuilderSprite=function(p,dex,xOffset=0,yOffset=0){
  if(!p)return'';const url=local(p),species=Dex.species.get(typeof p==='string'?p:p.species);
  const meta=window.__dfySpriteAssetKeys(url.replace('dfy-asset://battle/','')).map(key=>assetMeta[key]).find(Boolean);
  const width=meta?.width||96,height=meta?.height||96,scale=Math.min(90/width,72/height),w=width*scale,h=height*scale;
  return 'background-image:url('+url+');background-position:'+(10+(96-w)/2+xOffset)+'px '+(22+(72-h)/2+yOffset)+'px;background-repeat:no-repeat;background-size:'+w+'px '+h+'px';
 };
 Dex.getItemIcon=function(item){const entry=Dex.items.get(typeof item==='string'?item:item?.name||item?.id),key='item/'+entry.id;if(assetMeta[key])return'background:transparent url(dfy-asset://battle/'+key+') center/24px 24px no-repeat';const num=entry.spritenum||0;return'background:transparent url(dfy-asset://battle/atlas/items) '+(-(num%16)*24)+'px '+(-Math.floor(num/16)*24)+'px no-repeat';};
 const nativeType=Dex.getTypeIcon,typeOrder=['Normal','Fighting','Flying','Poison','Ground','Rock','Bug','Ghost','Steel','Fire','Water','Grass','Electric','Psychic','Ice','Dragon','Dark','Fairy'];
 const typeLabels=['一般','格斗','飞行','毒','地面','岩石','虫','幽灵','钢','火','水','草','电','超能力','冰','龙','恶','妖精'],typeColors=['#929da3','#cf4968','#8098d0','#a45fb0','#cc8956','#b09f75','#8fa945','#726bb2','#60959f','#e8944e','#6097cc','#69aa65','#d8b645','#d9628a','#76b9aa','#4e72b6','#786777','#ce82c0'];
 Dex.getTypeIcon=function(type,b){const index=typeOrder.indexOf(type);if(index<0)return nativeType.call(this,type,b);return'<span class="dfy-native-type" translate="no" title="'+typeLabels[index]+'" style="background-color:'+typeColors[index]+'"><i style="background-position:0 -'+(index*14)+'px"></i>'+typeLabels[index]+'</span>';};
 const oldSprite=Dex.getSpriteData;Dex.getSpriteData=function(p,front,options){
  const data=oldSprite.call(this,p,front,options);if(document.body.dataset.dfyDisplay!=='game')return data;
  const url=local(p,front),meta=window.__dfySpriteAssetKeys(url.replace('dfy-asset://battle/','')).map(key=>assetMeta[key]).find(Boolean),species=Dex.species.get(typeof p==='string'?p:p.getSpeciesForme?.()||p.speciesForme||p.species);
  const near=!front,dynamax=!!p.volatiles?.dynamax&&options?.dynamax!==false;
  const w=meta?.width||32,h=meta?.height||32;
  const dimensions=window.__dfySpriteDimensions({width:w,height:h,heightm:species.heightm,front,gen:data.gen,doubles:p?.side?.active?.length===2,slot:p.slot||0,dynamax});
  return{...data,url,pixelated:false,...dimensions};
 };
 for(const fx of Object.values(window.BattleEffects||{})){const name=fx.url?.split('/').pop();if(/^[a-z0-9-]+\.(png|gif)$/.test(name)){const key='fx/'+name;fx.url='dfy-asset://battle/'+(assetMeta[key]?key:'fx/shine.png');}}
 window.__dfyPixelBattle=function create({room,battle,arena,command,dictionary:terms}){
  const scene=battle.scene,screen=arena.parentElement,layout=screen.parentElement,record=layout.querySelector('.dfy-game-record'),header=screen.querySelector('.dfy-game-title');let disposed=false;const hooks=[],evidence=[];
  const tools=el('div','dfy-arena-tools'),timer=el('div','dfy-timer'),replayTools=el('div','dfy-replay-tools');tools.append(timer);header.append(tools);
  const musicLabel=el('small','dfy-music-label');tools.prepend(musicLabel);
  const musicTitles={'battle-galar-champion':'剑盾 · 冠军之战','battle-galar-gym':'剑盾 · 道馆之战','battle-paldea-elite':'朱紫 · 四天王','battle-paldea-gym':'朱紫 · 道馆之战'};
  const logNode=record.querySelector('.battle-log'),logHeader=record.querySelector('.dfy-record-header'),followButton=el('button','dfy-log-follow','跟随最新');
  followButton.type='button';followButton.setAttribute('aria-pressed','true');logHeader?.append(followButton);
  const battleLog=scene.log;let following=true;
  const updateFollow=()=>{followButton.textContent=following?'跟随最新':'回到最新';followButton.setAttribute('aria-pressed',String(following));};
  const onLogScroll=()=>{if(!logNode)return;following=logNode.scrollHeight-logNode.clientHeight-logNode.scrollTop<28;if(battleLog)battleLog.atBottom=following;updateFollow();};
  logNode?.setAttribute('tabindex','0');logNode?.setAttribute('aria-label','对战详情，可自由滚动');logNode?.addEventListener('scroll',onLogScroll,{passive:true});
  followButton.onclick=()=>{following=true;if(battleLog)battleLog.atBottom=true;if(logNode)logNode.scrollTop=logNode.scrollHeight;updateFollow();};
  const sidebar=el('aside','dfy-battle-sidebar'),roster=el('section','dfy-roster'),rosterHeader=el('header',''),rosterTitle=el('b','','对手队伍'),rosterCount=el('small',''),slots=el('div','dfy-roster-slots');rosterHeader.append(rosterTitle,rosterCount);roster.append(rosterHeader,slots);record.insertBefore(replayTools,record.querySelector('.battle-log'));sidebar.append(roster,record);layout.append(sidebar);
  const overlay=el('div','dfy-scene-overlay'),hudLayer=el('div','dfy-hud-layer'),preview=el('div','dfy-team-preview'),dialogue=el('div','dfy-scene-caption','选择招式，开始这一回合。'),splash=el('div','dfy-mechanic-splash');overlay.append(hudLayer,preview,splash);arena.append(overlay);command.prepend(dialogue);
  const choiceTools=el('div','dfy-choice-tools');command.append(choiceTools);const huds=new Map();const name=p=>zh(p?.getSpeciesForme?.()||p?.speciesForme||p?.species||'');
  const privateData=p=>(room.request?.side?.pokemon||[]).find(own=>own.ident===(p.ident||p.searchid?.split('|')[0]));
  function teraType(p){const own=privateData(p),index=room.request?.side?.pokemon?.indexOf(own);return p.terastallized||own?.teraType||own?.canTerastallize||(index>=0?room.request.active?.[index]?.canTerastallize:'')||'';}
  // Supplemental effects follow public animation events. They never delay a choice or
  // invent a hit/ability from a prediction. Native per-move animation remains intact.
  const fxLayer=el('div','dfy-accent-fx');arena.append(fxLayer);
  // 保留理由：晨光等全场光幕覆盖实际战场，不能跟随 640×360 精灵镜头露出矩形硬边；原生引擎继续管理动画和清理。
  let background,backgroundParent,backgroundNext;
  function restoreBackground(){if(!background)return;background.classList.remove('dfy-move-background');if(backgroundParent?.isConnected)backgroundParent.insertBefore(background,backgroundNext?.parentNode===backgroundParent?backgroundNext:null);else background.remove();background=null;}
  function fitBackground(){const next=scene.$bgEffect?.[0];if(!next||next===background)return;restoreBackground();background=next;backgroundParent=next.parentNode;backgroundNext=next.nextSibling;next.classList.add('dfy-move-background');arena.insertBefore(next,arena.querySelector('.battle'));}
  fitBackground();
  const timers=new Set(),animations=new Set(),transformStates=new WeakMap();
  const positioned=new WeakSet();
  function positionSprite(p){
   const sprite=p?.sprite;if(!sprite||positioned.has(sprite))return;positioned.add(sprite);
   const original=sprite.recalculatePos;sprite.recalculatePos=function(slot){
    original.call(this,slot);if(document.body.dataset.dfyDisplay!=='game'||this.scene.activeCount!==2||!['doubles','multi'].includes(battle.gameType))return;
    const far=this.isFrontSprite,scale=far?1:this.sp.gen===5?2:1.5;
    this.x=((far?[514,358]:[156,310])[slot]-(far?430:210))/scale;
    this.y=(far?[0,10]:[12,-7])[slot]/scale;
    const at=this.scene.pos({x:this.x,y:this.y,z:this.z},{w:0,h:96});this.left=at.left;this.top=at.top+40;
   };
   sprite.recalculatePos(p.slot||0);sprite.animReset?.();
  }
  for(const side of battle.sides)for(const p of side.pokemon)positionSprite(p);
  const colors={Fire:'#ff9a5a',Water:'#65c8ff',Electric:'#ffe17b',Grass:'#8adab2',Ice:'#a8edff',Fighting:'#f7ac93',Poison:'#cc92ee',Ground:'#d6af80',Flying:'#bbd4ff',Psychic:'#fa9dcb',Bug:'#bfda82',Rock:'#d5c8aa',Ghost:'#b5a0ef',Dragon:'#b298ff',Dark:'#aaa4c2',Steel:'#b1dae9',Fairy:'#f2bbe6',Normal:'#e0e6f3'};
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  function later(fn,delay=0){if(disposed||!scene.animating||scene.acceleration>=3||!arena.getClientRects().length)return;const t=setTimeout(()=>{timers.delete(t);if(!disposed&&scene.animating)fn();},Math.max(0,scene.timeOffset||0)+delay);timers.add(t);}
  function animate(n,frames,duration=650,delay=0){const a=n.animate(frames,{duration:reduced.matches?Math.min(duration,200):duration,delay,easing:'cubic-bezier(.2,.7,.2,1)',fill:'both'});animations.add(a);a.finished.catch(()=>{}).finally(()=>{animations.delete(a);n.remove();});return a;}
  function point(p){const sprite=p?.sprite,r=sprite?.$el?.[0]?.getBoundingClientRect(),a=arena.getBoundingClientRect();if(r?.width&&r?.height)return{x:r.x-a.x+r.width/2,y:r.y-a.y+r.height*.58};const scale=Math.min(a.width/640,a.height/360);return{x:(a.width-640*scale)/2+(sprite?.left||320)*scale,y:(a.height-360*scale)/2+(sprite?.top||180)*scale};}
  function piece(cls,at,color){while(fxLayer.childElementCount>72)fxLayer.firstElementChild.remove();const n=el('i','dfy-fx '+cls);n.style.left=at.x/arena.clientWidth*100+'%';n.style.top=at.y/arena.clientHeight*100+'%';n.style.setProperty('--fx-color',color);fxLayer.append(n);return n;}
  function ring(at,color,large=false){const n=piece('dfy-fx-ring',at,color);animate(n,[{opacity:0,transform:'translate(-50%,-50%) scale(.2)'},{opacity:.75,offset:.2},{opacity:0,transform:'translate(-50%,-50%) scale('+(large?2.6:1.4)+')'}],large?1050:650);}
  function sparks(at,color,count=9){if(reduced.matches)return;for(let i=0;i<count;i++){const angle=i/count*Math.PI*2,dist=(28+(i%3)*13)*Math.min(1.5,Math.max(.65,arena.clientHeight/380)),n=piece('dfy-fx-spark',at,color);animate(n,[{opacity:0,transform:'translate(-50%,-50%) scale(.4)'},{opacity:.85,offset:.18},{opacity:0,transform:'translate('+Math.cos(angle)*dist+'px,'+(Math.sin(angle)*dist-15)+'px) scale(.1)'}],560+i%3*100);}}
  function travel(from,to,color,returning=false){const n=piece('dfy-fx-trail',from,color),dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;animate(n,[{opacity:0,transform:'rotate('+angle+'deg) scaleX(.1)'},{opacity:.65,offset:.2},{opacity:0,transform:'translate('+dx+'px,'+dy+'px) rotate('+angle+'deg) scaleX('+(returning?'.2':'1.2')+')'}],returning?480:430);}
  // Showdown owns the single ball and the Pokemon reveal timeline. Add only
  // the opening light and sound at that ball's arrival, never another ball.
  let entranceContext=null;
  function entranceAccent(p,end,effect,returning){
   const at=()=>{const stage=arena.querySelector('.battle'),r=stage.getBoundingClientRect(),a=arena.getBoundingClientRect(),pos=scene.pos(end,effect),scale=r.width/640;return{x:r.x-a.x+(pos.left+pos.width/2)*scale,y:r.y-a.y+(pos.top+pos.height/2)*scale};};
   mark(returning?'recall-fx':'entry-fx',name(p));
   if(returning){later(()=>{sound('recall');ring(point(p),'#efa5b8');});return;}
   later(()=>{const target=at();ring(target,'#d8f5ff',true);sparks(target,'#fff',8);sound('summon');cry(p);mark('entry-open',name(p));},end.time||300/scene.acceleration);
  }
  const abilityQueue=[];let showingAbility=false;
  function nextAbility(){if(disposed||showingAbility||!abilityQueue.length)return;showingAbility=true;const {p,abilityName}=abilityQueue.shift(),card=el('div','dfy-ability-toast');card.append(el('small','',(p.side===battle.nearSide?'我方':'对方')+' · '+name(p)),el('strong','',abilityName));fxLayer.append(card);animate(card,[{opacity:0,translate:'0 8px'},{opacity:1,translate:'0 0',offset:.12},{opacity:1,offset:.8},{opacity:0,translate:'0 -7px'}],1200).finished.catch(()=>{}).finally(()=>{showingAbility=false;nextAbility();});}
  function ability(p,result){later(()=>{const plain=document.createElement('span');plain.innerHTML=String(result);const abilityName=zh(plain.textContent.trim());mark('ability',abilityName);abilityQueue.push({p,abilityName});nextAbility();ring(point(p),'#f5d99c');});}
  let lastMove=null;
  const sound=key=>audio.play('audio/'+key+'.wav');
  function cry(p){const num=Dex.species.get(p.getSpeciesForme?.()||p.speciesForme).num;if(num>0)audio.play('cry/'+num+'.ogg',.14);}
  function impact(p,kind){later(()=>{const strong=kind==='super4'||kind==='critical',at=point(p);sound(kind);ring(at,strong?'#ffcf8b':'#ffdcaf',strong);sparks(at,strong?'#ffd996':'#ffedc9',strong?14:8);mark('impact-sound',kind);if(strong&&!reduced.matches){const stage=arena.querySelector('.battle');stage?.animate([{translate:'0 0'},{translate:'-4px 1px'},{translate:'4px -1px'},{translate:'-2px 0'},{translate:'0 0'}],{duration:240});}if(kind!=='hit'){const text=kind==='critical'?'击中要害！':kind==='super4'?'效果拔群 ×4':'效果拔群 ×2',existing=fxLayer.querySelector('.dfy-impact-title');if(existing){if(!existing.textContent.includes(text))existing.textContent+=' · '+text;if(kind==='critical')existing.dataset.kind=kind;return;}const label=el('div','dfy-impact-title',text);label.dataset.kind=kind;fxLayer.append(label);animate(label,[{opacity:0,transform:'translateX(-50%) scale(1.1)'},{opacity:1,transform:'translateX(-50%) scale(1)',offset:.15},{opacity:1,offset:.65},{opacity:0,transform:'translate(-50%,-10px)'}],950);}});}
  function mark(kind,value){evidence.push({kind,name:value,at:Date.now()});if(evidence.length>100)evidence.shift();}
  const intro=window.__dfyTrainerIntro({room,battle,arena,mark});
  const field=window.__dfyFieldEffects({arena,battle,mark,privateData,zh});
  const choice=window.__dfyBattleChoice({room,battle,command,preview,name,local,zh});
  const moveInfo=window.__dfyMoveInfo({command,battle,descriptions,zh});
  const result=window.__dfyBattleResult({room,battle,arena,header:tools,audio,mark});
  function announce(t){set(dialogue,t);}
  function hook(method,fn){const original=scene[method];if(typeof original!=='function')return;const wrapped=function(...args){fn(...args);return original.apply(this,args);};scene[method]=wrapped;hooks.push({method,original,wrapped});}
  hook('backgroundEffect',fitBackground);
  function mechanic(p,kind){
   if(!scene.animating)return;mark(kind,p.terastallized||name(p));
   const title=({tera:'太晶化',mega:'超级进化',dynamax:'极巨化',zpower:'Ｚ力量'})[kind];
   announce(name(p)+' · '+title);splash.replaceChildren();splash.dataset.kind=kind;
   const label=el('b','',title);
   if(kind==='tera'){const img=el('img','');img.src='dfy-asset://battle/tera/'+id(p.terastallized);img.alt=zh(p.terastallized);splash.append(img);}splash.append(label);
   splash.animate([{opacity:0,transform:'translateY(12px) scale(.9)'},{opacity:1,transform:'none',offset:.18},{opacity:1,offset:.7},{opacity:0}],{duration:1500});
   later(()=>{sound('transform');const wash=el('div','dfy-transformation-wash');wash.style.setProperty('--fx-color',kind==='dynamax'?'#e568b699':kind==='tera'?'#8ddde6aa':'#b9a3efaa');fxLayer.prepend(wash);animate(wash,[{opacity:0,transform:'scale(1)'},{opacity:.8,offset:.35},{opacity:0,transform:'scale(1.35)'}],1500);});
  }
  hook('runMoveAnim',(move,ps)=>{if(!scene.animating)return;const data=battle.dex.moves.get(move);mark('move',move);announce(name(ps[0])+' 使用了 '+zh(data.name)+'！');lastMove={id:data.id,actor:ps[0],type:data.type,targets:ps.slice(1),at:Date.now()};later(()=>{const from=point(ps[0]),color=colors[data.type]||colors.Normal;if(data.category==='Status'){ring(from,color);return;}ring(from,color);for(const target of ps.slice(1))if(target!==ps[0])travel(from,point(target),color);mark('move-accent',move);});});
  for(const side of battle.sides)for(const p of side.pokemon)transformStates.set(p,{tera:p.terastallized,dynamax:!!p.volatiles?.dynamax,forme:p.getSpeciesForme?.()});
  hook('animTransform',p=>{const next={tera:p.terastallized,dynamax:!!p.volatiles?.dynamax,forme:p.getSpeciesForme?.()},old=transformStates.get(p)||{};transformStates.set(p,next);const kind=next.tera&&next.tera!==old.tera?'tera':next.dynamax&&!old.dynamax?'dynamax':/mega/i.test(next.forme||'')&&next.forme!==old.forme?'mega':null;if(kind){mechanic(p,kind);later(()=>{const color=kind==='tera'?'#bdf4ff':kind==='dynamax'?'#f59fc7':'#ceb1ff';ring(point(p),color,true);sparks(point(p),color,14);});}});
  hook('runOtherAnim',(effect,ps)=>{if(effect==='zpower'&&ps[0])mechanic(ps[0],'zpower');});
  for(const method of ['animSummon','animUnsummon']){const original=scene[method],returning=method==='animUnsummon';const wrapped=function(p,...args){positionSprite(p);if(!returning)scene.timeOffset+=intro.start({instant:!!args[1]});if(scene.animating){mark(returning?'switch-out':'summon',name(p));if(!returning)announce('上吧，'+name(p)+'！');}const previous=entranceContext;entranceContext={p,returning};try{return original.call(this,p,...args);}finally{entranceContext=previous;}};scene[method]=wrapped;hooks.push({method,original,wrapped});}
  {const method='showEffect',original=scene[method],wrapped=function(effect,start,end,transition,after,...args){
   if(entranceContext&&(effect==='pokeball'||effect===window.BattleEffects?.pokeball)){
    const {p,returning}=entranceContext,near=p.side===battle.nearSide,data=typeof effect==='string'?window.BattleEffects[effect]:effect;
    if(!returning){start={...start,x:start.x+(near?-105:105),y:start.y+18,opacity:1,scale:near?1:.82};end={...end,scale:near?1:.82};}
    entranceAccent(p,{...end},data,returning);mark('entry-ball',name(p));
   }
   return original.call(this,effect,start,end,transition,after,...args);
  };scene[method]=wrapped;hooks.push({method,original,wrapped});}
  hook('abilityActivateAnim',(p,result)=>{ability(p,result);later(()=>sound('ability'));});
  {const method='resultAnim',original=scene[method],wrapped=function(p,result,...args){if(result==='Critical hit'){impact(p,'critical');return;}if(result==='Super-effective'){const factor=lastMove?typeFactor(battle.dex.moves.get(lastMove.id),p,lastMove.actor):2;impact(p,factor>=4?'super4':'super2');return;}return original.call(this,p,result,...args);};scene[method]=wrapped;hooks.push({method,original,wrapped});}
  hook('damageAnim',p=>{mark('damage',name(p));if(lastMove?.targets.includes(p)&&Date.now()-lastMove.at<7000)later(()=>{const color=colors[lastMove?.type]||colors.Normal;const at=point(p);ring(at,color);sparks(at,color,12);const slash=piece('dfy-hit-slash',at,color);animate(slash,[{opacity:0,transform:'translate(-50%,-50%) rotate(-35deg) scale(.2)'},{opacity:1,offset:.18,transform:'translate(-50%,-50%) rotate(-35deg) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) rotate(-35deg) scale(1.5)'}],480);sound('hit');mark('impact-fx',name(p));});});
  function typeFactor(move,target,source){if(move.category==='Status')return null;let type=move.type;const actor=source||battle.nearSide?.active?.[Math.min(room?.choice?.choices?.length||0,(battle.nearSide?.active?.length||1)-1)];if(move.id==='terablast'&&actor?.terastallized)type=actor.terastallized;if(type==='Stellar')return target.terastallized?2:1;const ability=id(target.ability),attacking=id(actor?.ability);const ignore=['moldbreaker','teravolt','turboblaze'].includes(attacking)||move.ignoreAbility;
   if(!ignore&&({levitate:'Ground',flashfire:'Fire',waterabsorb:'Water',stormdrain:'Water',dryskin:'Water',voltabsorb:'Electric',lightningrod:'Electric',motordrive:'Electric',sapsipper:'Grass',eartheater:'Ground'})[ability]===type)return 0;
   let value=1;for(const t of target.getTypeList?.()||Dex.species.get(target.speciesForme).types){const effect=battle.dex.types.get(t).damageTaken?.[type];let factor=effect===1?2:effect===2?.5:effect===3?0:1;if(move.id==='freezedry'&&t==='Water')factor=2;if(t==='Ghost'&&['Normal','Fighting'].includes(type)&&['scrappy','mindseye'].includes(attacking))factor=1;if(type==='Ground'&&t==='Flying'&&battle.hasPseudoWeather?.('Gravity'))factor=1;value*=factor;if(move.id==='flyingpress'){const second=battle.dex.types.get(t).damageTaken?.Flying;value*=second===1?2:second===2?.5:second===3?0:1;}}return value;
  }
  function decorateButtons(){
   const visible=n=>{for(let p=n;p&&p!==room.el.querySelector('.battle-controls');p=p.parentElement)if(p.hidden||getComputedStyle(p).display==='none')return false;return true;};
   for(const clone of [...choiceTools.children,...replayTools.children]){const input=clone.querySelector('input'),selector=input?'input[name="'+input.dataset.nativeToggle+'"]':'button[name="'+clone.dataset.nativeAction+'"]';if(![...room.el.querySelectorAll('.battle-controls '+selector)].some(visible))clone.remove();}
   const tb=timer.querySelector('button'),nt=room.el.querySelector('.battle-controls [name=openTimer]');if(tb&&nt){const value=nt.textContent.replace(/\s+/g,' ').trim();set(tb,/\d/.test(value)?value:'计时器');tb.onclick=e=>{e.stopPropagation();room.el.querySelector('.battle-controls [name=openTimer]')?.click();};}
   const buttons=command.querySelector('.dfy-game-buttons');if(!buttons)return;
   const doubles=(battle.nearSide?.active.length||1)>1,selectingTarget=room.choice?.type==='movetarget',actorIndex=Math.max(0,Math.min((room.choice?.choices?.length||0)-(selectingTarget?1:0),(battle.nearSide?.active.length||1)-1)),actor=battle.nearSide?.active[actorIndex];
   if(room.request?.teamPreview&&room.choice)announce('请选择第 '+((room.choice.done||0)+1)+' 只 · 已选 '+(room.choice.done||0)+' / '+(room.choice.count||room.request.maxTeamSize||6));
   else if(room.choice?.waiting||room.request?.wait)announce('已提交选择，等待对手行动');
   else if(doubles&&room.choice&&battle.atQueueEnd&&!room.request?.wait)announce((selectingTarget?'选择目标':'选择行动')+' · 我方 '+(actorIndex+1)+' 号位 '+name(actor));
   for(const h of huds.values())h.node.dataset.acting=String(doubles&&h.node.__pokemon===actor&&!room.request?.wait);
   for(const b of [...buttons.querySelectorAll('.dfy-game-action,.dfy-game-check')]){const action=b.dataset.nativeAction;if(b.classList.contains('dfy-game-check')||['undoChoice','clearChoice'].includes(action)){const selector=b.classList.contains('dfy-game-check')?'[data-native-toggle="'+b.querySelector('input').dataset.nativeToggle+'"]':'[data-native-action="'+action+'"]';const old=choiceTools.querySelector(selector);if(old)old.closest('.dfy-game-check')?.remove()||old.remove();if(action==='clearChoice')b.textContent='重新选择';choiceTools.append(b);continue;}if(action==='openTimer'){timer.replaceChildren(b);const native=room.el.querySelector('.battle-controls [name=openTimer]');const text=native?.textContent.replace(/\s+/g,' ').trim();b.textContent=/\d/.test(text)?text:'计时器';b.classList.toggle('running',!!battle.kickingInactive);continue;}if(['skipTurn','goToEnd','rewindTurn','instantReplay','saveReplay','play','pause','resume'].includes(action)){replayTools.querySelector('[data-native-action="'+action+'"]')?.remove();replayTools.append(b);continue;}
    if(b.dataset.switchIndex!==undefined){
     const p=battle.myPokemon?.[Number(b.dataset.switchIndex)];if(!p)continue;
     let strip=buttons.querySelector('.dfy-switch-strip');if(!strip){strip=el('div','dfy-switch-strip');strip.setAttribute('aria-label',room.request?.teamPreview?'选择出场阵容':'选择换入的宝可梦');buttons.append(strip);}
     strip.style.gridTemplateColumns='repeat('+Math.max(1,battle.myPokemon?.length||6)+',minmax(0,1fr))';if(b.parentElement!==strip)strip.append(b);
     const previewMode=!!room.request?.teamPreview,order=room.choice?.teamPreview?.indexOf(Number(b.dataset.switchIndex)+1),selected=previewMode&&order>=0&&order<(room.choice.done||0);
     const ratio=p.maxhp?Math.max(0,p.hp/p.maxhp):0,tera=teraType(p),state=previewMode?(selected?'第 '+(order+1)+' 只':'选择'):p.fainted?'已倒下':p.active?'场上':b.disabled?'不可换入':'换入';b.dataset.selected=String(selected);
     const key=[name(p),p.hp,p.maxhp,p.status,state,tera].join('|');
     if(b.dataset.pokemonKey!==key){b.dataset.pokemonKey=key;b.replaceChildren();const img=el('img','dfy-switch-sprite');img.src=local(p);img.alt=name(p);const track=el('span','dfy-switch-hp'),fill=el('i','');fill.style.width=ratio*100+'%';fill.dataset.color=ratio>.5?'green':ratio>.2?'yellow':'red';track.append(fill);b.append(img,el('span','dfy-switch-name',name(p)));if(!previewMode)b.append(track);b.append(el('span','dfy-switch-state',state));b.title=name(p)+' · '+state+'\nHP '+p.hp+' / '+p.maxhp+(p.status?' · '+zh(p.status):'')+(tera?'\n太晶属性：'+zh(tera):'');b.setAttribute('aria-label',b.title.replace(/\n/g,'，'));}
     continue;
    }
    if(['chooseMoveTarget','chooseSwitchTarget'].includes(action)){
     const value=Number(b.dataset.nativeValue),far=action==='chooseMoveTarget'&&value>0,index=action==='chooseMoveTarget'?Math.abs(value)-1:value,p=(far?battle.farSide:battle.nearSide)?.active[index];if(!p)continue;
     const tag=(far?'对方':'我方')+' '+(index+1)+' 号位',key=tag+'|'+name(p);b.dataset.targetSide=far?'far':'near';if(b.dataset.targetKey!==key){b.dataset.targetKey=key;b.replaceChildren();const img=el('img','dfy-target-sprite');img.src=local(p);img.alt='';b.append(img,el('span','dfy-target-position',tag),el('b','dfy-target-name',name(p)));b.setAttribute('aria-label',tag+' '+name(p));}continue;
    }
    if(action==='chooseMove'){const native=room.el.querySelector('.battle-controls [name=chooseMove][value="'+b.dataset.nativeValue+'"]'),move=battle.dex.moves.get(native?.dataset.move||native?.textContent.split('\n')[0]);if(!move.exists)continue;b.dataset.moveId=move.id;const active=(battle.farSide?.active||[]).filter(p=>p&&!p.fainted),factors=active.map(p=>typeFactor(move,p)).filter(n=>n!==null),best=factors.length?Math.max(...factors):null,label=best===null?'变化招式':best>1?'效果拔群':best===1?'':best===0?'无效':'效果不佳';let badge=b.querySelector('.dfy-effectiveness');if(!badge){badge=el('span','dfy-effectiveness');b.append(badge);}set(badge,label);badge.hidden=doubles;badge.dataset.effect=best===null?'status':best>1?'super':best===0?'immune':best<1?'resist':'normal';let scope=b.querySelector('.dfy-move-scope');if(doubles){if(!scope){scope=el('span','dfy-move-scope');b.append(scope);}const target=native?.dataset.target||move.target;set(scope,move.id==='allyswitch'?'交换我方位置':({allAdjacent:'全体 · 含队友',allAdjacentFoes:'敌方全体',adjacentAlly:'选择队友',adjacentAllyOrSelf:'我方单体',self:'自身',allySide:'我方场地',foeSide:'对方场地',all:'全场',randomNormal:'随机单体'})[target]||'选择目标');}b.removeAttribute('title');}
   }
   const toggle=choiceTools.querySelector('[data-native-toggle=terastallize]');if(toggle){const label=toggle.closest('label'),index=Math.min(room.choice?.choices?.length||0,(battle.nearSide?.active?.length||1)-1),p=battle.nearSide?.active?.[index],type=p?teraType(p):room.request?.active?.[index]?.canTerastallize;let caption=label.querySelector('.dfy-tera-choice');if(!caption){for(const n of [...label.childNodes])if(n.nodeType===3)n.remove();caption=el('span','dfy-tera-choice');label.append(caption);}set(caption,'太晶化'+(type?' · '+zh(type):''));}
  }
  let rosterKey='',previewKey='';function sync(){if(disposed)return;const side=battle.farSide,size=side?.totalPokemon||6,known=(side?.pokemon||[]).slice(0,size),key=known.map(p=>[p.searchid,p.speciesForme,p.fainted,side.active.includes(p)].join(':')).join('|');
   if(key!==rosterKey){rosterKey=key;set(rosterTitle,(side?.name||'对手')+' 的队伍');set(rosterCount,known.filter(p=>!p.fainted).length+' / '+size);slots.replaceChildren(...Array.from({length:Math.max(known.length,size)},(_,i)=>{const p=known[i],slot=el('div','dfy-roster-slot');slot.dataset.fainted=String(!!p?.fainted);slot.dataset.active=String(!!p&&side.active.includes(p));if(p){const img=el('img','');img.src=local(p);img.alt=name(p);slot.append(img,el('span','',name(p)),el('small','',p.fainted?'已倒下':side.active.includes(p)?'场上':'待命'));}else slot.append(el('i','dfy-pokeball'),el('span','','未公开'));return slot;}));}
   const active=new Set();for(const [sideName,team]of [['near',battle.nearSide],['far',battle.farSide]])for(const [i,p]of (team?.active||[]).entries()){if(!p)continue;active.add(p);const spriteNode=p.sprite?.$el?.[0];if(spriteNode){spriteNode.style.marginLeft='0px';spriteNode.style.zIndex=sideName==='near'?'3':'2';spriteNode.style.filter=sideName==='near'?'drop-shadow(0 12px 7px #394a6426)':'drop-shadow(0 7px 5px #394a641b)';}let h=huds.get(p);if(!h){const node=el('section','dfy-active-hud'),head=el('header',''),title=el('b',''),level=el('small',''),hp=el('i',''),bar=el('div','dfy-hp-track'),foot=el('footer',''),status=el('span',''),numbers=el('span',''),tera=el('span','dfy-tera-badge'),teraIcon=el('img',''),teraLabel=el('span','');tera.append(teraIcon,teraLabel);head.append(title,level);bar.append(hp);foot.append(status,numbers);node.append(head,bar,foot,tera);hudLayer.append(node);h={node,title,level,hp,status,numbers,tera,teraIcon,teraLabel};huds.set(p,h);}h.node.__pokemon=p;h.node.hidden=false;h.node.dataset.side=sideName;h.node.dataset.slot=i;set(h.title,name(p));set(h.level,'等级 '+(p.level||100));const ratio=p.maxhp?Math.max(0,p.hp/p.maxhp):0;h.hp.style.width=100*ratio+'%';h.hp.dataset.color=ratio>.5?'green':ratio>.2?'yellow':'red';set(h.status,({brn:'灼伤',par:'麻痹',slp:'睡眠',psn:'中毒',tox:'剧毒',frz:'冰冻'})[p.status]||(p.terastallized?'太晶·'+zh(p.terastallized):''));set(h.numbers,sideName==='near'?Math.ceil(p.hp)+' / '+p.maxhp:Math.round(ratio*100)+'%');const type=sideName==='near'?teraType(p):p.terastallized;h.tera.hidden=!type;if(type){const url='dfy-asset://battle/tera/'+id(type);if(h.teraIcon.getAttribute('src')!==url)h.teraIcon.src=url;h.teraIcon.alt=zh(type);set(h.teraLabel,'太晶 · '+zh(type));h.tera.title=(p.terastallized?'已太晶化：':'太晶属性：')+zh(type);h.tera.dataset.active=String(!!p.terastallized);}}
   for(const [p,h]of huds)h.node.hidden=!active.has(p);overlay.dataset.double=String((battle.nearSide?.active.length||1)>1);arena.dataset.double=overlay.dataset.double;
   const choosing=(room.request?.teamPreview&&!battle.nearSide?.active.some(Boolean))||(!battle.turn&&!battle.ended&&!battle.nearSide?.active.some(Boolean)&&known.length>0);preview.hidden=!choosing;arena.dataset.preview=String(!!choosing);
   const pk=choosing?key+'|'+(battle.nearSide?.pokemon||[]).map(p=>p.speciesForme).join(','):'';
   if(pk!==previewKey){previewKey=pk;preview.replaceChildren();
    if(choosing){announce(room.request?.teamPreview?'点击下方队伍，选择出场顺序。':'等待训练家选择出场阵容。');preview.append(el('h2','','选择出场阵容'),el('p','','点击自己的宝可梦，按下方位置安排出场顺序'));
     for(const [team,label] of [[battle.nearSide,'我方']]){const block=el('section','dfy-preview-team');block.append(el('b','',label+' · '+(team?.name||'训练家')));const row=el('div','dfy-preview-row');for(const [index,p] of (battle.myPokemon||team?.pokemon||[]).entries()){const fig=el('button','dfy-preview-pick'),img=el('img','');fig.type='button';fig.dataset.previewPokemon=index;img.src=local(p);img.alt=name(p);fig.append(img,el('figcaption','',name(p)));row.append(fig);}block.append(row);preview.append(block);}
    }
   }
   const track=audio.music.track?.match(/bgm\/([^/.]+)\.mp3/)?.[1];set(musicLabel,track?'♫ '+(musicTitles[track]||'对战音乐'):'');musicLabel.title='本地音乐 · 音量由应用声音设置控制';
   intro.prepare();audio.sync(room,battle,!!arena.getClientRects().length&&!document.hidden);field.sync();
   for(const sideName of ['near','far']){const cards=[...huds.values()].filter(h=>!h.node.hidden&&h.node.dataset.side===sideName).sort((a,b)=>a.node.dataset.slot-b.node.dataset.slot);let offset=12;for(const h of cards){const n=h.node;if(overlay.dataset.double==='true'){n.style.width=Math.min(158,Math.max(128,arena.clientWidth*.23))+'px';n.style.left=sideName==='far'?'12px':'auto';n.style.right=sideName==='near'?'12px':'auto';n.style.top=sideName==='far'?offset+'px':'auto';n.style.bottom=sideName==='near'?offset+'px':'auto';offset+=n.offsetHeight+8;}else for(const prop of ['width','left','right','top','bottom'])n.style.removeProperty(prop);}}
   decorateButtons();choice.sync();moveInfo.sync();const outcome=result.sync(!!arena.getClientRects().length);if(battle.ended)announce(outcome?.label||'对战结束');resize();
  }
  let cameraKey='',bounds=[];
  const resize=()=>{const stage=arena.querySelector('.battle');if(!stage||!arena.clientWidth)return;
   const compact=arena.clientWidth<700;arena.dataset.compact=String(compact);
   const active=[battle.nearSide,battle.farSide].flatMap(s=>s?.active||[]).filter(p=>p&&!p.fainted),key=active.map(p=>[p.searchid,p.getSpeciesForme?.(),p.slot,!!p.volatiles?.dynamax].join(':')).join('|');
   if(key!==cameraKey){const next=active.map(p=>{const s=p.sprite;if(!s?.sp)return null;const n=scene.pos({x:s.x,y:s.y,z:s.z},s.sp);return {x:n.left,y:n.top,w:n.width,h:n.height};}).filter(Boolean);if(next.length===active.length&&next.every(b=>b.w>0&&b.h>0)){bounds=next;cameraKey=key;}}
   const columns=side=>Math.max(0,...[...huds.values()].filter(h=>!h.node.hidden&&h.node.dataset.side===side).map(h=>h.node.offsetWidth))+26;
   const rows=side=>Math.max(0,...[...huds.values()].filter(h=>!h.node.hidden&&h.node.dataset.side===side).map(h=>h.node.offsetHeight))+24;
   const camera=window.__dfyBattleCamera({width:arena.clientWidth,height:arena.clientHeight,bounds,leftInset:compact?16:columns('far'),rightInset:compact?16:columns('near'),topInset:compact?rows('far'):0,bottomInset:compact?rows('near'):0,centered:compact,doubles:overlay.dataset.double==='true'});
   stage.style.setProperty('--dual-scale',camera.scale);stage.style.setProperty('--dual-left',camera.left+'px');stage.style.setProperty('--dual-top',camera.top+'px');field.setCamera(camera);
  };const observer=new ResizeObserver(resize);observer.observe(arena);const tick=setInterval(sync,500);sync();resize();
  return{sync,afterMirror(){decorateButtons();choice.sync();moveInfo.sync();},evidence,field,dispose(){disposed=true;restoreBackground();intro.dispose();moveInfo.dispose();result.dispose();choice.dispose();field.dispose();audio.stop(room);clearInterval(tick);logNode?.removeEventListener('scroll',onLogScroll);for(const t of timers)clearTimeout(t);for(const a of animations)a.cancel();observer.disconnect();for(const h of hooks)if(scene[h.method]===h.wrapped)scene[h.method]=h.original;tools.remove();overlay.remove();fxLayer.remove();dialogue.remove();choiceTools.remove();layout.append(record);sidebar.remove();replayTools.remove();}};
 };
}
module.exports={install};
