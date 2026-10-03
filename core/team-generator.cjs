'use strict';
const {Dex,Teams,TeamValidator,toID}=require('./dex.cjs'),editor=require('./team-editor.cjs'),{cachedRecommendations}=require('./team-recommendations.cjs'),starters=require('./starter-teams.cjs');
const dictionary=require('../assets/zh-dictionary.json'),pools=new Map();
const shuffle=rows=>rows.map(value=>({value,key:Math.random()})).sort((a,b)=>a.key-b.key).map(x=>x.value);
const signature=team=>JSON.stringify(team.map(s=>[s.species,s.item,s.ability,[...s.moves].sort(),s.nature,s.evs,s.teraType]).sort((a,b)=>a[0].localeCompare(b[0])));
function generate(format,{previous='',store}={}){
 const v=new TeamValidator(format),dex=v.dex,r=v.ruleTable,p=editor.profile(format),f=v.format;
 if(!f.exists||f.team)throw Error('随机队伍赛制由服务器生成队伍，请在对战页直接开始匹配');
 if(!['singles','doubles'].includes(f.gameType||'singles')||r.minTeamSize>6)throw Error('这个赛制需要当前客户端尚未支持的出场布局，请更新客户端');
 const target=Math.min(6,r.maxTeamSize),usage=cachedRecommendations(format,store),key=format+'|'+(usage.month||'')+'|'+(usage.checkedAt||0),prior=signature(Teams.import(previous)||[]);
 let pool=pools.get(key);
 const validTeam=team=>{const copy=structuredClone(team);return v.validateTeam(copy)?.length?null:copy;};
 if(!pool){
  const sets=[],seen=new Set();
  function accept(raw){const set=structuredClone(raw);delete set.name;if(!set.species||!set.moves?.length)return;
   const species=dex.species.get(set.species);if(!species.exists||species.battleOnly)return;
   const problems=(f.validateSet||v.validateSet).call(v,set,{});if(problems?.length)return problems;
   const id=signature([set]);if(!seen.has(id)){sets.push(set);seen.add(id);}
  }
  for(const source of starters.list(format))for(const set of Teams.import(source.text)||[])accept(set);
  for(const [species,examples]of Object.entries(usage.dex||{})){const rows=Array.isArray(examples?.sets)?examples.sets:Object.values(examples||{});for(const row of rows)if(Array.isArray(row?.moves))accept({...row,species,level:row.level||p.defaultLevel});}
  // 数据来源只给候选，当前规则引擎决定能否入队；保留理由：不借用其他分级的合法性，也不放宽新规则的限制。
  const speciesPool=dex.species.all().filter(s=>s.exists&&s.num>0&&!s.battleOnly&&editor.speciesStatus(format,s.name).legal).map(s=>({s,rank:(usage.stats?.[s.name]?.usage||0)*1000+s.bst+Math.random()*180})).sort((a,b)=>b.rank-a.rank).map(x=>x.s);
  const itemNames=['Leftovers','Sitrus Berry','Heavy-Duty Boots','Lum Berry','Focus Sash','Life Orb','Expert Belt','Covert Cloak','Shuca Berry','Chesto Berry','Rocky Helmet','Eviolite','Shell Bell','Oran Berry'];
  let generated=0,visited=0;
  for(const s of speciesPool){
   if(generated>=65||visited++>=180)break;
   const moves=editor.movesForSpecies(format,s.name).map(m=>dex.moves.get(m.name));if(!moves.length)continue;
   const atk=s.baseStats.atk>=s.baseStats.spa?'atk':'spa',bulk=s.baseStats.spe<70?'hp':'spe';
   const evs=Object.fromEntries(['hp','atk','def','spa','spd','spe'].map(stat=>[stat,0]));
   if(r.evLimit===null)for(const stat in evs)evs[stat]=p.evMax;else{let budget=r.evLimit||0;for(const stat of [atk,bulk,bulk==='hp'?'spd':'hp']){evs[stat]=Math.min(p.evMax,budget);budget-=evs[stat];}}
   const abilities=p.abilities?[...new Set(Object.values(s.abilities))].filter(a=>!v.checkAbility({species:s.name,name:s.name},dex.abilities.get(a),{})):[''];if(!abilities.length)continue;
   const items=p.items?(s.requiredItems||[s.requiredItem].filter(Boolean)).concat(s.requiredItem||s.requiredItems?.length?[]:itemNames):[''];if(!items.length)items.push('');
   const legalItems=items.filter(item=>!v.checkItem({species:s.name,name:s.name},dex.items.get(item),{}));if(!legalItems.length)legalItems.push('');
   const distributions=usage.stats?.[s.name]?.moves||[],rank=new Map(distributions.map((x,i)=>[toID(x.name),180-i*3]));
   const support={recover:80,roost:80,slackoff:80,softboiled:80,shoreup:80,strengthsap:80,synthesis:66,moonlight:66,protect:f.gameType==='doubles'?95:25,tailwind:f.gameType==='doubles'?100:20,trickroom:f.gameType==='doubles'&&s.baseStats.spe<60?100:10,stealthrock:75,spikes:60,willowisp:70,thunderwave:65,leechseed:55,swordsdance:atk==='atk'?60:0,nastyplot:atk==='spa'?60:0,calmmind:atk==='spa'?60:0,dragondance:atk==='atk'?65:0};
   const scored=moves.map(m=>({m,score:(rank.get(m.id)||0)+(m.category==='Status'?(support[m.id]||0):(m.category===(dex.gen<4?(['Fire','Water','Grass','Electric','Ice','Psychic','Dragon','Dark'].includes(m.type)?'Special':'Physical'):(atk==='atk'?'Physical':'Special'))?60:12)+Math.min(m.basePower||35,120)*.55+(s.types.includes(m.type)?45:0)+(m.accuracy===true?0:(m.accuracy-100)*.65)+(m.selfdestruct?-180:0)+(m.flags.recharge?-80:0)+(m.id==='fakeout'&&f.gameType==='doubles'?50:0))+Math.random()*8})).sort((a,b)=>b.score-a.score);
   for(let variant=0;variant<Math.min(r.has('itemclause')?8:3,Math.max(abilities.length,legalItems.length));variant++){
    const selected=[],types=new Set();if(s.requiredMove)selected.push(s.requiredMove);
    for(const {m}of scored){if(selected.includes(m.name)||selected.length>=4)continue;if(m.category!=='Status'&&types.has(m.type)&&selected.length<3)continue;if(m.category==='Status'&&selected.filter(n=>dex.moves.get(n).category==='Status').length>=1)continue;selected.push(m.name);if(m.category!=='Status')types.add(m.type);}
    const set={species:s.name,ability:abilities[variant%abilities.length],item:legalItems[variant%legalItems.length],moves:selected,level:r.adjustLevel||Math.min(r.maxLevel,r.defaultLevel),evs,nature:p.natures?(atk==='atk'?(bulk==='spe'?'Jolly':'Adamant'):(bulk==='spe'?'Timid':'Modest')):undefined,teraType:p.tera?s.requiredTeraType||s.types[0]:undefined};
    const problems=accept(set);
    // 格式钩子可能规定只能携带某一种招式；用真实校验搜索单招配置，不按规则名添加例外。保留理由：兼容元规则的自定义招式限制，仍以原校验结果为准。
    if(problems?.some(x=>/illegal moves|only.+moves|exactly one move/i.test(x))&&variant===0)for(const m of scored){const candidate={...set,moves:[m.m.name]};const n=sets.length;accept(candidate);if(sets.length>n)break;}
   }
   if(sets.some(set=>set.species===s.name))generated++;
  }
  pool=sets;pools.set(key,pool);if(pools.size>12)pools.delete(pools.keys().next().value);
 }
 const itemLimit=r.has('itemclause')?Number(r.valueRules.get('itemclause')||1):Infinity,mono=r.has('sametypeclause');let best=null,bestScore=-Infinity;
 function quality(team){const types=new Map(),weak=new Map();let damage=0,support=0;for(const set of team){const s=dex.species.get(set.species);s.types.forEach(t=>types.set(t,(types.get(t)||0)+1));for(const t of dex.types.names())if(dex.getImmunity(t,s)&&dex.getEffectiveness(t,s)>0)weak.set(t,(weak.get(t)||0)+1);if(set.moves.some(m=>dex.moves.get(m).category!=='Status'))damage++;if(set.moves.some(m=>['tailwind','trickroom','stealthrock','rapidspin','defog','uturn','voltswitch','partingshot','recover','roost'].includes(toID(m))))support++;}return types.size*5+damage*4+Math.min(3,support)*6-[...weak.values()].reduce((n,c)=>n+Math.max(0,c-2)*5,0)-[...types.values()].reduce((n,c)=>n+Math.max(0,c-2)*3,0);}
 for(let attempt=0;attempt<100;attempt++){
  const team=[],species=new Set(),items=new Map(),rows=shuffle(pool),type=mono?dex.species.get(rows[0]?.species||'').types?.[0]:null;
  for(const set of rows){const s=dex.species.get(set.species);if(species.has(s.baseSpecies)||mono&&!s.types.includes(type)||set.item&&(items.get(set.item)||0)>=itemLimit)continue;team.push(set);species.add(s.baseSpecies);if(set.item)items.set(set.item,(items.get(set.item)||0)+1);if(team.length===target)break;}
  if(team.length!==target||signature(team)===prior)continue;const checked=validTeam(team);if(!checked)continue;const score=quality(checked)+Math.random()*5;if(score>bestScore){best=checked;bestScore=score;}
 }
 if(!best){const sources=shuffle(starters.list(format));for(const source of sources){const team=Teams.import(source.text);if(signature(team)!==prior&&(best=validTeam(team)))break;}}
 if(!best)throw Error('当前规则下未生成通过完整校验的队伍，请重试或更新规则数据。现有队伍已保留。');
 const first=best[0],name=(dictionary[first.species]||first.species)+'与伙伴 · '+require('node:crypto').randomBytes(2).toString('hex').toUpperCase();return{format,text:Teams.export(best),name,members:best.length,source:'rules-generator',note:'按当前规则自动组合并通过完整合法性校验，可直接使用或继续调整。'};
}
module.exports={generate};
