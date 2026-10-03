'use strict';
const fixture=require('./electron-fixture.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{_electron}=require('playwright');
const out=path.resolve(process.env.SHOWDOWN_TEST_OUTPUT||'test-results/audio-results-'+new Date().toISOString().replace(/[.:]/g,'-'));fs.mkdirSync(out,{recursive:true});
(async()=>{
 const env={...process.env,SHOWDOWN_AUDIO_TEST_HOME:path.join(out,'profile')};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[...fixture.flags,path.resolve('tests/audio-results-fixture.cjs')],env}),page=await app.firstWindow(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const shot=async name=>{if(await page.locator('.dfy-result-scene').count())await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('.dfy-result-scene')).opacity)>.9);const bytes=await app.evaluate(async({BrowserWindow})=>(await BrowserWindow.getAllWindows()[0].webContents.capturePage(undefined,{stayHidden:true,stayAwake:true})).toPNG().toString('base64'));fs.writeFileSync(path.join(out,name),Buffer.from(bytes,'base64'));};
 try{
  await page.waitForFunction(()=>window.fixtureReady);await fixture.isolate(app);await page.emulateMedia({reducedMotion:'no-preference'});
  await page.evaluate(()=>{
   window.clicks=0;document.querySelector('#under-card').onclick=()=>window.clicks++;
   window.testAudio=window.__dfyCreateBattleAudio({});testAudio.setVolumes({bgm:.25,effects:.6});
   window.testRoom={request:{side:{id:'p1'}}};window.testBattle={ended:false,atQueueEnd:true,stepQueue:['|turn|24'],sides:[{id:'p1',name:'Trainer One'},{id:'p2',name:'Trainer Two'}]};
   window.testOptions={room:testRoom,battle:testBattle,arena:document.querySelector('main'),header:document.querySelector('header'),audio:testAudio};window.result=window.__dfyBattleResult(testOptions);result.sync();
   testRoom.request=null;testBattle.stepQueue.push('|win|Trainer One');testBattle.ended=true;result.sync();
  });
  await page.waitForFunction(()=>window.testAudio.events.some(e=>e.key==='victory'));assert.equal(await page.locator('.dfy-result-badge').textContent(),'胜利！');assert.equal(await page.locator('.dfy-victory-spark').count(),18);assert.equal(await page.locator('.dfy-victory').evaluate(n=>getComputedStyle(n).pointerEvents),'none');
  await page.locator('#under-card').click();assert.equal(await page.evaluate(()=>window.clicks),1);await shot('victory.png');
  await page.evaluate(()=>{result.sync();result.dispose();window.result=window.__dfyBattleResult(testOptions);result.sync();});assert.equal(await page.evaluate(()=>testAudio.events.filter(e=>e.key==='victory').length),1);assert.equal(await page.locator('.dfy-victory').count(),0);
  for(const kind of ['loss','tie','spectator']){
   const actual=await page.evaluate(kind=>{result.dispose();window.testRoom=kind==='spectator'?{}:{side:'p2'};testBattle.stepQueue=[kind==='tie'?'|tie|':'|win|Trainer One'];window.result=window.__dfyBattleResult({...testOptions,room:testRoom});return result.sync().kind;},kind);assert.equal(actual,kind);assert.equal(await page.locator('.dfy-victory').count(),0);if(kind!=='spectator'){await page.waitForFunction(kind=>testAudio.events.some(e=>e.key===kind),kind);await shot('result-'+kind+'.png');}else assert.equal(await page.locator('.dfy-result-scene').count(),0);
  }
  for(const zoom of [1,1.25,1.5]){await app.evaluate(({BrowserWindow},zoom)=>{const w=BrowserWindow.getAllWindows()[0];w.setSize(1100,720);w.webContents.setZoomFactor(zoom);},zoom);await page.evaluate(()=>{result.dispose();testBattle.stepQueue=['|win|Trainer One'];result=window.__dfyBattleResult({...testOptions,room:{side:'p1'},audio:{victory(){}}});result.sync();});assert(await page.locator('.dfy-result-scene').evaluate(n=>{const r=n.getBoundingClientRect(),a=document.querySelector('main').getBoundingClientRect();return r.x>=a.x&&r.right<=a.right&&r.y>=a.y&&r.bottom<=a.bottom;}));await shot('victory-zoom-'+zoom+'.png');}await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].webContents.setZoomFactor(1));
  await page.emulateMedia({reducedMotion:'reduce'});await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setSize(700,620));
  await page.evaluate(()=>{result.dispose();testAudio.setVolumes({muted:true});testBattle.stepQueue=['|win|Trainer One'];window.result=window.__dfyBattleResult({...testOptions,room:{side:'p1'}});result.sync();});
  assert.equal(await page.locator('.dfy-victory').count(),1);assert.equal(await page.locator('.dfy-victory-spark').count(),0);assert.equal(await page.locator('.dfy-victory').evaluate(n=>n.getAnimations({subtree:true}).length),0);assert.equal(await page.evaluate(()=>testAudio.events.filter(e=>e.key==='victory').length),1);
  await page.locator('#under-card').click();assert.equal(await page.evaluate(()=>window.clicks),2);await shot('victory-reduced-motion.png');
  assert.deepEqual(errors,[]);const summary={checks:['Electron DOM rendering','server terminal win/loss/tie/spectator','underlying operation remains clickable','result remount does not repeat sound','muted victory stays silent','reduced motion has no particles or animation','700px window remains operable'],errors};fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify({out,...summary},null,2));
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
