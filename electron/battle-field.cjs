'use strict';

// Read public state after Showdown has processed the protocol. Never infer duration
// from elapsed time: hidden items can make the remaining turn count a range.
function readFieldState(battle) {
 const toID=t=>String(t||'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const names={sunnyday:'晴天',desolateland:'大日照',raindance:'雨天',primordialsea:'大雨',sandstorm:'沙暴',hail:'冰雹',snow:'下雪',snowscape:'下雪',deltastream:'乱流',trickroom:'戏法空间',magicroom:'魔法空间',wonderroom:'奇妙空间',gravity:'重力',electricterrain:'电气场地',grassyterrain:'青草场地',mistyterrain:'薄雾场地',psychicterrain:'精神场地',tailwind:'顺风',reflect:'反射壁',lightscreen:'光墙',auroraveil:'极光幕',safeguard:'神秘守护',mist:'白雾',stealthrock:'隐形岩',spikes:'撒菱',toxicspikes:'毒菱',stickyweb:'黏黏网',gmaxsteelsurge:'钢刺',gmaxwildfire:'超极巨地狱灭焰',gmaxvolcalith:'超极巨炎石喷发',gmaxcannonade:'超极巨水炮轰灭',gmaxvinelash:'超极巨灰飞鞭灭',grasspledge:'火海',waterpledge:'彩虹',firepledge:'湿地',seaoffire:'火海',rainbow:'彩虹',swamp:'湿地',watersport:'玩水',mudsport:'掷泥'};
 const duration=(min,max)=>{min=Number(min)||0;max=Number(max)||0;return min&&max&&min!==max?min+'–'+max+' 回合':min||max?(min||max)+' 回合':'';};
 const effect=(key,min,max)=>({id:toID(key),label:names[toID(key)]||'场地效果',duration:duration(min,max)});
 const weather=battle.weather&&battle.weather!=='none'?effect(battle.weather,battle.weatherMinTimeLeft,battle.weatherTimeLeft):null;
 if(weather)weather.suppressed=!!battle.abilityActive?.(['Air Lock','Cloud Nine']);
 const global=(battle.pseudoWeather||[]).map(p=>effect(p[0],p[1],p[2]));
 return {weather,terrain:global.find(p=>p.id.endsWith('terrain'))||null,rooms:global.filter(p=>!p.id.endsWith('terrain')),sides:[['near',battle.nearSide],['far',battle.farSide]].map(([side,team])=>({side,conditions:Object.entries(team?.sideConditions||{}).map(([key,p])=>({...effect(key,p[2],p[3]),layers:p[1]||1}))}))};
}

function install() {
 const readState=window.__dfyReadFieldState;
 window.__dfyFieldEffects=({arena,battle,mark,privateData,zh=t=>t})=>{
  const create=(tag,cls)=>{const n=document.createElement(tag);n.className=cls;return n;};
  const ground=create('canvas','dfy-field-ground'),air=create('canvas','dfy-field-air'),status=create('div','dfy-field-status');
  ground.setAttribute('aria-hidden','true');air.setAttribute('aria-hidden','true');status.setAttribute('aria-label','当前场地效果');
  arena.prepend(ground);arena.append(air,status);
  const inspector=window.__dfyBattleInspector({arena,battle,globalIcons:status,privateData,zh});
  const g=ground.getContext('2d'),a=air.getContext('2d'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let state=readState(battle),key='',frame=0,disposed=false,running=false,last=0,clock=0,width=1,height=1,scale=1,dx=0,dy=0,dpr=1,draws=0,camera=null;
  const mod=(n,m)=>((n%m)+m)%m,rand=i=>mod(Math.sin(i*127.1+311.7)*43758.5453,1),has=id=>state.rooms.some(p=>p.id===id);
  const terrainColors={electricterrain:'#e6b649',grassyterrain:'#62b99d',mistyterrain:'#dfa1c6',psychicterrain:'#b795da'};
  function path(c,points,color,lineWidth=1,close=false){c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);if(close)c.closePath();c.strokeStyle=color;c.lineWidth=lineWidth;c.stroke();}
  function ellipse(c,x,y,rx,ry,color,stroke){c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);if(color){c.fillStyle=color;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
  function glow(c,x,y,r,color){const fill=c.createRadialGradient(x,y,0,x,y,r);fill.addColorStop(0,color);fill.addColorStop(1,color.slice(0,7)+'00');c.fillStyle=fill;c.fillRect(x-r,y-r,2*r,2*r);}
  function prepare(c,canvas){c.setTransform(1,0,0,1,0,0);c.clearRect(0,0,canvas.width,canvas.height);c.setTransform(dpr*scale,0,0,dpr*scale,dpr*dx,dpr*dy);}
  function floor(t){
   prepare(g,ground);const left=-dx/scale-1,right=(width-dx)/scale+1,top=-dy/scale-1,bottom=(height-dy)/scale+1;
   const sky=g.createLinearGradient(0,top,0,bottom);sky.addColorStop(0,'#d6e2f1');sky.addColorStop(.42,'#edf5fa');sky.addColorStop(1,'#aec3da');g.fillStyle=sky;g.fillRect(left,top,right-left,bottom-top);
   glow(g,315,85,390,'#ffffffb0');
   const wash=g.createLinearGradient(0,115,0,bottom);wash.addColorStop(0,'#e5eef7');wash.addColorStop(1,'#a9c4d7');g.fillStyle=wash;g.fillRect(left,115,right-left,bottom-115);
   const hue=has('trickroom')?'#ac91d2':terrainColors[state.terrain?.id]||'#93b8ce';
   const tint=g.createLinearGradient(0,125,0,bottom);tint.addColorStop(0,hue+'00');tint.addColorStop(1,hue+'45');g.fillStyle=tint;g.fillRect(left,115,right-left,bottom-115);
   // Lines converge at the horizon; spacing grows towards the near platform.
   g.save();g.beginPath();g.rect(left,116,right-left,bottom-116);g.clip();
   for(let x=-1500;x<=2100;x+=100)path(g,[[320+(x-320)*.055,116],[x,560]],'#ffffff50',.65);
   for(const y of [121,130,145,165,195,236,293,371,480])path(g,[[left,y],[right,y]],'#ffffff75',.7);
   const shine=140+mod(t*.017,340);const sheen=g.createLinearGradient(0,shine-18,0,shine+18);sheen.addColorStop(0,'#ffffff00');sheen.addColorStop(.5,'#ffffff28');sheen.addColorStop(1,'#ffffff00');g.fillStyle=sheen;g.fillRect(left,shine-18,right-left,36);
   if(has('trickroom')){for(let n=0;n<6;n++){const y=120+mod(n*48-t*.013,258);path(g,[[left,y],[right,y]],'#bd8de83c',1);}}
   g.restore();path(g,[[left,115],[right,115]],'#ffffffa0',.7);
   const platforms=battle.nearSide?.active.length===2?[[514,224,75,20,false],[358,214,66,18,false],[156,314,85,24,true],[310,333,90,24,true]]:[[430,224,82,22,false],[210,326,128,35,true]];
   for(const [x,y,rx,ry,near]of platforms){
    ellipse(g,x,y+5,rx+5,ry+4,near?'#526e8e20':'#66809b16');
    const platform=g.createLinearGradient(0,y-ry,0,y+ry);platform.addColorStop(0,'#f5fbffc9');platform.addColorStop(.55,'#dcecf5c9');platform.addColorStop(1,'#abc7dcc9');
    ellipse(g,x,y,rx,ry,platform,'#ffffffdb');ellipse(g,x,y,rx-6,ry-4,null,hue+'90');
    g.save();g.translate(x,y);g.scale(rx-3,ry-2);g.beginPath();g.arc(0,0,1,t*.00018+(near?0:Math.PI),t*.00018+(near?0:Math.PI)+1.05);g.strokeStyle='#ffffffb8';g.lineWidth=.025;g.stroke();g.restore();
    const shadow=g.createRadialGradient(x,y,0,x,y,near?61:38);shadow.addColorStop(0,'#3a537547');shadow.addColorStop(1,'#3a537500');g.save();g.translate(0,y*.77);g.scale(1,.23);g.fillStyle=shadow;g.fillRect(x-80,y-80,160,160);g.restore();
   }
  }
  function terrain(t,type,left,right){
   const color=terrainColors[type]||'#acb5ce';
   if(type==='electricterrain'){for(let i=0;i<9;i++){const phase=mod(t*.00075+i*.371,1);if(phase>.38)continue;const x=50+rand(i)*540,y=150+rand(i+30)*205;a.globalAlpha=(1-phase/.38)*.6;path(a,[[x,y],[x+12,y-3],[x+8,y+3],[x+24,y]],color,1.1);}a.globalAlpha=1;}
   if(type==='grassyterrain'){for(let i=0;i<26;i++){const x=25+rand(i)*590,y=160+rand(i+20)*190,bend=Math.sin(t*.0016+i)*3;path(a,[[x,y],[x+bend,y-8],[x+4+bend,y-13]],'#4f987e6f',1.3);}}
   if(type==='mistyterrain'){for(let i=0;i<4;i++){const x=mod(t*.009+i*220,1000)-180;a.save();a.translate(x,230+i*28);a.scale(2.8,.3);glow(a,0,0,85,'#edbdd96b');a.restore();}}
   if(type==='psychicterrain'){for(let i=0;i<6;i++){const phase=mod(t*.00013+i/6,1);a.globalAlpha=Math.sin(phase*Math.PI)*.28;ellipse(a,320,250,50+phase*370,13+phase*83,null,color);}a.globalAlpha=1;}
  }
  function wind(t,x,y,rx,ry,color,strong=false){
   for(let i=0;i<(strong?9:6);i++){const phase=mod(t*.00046+i*.163,1),xx=x-rx+phase*rx*2,yy=y-ry+rand(i+8)*ry*2;a.globalAlpha=Math.sin(phase*Math.PI)*.6;a.beginPath();a.moveTo(xx-20,yy+4);a.bezierCurveTo(xx-2,yy-5,xx+16,yy+6,xx+32,yy-2);a.strokeStyle=color;a.lineWidth=i%3===0?1.8:.8;a.stroke();}a.globalAlpha=1;
  }
  function atmosphere(t){
   const weather=state.weather?.suppressed?'':state.weather?.id;
   if(['sunnyday','desolateland'].includes(weather)){
    glow(a,480,0,420,weather==='desolateland'?'#ffd16f70':'#ffe7a56b');
    a.save();a.translate(480,-80);a.rotate(.16+Math.sin(t*.00012)*.025);for(let i=0;i<5;i++){a.beginPath();a.moveTo(0,0);a.lineTo(-310+i*110,460);a.lineTo(-250+i*110,460);a.closePath();a.fillStyle='#fff8cd16';a.fill();}a.restore();
    for(let i=0;i<14;i++){const x=rand(i)*640,y=mod(rand(i+8)*360-t*.008,360);ellipse(a,x+Math.sin(t*.0006+i)*6,y,1.3,1.3,'#fff6ca99');}
   }else if(['raindance','primordialsea'].includes(weather)){
    a.fillStyle=weather==='primordialsea'?'#345d803d':'#456d8923';a.fillRect(-dx/scale,-dy/scale,width/scale,height/scale);
    for(let i=0;i<(weather==='primordialsea'?78:48);i++){const z=.4+rand(i+100)*.6,y=mod(rand(i)*400+t*(.18+z*.16),420)-30,x=mod(rand(i+20)*740-t*.085,740)-45;path(a,[[x,y],[x-5*z,y+19*z]],'#dff6ff8a',.65+z*.5);}
    for(let i=0;i<16;i++){const phase=mod(t*.0011+i*.127,1);a.globalAlpha=(1-phase)*.46;ellipse(a,rand(i+60)*640,150+rand(i+90)*207,2+phase*9,1+phase*2.2,null,'#ecfaff');}a.globalAlpha=1;
   }else if(weather==='sandstorm'){
    a.fillStyle='#c5a06a29';a.fillRect(-dx/scale,-dy/scale,width/scale,height/scale);wind(t*1.5,320,190,350,170,'#c2a06b',true);
    for(let i=0;i<48;i++){const x=mod(rand(i)*740+t*.14,740)-50,y=rand(i+4)*360+Math.sin(t*.003+i)*7;ellipse(a,x,y,1+rand(i)*1.5,.6,'#b494697c');}
   }else if(['snow','snowscape','hail'].includes(weather)){
    a.fillStyle='#c9eafb23';a.fillRect(-dx/scale,-dy/scale,width/scale,height/scale);
    for(let i=0;i<42;i++){const z=.3+rand(i)*.7,x=rand(i+30)*640+Math.sin(t*.0006+i)*13,y=mod(rand(i)*400+t*(weather==='hail'?.12:.018)*z,400)-20;if(weather==='hail'){path(a,[[x,y-2],[x+2,y],[x,y+3],[x-2,y]],'#e5f4ffb0',1,true);}else ellipse(a,x,y,1+z*1.3,1+z*1.3,'#ffffffc7');}
   }else if(weather==='deltastream')wind(t,320,150,350,135,'#e6ffec',true);
   for(const room of state.rooms){
    if(room.id==='trickroom'){
     const pulse=.32+Math.sin(t*.001)*.08;a.globalAlpha=pulse;
     for(let i=0;i<5;i++){const x=65+i*127;path(a,[[x,306],[x,63],[320+(x-320)*.67,26],[320+(x-320)*.67,199]],'#9f7dc8',.8);}
     path(a,[[65,63],[573,63],[490,26],[149,26],[65,63],[65,306],[573,306],[573,63]],'#ab86d6',1.2);a.globalAlpha=1;
     for(let i=0;i<7;i++){const x=75+rand(i)*490,y=mod(rand(i+14)*270-t*.017,270)+25;path(a,[[x,y-4],[x+4,y],[x,y+4],[x-4,y]],'#ae8ad078',.8,true);}
    }else if(room.id==='gravity'){
     for(let i=0;i<12;i++){const x=40+rand(i)*560,phase=mod(t*.00036+i*.12,1),y=60+phase*270;a.globalAlpha=Math.sin(phase*Math.PI)*.4;path(a,[[x-4,y],[x,y+5],[x+4,y]],'#7f90b7',1);}a.globalAlpha=1;
    }else if(['magicroom','wonderroom'].includes(room.id)){
     const color=room.id==='magicroom'?'#c7a26266':'#77b7c966';for(let i=0;i<8;i++){const x=40+rand(i)*560,y=50+rand(i+21)*270,size=7+Math.sin(t*.001+i)*3;path(a,[[x-size,y],[x,y-size],[x+size,y],[x,y+size]],color,1,true);}
    }
   }
   for(const side of state.sides){const near=side.side==='near',x=near?210:430,y=near?307:212,rx=near?132:85,ry=near?47:32;
    for(const effect of side.conditions){
     if(effect.id==='tailwind')wind(t,x,y-30,rx,ry,'#f4feff');
     if(['reflect','lightscreen','auroraveil','safeguard','mist'].includes(effect.id)){
      const color=({reflect:'#eac1dc',lightscreen:'#ecdca0',auroraveil:'#afd5ef',safeguard:'#92d2b2',mist:'#e5eef6'})[effect.id];
      const wall=a.createLinearGradient(0,y-70,0,y+4);wall.addColorStop(0,color+'00');wall.addColorStop(.65,color+'31');wall.addColorStop(1,color+'08');a.fillStyle=wall;a.fillRect(x-rx*.75,y-70,rx*1.5,70);ellipse(a,x,y,rx*.8,ry*.3,null,color+'a0');
     }
     if(['grasspledge','seaoffire','gmaxwildfire'].includes(effect.id))for(let i=0;i<13;i++){const phase=mod(t*.0007+i*.147,1);glow(a,x-rx+rand(i)*rx*2,y-phase*30,6*(1-phase)+2,'#f6ae635b');}
     if(['firepledge','swamp'].includes(effect.id))ellipse(a,x,y,rx,ry*.65,'#789b6844');
     if(['waterpledge','rainbow'].includes(effect.id)){for(let i=0;i<4;i++){a.beginPath();a.ellipse(x,y,rx-i*3,ry*2-i*3,0,Math.PI,Math.PI*2);a.strokeStyle=['#e6a6b466','#ecd69566','#a4d7bd66','#b1bfe566'][i];a.lineWidth=3;a.stroke();}}
    }
   }
  }
  function draw(t,full=false){if(disposed)return;prepare(a,air);if(full||!draws)floor(t);if(state.terrain)terrain(t,state.terrain.id);atmosphere(t);draws++;}
  function tick(now){frame=0;if(!running||disposed)return;if(now-last>=41){clock+=Math.min(80,now-last);last=now;draw(clock);}frame=requestAnimationFrame(tick);}
  function resize(){width=arena.clientWidth||1;height=arena.clientHeight||1;scale=camera?.scale||Math.min(width/640,height/360);dx=camera?.left??(width-640*scale)/2;dy=camera?.top??(height-360*scale)/2;dpr=Math.min(devicePixelRatio||1,1.25);for(const c of [ground,air]){c.width=Math.round(width*dpr);c.height=Math.round(height*dpr);}draw(clock,true);}
  function sync(){
   if(disposed)return;state=readState(battle);const next=JSON.stringify([state,battle.nearSide?.active.length]);
   if(next!==key){key=next;arena.dataset.weather=state.weather?.suppressed?'':state.weather?.id||'';arena.dataset.terrain=state.terrain?.id||'';arena.dataset.rooms=state.rooms.map(p=>p.id).join(' ');mark?.('field-state',next);draw(clock,true);}
   inspector.sync(state);
   for(const side of battle.scene?.sideConditions||[])for(const [id,sprites]of Object.entries(side))if(['reflect','lightscreen','auroraveil','safeguard','mist'].includes(id))for(const sprite of sprites){const n=sprite.$el?.[0];if(n)n.dataset.dfyFieldReplaced='true';}
   const visible=!!arena.getClientRects().length&&!document.hidden&&arena.dataset.preview!=='true';
   ground.hidden=!visible;air.hidden=!visible;status.hidden=!visible;
   const moving=(state.weather&&!state.weather.suppressed)||state.terrain||state.rooms.length||state.sides.some(s=>s.conditions.some(c=>['tailwind','grasspledge','seaoffire','gmaxwildfire','waterpledge','rainbow'].includes(c.id)));
   const nextRunning=!!moving&&visible&&!reduced.matches&&!battle.paused&&!battle.ended&&battle.seeking==null;
   if(nextRunning!==running){running=nextRunning;if(frame)cancelAnimationFrame(frame);frame=0;if(running){last=performance.now();frame=requestAnimationFrame(tick);}else draw(clock);}
  }
  document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
  const observer=new ResizeObserver(resize);observer.observe(arena);resize();sync();
  return{sync,setCamera(value){if(camera&&camera.scale===value.scale&&camera.left===value.left&&camera.top===value.top)return;camera=value;resize();},info:()=>({state,running,draws,canvases:2,camera}),dispose(){disposed=true;cancelAnimationFrame(frame);observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);ground.remove();air.remove();status.remove();inspector.dispose();}};
 };
}
module.exports={readFieldState,install};
