'use strict';
const {parentPort, workerData} = require('node:worker_threads');
const editor = require('./team-editor.cjs');
const {Store} = require('./store.cjs');
const {cachedRecommendations, loadRecommendations} = require('./team-recommendations.cjs');
const store = new Store(workerData.root);
parentPort.on('message', async ({id, method, payload:p}) => {
  try {
    const recommendation = method === 'refresh' ? await loadRecommendations(p.format, store, {force:!!p.force}) : cachedRecommendations(p.format, store);
    const value = method === 'update' ? editor.update(p) : editor.read(p.text, p.format, recommendation, p.positions);
    parentPort.postMessage({id, value});
  } catch (error) { parentPort.postMessage({id, error:error.message, stack:error.stack}); }
});
