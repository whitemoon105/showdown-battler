'use strict';
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const out=process.env.SHOWDOWN_TEST_OUTPUT||path.resolve('test-results/0.5.8');fs.mkdirSync(out,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const env={...process.env,DFY_PLAY_HOME:out+'/issues-data',DFY_PLAY_CACHE:out+'/issues-cache'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:process.env.SHOWDOWN_TEST_EXE||path.resolve('node_modules/electron/dist/electron.exe'),args:process.env.SHOWDOWN_TEST_EXE?[]:[path.resolve('.')],env});
 const page=await app.firstWindow();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const foreground=()=>app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];w.restore();w.show();w.focus();});await foreground();
 const run=code=>app.evaluate(async({webContents},code)=>{const w=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com'));return w?.executeJavaScript(code);},code);
 const until=async code=>{for(let i=0;i<100;i++){if(await run(code))return;await sleep(300);}throw Error('Timed out: '+code);};
 try{
  await page.click('[data-page=accounts]');await page.click('[data-action=account-edit]');
  await page.fill('#account-form [name=label]','错误提示测试');await page.fill('#account-form [name=username]','爱叔');await page.fill('#account-form [name=password]','local-fixture-only');await page.click('#account-form button.primary');
  const feedback=page.locator('#account-form .dialog-feedback');await feedback.waitFor();assert.match(await feedback.textContent(),/用户名/);assert.equal(await feedback.getAttribute('role'),'alert');assert(await page.locator('#dialog').evaluate(n=>n.open));assert(!(await page.locator('#toast').isVisible()));
  assert(await feedback.evaluate(n=>{const r=n.getBoundingClientRect();return n.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'error is visible above modal backdrop');
  assert.equal(await page.inputValue('#account-form [name=username]'),'爱叔');assert.equal(await page.inputValue('#account-form [name=password]'),'local-fixture-only');await page.screenshot({path:out+'/account-error-visible.png'});
  await page.fill('#account-form [name=username]','localfixture');await page.click('#account-form button.primary');await page.waitForFunction(()=>!document.querySelector('#dialog').open);
  await page.click('[data-page=teams]');await page.waitForFunction(()=>!!window.__playState.teamEditorData);
  await page.waitForFunction(()=>window.__playState.refreshStates?.[window.__playState.format]?.phase!=='loading',null,{timeout:18000});
  assert.equal(await page.getAttribute('#team-data-source','aria-busy'),'false');assert(!(await page.locator('[data-action=team-resource-retry]').isDisabled()));await page.screenshot({path:out+'/statistics-settled.png'});
  // A delayed refresh must settle even after the editor DOM and active format change.
  await page.evaluate(()=>{const S=window.__playState;window.__fixtureData=structuredClone(S.teamEditorData);S.forceRefresh=true;window.__fixtureCalls=0;window.DfyTeamEditor.refresh(S,()=>{window.__fixtureCalls++;return new Promise(resolve=>window.__finishRefresh=resolve);},window.__playRender,window.__playToast);});
  assert.equal(await page.getAttribute('#team-data-source','aria-busy'),'true');assert(await page.locator('[data-action=team-resource-retry]').isDisabled());
  await page.click('[data-page=accounts]');await page.click('[data-page=teams]');assert.equal(await page.getAttribute('#team-data-source','aria-busy'),'true');
  await page.evaluate(()=>window.DfyTeamEditor.refresh(window.__playState,()=>{window.__fixtureCalls++;},window.__playRender,window.__playToast));assert.equal(await page.evaluate(()=>window.__fixtureCalls),1);
  await page.evaluate(()=>window.__finishRefresh(window.__fixtureData));await page.waitForFunction(()=>document.querySelector('#team-data-source').getAttribute('aria-busy')==='false');
  await page.evaluate(()=>{const S=window.__playState;S.forceRefresh=true;window.DfyTeamEditor.refresh(S,()=>new Promise(resolve=>window.__finishRefresh=resolve),window.__playRender,window.__playToast);});
  await page.selectOption('#team-format','gen9ru');await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9ru');await page.evaluate(()=>window.__finishRefresh(window.__fixtureData));assert.equal(await page.evaluate(()=>window.__playState.teamEditorData.format),'gen9ru');
  await page.click('[data-page=battle]');await until('!!(window.app&&window.TeambuilderRoom&&window.Dex)');
  await run(`app.send=()=>{};Storage.teams=[{name:'本地贴图测试',format:'gen9ubers',team:Storage.packTeam([{species:'Calyrex-Shadow',ability:'As One (Spectrier)',moves:['Astral Barrage'],item:'Focus Sash',evs:{}},{species:'Slowking-Galar',ability:'Regenerator',moves:['Future Sight'],evs:{}}])}];app.joinRoom('teambuilder');app.focusRoom('teambuilder');app.rooms.teambuilder.edit('0');true;`);
  await until("document.querySelectorAll('#room-teambuilder .setchart').length>=2");
  assert.equal(await run("document.querySelector('#room-teambuilder .dfy-native-type').textContent"),'超能力');
  await app.evaluate(({session})=>session.fromPartition('persist:showdown-international').enableNetworkEmulation({offline:true}));
  const sprites=await run(`(async()=>{const nodes=[...document.querySelectorAll('#room-teambuilder .setchart')].slice(0,2);return Promise.all(nodes.map(async n=>{const url=getComputedStyle(n).backgroundImage.slice(5,-2);const img=new Image();img.src=url;await img.decode();return{url,width:img.naturalWidth,height:img.naturalHeight,backgroundSize:getComputedStyle(n).backgroundSize};}));})()`);
  assert.equal(sprites.length,2);assert.match(sprites[0].url,/dfy-asset:\/\/battle\/sprite\/calyrexshadow\//);assert.match(sprites[1].url,/\/slowkinggalar\//);assert(sprites.every(s=>s.width>0&&s.height>0));
  const icons=await run(`(async()=>{const item=document.querySelector('#room-teambuilder .itemicon'),type=document.querySelector('#room-teambuilder .dfy-native-type i');return Promise.all([item,type].map(async n=>{const url=getComputedStyle(n).backgroundImage.slice(5,-2),img=new Image();img.src=url;await img.decode();return{url,width:img.naturalWidth};}));})()`);assert(icons.every(i=>i.url.startsWith('dfy-asset:')&&i.width>0));
  await foreground();await sleep(250);
  const capture=await app.evaluate(async({webContents})=>(await webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com')).capturePage()).toPNG().toString('base64'));fs.writeFileSync(out+'/native-teambuilder-offline.png',Buffer.from(capture,'base64'));
  assert.deepEqual(errors,[]);const report={checks:['modal validation error readable and retry preserves inputs','statistics finish with cached fallback and retry enabled','refresh survives navigation and ignores old-format results','native teambuilder exact-form portraits, item and type icons decode offline'],sprites,icons,errors};fs.writeFileSync(out+'/reported-issues.json',JSON.stringify(report,null,2));console.log(report);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
