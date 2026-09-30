'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const names=require('../assets/zh-dictionary.json');
const normalize=s=>String(s||'').replace(/×/g,'x').replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim().toLowerCase();
const source=fs.readFileSync(path.join(__dirname,'../assets/ps-china.user.js'),'utf8');
const start=source.indexOf('var translations ='),end=source.indexOf('\n};',start)+3;
const dictionary=vm.runInNewContext(source.slice(start,end)+';translations');
const translations=new Map(Object.entries(dictionary).map(([a,b])=>[normalize(a),b]));
const extra={
 "A Poke Ball that makes it easier to catch wild Pokémon while they're asleep.":'更容易捕捉处于睡眠状态的野生宝可梦的精灵球。',
 "If Sun is active, this Pokemon's Speed is doubled.":'大晴天时，速度变为原来的 2 倍。',
 'On switch-in, this Pokemon summons Rain.':'出场时将天气变为下雨。',
 'On switch-in, this Pokemon summons Sun.':'出场时将天气变为大晴天。',
 "If user is Cherrim and Sun is active, it and allies' Attack and Sp. Def are 1.5×.":'大晴天时，樱花儿自身与同伴的攻击和特防变为原来的 1.5 倍。',
 'This Pokemon has its status cured at the end of each turn if Rain is active.':'下雨时，每回合结束解除自身的异常状态。',
 'If Sun is active, this Pokemon cannot be statused and Rest will fail for it.':'大晴天时不会陷入异常状态，且无法使用睡觉。',
 'On switch-in, summons Sun. During Sun, Attack is 1.3333×.':'出场时将天气变为大晴天。大晴天时，自身攻击变为原来的约 4/3。',
 'Sun active or Booster Energy used: highest stat is 1.3×, or 1.5× if Speed.':'大晴天或消耗驱劲能量时，最高的能力提高 30%；若最高能力为速度，则提高 50%。',
 'If Rain is active, this Pokemon heals 1/16 of its max HP each turn.':'下雨时，每回合恢复最大体力的 1/16。',
 "If Sun is active, this Pokemon's Sp. Atk is 1.5×; loses 1/8 max HP per turn.":'大晴天时，特攻变为原来的 1.5 倍，每回合损失最大体力的 1/8。',
 "If Rain is active, this Pokemon's Speed is doubled.":'下雨时，速度变为原来的 2 倍。',
 "This Pokemon's attacks have a 30% chance of badly poisoning.":'攻击命中时，有 30% 的概率使目标陷入剧毒状态。',
 '-1 evasion; ends user and target hazards/terrain.':'目标闪避降低 1 级，清除双方场地的进入场地效果与场地状态。',
 'During Sun: 1.5× damage instead of half.':'大晴天时威力提高 50%，而非降低一半。',
 '100% flinch. Fails unless target using priority attack.':'使目标畏缩。仅在目标即将使用先制攻击招式时成功。',
 "Holder's Ability cannot be changed, suppressed, or ignored by any effect.":'保护携带者的特性，使其不会被改变、压制或无视。',
 "Holder's use of Snowscape lasts 8 turns instead of 5.":'携带者引发的下雪持续时间从 5 回合延长至 8 回合。',
 "Holder's first successful Normal-type attack will have 1.3× power. Single use.":'首次成功使用一般属性攻击时，威力提高 30%。使用后消耗。',
 "Though this feather is beautiful, it's just a regular feather and has no effect.":'一片美丽的普通羽毛，没有对战效果。',
 'Holder cannot be prevented from choosing to switch out by any effect.':'携带者可以无视阻止替换的效果，主动替换下场。',
};
for(const [a,b] of Object.entries(extra))translations.set(normalize(a),b);
const type=t=>({Psychic:'超能力',Normal:'一般'})[t]||names[t]||t;
function translate(text){
 if(!text)return '';const exact=translations.get(normalize(text));if(exact)return exact;
 let m;
 if(m=text.match(/^Holder's (\w+)-type attacks have ([\d.]+)[×x] power\.(?: Judgment is (\w+) type\.)?$/))return `携带者的${type(m[1])}属性招式威力变为原来的 ${m[2]} 倍。`+(m[3]?`制裁光砾变为${type(m[3])}属性。`:'');
 if(m=text.match(/^Halves damage taken from a supereffective (\w+)-type attack\. Single use\.$/))return `受到效果绝佳的${type(m[1])}属性攻击时，伤害减半。使用后消耗。`;
 if(m=text.match(/^Restores 1\/3 max HP at 1\/4 max HP or less; confuses if -(SpD|Atk|Def|Spe|SpA) Nature\. Single use\.$/))return '体力不高于 1/4 时恢复最大体力的 1/3；若性格降低'+({SpD:'特防',Atk:'攻击',Def:'防御',Spe:'速度',SpA:'特攻'})[m[1]]+'，则陷入混乱。使用后消耗。';
 if(m=text.match(/^Evolves (.+) into (.+) when (used|traded)\.$/)){const n=s=>names[s]||names[s.replace(/^Galarian (.+)$/,'$1-Galar')]||s;return `${m[3]==='traded'?'携带并通信交换':'使用后'}可使${n(m[1])}进化为${n(m[2])}。`;}
 return '';
}
function describe(dex,item){const text=dex.text.get(item)||{},short=translate(text.shortDesc),long=translate(text.desc);return {shortDesc:short||long||'暂无中文效果说明',desc:long||short||'暂无中文效果说明'};}
module.exports={describe,translate};
