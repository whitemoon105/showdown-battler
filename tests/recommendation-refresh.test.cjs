'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {MockAgent,setGlobalDispatcher,getGlobalDispatcher}=require('undici');
const {loadRecommendations}=require('../core/team-recommendations.cjs');
const memory=()=>{const data=new Map();return{get:(key,fallback)=>data.get(key)||fallback,set:(key,value)=>data.set(key,structuredClone(value))};};
test('failed statistics settle, retain exact-format data, back off and allow explicit retry',async()=>{
 const prior=getGlobalDispatcher(),agent=new MockAgent();agent.disableNetConnect();setGlobalDispatcher(agent);
 try{
  const store=memory();let calls=0;
  const fail=()=>{agent.get('https://www.smogon.com').intercept({path:'/stats/'}).reply(()=>{calls++;return{statusCode:503,data:''};});agent.get('https://play.pokemonshowdown.com').intercept({path:'/data/sets/gen9ru.json'}).reply(404,'');};
  fail();const first=await loadRecommendations('gen9ru',store);
  assert.equal(first.format,'gen9ru');assert.equal(first.stale,true);assert(first.stats&&Object.keys(first.stats).length);assert(first.retryAt>Date.now());assert(first.checkedAt);assert.match(first.warning,/已保存/);
  await loadRecommendations('gen9ru',store);assert.equal(calls,1,'failed automatic refresh must not repeat on revisit');
  fail();await loadRecommendations('gen9ru',store,{force:true});assert.equal(calls,2);
  const missingStore=memory();let missingCalls=0;
  const missing=()=>{agent.get('https://www.smogon.com').intercept({path:'/stats/'}).reply(()=>{missingCalls++;return{statusCode:503,data:''};});agent.get('https://play.pokemonshowdown.com').intercept({path:'/data/sets/gen9refreshfixture.json'}).reply(404,'');};
  missing();const unavailable=await loadRecommendations('gen9refreshfixture',missingStore);assert.equal(unavailable.source,'unavailable');
  await loadRecommendations('gen9refreshfixture',missingStore);assert.equal(missingCalls,1);
  missingStore.set('recommendations-v2-gen9refreshfixture',{...unavailable,retryAt:Date.now()-1});
  missing();await loadRecommendations('gen9refreshfixture',missingStore);assert.equal(missingCalls,2,'failed empty data must retry after cooldown, not use the fresh-data TTL');
  agent.get('https://www.smogon.com').intercept({path:'/stats/'}).reply(200,'<a href="2026-09/">2026-09</a>').delay(200);
  agent.get('https://play.pokemonshowdown.com').intercept({path:'/data/sets/gen9uu.json'}).reply(200,'invalid JSON');
  const start=Date.now(),timeout=await loadRecommendations('gen9uu',memory(),{timeoutMs:30});
  assert(Date.now()-start<1000);assert.equal(timeout.format,'gen9uu');assert.equal(timeout.stale,true);assert(timeout.retryAt>Date.now());
  agent.get('https://www.smogon.com').intercept({path:'/stats/'}).reply(200,'<a href="2026-09/">2026-09</a>');
  agent.get('https://www.smogon.com').intercept({path:'/stats/2026-09/chaos/'}).reply(200,'<a href="gen9ru-0.json">RU</a><a href="gen9ou-0.json">OU</a>');
  agent.get('https://www.smogon.com').intercept({path:'/stats/2026-09/chaos/gen9ru-0.json'}).reply(200,{data:{Pikachu:{usage:.1}}});
  agent.get('https://play.pokemonshowdown.com').intercept({path:'/data/sets/gen9ru.json'}).reply(200,{dex:{},stats:{}});
  const fresh=await loadRecommendations('gen9ru',store,{force:true});assert.equal(fresh.month,'2026-09');assert.equal(fresh.stale,undefined);assert.equal(fresh.retryAt,0);assert.equal(fresh.networkIssue,'');assert.equal(fresh.stats.Pikachu.usage,.1);
 }finally{setGlobalDispatcher(prior);await agent.close();}
});
