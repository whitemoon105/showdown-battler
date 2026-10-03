'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Store}=require('../core/store.cjs'),{readResult}=require('../electron/battle-result.cjs');
test('audio settings migrate the old level once and independently persist music, effects and mute',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'battler-audio-'));
 try{let store=new Store(root);store.set('settings',{audioVolume:25,audioMuted:true});assert.equal(store.settings().bgmVolume,25);assert.equal(store.settings().effectsVolume,25);
  store.saveSettings({bgmVolume:0,effectsVolume:65});store=new Store(root);assert.equal(store.settings().bgmVolume,0);assert.equal(store.settings().effectsVolume,65);assert.equal(store.settings().audioMuted,true);assert(!('audioVolume'in store.get('settings')));
  store.saveSettings({audioMuted:false,bgmVolume:35});assert.equal(store.settings().effectsVolume,65);assert.equal(store.settings().bgmVolume,35);assert.equal(store.settings().audioMuted,false);
  assert.throws(()=>store.saveSettings({effectsVolume:'bad'}),/音量/);assert.equal(store.settings().effectsVolume,65);store.saveSettings({effectsVolume:150});assert.equal(store.settings().effectsVolume,100);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
function audioHarness(){
 const gains=[],sounds=[],oscillators=[];class Gain{constructor(){this.gain={value:1,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}};gains.push(this);}connect(target){this.target=target;}disconnect(){}}
 class Source{constructor(){this.frequency={value:0};}connect(target){this.target=target;}disconnect(){}start(){this.started=true;}stop(){this.stopped=true;this.onended?.();}}
 class AudioContext{constructor(){this.state='running';this.destination={};this.currentTime=0;}createGain(){return new Gain();}createBufferSource(){const s=new Source();sounds.push(s);return s;}createOscillator(){const s=new Source();oscillators.push(s);return s;}resume(){this.state='running';return Promise.resolve();}decodeAudioData(){return Promise.resolve({});}}
 class Audio{constructor(src){this.src=src;this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}}
 const context={window:{},document:{addEventListener(){}},AudioContext,Audio,fetch:async()=>({ok:true,arrayBuffer:async()=>new ArrayBuffer(0)}),setTimeout,clearTimeout};vm.runInNewContext('('+require('../electron/battle-audio.cjs').install.toString()+')()',context);
 return{audio:context.window.__dfyCreateBattleAudio({'bgm/test.mp3':{},'audio/hit.wav':{}}),gains,sounds,oscillators};
}
test('running sounds, music, zero levels and master mute use independent gain controls',async()=>{
 const {audio,gains,sounds,oscillators}=audioHarness();audio.setVolumes({bgm:.2,effects:.6});audio.sync({id:'one'},{started:true},true);await audio.play('audio/hit.wav');
 assert(Math.abs(audio.music.volume-.056)<1e-8);assert.equal(gains[0].gain.value,.6);assert.equal(sounds[0].target.target,gains[0]);
 audio.setVolumes({bgm:.8});assert.equal(gains[0].gain.value,.6);assert(Math.abs(audio.music.volume-.224)<1e-8);audio.setVolumes({effects:.3});assert.equal(gains[0].gain.value,.3);assert(Math.abs(audio.music.volume-.224)<1e-8);
 audio.setVolumes({muted:true});assert.equal(gains[0].gain.value,0);assert.equal(audio.music.volume,0);await audio.play('audio/hit.wav');await audio.victory();assert.equal(sounds.length,1);assert.equal(oscillators.length,0);
 audio.setVolumes({muted:false});assert.equal(gains[0].gain.value,.3);await audio.victory();assert.equal(oscillators.length,4);assert(oscillators.every(s=>s.target.target===gains[0]));
 audio.setVolumes({effects:0});await audio.play('audio/hit.wav');await audio.victory();assert.equal(sounds.length,1);assert.equal(oscillators.length,4);assert(Math.abs(audio.music.volume-.224)<1e-8);
 audio.sync({id:'one'},{started:true,ended:true},true);assert.equal(audio.music.paused,true);audio.sync({id:'two'},{started:true},true);assert.equal(audio.music.bgm,.8);assert.equal(audio.music.effects,0);assert.equal(audio.music.paused,false);
});
const battle=(line,overrides={})=>({ended:true,atQueueEnd:true,stepQueue:['|turn|24',line],sides:[{id:'p1',name:'Trainer One'},{id:'p2',name:'Trainer Two'}],...overrides});
test('only server terminal lines yield wins, losses, ties or spectator results',()=>{
 assert.equal(readResult(battle('|win|Trainer One'),'p1').kind,'win');assert.equal(readResult(battle('|win|trainerone'),'p1').kind,'win');assert.equal(readResult(battle('|win|Trainer One'),'p2').kind,'loss');
 assert.equal(readResult(battle('|tie|'),'p2').kind,'tie');assert.equal(readResult(battle('|tie'),'p2').kind,'tie');assert.equal(readResult(battle('|win|Trainer One'),null).kind,'spectator');assert.equal(readResult(battle('|tie|'),null).kind,'spectator');
 for(const overrides of [{ended:false},{atQueueEnd:false},{seeking:20}])assert.equal(readResult(battle('|win|Trainer One',overrides),'p1'),null);
 assert.equal(readResult(battle('|message|Trainer One won!'),'p1'),null);assert.equal(readResult(battle('|win|'),'p1'),null);
 const b=battle('|win|本地甲',{sides:[{id:'p1',name:'本地甲'},{id:'p2',name:'本地乙'}]});assert.equal(readResult(b,'p1').kind,'win');assert.equal(readResult(b,'p2').kind,'loss');
});
function resultHarness(reducedMotion=false){
 const animations=[],nodes=[];class Element{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={setProperty(){}};nodes.push(this);}append(...children){for(const child of children){child.parent=this;this.children.push(child);}}setAttribute(){}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);}animate(){const a={finished:Promise.resolve(),cancel(){this.cancelled=true;}};animations.push(a);return a;}}
 const reduced={matches:reducedMotion,addEventListener(){},removeEventListener(){}},window={__dfyReadBattleResult:readResult},document={hidden:false,createElement:tag=>new Element(tag)},timeouts=new Map();let timerId=0;
 vm.runInNewContext('('+require('../electron/battle-result.cjs').install.toString()+')()',{window,document,matchMedia:()=>reduced,setTimeout:fn=>{timeouts.set(++timerId,fn);return timerId;},clearTimeout:id=>timeouts.delete(id)});
 return{window,document,animations,nodes,arena:new Element('main'),header:new Element('header')};
}
test('result effects fire once across sync, replay rewind and presentation remount and never celebrate spectators',()=>{
 const h=resultHarness(),room={request:{side:{id:'p1'}}},b=battle('|turn|1',{ended:false});let sound=0;const options={room,battle:b,arena:h.arena,header:h.header,audio:{victory(){sound++;}}};
 let result=h.window.__dfyBattleResult(options);assert.equal(result.sync(),null);room.request=null;Object.assign(b,battle('|win|Trainer One'));assert.equal(result.sync().kind,'win');result.sync();assert.equal(sound,1);assert.equal(h.header.children.length,1);assert.equal(h.animations.length,19);
 b.ended=false;assert.equal(result.sync(),null);b.ended=true;result.sync();assert.equal(sound,1);result.dispose();assert.equal(h.header.children.length,0);assert.equal(h.arena.children.length,0);result=h.window.__dfyBattleResult(options);assert.equal(result.sync().kind,'win');assert.equal(sound,1);result.dispose();
 const spectator=h.window.__dfyBattleResult({...options,room:{}});assert.equal(spectator.sync().kind,'spectator');assert.equal(sound,1);spectator.dispose();
});
test('hidden rooms defer feedback and reduced motion provides static feedback with no animation',()=>{
 const h=resultHarness(true);let sound=0;const result=h.window.__dfyBattleResult({room:{side:'p2'},battle:battle('|win|Trainer Two'),arena:h.arena,header:h.header,audio:{victory(){sound++;}}});
 result.sync(false);assert.equal(sound,0);h.document.hidden=true;result.sync(true);assert.equal(sound,0);h.document.hidden=false;result.sync(true);assert.equal(sound,1);assert.equal(h.animations.length,0);assert.equal(h.arena.children.length,1);assert.equal(h.header.children[0].dataset.result,'win');result.dispose();
});
