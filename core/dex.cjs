const {Dex, Teams, TeamValidator, toID} = require('pokemon-showdown');
function formats() {
  return Dex.formats.all().filter(f => f.name && f.mod && !f.name.includes('@@@')).map(f => ({
    id: f.id, name: f.name, gameType: f.gameType || 'singles', random: !!f.team,
    rules: f.ruleset || [], bans: f.banlist || [], search: f.searchShow !== false,
    section: f.section || '', supported: ['singles', 'doubles'].includes(f.gameType || 'singles'),
  }));
}
function validate(text, format = 'gen9ou') {
  const f = Dex.formats.get(format);
  if (!f.exists) throw new Error('本地引擎尚不支持此规则，请更新引擎后重试');
  const team = Teams.import(text || '');
  if (!team?.length) return {valid: false, errors: ['请导入至少一只宝可梦的 Showdown 队伍文本'], team: []};
  if (team.length > 6) return {valid: false, errors: ['最多支持六只宝可梦'], team};
  const errors = new TeamValidator(format).validateTeam(team) || [];
  return {valid: !errors.length, errors, team, text: Teams.export(team), packed: Teams.pack(team)};
}
function speciesInfo(name, format = 'gen9ou') {
  const dex = Dex.forFormat(format); const species = dex.species.get(name);
  if (!species.exists) return null;
  const learnset = dex.species.getLearnsetData(species.id).learnset || {};
  return {id: species.id, name: species.name, types: species.types, abilities: species.abilities, stats: species.baseStats,
    tier: species.tier, moves: Object.keys(learnset).map(id => dex.moves.get(id)).filter(m => m.exists).map(m => ({name:m.name,type:m.type,power:m.basePower,category:m.category,desc:m.shortDesc}))};
}
function parseFormats(line) {
  let section = ''; let skipSection = false; const result = [];
  for (const token of line.replace(/^\|formats\|/, '').split('|')) {
    if (!token) continue;
    if (/^,\d/.test(token)) {skipSection = true; continue;}
    if (skipSection) { section = token; skipSection = false; continue; }
    const [name, flag] = token.split(',');
    if (!name || !name.includes('[')) continue;
    const bits = /^[0-9a-f]+$/i.test(flag || '') ? parseInt(flag, 16) : null;
    result.push({id:toID(name), name, section, random:bits === null ? token.includes(',#') : !!(bits & 1), search: bits === null ? !token.endsWith(',') || token.endsWith(',,') : !!(bits & 2), online:true});
  }
  return result;
}
module.exports = {Dex, Teams, TeamValidator, toID, formats, validate, speciesInfo, parseFormats};
