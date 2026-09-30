'use strict';
const {fetch} = require('undici');
const fs = require('node:fs');
const path = require('node:path');
const TTL = 6 * 60 * 60 * 1000;
const SCHEMA = 2;
const pending = new Map();
const indexes = new Map();
const normalize = value => String(value || 'gen9ou').toLowerCase().replace(/[^a-z0-9]/g, '');
function empty(format, warning = '') { return {schema: SCHEMA, format, source: 'unavailable', stats: {}, dex: {}, warning}; }
function valid(data, format) { return data?.schema === SCHEMA && data.format === format && data.stats && data.dex; }
function cachedRecommendations(format, store) {
  format = normalize(format);
  const cached = store?.get(`recommendations-v${SCHEMA}-${format}`, null);
  let bundled = null;
  try {
    bundled = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/recommendations', format + '.json'), 'utf8'));
  } catch {}
  if (valid(bundled, format) && (!valid(cached, format) || cached.source === 'unavailable' ||
      (bundled.source === 'smogon' && (cached.source !== 'smogon' || bundled.month > cached.month)))) return {...bundled, bundled: true};
  if (valid(cached, format)) return cached;
  if (valid(bundled, format)) return {...bundled, bundled: true};
  return empty(format);
}
async function request(url, signal) {
  const response = await fetch(url, {signal, headers: {'user-agent': 'ShowdownBattler/0.5.6'}});
  if (!response.ok) { await response.body?.cancel(); throw Error(`HTTP ${response.status}`); }
  let size = 0; const chunks = [];
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 24 * 1024 * 1024) throw Error('统计文件过大');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}
async function index(url, signal) {
  const old = indexes.get(url);
  if (old && Date.now() - old.at < TTL) return old.text;
  const text = await request(url, signal);
  indexes.set(url, {text, at: Date.now()});
  return text;
}
function distribution(values, denominator) {
  const entries = Object.entries(values || {}).filter(([, n]) => Number(n) > 0);
  const total = denominator || entries.reduce((n, [, v]) => n + Number(v), 0);
  return entries.sort((a, b) => b[1] - a[1]).map(([name, value]) => ({name, weight: Number(value), percent: total ? Number(value) / total * 100 : 0}));
}
function parseUsage(raw, format, metadata = {}) {
  const stats = {};
  for (const [name, row] of Object.entries(raw.data || {}).sort((a, b) => (b[1].usage || 0) - (a[1].usage || 0))) {
    stats[name] = {usage: Number(row.usage || 0), moves: distribution(row.Moves, Object.values(row.Abilities||{}).reduce((n,v)=>n+Number(v),0)), items: distribution(row.Items), abilities: distribution(row.Abilities), spreads: distribution(row.Spreads), teraTypes: distribution(row['Tera Types'])};
  }
  if (!Object.keys(stats).length) throw Error('统计数据为空');
  return {schema: SCHEMA, format, source: 'smogon', stats, dex: {}, ...metadata};
}
async function loadRecommendations(format, store, {force = false} = {}) {
  format = normalize(format);
  const cached = cachedRecommendations(format, store);
  if (!force && cached.fetchedAt && Date.now() - cached.fetchedAt < TTL) return cached;
  if (pending.has(format)) return pending.get(format);
  const job = (async () => {
    const signal = AbortSignal.timeout(30000);
    let result = null; let issue = '';
    try {
      const root = await index('https://www.smogon.com/stats/', signal);
      const months = [...new Set([...root.matchAll(/href="(\d{4}-\d{2})\//g)].map(x => x[1]))].sort().reverse();
      // 保留理由：只使用相同规则 ID 的统计，不能把相邻 VGC 赛制伪装成当前规则。
      for (const month of months.slice(0, 3)) {
        const listing = await index(`https://www.smogon.com/stats/${month}/chaos/`, signal);
        const available = [...listing.matchAll(/href="([a-z0-9]+)-(\d+)\.json"/g)].filter(x => x[1] === format);
        if (!available.length) continue;
        const chosen = available.find(x => x[2] === '0') || available.find(x => x[2] === '1500') || available[0];
        const sourceUrl = `https://www.smogon.com/stats/${month}/chaos/${chosen[1]}-${chosen[2]}.json`;
        result = parseUsage(JSON.parse(await request(sourceUrl, signal)), format, {month, rating: Number(chosen[2]), sourceUrl});
        break;
      }
    } catch (error) { issue = error.message; }
    // 保留理由：统计刷新失败时保留同规则的已验证快照，示例配装不能覆盖使用率数据。
    if (!result && cached.source !== 'unavailable') result = {...cached, stale: true, warning: '统计暂未更新，使用此规则已保存的数据。'};
    if (result && !result.stale && cached.dex) result.dex = cached.dex;
    try {
      const sourceUrl = `https://play.pokemonshowdown.com/data/sets/${format}.json`;
      const data = JSON.parse(await request(sourceUrl, AbortSignal.timeout(3000)));
      if (data.dex && data.stats) {
        result ||= empty(format);
        result.dex = data.dex;
        result.sampleStats = data.stats;
        result.setsUrl = sourceUrl;
        if (result.source === 'unavailable') result.source = 'showdown-sets';
      }
    } catch (error) { issue ||= error.message; }
    if (!result && cached.source !== 'unavailable') return {...cached, stale: true, warning: '网络暂不可用，使用此规则已保存的数据。'};
    result ||= empty(format, '此规则暂未发布独立使用率；按当前规则分级浏览即可。');
    result.fetchedAt = result.stale ? cached.fetchedAt : Date.now();
    result.networkIssue = issue;
    store?.set(`recommendations-v${SCHEMA}-${format}`, result);
    return result;
  })().finally(() => pending.delete(format));
  pending.set(format, job);
  return job;
}
module.exports = {loadRecommendations, cachedRecommendations, parseUsage};
