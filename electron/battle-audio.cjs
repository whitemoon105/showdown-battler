'use strict';
function install(){
 window.__dfyCreateBattleAudio=function(assetMeta={}){
  const nativeSound=window.BattleSound;if(nativeSound){const mute=nativeSound.setMute?.bind(nativeSound);mute?.(true);nativeSound.setMute=()=>mute?.(true);nativeSound.playEffect=()=>{};nativeSound.loadBgm=()=>({resume(){},pause(){},stop(){},destroy(){}});}
  let context,effectsBus,bgm,owner='',duckTimer,ducked=false,previous='';const levels={bgm:1,effects:1,muted:false},buffers=new Map(),chosen=new Map(),sources=new Set(),events=[],playlist=Object.keys(assetMeta).filter(k=>k.startsWith('bgm/'));
  const log=(kind,key)=>{events.push({kind,key,at:Date.now()});if(events.length>100)events.shift();};
  const musicVolume=()=>{if(bgm)bgm.volume=(ducked?.13:.28)*levels.bgm*(levels.muted?0:1);};
  const ctx=()=>{if(!context){context=new AudioContext();effectsBus=context.createGain();effectsBus.gain.value=levels.muted?0:levels.effects;effectsBus.connect(context.destination);}return context;};
  const unlock=()=>{if(levels.muted)return;if(context?.state==='suspended')context.resume().catch(()=>{});if(bgm?.paused&&owner)bgm.play().catch(()=>{});};document.addEventListener('pointerdown',unlock,{passive:true});
  const remember=(source,gain)=>{if(sources.size>=8)sources.values().next().value.stop();sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();gain.disconnect();};};
  async function play(key,volume=.42){
   if(!assetMeta[key]||levels.muted||!levels.effects)return;
   try{const c=ctx();if(c.state!=='running')await c.resume();if(!buffers.has(key))buffers.set(key,fetch('dfy-asset://battle/'+key).then(r=>{if(!r.ok)throw Error('Missing sound');return r.arrayBuffer();}).then(b=>c.decodeAudioData(b)));const buffer=await buffers.get(key);if(levels.muted||!levels.effects)return;if(buffers.size>36)buffers.delete(buffers.keys().next().value);
    const source=c.createBufferSource(),gain=c.createGain();source.buffer=buffer;gain.gain.value=volume;source.connect(gain);gain.connect(effectsBus);remember(source,gain);source.start();log('sound',key);
    if(bgm&&/^audio\/(?:summon|recall|transform)\.wav$/.test(key)){ducked=true;musicVolume();clearTimeout(duckTimer);duckTimer=setTimeout(()=>{ducked=false;musicVolume();},700);}
   }catch{buffers.delete(key);}
  }
  async function victory(){
   if(levels.muted||!levels.effects)return;
   try{const c=ctx();if(c.state!=='running')await c.resume();if(levels.muted||!levels.effects)return;
    for(const [i,hz]of [523.25,659.25,783.99,1046.5].entries()){const source=c.createOscillator(),gain=c.createGain(),start=c.currentTime+i*.095,duration=i===3?.45:.2;source.type='sine';source.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.065,start+.015);gain.gain.exponentialRampToValueAtTime(.001,start+duration);source.connect(gain);gain.connect(effectsBus);remember(source,gain);source.start(start);source.stop(start+duration+.02);}log('sound','victory');
   }catch{}
  }
  async function result(kind){
   if(!['loss','tie'].includes(kind)||levels.muted||!levels.effects)return;
   try{const c=ctx();if(c.state!=='running')await c.resume();if(levels.muted||!levels.effects)return;for(const [i,hz]of (kind==='tie'?[440,554.37,659.25]:[392,329.63,261.63]).entries()){const source=c.createOscillator(),gain=c.createGain(),start=c.currentTime+i*.16;source.type='sine';source.frequency.value=hz;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.05,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.42);source.connect(gain);gain.connect(effectsBus);remember(source,gain);source.start(start);source.stop(start+.45);}log('sound',kind);}catch{}
  }
  function setVolumes(input={}){for(const key of ['bgm','effects'])if(key in input){const value=Number(input[key]);if(Number.isFinite(value))levels[key]=Math.min(1,Math.max(0,value));}if('muted'in input)levels.muted=!!input.muted;if(effectsBus)effectsBus.gain.value=levels.muted?0:levels.effects;musicVolume();return{...levels};}
  function sync(room,battle,visible){
   if(!visible||battle.ended||battle.paused||!battle.started){if(owner===room.id){bgm?.pause();owner='';}return;}if(owner===room.id||!playlist.length)return;bgm?.pause();owner=room.id;let key=chosen.get(owner);if(!key){const options=playlist.filter(k=>k!==previous),pool=options.length?options:playlist;key=pool[Math.floor(Math.random()*pool.length)];chosen.set(owner,key);previous=key;}if(!bgm||!bgm.src.endsWith(key)){bgm=new Audio('dfy-asset://battle/'+key);bgm.loop=true;}ducked=false;clearTimeout(duckTimer);musicVolume();bgm.play().then(()=>log('bgm',key)).catch(()=>{});
  }
  return{play,victory,result,sync,setVolumes,events,stop(room){if(owner===room.id){bgm?.pause();owner='';}},get levels(){return{...levels};},get music(){return{owner,track:bgm?.src,volume:bgm?.volume,...levels,paused:bgm?.paused,time:bgm?.currentTime,readyState:bgm?.readyState,error:bgm?.error?.message};}};
 };
}
module.exports={install};
