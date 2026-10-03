'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{generate}=require('../core/team-generator.cjs'),{formats,validate,TeamValidator,Teams}=require('../core/dex.cjs');
test('automatic generator produces a complete legal team for every supported constructed ladder',()=>{
 const failures=[],times=[];
 for(const f of formats().filter(f=>f.search&&!f.random&&f.supported)){const start=Date.now();try{const row=generate(f.id),check=validate(row.text,f.id);assert(check.valid,check.errors.join(';'));assert.equal(check.team.length,Math.min(6,new TeamValidator(f.id).ruleTable.maxTeamSize));times.push({format:f.id,ms:Date.now()-start});}catch(error){failures.push(f.id+': '+error.message);}}
 console.log(JSON.stringify({formats:times.length,maxMs:Math.max(...times.map(r=>r.ms)),failures}));assert.deepEqual(failures,[]);
});
test('new teams change without editing the old team and retain item clause and EV budget',()=>{
 let previous='';for(let i=0;i<6;i++){const row=generate('gen9championsvgc2026regmc',{previous});assert.notEqual(row.text,previous);const team=Teams.import(row.text);assert.equal(new Set(team.filter(p=>p.item).map(p=>p.item)).size,team.filter(p=>p.item).length);assert(team.every(p=>Object.values(p.evs).reduce((a,b)=>a+b,0)<=66));previous=row.text;}
 assert.throws(()=>generate('gen9randombattle'),/服务器/);
});
