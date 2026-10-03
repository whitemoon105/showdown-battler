'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const editor=require('../core/team-editor.cjs');
const {Teams,Dex,validate}=require('../core/dex.cjs');
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

test('Ogerpon form, held item and Tera candidates use the same validator as saving',()=>{
 let r=editor.update({format:'gen9ou',index:0,patch:{species:'Ogerpon-Wellspring'}});
 let data=editor.read(r.text,'gen9ou');
 assert.deepEqual(data.sets[0].itemCatalog.map(i=>i.name),['Wellspring Mask']);
 assert.deepEqual(data.sets[0].teraCatalog.map(i=>i.name),['Water']);
 assert(data.validation.draft);assert.equal(data.validation.valid,false);assert.equal(validate(r.text,'gen9ou').valid,false);
 for(const patch of [{item:'Leftovers'},{item:''},{teraType:'Fire'}])assert.throws(()=>editor.update({...r,index:0,patch}),/Wellspring Mask|Terastal type needs to be Water/);
 r=editor.update({...r,index:0,patch:{moves:['Ivy Cudgel'],evs:{hp:4,atk:252,spe:252},nature:'Jolly'}});
 assert(validate(r.text,'gen9ou').valid);assert(editor.read(r.text,'gen9ou').validation.valid);
});

test('Champions permits unfinished rosters, rejects banned items and moves, and filters teammates items',()=>{
 const format='gen9championsvgc2026regmc';
 let r=editor.update({format,index:0,patch:{species:'Pikachu'}});
 r=editor.update({...r,format,index:0,patch:{item:'Leftovers',moves:['Thunderbolt']}});
 r=editor.update({...r,format,index:1,patch:{species:'Raichu'}});
 const data=editor.read(r.text,format);
 assert(data.validation.draft);assert(data.validation.incomplete.some(p=>p.startsWith('You must bring at least')));
 assert(data.sets[0].itemCatalog.some(i=>i.name==='Leftovers'));
 assert(!data.sets[1].itemCatalog.some(i=>i.name==='Leftovers'));
 assert(!data.sets[1].itemCatalog.some(i=>i.name==='Assault Vest'));
 assert.throws(()=>editor.update({...r,format,index:1,patch:{item:'Leftovers'}}),/Item Clause/);
 assert.throws(()=>editor.update({...r,format,index:1,patch:{item:'Assault Vest'}}),/无法识别/);
 r=editor.update({...r,format,index:1,patch:{species:'Venusaur'}});
 assert.throws(()=>editor.update({...r,format,index:1,patch:{moves:['Vine Whip']}}),/当前规则不可学习/);
 r=editor.update({...r,format,index:1,patch:{item:'Life Orb',moves:['Giga Drain']}});
 assert.equal(editor.read(r.text,format).validation.errors.length,0);
 assert.equal(validate(r.text,format).valid,false);
});

test('item uniqueness is derived from rule values, while OU allows repeats',()=>{
 for(const [format,limit] of [['gen9ou',Infinity],['gen9ou@@@Item Clause=2',2]]){
  let r={text:'',positions:[]};
  for(const [index,species] of ['Pikachu','Raichu','Venusaur'].entries()){
   r=editor.update({...r,format,index,patch:{species}});
   if(index>=limit){assert.throws(()=>editor.update({...r,format,index,patch:{item:'Leftovers'}}),/Item Clause/);continue;}
   r=editor.update({...r,format,index,patch:{item:'Leftovers'}});
  }
  assert.equal(Teams.import(r.text).filter(s=>s.item==='Leftovers').length,Math.min(limit,3));
 }
});

test('set combinations, cross-team combinations and format hooks constrain candidates',()=>{
 const format='gen9ou@@@-Thunderbolt + Surf';
 let r=editor.update({format,index:0,patch:{species:'Pikachu'}});
 r=editor.update({...r,format,index:0,patch:{moves:['Surf']}});
 const data=editor.read(r.text,format);
 assert(data.sets[0].moveCatalog.some(m=>m.name==='Thunderbolt'));
 assert(data.sets[0].moveCatalogs[0].some(m=>m.name==='Thunderbolt'));
 assert(!data.sets[0].moveCatalogs[1].some(m=>m.name==='Thunderbolt'));
 assert.throws(()=>editor.update({...r,format,index:0,patch:{moves:['Surf','Thunderbolt']}}),/combination/);
 const teamFormat='gen9ou@@@-Pikachu ++ Leftovers';
 r=editor.update({format:teamFormat,index:0,patch:{species:'Pikachu'}});
 r=editor.update({...r,format:teamFormat,index:1,patch:{species:'Raichu'}});
 assert(!editor.read(r.text,teamFormat).sets[1].itemCatalog.some(i=>i.name==='Leftovers'));
 assert.throws(()=>editor.update({...r,format:teamFormat,index:1,patch:{item:'Leftovers'}}),/combination/);
 const teraFormat='gen9ou@@@Force Tera Type = Water';
 r=editor.update({format:teraFormat,index:0,patch:{species:'Pikachu'}});
 assert.equal(Teams.import(r.text)[0].teraType,'Water');
 assert.deepEqual(editor.read(r.text,teraFormat).sets[0].teraCatalog.map(t=>t.name),['Water']);
});

test('invalid imports are visible and can be repaired without mutating source drafts',()=>{
 const text='Ogerpon-Wellspring @ Leftovers\nAbility: Water Absorb\nTera Type: Fire\n- Ivy Cudgel';
 const sets=Teams.import(text),original=structuredClone(sets);
 const check=editor.inspectTeam('gen9ou',sets);assert(check.errors.some(e=>e.includes('Wellspring Mask')));assert.deepEqual(sets,original);
 const data=editor.read(text,'gen9ou');assert.equal(data.sets[0].legality.legal,false);assert.equal(data.sets[0].item,'Leftovers');assert.equal(data.sets[0].teraType,'Fire');
 let r=editor.update({text,index:0,patch:{item:'Wellspring Mask'}});
 assert.equal(Teams.import(r.text)[0].teraType,'Fire');
 r=editor.update({...r,index:0,patch:{teraType:'Water'}});
 assert.equal(editor.read(r.text,'gen9ou').validation.errors.length,0);
 const normalized=Teams.import('Charizard-Mega-X @ Charizardite X\nAbility: Tough Claws\n- Dragon Claw');
 const before=structuredClone(normalized),result=editor.inspectTeam('gen9nationaldex',normalized);
 assert.deepEqual(normalized,before);assert(result.normalizations.some(n=>n.field==='species'&&n.to==='Charizard'));
});

test('recommendations are cloned and filtered against the whole team',()=>{
 const format='gen9championsvgc2026regmc';
 let r=editor.update({format,index:0,patch:{species:'Raichu'}});
 r=editor.update({...r,format,index:0,patch:{item:'Leftovers'}});
 r=editor.update({...r,format,index:1,patch:{species:'Pikachu'}});
 const set={species:'Pikachu',ability:'Static',nature:'Timid',moves:['Thunderbolt'],evs:{spa:32,spe:32,hp:2}};
 const source={format,dex:{Pikachu:{sets:[{...set,name:'重复道具',item:'Leftovers'},{...set,name:'可用配装',item:'Life Orb'}]}}};
 const before=structuredClone(source),data=editor.read(r.text,format,source);
 assert.deepEqual(source,before);assert.deepEqual(data.sets[1].recommendations.map(s=>s.name),['可用配装']);
});

test('switching rules rechecks imported duplicates and Gen 1 retains generation-specific validation',()=>{
 const text='Pikachu @ Leftovers\nAbility: Static\n- Thunderbolt\n\nRaichu @ Leftovers\nAbility: Static\n- Thunderbolt';
 assert.equal(editor.read(text,'gen9ou').validation.errors.length,0);
 assert(editor.read(text,'gen9championsvgc2026regmc').validation.errors.some(e=>e.includes('Item Clause')));
 let r=editor.update({format:'gen1ou',index:0,patch:{species:'Pikachu'}});
 r=editor.update({...r,format:'gen1ou',index:0,patch:{moves:['Thunderbolt'],evs:{hp:252,atk:252,def:252,spa:252,spd:252,spe:252}}});
 assert(validate(r.text,'gen1ou').valid);
});

test('lazy slot catalogs still use the full roster and invalidate when a teammate changes',()=>{
 const format='gen9championsvgc2026regmc';let r=editor.update({format,index:0,patch:{species:'Pikachu'}});r=editor.update({...r,format,index:0,patch:{item:'Leftovers'}});r=editor.update({...r,format,index:5,patch:{species:'Raichu'}});
 const first=editor.read(r.text,format,null,r.positions,5);assert.equal(first.activeIndex,5);assert.equal(first.sets[0].species,'Pikachu');assert.equal(first.sets[0].itemCatalog,undefined);assert(!first.sets[5].itemCatalog.some(i=>i.name==='Leftovers'));
 r=editor.update({...r,format,index:0,patch:{item:'Life Orb'}});const next=editor.read(r.text,format,null,r.positions,5);assert(next.sets[5].itemCatalog.some(i=>i.name==='Leftovers'));assert(!next.sets[5].itemCatalog.some(i=>i.name==='Life Orb'));assert.equal(next.validation.errors.length,0);
});
