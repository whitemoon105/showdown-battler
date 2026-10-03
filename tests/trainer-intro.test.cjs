'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
function harness(reduce=false){
 const animations=[],timers=new Map();let nextTimer=0;
 class Element{
  constructor(){this.children=[];this.dataset={};}
  append(...nodes){for(const n of nodes){n.parent=this;this.children.push(n);}}
  setAttribute(key,value){this[key]=value;}
  getClientRects(){return [{}];}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}
  querySelectorAll(selector){return this.children.flatMap(n=>[...(n.className?.split(' ').includes(selector.slice(1))?[n]:[]),...n.querySelectorAll(selector)]);}
  querySelector(selector){return this.querySelectorAll(selector)[0];}
  animate(){const a={finished:Promise.resolve(),cancel(){this.cancelled=true;}};animations.push(a);return a;}
 }
 const window={},document={hidden:false,createElement:()=>new Element()},arena=new Element();
 vm.runInNewContext('('+require('../electron/battle-intro.cjs').install.toString()+')()',{
  window,document,URL,location:{href:'https://play.pokemonshowdown.com/'},Image:class{},
  Dex:{resolveAvatar:id=>'/sprites/trainers/'+id+'.png'},matchMedia:()=>({matches:reduce}),
  setTimeout:(fn,delay)=>{timers.set(++nextTimer,{fn,delay});return nextTimer;},clearTimeout:id=>timers.delete(id),
 });
 const battle={started:false,turn:0,scene:{animating:true,acceleration:1},nearSide:{name:'玩家一',avatar:'lucas'},farSide:{name:'玩家二',avatar:'dawn'}},room={},marks=[];
 const create=()=>window.__dfyTrainerIntro({room,battle,arena,mark:(...m)=>marks.push(m)});
 return{create,battle,document,arena,animations,timers,marks};
}
test('trainer intro waits for server start, maps both avatars, and cannot replay after remount',()=>{
 const h=harness(),intro=h.create();assert.equal(intro.start(),0);assert.equal(h.arena.children.length,0);
 h.battle.started=true;assert.equal(intro.start(),1800);
 assert.deepEqual(h.arena.querySelectorAll('.dfy-intro-avatar').map(n=>n.src),['dfy-asset://battle/trainer/lucas.png','dfy-asset://battle/trainer/dawn.png']);
 assert.equal(h.arena.children[0]['aria-label'],'玩家一 对战 玩家二');assert.equal(intro.start(),0);assert.equal(h.marks.length,1);
 intro.dispose();assert.equal(h.timers.size,0);assert.equal(h.arena.children.length,0);assert(h.animations.every(a=>a.cancelled));assert.equal(h.create().start(),0);
});
test('fast forward, instant entries and completed battles skip intro; reduced motion is static',()=>{
 for(const patch of [{ended:true},{turn:1},{scene:{animating:false}},{scene:{animating:true,acceleration:3}}]){
  const h=harness();Object.assign(h.battle,{started:true},patch);assert.equal(h.create().start(),0);assert.equal(h.arena.children.length,0);
 }
 const h=harness(true),intro=h.create();h.battle.started=true;assert.equal(intro.start({instant:true}),0);h.document.hidden=true;assert.equal(intro.start(),0);h.document.hidden=false;
 assert.equal(intro.start(),800);assert.equal(h.animations.length,0);[...h.timers.values()][0].fn();assert.equal(h.arena.children.length,0);
});
