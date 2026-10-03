'use strict';
const fixture=require('./electron-fixture.cjs');
const fs=require('fs'),path=require('path'),assert=require('node:assert/strict');
const {_electron}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),out=process.env.SHOWDOWN_TEST_OUTPUT||path.resolve('test-results/0.5.7');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const env={...process.env,DFY_PLAY_HOME:path.join(out,'test-data'),DFY_PLAY_CACHE:path.join(out,'test-cache')};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:process.env.SHOWDOWN_TEST_EXE||path.join(root,'node_modules/electron/dist/electron.exe'),args:[...fixture.flags,...(process.env.SHOWDOWN_TEST_EXE?[]:[root])],env,timeout:30000});
 const page=await app.firstWindow();page.setDefaultTimeout(12000);const chooseFormat=async value=>{await page.waitForFunction(()=>!__playState.teamActionBusy);await page.click('#team-format-button');await page.locator('.dfy-format-picker>input').fill(value);await page.locator('.dfy-format-options [data-rule-format="'+value+'"]').click();await page.waitForFunction(value=>__playState.format===value,value);};const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await fixture.isolate(app);
 try{
  await page.waitForSelector('[data-page=teams]');await page.click('[data-page=teams]');await page.locator('.page-head [data-action=team-start-blank]').click();await chooseFormat('gen9ou');await page.waitForFunction(()=>window.__playState.format==='gen9ou');const start=Date.now();await page.click('[data-page=teams]');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.format===window.__playState.format);
  const localLoadMs=Date.now()-start;
  await page.click('[data-slot="5"]');
  assert.equal(await page.locator('.party-editor').getAttribute('data-slot'),'5');
  const species=page.locator('[data-team-field=species]');
  await species.fill('Venusaur');await page.click('[data-choice="Venusaur"]');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.species==='Venusaur');
  assert.equal(await page.locator('[data-slot="0"] b').textContent(),'添加伙伴');
  await page.locator('.party-slot img').first().waitFor();
  await page.click('[data-team-field=ability]');
  assert.equal(await page.locator('#team-picker [data-choice]').count(),2);
  await page.click('[data-choice=Chlorophyll]');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.ability==='Chlorophyll');
  await page.locator('[data-team-field="evs.hp"]').fill('252');
  await page.locator('[data-team-field="evs.atk"]').fill('252');
  await page.locator('[data-team-field="evs.def"]').fill('252');
  assert.equal(await page.locator('[data-team-field="evs.def"]').inputValue(),'6');
  await page.click('[data-editor=apply]');await page.waitForFunction(()=>!!window.__playState.teamEditorData);
  await chooseFormat('gen9ru');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9ru');
  await page.locator('[data-team-field=species]').click();
  assert.equal(await page.locator('#team-picker .picker-heading').first().textContent(),'RU');
  await page.locator('[data-team-field=species]').fill('Alomomola');
  assert(await page.locator('[data-choice=Alomomola]').isDisabled());
  // Invalid text must not trap navigation and must survive returning.
  await page.click('[data-page=accounts]');
  await page.waitForSelector('[data-action=account-edit]');
  await page.click('[data-page=teams]');await page.waitForFunction(()=>!!window.__playState.teamEditorData);
  assert.equal(await page.locator('[data-team-field=species]').inputValue(),'Alomomola');
  await page.click('[data-action=team-clear-species]');
  await page.waitForFunction(()=>window.__playState.teamEditorData&&!window.__playState.teamEditorData.sets[5]);
  await page.locator('[data-team-field=species]').click();
  const before=await page.locator('#team-picker [data-choice]').count();
  await page.click('[data-picker-more]');
  assert(await page.locator('#team-picker [data-choice]').count()>before);
  await page.keyboard.press('Escape');
  for(const format of ['gen9ubers','gen9uu','gen9ru','gen9doublesou','gen9lc','gen9championsvgc2026regmc','gen9ru']){
   await chooseFormat(format);
  }
  await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9ru');
  const dom=await page.locator('*').count();assert(dom<1600,'DOM count '+dom);
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());await page.screenshot({path:path.join(out,'ru-selector.png'),fullPage:true});
  await page.locator('[data-team-field=species]').click();
  await page.screenshot({path:path.join(out,'ru-menu.png')});
  await page.keyboard.press('Escape');
  await chooseFormat('gen9ou');await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9ou');
  await page.locator('[data-team-field=species]').fill('Venusaur');await page.click('[data-choice=Venusaur]');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.species==='Venusaur');
  await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.recommendations?.length>0);
  await page.locator('[data-action=team-apply-recommendation]').first().click();
  await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.moves?.length===4);
  await page.locator('.party-loadout').screenshot({path:path.join(out,'loadout.png')});
  const valid=await page.evaluate(()=>window.play.invoke('team-validate',{text:window.__playState.draft,format:window.__playState.format}));assert(valid.valid,valid.errors?.join(';'));
  await page.click('[data-action=team-save]');
  await page.waitForFunction(()=>window.__playState.data.teams.length>0);
  await page.click('[data-action=audio]');await page.locator('input[name=bgmVolume]').fill('25');await page.locator('input[name=effectsVolume]').fill('65');await page.locator('input[name=muted]').check();await page.locator('#audio-form button.primary').click();
  const audio=await page.evaluate(()=>window.play.invoke('bootstrap'));assert.equal(audio.settings.bgmVolume,25);assert.equal(audio.settings.effectsVolume,65);assert.equal(audio.settings.audioMuted,true);
  await page.click('[data-action=about]');await page.waitForSelector('#update-status');assert((await page.locator('#dialog').textContent()).includes('白月遥'));assert((await page.locator('#dialog').textContent()).includes('loving1096'));assert((await page.locator('#dialog').textContent()).includes('免费使用'));const updateInfo=await page.evaluate(()=>window.play.invoke('update-status'));assert.equal(updateInfo.repository,'https://github.com/whitemoon105/showdown-battler');await page.screenshot({path:path.join(out,'about-updates.png')});await page.click('#dialog [data-action=close]');
  const proxy=await app.evaluate(async({session})=>session.fromPartition('persist:showdown-international').resolveProxy('https://play.pokemonshowdown.com'));assert.equal(proxy,'DIRECT');
  await app.evaluate(async({session})=>{await session.defaultSession.enableNetworkEmulation({offline:true});await session.fromPartition('persist:showdown-international').enableNetworkEmulation({offline:true});});
  await chooseFormat('gen9lc');await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9lc');
  assert.equal(await page.locator('[data-team-field=level]').getAttribute('max'),'5');
  const images=await page.locator('.party-sprite').evaluateAll(nodes=>nodes.map(n=>({src:n.getAttribute('src'),complete:n.complete,width:n.naturalWidth})));
  assert(images.every(n=>n.src.startsWith('dfy-asset:')&&n.complete&&n.width>0),JSON.stringify(images));
  assert.deepEqual(errors,[]);
  await chooseFormat('gen9ou');await page.waitForFunction(()=>window.__playState.teamEditorData?.format==='gen9ou');await species.fill('Gholdengo');await page.click('[data-choice="Gholdengo"]');await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.species==='Gholdengo');await page.locator('.party-habitat img').evaluate(img=>img.decode());
  assert.equal(await page.locator('.party-habitat').evaluate(n=>getComputedStyle(n).backgroundImage),'none');await page.locator('.party-portrait').screenshot({path:path.join(out,'gholdengo-portrait.png')});
  await species.fill('Ogerpon-Wellspring');await page.click('[data-choice="Ogerpon-Wellspring"]');await page.waitForFunction(()=>window.__playState.teamEditorData?.sets?.[5]?.species==='Ogerpon-Wellspring');assert.match(await page.locator('#team-rule-status').textContent(),/草稿|招式/);await page.locator('[data-team-field=item]').click();assert.equal(await page.locator('#team-picker [data-choice]').count(),1);assert.equal(await page.locator('#team-picker [data-choice]').getAttribute('data-choice'),'Wellspring Mask');await page.screenshot({path:path.join(out,'ogerpon-rule-item.png')});await page.keyboard.press('Escape');await page.locator('[data-team-field=teraType]').click();assert.equal(await page.locator('#team-picker [data-choice]').count(),1);assert.equal(await page.locator('#team-picker [data-choice]').getAttribute('data-choice'),'Water');await page.screenshot({path:path.join(out,'ogerpon-rule-tera.png')});await page.keyboard.press('Escape');
  const summary={localLoadMs,dom,errors,checks:['sixth slot','two abilities','EV budget','RU legality','invalid text navigation','scroll pagination','rapid format changes','validated sample set','save team','audio persistence','DIRECT network','offline rule switch and sprites']};
  fs.writeFileSync(path.join(out,'ui-result.json'),JSON.stringify(summary,null,2));console.log(summary);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});



