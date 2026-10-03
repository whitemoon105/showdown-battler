'use strict';
const fixture=require('./electron-fixture.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{_electron}=require('playwright');
const out=process.env.SHOWDOWN_TEST_OUTPUT||path.resolve('test-results/aspect'),sleep=ms=>new Promise(r=>setTimeout(r,ms));fs.mkdirSync(out,{recursive:true});
(async()=>{
 const env={...process.env,DFY_PLAY_HOME:out+'/aspect-data',DFY_PLAY_CACHE:out+'/aspect-cache'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[...fixture.flags,path.resolve('.')],env});await fixture.isolate(app);let room;const report=[];
 const run=code=>app.evaluate(({webContents},code)=>webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com'))?.executeJavaScript(code),code);
 const until=async code=>{for(let i=0;i<150;i++){try{if(await run(code))return;}catch(e){if(!/Execution context was destroyed/.test(e.message))throw e;}await sleep(100);}throw Error('Timed out '+code);};
 const receive=lines=>run('app.receive('+JSON.stringify('>'+room+'\n'+lines.join('\n'))+')');
 const capture=async name=>{const bytes=await app.evaluate(async({webContents})=>(await webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://play.pokemonshowdown.com')).capturePage()).toPNG().toString('base64'));fs.writeFileSync(out+'/'+name+'.png',Buffer.from(bytes,'base64'));};
 // Diagnostic setSize deliberately bypasses the production drag ratio and minimum size.
 const size=async(w,h,zoom=1)=>{await app.evaluate(({BrowserWindow,webContents},[w,h,zoom])=>{const win=BrowserWindow.getAllWindows()[0];win.setMinimumSize(800,500);win.setSize(w,h);for(const wc of webContents.getAllWebContents())wc.setZoomFactor(zoom);},[w,h,zoom]);await sleep(600);};
 try{
  await until('!!(window.app&&window.__dfyGame&&window.Battle)');await run('void(app.send=()=>{})');
  for(const [mode,picked,doubles]of [['66',6,false],['64',4,true],['63',3,false]]){
   room='battle-gen9ou-localaspect'+mode;
   const team=['Arcanine','Cresselia','Incineroar','Rillaboom','Dragonite','Gholdengo'];
   const pokemon=team.slice(0,picked).map((n,i)=>({ident:'p1: '+n,details:n+', L50',condition:i?'200/200':'100/200',active:i<(doubles?2:1),moves:['morningsun','flamethrower','protect','extremespeed'],stats:{atk:120,def:120,spa:160,spd:120,spe:140},baseAbility:'intimidate',item:'',teraType:'Fire'}));
   const active={moves:[{move:'Morning Sun',id:'morningsun',pp:8,maxpp:8,target:'self'},{move:'Flamethrower',id:'flamethrower',pp:16,maxpp:16,target:'normal'},{move:'Protect',id:'protect',pp:16,maxpp:16,target:'self'},{move:'Extreme Speed',id:'extremespeed',pp:8,maxpp:8,target:'normal'}]};
   await size(1920,720);
   await receive(['|init|battle','|title|窄窗口检查 '+mode,'|gametype|'+(doubles?'doubles':'singles'),'|gen|9','|tier|'+(doubles?'[Gen 9] Doubles OU':'[Gen 9] OU'),'|player|p1|晨光甲|1','|player|p2|晨光乙|2','|teamsize|p1|'+picked,'|teamsize|p2|'+picked,'|start','|switch|p1a: Arcanine|Arcanine, L50|100/200',...(doubles?['|switch|p1b: Cresselia|Cresselia, L50|200/200']:[]),'|switch|p2a: Kyogre|Kyogre, L50|100/100',...(doubles?['|switch|p2b: Tornadus|Tornadus, L50|100/100']:[]),'|turn|1']);
   await run(`app.focusRoom('${room}')`);await receive(['|request|'+JSON.stringify({rqid:1,active:Array.from({length:doubles?2:1},()=>active),side:{name:'晨光甲',id:'p1',pokemon}})]);
   await until(`!!document.getElementById('room-${room}').querySelector('.dfy-game-arena')`);await until(`app.rooms['${room}'].battle.atQueueEnd`);
   await run(`(()=>{const s=app.rooms['${room}'].battle.scene,show=s.showEffect;window.__aspectEffects=[];s.showEffect=function(effect,start,end,...rest){window.__aspectEffects.push({effect:typeof effect==='string'?effect:effect?.url,start,end});return show.call(this,effect,start,end,...rest)};return true})()`);
   if(mode==='66')fs.writeFileSync(out+'/morning-sun-animation.json',JSON.stringify(await run(`({move:String(window.BattleMoveAnims?.morningsun?.anim),background:String(app.rooms['${room}'].battle.scene.backgroundEffect),layer:app.rooms['${room}'].battle.scene.$bgEffect?.[0]?.outerHTML})`),null,2));
   for(const [w,h,zoom]of [[1920,720,1],[1060,1440,1],[1060,720,1.5],[1920,720,1.25]]){
    await size(w,h,zoom);const label=mode+'-'+w+'x'+h+'-z'+zoom;
    await receive(['|-weather|SunnyDay','|-fieldstart|move: Grassy Terrain','|-sidestart|p1: 晨光甲|Tailwind']);await until(`app.rooms['${room}'].battle.atQueueEnd`);await sleep(500);
    await run('window.__aspectEffects=[]');await receive(['|move|p1a: Arcanine|Morning Sun|p1a: Arcanine','|-heal|p1a: Arcanine|200/200']);
    await until(`window.__aspectEffects.length>0`);await sleep(450);await capture('aspect-'+label+'-morning');
    const geometry=await run(`(()=>{const root=document.getElementById('room-${room}'),r=n=>{const x=n.getBoundingClientRect();return {x:x.x,y:x.y,w:x.width,h:x.height,right:x.right,bottom:x.bottom}},b=app.rooms['${room}'].battle,arena=root.querySelector('.dfy-game-arena'),stage=arena.querySelector('.battle'),m=new DOMMatrix(getComputedStyle(stage).transform);return {arena:r(arena),screen:{w:innerWidth,h:innerHeight},body:{w:document.body.scrollWidth,h:document.body.scrollHeight},stage:r(stage),matrix:{a:m.a,d:m.d,b:m.b,c:m.c},command:r(root.querySelector('.dfy-game-command')),huds:[...root.querySelectorAll('.dfy-active-hud')].filter(n=>!n.hidden).map(r),sprites:[b.nearSide,b.farSide].flatMap(s=>s.active.filter(Boolean).map(p=>({name:p.speciesForme,nw:p.sprite.$el[0].naturalWidth,nh:p.sprite.$el[0].naturalHeight,...r(p.sprite.$el[0])}))),layers:[...arena.querySelectorAll('.dfy-field-air,.dfy-field-ground,.dfy-accent-fx')].map(n=>({cls:n.className,pointer:getComputedStyle(n).pointerEvents,...r(n)})),effects:window.__aspectEffects}})()`);
    report.push({mode,size:[w,h],zoom,...geometry});fs.writeFileSync(out+'/aspect-matrix.json',JSON.stringify(report,null,2));
    assert(Math.abs(geometry.matrix.a-geometry.matrix.d)<.0001,'Non-uniform scene scaling');
    for(const sprite of geometry.sprites)assert(Math.abs((sprite.w/sprite.h)/(sprite.nw/sprite.nh)-1)<.04,'Pokemon stretched: '+label);
    for(const layer of geometry.layers){assert.equal(layer.pointer,'none');assert(layer.bottom<=geometry.command.y+1,'Effects overlap controls: '+label);assert(Math.abs(layer.w-geometry.arena.w)<3&&Math.abs(layer.h-geometry.arena.h)<3,'Effect layer does not fit arena: '+label);}
    const light=await run(`(()=>{const root=document.getElementById('room-${room}'),a=root.querySelector('.dfy-game-arena').getBoundingClientRect(),n=root.querySelector('.dfy-move-background>.background'),r=n?.getBoundingClientRect();return r?{fit:Math.abs(r.x-a.x)<2&&Math.abs(r.y-a.y)<2&&Math.abs(r.width-a.width)<3&&Math.abs(r.height-a.height)<3,size:getComputedStyle(n).backgroundSize,pointer:getComputedStyle(n).pointerEvents}:null})()`);
    assert(light?.fit&&light.size==='cover'&&light.pointer==='none','Morning Sun exposes fixed-size rectangle: '+label);
    if(geometry.command.bottom>geometry.screen.h+1)assert(await run(`(()=>{const n=document.getElementById('room-${room}').querySelector('.dfy-game-layout');return getComputedStyle(n).overflowY==='auto'&&n.scrollHeight>n.clientHeight})()`),'Commands inaccessible in narrow viewport: '+label);
    const overlaps=(a,b)=>a.x<b.right&&a.right>b.x&&a.y<b.bottom&&a.bottom>b.y;
    for(const [i,hud]of geometry.huds.entries()){assert(hud.x>=geometry.arena.x&&hud.right<=geometry.arena.right+1&&hud.y>=geometry.arena.y&&hud.bottom<=geometry.arena.bottom+1,'HUD outside: '+label);assert(!geometry.huds.slice(i+1).some(h=>overlaps(hud,h)),'Overlapping HUDs: '+label);}
    await until(`app.rooms['${room}'].battle.atQueueEnd`);await until(`!document.getElementById('room-${room}').querySelector('.dfy-accent-fx').children.length`);
    await receive(['|-weather|RainDance','|-fieldstart|move: Trick Room']);await until(`app.rooms['${room}'].battle.atQueueEnd`);await sleep(500);await capture('aspect-'+label+'-rain');
    await receive(['|-weather|none','|-fieldend|move: Trick Room','|-fieldend|move: Grassy Terrain','|-sideend|p1: 晨光甲|Tailwind']);await until(`app.rooms['${room}'].battle.atQueueEnd`);
    console.log('Passed',label);
   }
  }
  console.log(JSON.stringify({cases:report.length,checks:['Morning Sun protocol animation','uniform sprite and effect scaling','sun/rain/terrain/room resize','bounded non-interactive effects','narrow HUDs and usable commands']},null,2));
 }catch(e){await capture('aspect-failure').catch(()=>{});throw e;}finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
