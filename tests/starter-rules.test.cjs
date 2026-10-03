'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{validate,TeamValidator}=require('../core/dex.cjs'),starters=require('../core/starter-teams.cjs'),{summary}=require('../core/rule-summary.cjs');
test('every offered complete starter passes its exact rules including champions item and move pools',()=>{
 const formats=new Set([...Object.keys(require('../assets/sample-teams.json').formats),...Object.keys(require('../assets/builtin-starters.json'))]);let count=0;
 for(const format of formats){const source=[...(require('../assets/sample-teams.json').formats[format]||[]),...(require('../assets/builtin-starters.json')[format]||[])],offered=starters.list(format);assert.equal(offered.length,source.length,format);for(const row of offered){const valid=validate(row.text,format);assert(valid.valid,format+valid.errors.join(';'));assert.equal(valid.team.length,Math.min(6,new TeamValidator(format).ruleTable.maxTeamSize));count++;}}
 assert(count>=118);assert.equal(starters.list('gen1ou').length,0,'do not substitute another format');assert(starters.list('gen9ru').every(row=>row.format==='gen9ru'));
});
test('using a sample does not mutate the reusable source',()=>{const first=starters.list('gen9ou')[0];const expected=first.text;first.text='bad';assert.equal(starters.list('gen9ou')[0].text,expected);});
test('rule hover reports inherited bans, rule-specific roster, caps and item restrictions',()=>{
 const ru=summary('gen9ru'),ou=summary('gen9ou'),vgc=summary('gen9championsvgc2026regmc');assert(ru.bans.includes('宝可梦类别 · OU'));assert(ru.bans.includes('道具 · 光之黏土'));assert(!ou.bans.includes('宝可梦类别 · OU'));assert(vgc.lines.includes('同一道具最多携带 1 个'));assert(vgc.lines.some(x=>x.includes('出场 4 只')));assert(vgc.lines.includes('能力点总上限 66'));assert(vgc.bans.includes('宝可梦类别 · 受限传说宝可梦'));assert(!summary('gen1ou').lines.some(x=>x.includes('特性')));assert(summary('gen9randombattle').lines.some(x=>x.includes('服务器生成')));assert(summary('gen6vgc2014').lines.some(x=>x.includes('超过 50 级')));
});
