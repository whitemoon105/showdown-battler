'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out='D:/ai/Outputs/ShowdownBattler/Verification-0.5.6';
(async()=>{
 const env={...process.env,DFY_PLAY_HOME:path.join(out,'network-data'),DFY_PLAY_CACHE:path.join(out,'network-cache')};delete env.ELECTRON_RUN_AS_NODE;
 const exe=process.env.SHOWDOWN_TEST_EXE||path.resolve(__dirname,'../node_modules/electron/dist/electron.exe');
 const app=await _electron.launch({executablePath:exe,args:process.env.SHOWDOWN_TEST_EXE?[]:[path.resolve(__dirname,'..')],env});
 const page=await app.firstWindow();page.setDefaultTimeout(15000);const result={version:'',network:'pending'};
 try{
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());
  await page.waitForFunction(()=>!!window.__playState?.data);result.version=await page.evaluate(()=>window.__playState.data.version);assert.equal(result.version,'0.5.6');
  const deadline=Date.now()+35000;
  while(Date.now()<deadline){
   result.lobby=await app.evaluate(async({webContents})=>{const wc=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com'));if(!wc)return null;return wc.executeJavaScript('({ready:!!window.__dfyGame,connected:!!window.app?.connected,socketState:window.app?.socket?.readyState,connectionState:window.app?.connection?.readyState,scene:!!document.querySelector(".dfy-game-hub-scene"),sprites:[...document.querySelectorAll(".dfy-game-hub-scene img")].map(i=>({src:i.src,loaded:i.complete&&i.naturalWidth>0,width:i.getBoundingClientRect().width,height:i.getBoundingClientRect().height}))})').catch(()=>null);});
   if(result.lobby?.scene&&result.lobby.sprites.every(i=>i.loaded)&&(result.lobby.connected||result.lobby.socketState===1||result.lobby.connectionState===1)){result.network='official-client-loaded';break;}
   await new Promise(r=>setTimeout(r,500));
  }
  if(result.network==='pending')result.network='official-client-timeout';
  if(result.network==='official-client-loaded'){
   assert(result.lobby.sprites[0].width<=110,JSON.stringify(result.lobby));
   const screenshot=await app.evaluate(async({webContents})=>{const wc=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com'));return (await wc.capturePage()).toPNG().toString('base64');});fs.writeFileSync(path.join(out,'lobby.png'),Buffer.from(screenshot,'base64'));
  }
  await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:'D:/ai/Outputs/ShowdownBattler/Verification-0.5.6/exported-log.jsonl'});});
  await page.evaluate(()=>window.play.invoke('export-logs'));
  const rows=fs.readFileSync(path.join(out,'exported-log.jsonl'),'utf8').trim().split('\n').map(JSON.parse);assert(rows.some(r=>r.event==='runtime.started'&&r.version==='0.5.6'));result.logExport=rows.length+' valid JSONL records';
  fs.writeFileSync(path.join(out,'network-result.json'),JSON.stringify(result,null,2));console.log(result);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});


