const test=require('node:test'),assert=require('node:assert/strict'),{readFieldState}=require('../electron/battle-field.cjs');
test('weather, rooms, terrain and each side remain independent and preserve uncertain public durations',()=>{
 const battle={weather:'raindance',weatherMinTimeLeft:3,weatherTimeLeft:6,pseudoWeather:[['Trick Room',4,0],['Electric Terrain',3,6]],nearSide:{sideConditions:{tailwind:['Tailwind',1,2,0],spikes:['Spikes',3,0,0]}},farSide:{sideConditions:{reflect:['Reflect',1,3,6]}},abilityActive:()=>false};
 const s=readFieldState(battle);assert.equal(s.weather.duration,'3–6 回合');assert.equal(s.terrain.id,'electricterrain');assert.equal(s.rooms[0].id,'trickroom');assert.equal(s.sides[0].conditions[1].layers,3);assert.equal(s.sides[1].conditions[0].id,'reflect');
 battle.nearSide.sideConditions={};battle.pseudoWeather=[['Magic Room',2,0]];battle.abilityActive=()=>true;
 const changed=readFieldState(battle);assert(changed.weather.suppressed);assert.equal(changed.terrain,null);assert.equal(changed.rooms[0].id,'magicroom');assert.equal(changed.sides[0].conditions.length,0);assert.equal(changed.sides[1].conditions.length,1);
 battle.weather='';battle.pseudoWeather=[];battle.farSide.sideConditions={};const clear=readFieldState(battle);assert.equal(clear.weather,null);assert.equal(clear.rooms.length,0);assert(clear.sides.every(s=>!s.conditions.length));
});
test('changing viewer sides swaps field effects without mutating public battle state',()=>{
 const own={sideConditions:{stealthrock:['Stealth Rock',1,0,0]}},foe={sideConditions:{tailwind:['Tailwind',1,3,0]}};
 const battle={nearSide:own,farSide:foe};assert.equal(readFieldState(battle).sides[0].conditions[0].id,'stealthrock');
 battle.nearSide=foe;battle.farSide=own;assert.equal(readFieldState(battle).sides[0].conditions[0].id,'tailwind');assert.deepEqual(own.sideConditions.stealthrock,['Stealth Rock',1,0,0]);
});
