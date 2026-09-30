const {fetch} = require('undici');
async function request(url, settings, options = {}) {
  const {maxBytes = 5_000_000, timeout = 30000, ...init} = options;
  const response = await fetch(url, {...init, redirect: 'error', signal: AbortSignal.timeout(timeout)});
  if (!response.ok) { await response.body?.cancel(); throw new Error(`请求失败：HTTP ${response.status}（${new URL(url).hostname}）`); }
  const chunks = []; let size = 0;
  for await (const chunk of response.body) { size += chunk.length; if (size > maxBytes) { throw new Error('远程内容超出大小限制'); } chunks.push(chunk); }
  return Buffer.concat(chunks).toString('utf8');
}
const json = async (...args) => JSON.parse(await request(...args));
module.exports = {request, json};
