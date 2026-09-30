'use strict';
const {Worker} = require('node:worker_threads');
const path = require('node:path');
function createService(root) {
  let worker, serial = 0; const pending = new Map();
  function start() {
    worker = new Worker(path.join(__dirname, '../core/team-editor-worker.cjs'), {workerData:{root}});
    worker.unref();
    worker.on('message', ({id,value,error,stack}) => {
      const entry=pending.get(id); if(!entry)return;
      pending.delete(id);clearTimeout(entry.timer);
      if(error){const e=new Error(error);e.stack=stack;entry.reject(e);}else entry.resolve(value);
    });
    worker.on('error', error=>{for(const entry of pending.values()){clearTimeout(entry.timer);entry.reject(error);}pending.clear();worker=null;});
  }
  return (method,payload)=>new Promise((resolve,reject)=>{
    if(!worker)start();const id=++serial;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('组队数据处理超时，请重试'));},45000);
    pending.set(id,{resolve,reject,timer});worker.postMessage({id,method,payload});
  });
}
module.exports={createService};
