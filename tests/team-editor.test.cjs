'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const editor=require('../core/team-editor.cjs');
const {Teams,Dex}=require('../core/dex.cjs');
const {parseUsage,cachedRecommendations}=require('../core/team-recommendations.cjs');
test('rule matrix: actual tier fields, legality and legal entries before bans',()=>{
 for(const [format,tier] of [['gen9ou','OU'],['gen9ubers','Uber'],['gen9uu','UU'],['gen9ru','RU'],['gen9nu','NU'],['gen9pu','PU'],['gen9zu','ZU'],['gen9lc','LC'],['gen9doublesou','DOU'],['gen9nationaldex','OU'],['gen8ou','OU'],['gen1ou','OU']]){
  const rows=editor.read('',format).catalog.species;
  assert.equal(rows[0].tier,tier,format);
  const firstIllegal=rows.findIndex(s=>!s.legal);assert(rows.slice(firstIllegal).every(s=>!s.legal),format);
 }
 assert.equal(editor.speciesStatus('gen9ru','Alomomola').legal,false);
 assert.equal(editor.speciesStatus('gen9ou','Beedrill-Mega').legal,false);
 assert.equal(editor.speciesStatus('gen9nationaldex','Beedrill-Mega').legal,true);
 assert.equal(editor.speciesStatus('gen9lc','Pikachu').legal,false);
 assert.equal(editor.speciesStatus('gen9lc','Bulbasaur').legal,true);
});
test('six independent positions survive export, changes and deletion',()=>{
 let r=editor.update({format:'gen9ou',index:5,patch:{species:'Venusaur'}});
 assert.deepEqual(r.positions,[5]);assert(editor.read(r.text,'gen9ou',null,r.positions).sets[5]);assert.equal(editor.read(r.text,'gen9ou',null,r.positions).sets[0],null);
 r=editor.update({...r,format:'gen9ou',index:1,patch:{species:'Pikachu'}});
 assert.deepEqual(r.positions,[1,5]);
 r=editor.update({...r,format:'gen9ou',index:1,remove:true});assert.deepEqual(r.positions,[5]);
});
test('learnsets use current generation, previous evolutions, format bans, species abilities',()=>{
 const ou=editor.movesForSpecies('gen9ou','Venusaur').map(m=>m.id);
 const nd=editor.movesForSpecies('gen9nationaldex','Venusaur').map(m=>m.id);
 assert(!ou.includes('hiddenpower'));assert(nd.includes('hiddenpower'));assert(ou.includes('earthpower'));assert(!ou.includes('spore'));
 const r=editor.update({format:'gen9ou',index:0,patch:{species:'Venusaur'}});
 const row=editor.read(r.text,'gen9ou').sets[0];
 assert.deepEqual(new Set(row.abilityCatalog.map(a=>a.name)),new Set(['Overgrow','Chlorophyll']));
 assert.throws(()=>editor.update({...r,index:0,patch:{ability:'Multiscale'}}),/特性/);
 assert(!row.itemCatalog.some(i=>i.name==='Beedrillite'));
});
test('limits derive from rule table, and replacement resets stale species fields',()=>{
 let r=editor.update({format:'gen9ou',index:0,patch:{species:'Venusaur'}});
 assert.throws(()=>editor.update({...r,index:0,patch:{evs:{hp:252,atk:252,def:252}}}),/510/);
 r=editor.update({...r,index:0,patch:{moves:['Giga Drain'],ability:'Chlorophyll'}});
 r=editor.update({...r,index:0,patch:{species:'Pikachu'}});
 assert.equal(Teams.import(r.text)[0].ability,'Static');assert.deepEqual(Teams.import(r.text)[0].moves,[]);
 assert.equal(editor.profile('gen9lc').maxLevel,5);
 assert.equal(editor.profile('gen9championsvgc2026regmc').evLimit,66);
 assert.equal(editor.profile('gen9championsvgc2026regmc').evMax,32);
 assert.equal(editor.profile('gen1ou').evLimit,null);
});
test('usage remains numeric and per format; item/ability distributions are not lost',()=>{
 const data=parseUsage({data:{Venusaur:{usage:.2,Moves:{gigadrain:80,earthpower:20},Items:{leftovers:60,lifeorb:30,choicespecs:10},Abilities:{chlorophyll:90,overgrow:10}},Pikachu:{usage:.01}}},'gen9ou');
 let r=editor.read('Venusaur\nAbility: Overgrow\n- Giga Drain','gen9ou',data);
 assert.deepEqual(r.sets[0].itemCatalog.slice(0,3).map(i=>i.id),['leftovers','lifeorb','choicespecs']);
 assert.equal(r.sets[0].abilityCatalog[0].id,'chlorophyll');
 assert.equal(editor.read('','gen9ru',data).catalog.species.find(s=>s.id==='venusaur').usage,0);
 assert.equal(cachedRecommendations('gen9ru',{get:()=>data}).format,'gen9ru');
});
test('all locally exposed constructed formats can open without throwing',()=>{
 const failures=[];
 for(const f of Dex.formats.all().filter(f=>f.name&&f.mod&&f.searchShow!==false&&!f.team&&!f.name.includes('@@@'))){
  try{const data=editor.read('',f.id);assert(data.catalog.species.length);}catch(e){failures.push(f.id+': '+e.message);}
 }
 assert.deepEqual(failures,[]);
});
