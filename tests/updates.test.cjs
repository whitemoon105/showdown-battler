'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events'),{create}=require('../electron/play-updates.cjs');
test('public updates are explicit, preserve battle sessions and report download failures',async()=>{
 const updater=new EventEmitter();let downloads=0,playing=true,opened='';updater.setFeedURL=feed=>assert.deepEqual(feed,{provider:'github',owner:'whitemoon105',repo:'showdown-battler',private:false});updater.checkForUpdates=async()=>updater.emit('update-available',{version:'0.5.8'});updater.downloadUpdate=async()=>{downloads++;updater.emit('update-downloaded',{version:'0.5.8'});};updater.quitAndInstall=()=>assert.fail('must not close an active battle');
 const api=create({app:{isPackaged:true,getVersion:()=> '0.5.7'},updater,shell:{openExternal:async url=>{opened=url;}},logger:{error(){}},send(){},isPlaying:async()=>playing});
 assert.equal(updater.autoDownload,false);assert.equal(updater.autoInstallOnAppQuit,false);assert.equal(updater.allowDowngrade,false);
 await api['update-check']();assert.equal(downloads,0);assert.equal(api['update-status']().phase,'available');await api['update-download']();assert.equal(downloads,1);assert.equal(api['update-status']().phase,'ready');await assert.rejects(api['update-install'](),/结束当前对局/);
 await api['project-open']();assert.equal(opened,'https://github.com/whitemoon105/showdown-battler');updater.emit('error',new Error('offline'));assert.equal(api['update-status']().phase,'error');
});
