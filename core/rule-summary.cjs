'use strict';
const {TeamValidator}=require('./dex.cjs'),dictionary=require('../assets/zh-dictionary.json'),cache=new Map();
function summary(format){
 if(cache.has(format))return cache.get(format);
 const v=new TeamValidator(format),r=v.ruleTable,dex=v.dex,lines=[],bans=[],allows=[];
 const label=value=>dictionary[value]||value;
 const size=r.maxTeamSize,picked=r.pickedTeamSize||size;lines.push((v.format.gameType==='doubles'?'双打':'单打')+' · 队伍最多 '+size+' 只 · 出场 '+picked+' 只');
 if(r.minTeamSize>1)lines.push('登记队伍至少 '+r.minTeamSize+' 只');
 lines.push(r.adjustLevel?'对战时调整为 '+r.adjustLevel+' 级':r.adjustLevelDown?'超过 '+r.adjustLevelDown+' 级的宝可梦降至 '+r.adjustLevelDown+' 级':'等级 '+r.minLevel+'–'+r.maxLevel+'，默认 '+r.defaultLevel+' 级');
 if(r.maxTotalLevel)lines.push('出场宝可梦等级总和不超过 '+r.maxTotalLevel);
 if(v.format.team)lines.push('本赛制由服务器生成队伍，无需自行组队');
 if(r.has('speciesclause'))lines.push('同一队伍不能重复相同图鉴编号的宝可梦');
 if(r.has('itemclause'))lines.push('同一道具最多携带 '+(r.valueRules.get('itemclause')||1)+' 个');
 if(r.has('obtainablemoves'))lines.push('招式须在当前世代与赛制可学，配装组合也需合法');
 if(dex.gen>=3&&r.has('obtainableabilities'))lines.push('特性须属于该宝可梦在当前赛制的可用特性');
 if(dex.currentMod.startsWith('champions'))lines.push('使用冠军专属宝可梦、道具与招式表；能力点单项上限 32');
 if(Number.isFinite(r.evLimit))lines.push((dex.currentMod.startsWith('champions')?'能力点':'努力值')+'总上限 '+r.evLimit);
 if(dex.gen===9&&!dex.currentMod.startsWith('champions'))lines.push(r.has('terastalclause')?'本规则禁止太晶化':'可太晶化一次；固定形态的道具与太晶属性仍受限制');
 const clauses={sleepclausemod:'催眠限制：不能主动使对手多只同时陷入睡眠',sleepmovesclause:'禁止催眠类招式',evasionmovesclause:'禁止提升闪避的招式',evasionabilitiesclause:'禁止闪避类特性',ohkoclause:'禁止一击必杀招式',endlessbattleclause:'禁止制造无尽对战',littlecup:'仅允许符合幼年杯条件的宝可梦',sametypeclause:'全队必须共享至少一种属性',terastalclause:'禁止太晶化'};
 for(const [key,text]of Object.entries(clauses))if(r.has(key))lines.push(text);
 for(const key of r.keys()){
  if(!/^[+-]/.test(key))continue;const [type,...rest]=key.slice(1).split(':'),id=rest.join(':');let name;
  if(['pokemon','basepokemon','move','item','ability'].includes(type)){const group={pokemon:'species',basepokemon:'species',move:'moves',item:'items',ability:'abilities'}[type],x=dex[group].get(id);name=({pokemon:'宝可梦',basepokemon:'全形态',move:'招式',item:'道具',ability:'特性'})[type]+' · '+label(x.name||id);}
  else if((type==='pokemontag'||type==='tag'))name='宝可梦类别 · '+({uber:'Uber',ou:'OU',uubl:'UUBL',uu:'UU',rubl:'RUBL',ru:'RU',nubl:'NUBL',nu:'NU',publ:'PUBL',pu:'PU',zubl:'ZUBL',ag:'AG',duber:'双打 Uber',dou:'双打 OU',dbl:'双打禁用',mythical:'幻之宝可梦',restrictedlegendary:'受限传说宝可梦',past:'已退出本世代',future:'尚未登场',unobtainable:'不可获得',nonexistent:'当前赛制不存在'}[id]||id);
  if(name)(key[0]==='-'?bans:allows).push(name);
 }
 for(const entry of [...r.complexBans,...r.complexTeamBans])bans.push('组合限制 · '+entry[0].split(/(\s*\+\+?\s*)/).map(s=>label(s.trim())).join(' '));
 const value={id:format,name:v.format.name,lines:[...new Set(lines)],bans:[...new Set(bans)],allows:[...new Set(allows)],note:'以当前引擎为依据；最终出战由服务器复核。'};cache.set(format,value);return value;
}
module.exports={summary};
