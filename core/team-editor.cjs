'use strict';
const {Dex, Teams, TeamValidator, toID} = require('./dex.cjs');
const dictionary = require('../assets/zh-dictionary.json');
const assetManifest = require('../assets/battle-media/manifest.json');
const {describe}=require('./chinese-text.cjs');
const validators = new Map(), catalogs = new Map(), moveLists = new Map();
const statKeys = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];
const statLabel = {hp: 'HP', atk: '攻击', def: '防御', spa: '特攻', spd: '特防', spe: '速度'};
const label = name => dictionary[name] || name;
const sprite = name => Dex.species.get(name).id || toID(name);
function validator(format) {
  if (!validators.has(format)) validators.set(format, new TeamValidator(format));
  return validators.get(format);
}
function profile(format) {
  const v = validator(format), dex = v.dex, table = v.ruleTable;
  const national = /nationaldex/.test(format);
  const doubles = /doubles(?:ou|uu|ubers)$/.test(format);
  const tiered = doubles || /(?:ou|uu|ru|nu|pu|zu|ubers|anythinggoes|lc|lcuu)$/.test(format) || format === 'gen9nationaldex';
  const tiers = doubles ? ['DUber','DOU','DBL','DUU','DNU','NFE','LC'] : ['AG','Uber','OU','UUBL','UU','RUBL','RU','NUBL','NU','PUBL','PU','ZUBL','ZU','LC','NFE'];
  const champions = dex.currentMod.startsWith('champions');
  return {format, name: v.format.name, gen: dex.gen, tiered, tiers, tierField: national ? 'natDexTier' : doubles ? 'doublesTier' : 'tier',
    evLimit: table.evLimit, evMax: champions ? 32 : 252, evLabel: champions ? '能力点' : '努力值',
    ivMax: 31, minLevel: table.minLevel || 1, maxLevel: table.maxLevel || 100, defaultLevel: table.defaultLevel || 100,
    battleLevel: table.adjustLevel || table.adjustLevelDown || null,
    abilities: dex.gen >= 3, natures: dex.gen >= 3, items: dex.gen >= 2,
    tera: dex.gen === 9 && !champions && !table.has('terastalclause'), champions,
    learnset: table.has('obtainablemoves'), naturalAbilities: table.has('obtainableabilities')};
}
function speciesStatus(format, species) {
  const v = validator(format), dex = v.dex, s = dex.species.get(species), p = profile(format);
  const tier = String(s[p.tierField] || s.tier || '未分级').replace(/[()]/g, '');
  const set = {species:s.name, name:s.name, ability:s.abilities?.['0'] || '', item:s.requiredItem || s.requiredItems?.[0] || '', moves:[], level:p.defaultLevel};
  let reason = !s.exists || s.num === 0 ? '该规则中不存在此宝可梦' : v.checkSpecies(set, s, s, {}) || '';
  if (!reason && v.ruleTable.has('littlecup')) reason = (dex.formats.get('littlecup').onValidateSet.call(v, set) || []).join(' ');
  if (!reason) for (const type of s.types || []) reason ||= v.checkType(set, dex.types.get(type), {}) || '';
  const legal = !reason;
  return {legal, reason, tier, tierLabel:legal ? (p.tiered ? tier : '可用') : '非法', group:legal ? (p.tiered ? tier : '可用') : '非法'};
}
function catalog(format) {
  if (catalogs.has(format)) return catalogs.get(format);
  const v = validator(format), dex = v.dex, p = profile(format);
  const rows = items => items.filter(x=>x.exists && (!x.gen || x.gen<=dex.gen)).map(x=>({id:x.id,name:x.name,label:label(x.name)}));
  const result = {profile:p,
    species:rows(dex.species.all().filter(s=>s.num!==0)).map(r=>({...r,...speciesStatus(format,r.name),sprite:sprite(r.name),assetKey:'sprite/'+sprite(r.name)+'/front/normal/M',types:dex.species.get(r.name).types})),
    items:rows(dex.items.all()).filter(r=>!v.checkItem({name:'宝可梦'},dex.items.get(r.name),{})).map(r=>({...r,iconKey:'item/'+r.id,iconSprite:assetManifest['item/'+r.id]?null:dex.items.get(r.name).spritenum,...describe(dex,dex.items.get(r.name))})),
    abilities:rows(dex.abilities.all()).filter(r=>!v.checkAbility({name:'宝可梦',species:'Pikachu'},dex.abilities.get(r.name),{})).map(r=>({...r,...describe(dex,dex.abilities.get(r.name))})),
    natures:rows(dex.natures.all()).map(r=>{const n=dex.natures.get(r.name);return {...r,plusLabel:statLabel[n.plus]||'',minusLabel:statLabel[n.minus]||''};}),
    types:rows(dex.types.all().filter(t=>!t.isNonstandard)).filter(r=>!v.checkTeraType({name:'宝可梦'},dex.types.get(r.name),{}))
  };
  catalogs.set(format,result); return result;
}
function movesForSpecies(format, species) {
  const key=format+'|'+species;
  if(moveLists.has(key))return moveLists.get(key);
  const v=validator(format),dex=v.dex,s=dex.species.get(species),p=profile(format);
  if(!s.exists)return [];
  const checkLearn=v.ruleTable.checkCanLearn?.[0]||v.checkCanLearn;
  const set={species:s.name,name:s.name,level:p.defaultLevel,ability:s.abilities['0']||'',moves:[]};
  const result=dex.moves.all().filter(m=>{
    if(!m.exists||m.gen>dex.gen||v.checkMove(set,m,{}))return false;
    if(!p.learnset)return true;
    try{return !checkLearn.call(v,m,s,v.allSources(s),set);}catch{return false;}
  }).map(m=>({name:m.name,label:label(m.name),id:m.id,type:m.type,category:({Physical:'物理',Special:'特殊',Status:'变化'})[m.category],power:m.basePower,accuracy:m.accuracy,...describe(dex,m)}));
  moveLists.set(key,result);return result;
}
function sortUsage(rows, distribution=[]) {
  const values=new Map(distribution.map((x,index)=>[toID(x.name),{rank:index,percent:x.percent}]));
  return rows.map(r=>({...r,usageRank:values.get(r.id)?.rank??null,usagePercent:values.get(r.id)?.percent??null})).sort((a,b)=>(a.usageRank??Infinity)-(b.usageRank??Infinity)||a.label.localeCompare(b.label,'zh-CN'));
}
function sourceSets(source) {
  if(Array.isArray(source?.sets))return source.sets.map(s=>({name:s.name||'示例配装',...s}));
  return Object.entries(source||{}).filter(([,s])=>s&&Array.isArray(s.moves)).map(([name,s])=>({name,...s}));
}
function recommendationsFor(format,species,recommendation) {
  const v=validator(format),p=profile(format),dex=v.dex,usage=recommendation?.stats?.[species],result=[],seen=new Set();
  const candidates=[...sourceSets(recommendation?.dex?.[species]),...sourceSets(recommendation?.sampleStats?.[species])];
  if(usage?.moves?.length){
    const first=(field,group)=>dex[group].get(usage[field]?.[0]?.name||'').name;
    const spread=usage.spreads?.[0]?.name?.match(/^([^:]+):(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(\d+)$/);
    candidates.push({name:'使用率参考',species,moves:usage.moves.map(x=>dex.moves.get(x.name).name).filter(Boolean).slice(0,4),
      item:first('items','items'),ability:first('abilities','abilities'),teraType:first('teraTypes','types'),
      nature:spread?.[1]||'Serious',evs:spread?Object.fromEntries(statKeys.map((s,i)=>[s,Number(spread[i+2])])):{},level:p.defaultLevel});
  }
  for(const candidate of candidates) {
    const set={...candidate,species,level:candidate.level||p.defaultLevel,moves:(candidate.moves||[]).slice(0,4)};
    const name=set.name;delete set.name;
    const problems=v.validateSet(set)||[];
    if(problems.length)continue;
    const key=JSON.stringify(set);if(seen.has(key))continue;seen.add(key);
    result.push({...set,name});if(result.length>=8)break;
  }
  return result;
}
function positionsFor(sets, positions) {
  if(Array.isArray(positions)&&positions.length===sets.length&&new Set(positions).size===positions.length&&positions.every(i=>Number.isInteger(i)&&i>=0&&i<6))return [...positions];
  return sets.map((_,i)=>i);
}
function read(text='',format='gen9ou',recommendation=null,positions) {
  const sets=Teams.import(String(text))||[];
  if(sets.length>6)throw Error('一支队伍最多六只宝可梦');
  if(recommendation?.format!==format)recommendation=null;
  const cat=catalog(format),v=validator(format),dex=v.dex,p=cat.profile,pos=positionsFor(sets,positions);
  const species=cat.species.map(r=>({...r,usage:Number(recommendation?.stats?.[r.name]?.usage||0)}));
  species.sort((a,b)=>Number(b.legal)-Number(a.legal)||(p.tiered?(p.tiers.indexOf(a.tier)<0?99:p.tiers.indexOf(a.tier))-(p.tiers.indexOf(b.tier)<0?99:p.tiers.indexOf(b.tier)):0)||b.usage-a.usage||a.label.localeCompare(b.label,'zh-CN'));
  const slots=Array(6).fill(null);
  sets.forEach((s,i)=>{
    const entry=dex.species.get(s.species),usage=recommendation?.stats?.[s.species]||{};
    const abilityNames=Object.entries(entry.abilities||{}).filter(([key])=>key!=='S'&&(key!=='H'||!entry.unreleasedHidden)).map(([,name])=>name);
    slots[pos[i]]={...s,sprite:sprite(s.species),label:label(s.species),types:entry.types,legality:speciesStatus(format,s.species),
      abilityCatalog:sortUsage(cat.abilities.filter(a=>!p.naturalAbilities||abilityNames.includes(a.name)),usage.abilities),
      itemCatalog:sortUsage(cat.items,usage.items),moveCatalog:sortUsage(movesForSpecies(format,s.species),usage.moves),
      recommendations:recommendationsFor(format,s.species,recommendation)};
  });
  return {format,sets:slots,positions:pos,catalog:{...cat,species,recommendationSource:recommendation?.source||'local',
    recommendationWarning:recommendation?.warning||'',recommendationMonth:recommendation?.month||'',recommendationRating:recommendation?.rating,
    recommendationUrl:recommendation?.sourceUrl||recommendation?.setsUrl||''}};
}
function update({text='',format='gen9ou',positions,index,patch={},remove=false}={}) {
  const sets=Teams.import(String(text))||[],pos=positionsFor(sets,positions),offset=pos.indexOf(index);
  if(!Number.isInteger(index)||index<0||index>5||sets.length>6)throw Error('队伍位置无效');
  const finish=()=>{const rows=sets.map((s,i)=>({s,pos:pos[i]})).sort((a,b)=>a.pos-b.pos);return {text:Teams.export(rows.map(r=>r.s)),positions:rows.map(r=>r.pos)};};
  if(remove){if(offset>=0){sets.splice(offset,1);pos.splice(offset,1);}return finish();}
  const v=validator(format),dex=v.dex,cat=catalog(format),p=cat.profile;
  const resolve=(group,value,optional=false)=>{
    value=String(value||'').trim();if(!value&&optional)return '';
    const item=cat[group]?.find(x=>x.name===value||x.label===value||toID(x.name)===toID(value));
    if(!item)throw Error('无法识别：'+value);return item.name;
  };
  const previous=offset>=0?sets[offset]:{},next={...previous,moves:[...(previous.moves||[])]};
  if('species' in patch){
    next.species=resolve('species',patch.species);
    const status=speciesStatus(format,next.species);
    if(!status.legal)throw Error(label(next.species)+' 不符合当前规则：'+status.reason);
    if(previous.species!==next.species){
      const species=dex.species.get(next.species);
      Object.assign(next,{name:'',ability:species.abilities['0']||'',moves:[],item:species.requiredItem||species.requiredItems?.[0]||'',nature:'Serious',evs:{},ivs:{},level:p.defaultLevel,teraType:species.requiredTeraType||species.types[0]});
      // Old species-specific fields cannot leak into a replacement.
      patch={species:patch.species};
    }
  }
  if(!next.species)throw Error('请先选择宝可梦');
  for(const [field,group,optional]of [['item','items',true],['ability','abilities',true],['nature','natures',false],['teraType','types',true]])if(field in patch)next[field]=resolve(group,patch[field],optional);
  if(p.naturalAbilities&&next.ability&&!Object.values(dex.species.get(next.species).abilities).includes(next.ability))throw Error('特性不属于当前宝可梦');
  if('moves' in patch){
    if(!Array.isArray(patch.moves)||patch.moves.length>4)throw Error('最多四个招式');
    const allowed=movesForSpecies(format,next.species);
    next.moves=patch.moves.filter(x=>String(x).trim()).map(value=>{const m=allowed.find(m=>m.name===value||m.label===value||m.id===toID(value));if(!m)throw Error('当前规则不可学习：'+value);return m.name;});
    if(new Set(next.moves).size!==next.moves.length)throw Error('不能重复选择同一个招式');
  }
  if('name' in patch){if(/[\r\n|]/.test(patch.name))throw Error('昵称不能包含换行或分隔符');next.name=String(patch.name).slice(0,18);}
  if('level' in patch){const n=Number(patch.level);if(!Number.isInteger(n)||n<p.minLevel||n>p.maxLevel)throw Error('等级应为 '+p.minLevel+'–'+p.maxLevel);next.level=n;}
  for(const key of ['evs','ivs'])if(key in patch){
    next[key]={};for(const stat of statKeys){const n=Number(patch[key][stat]??(key==='ivs'?31:0));const max=key==='ivs'?31:p.evMax;if(!Number.isInteger(n)||n<0||n>max)throw Error((key==='ivs'?'个体值':p.evLabel)+'应为 0–'+max);next[key][stat]=n;}
    if(key==='evs'&&p.evLimit!==null&&Object.values(next.evs).reduce((a,b)=>a+b,0)>p.evLimit)throw Error(p.evLabel+'总和不能超过 '+p.evLimit);
  }
  if(offset<0){sets.push(next);pos.push(index);}else sets[offset]=next;
  return finish();
}
module.exports={read,update,sprite,profile,speciesStatus,movesForSpecies};
