'use strict';
const {parentPort, workerData} = require('node:worker_threads');
const editor = require('./team-editor.cjs');
const {Store} = require('./store.cjs');
const {cachedRecommendations, loadRecommendations} = require('./team-recommendations.cjs');
const store = new Store(workerData.root);
parentPort.on('message', async ({id, method, payload:p}) => {
  try {
    if(method==='generate'){parentPort.postMessage({id,value:require('./team-generator.cjs').generate(p.format,{previous:p.previous,store})});return;}
    const recommendation = method === 'refresh' ? await loadRecommendations(p.format, store, {force:!!p.force}) : cachedRecommendations(p.format, store);
    const value = method === 'update' ? editor.update(p) : editor.read(p.text, p.format, recommendation, p.positions,p.index);
    parentPort.postMessage({id, value});
  } catch (error) { parentPort.postMessage({id, error:error.message, stack:error.stack}); }
});
