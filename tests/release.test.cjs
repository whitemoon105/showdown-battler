'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {MockAgent,setGlobalDispatcher,getGlobalDispatcher}=require('undici');
const {loadRecommendations}=require('../core/team-recommendations.cjs');
const {Store}=require('../core/store.cjs');
const {imageInfo}=require('../core/battle-assets.cjs');
const {wikiCandidates}=require('../tools/download-52poke-sprites.cjs');
const {Dex}=require('../core/dex.cjs');

test('statistics outage preserves same-format usage when fresh sample sets succeed',async()=>{
 const old=getGlobalDispatcher(),mock=new MockAgent();mock.disableNetConnect();setGlobalDispatcher(mock);
 mock.get('https://www.smogon.com').intercept({path:'/stats/'}).reply(503,'offline');
 mock.get('https://play.pokemonshowdown.com').intercept({path:'/data/sets/gen9ou.json'}).reply(200,{dex:{Venusaur:{test:{moves:['Giga Drain']}}},stats:{}});
 const cached={schema:2,format:'gen9ou',source:'smogon',stats:{Venusaur:{usage:.1}},dex:{},month:'2026-08',fetchedAt:1};
 try{const result=await loadRecommendations('gen9ou',{get:()=>cached,set:()=>{}},{force:true});assert.equal(result.source,'smogon');assert.equal(result.stats.Venusaur.usage,.1);assert(result.dex.Venusaur);assert(result.stale);assert.equal(result.month,'2026-08');}
 finally{setGlobalDispatcher(old);await mock.close();}
});

test('standalone store keeps all files inside chosen data root and drops obsolete settings',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'showdown-store-'));
 try{const store=new Store(dir);store.set('settings',{proxy:'127.0.0.1:9999',provider:'old',audioVolume:30});assert.equal(store.settings().proxy,undefined);assert.equal(store.settings().provider,undefined);assert.equal(store.settings().audioVolume,30);store.saveSettings({audioMuted:true});assert(!('proxy' in store.get('settings')));assert.equal(path.dirname(store.file('policy-example')),dir);assert.throws(()=>store.file('../escape'));}
 finally{fs.rmSync(dir,{recursive:true});}
});

test('wiki selection cannot substitute another forme or shiny sprite',()=>{
 const html='<img src="//s1.52poke.com/wiki/a/ab/Spr_6x_006.png"><img src="//s1.52poke.com/wiki/a/ab/Spr_6x_006MX.png"><img src="//s1.52poke.com/wiki/a/ab/Spr_6x_006MY.png"><img src="//s1.52poke.com/wiki/a/ab/Spr_6x_006_s.png">';
 assert.deepEqual(wikiCandidates(html,Dex.species.get('Charizard-Mega-X')).map(u=>u.split('/').pop()),['Spr_6x_006MX.png']);
 assert.deepEqual(wikiCandidates(html,Dex.species.get('Charizard')).map(u=>u.split('/').pop()),['Spr_6x_006.png']);
 assert.deepEqual(wikiCandidates(html,{num:6,forme:'Unknown'}),[]);
});

test('every bundled resource matches its hash and measured animation metadata',()=>{
 const directory=path.join(__dirname,'../assets/battle-media'),manifest=require('../assets/battle-media/manifest.json'),files=new Map();
 for(const [key,entry] of Object.entries(manifest)){
  assert(/^[a-f0-9]{64}\.(png|gif|webp|ogg|wav|mp3)$/.test(entry.file),key);
  if(!files.has(entry.file)){const bytes=fs.readFileSync(path.join(directory,entry.file));assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),entry.file.split('.')[0],key);files.set(entry.file,/\.(png|gif|webp)$/.test(entry.file)?imageInfo(bytes):null);}
  const info=files.get(entry.file);if(info&&key.startsWith('sprite/'))assert.equal(entry.animated,info.animated,key);
 }
 const fronts=Object.entries(manifest).filter(([k])=>/^sprite\/[^/]+\/front\/normal\/M$/.test(k));assert(fronts.length>1400);assert(fronts.every(([,v])=>v.verified));
});
