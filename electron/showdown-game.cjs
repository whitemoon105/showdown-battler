'use strict';
// Game shell: Showdown still owns the battle protocol and native request controls.
// Serialized into the sandboxed Showdown page; no Node or native API access.
function mount(options={}){
 if(window.__dfyGame){window.__dfyGame.configure(options);return;}
 let mode=options.mode==='web'?'web':'game',scheduled=false;
 const rooms=new Map(),originalPrefs=window.Dex?.prefs;
 let pending=null,lobby=null,teamRoom=null,nav=null;
 const dictionary=options.dictionary||{};const dual=!!options.dual,playEdition=!!options.playEdition;
 const zh=text=>dictionary[text]||text;
 const names={selectMove:'招式',selectSwitch:'换人',openTimer:'计时',search:'开始对战',cancelSearch:'取消匹配',format:'对战规则',team:'选择队伍',chooseMove:'招式',chooseSwitch:'换人',chooseMoveTarget:'选择目标',chooseTeamPreview:'选择出场',chooseSwitchTarget:'选择位置',undoChoice:'重新选择',chooseShift:'移动位置',saveReplay:'保存回放',instantReplay:'重看回放',skipTurn:'下一回合',rewindTurn:'上一回合',goToEnd:'跳到结束',forfeit:'认输',timer:'计时器',login:'登录',logout:'退出登录',changeName:'账号',finduser:'查找训练家'};
 const element=(tag,cls,text)=>{const e=document.createElement(tag);e.className=cls;if(text)e.textContent=text;return e;};
 const style=element('style','');style.id='dfy-game-theme';style.textContent=`
 body[data-dfy-display=game]{background:#343944!important;background-image:linear-gradient(135deg,#686d79,#1c303d)!important;color:#343944}
 body[data-dfy-display=game] .header{background:#343944!important;border-bottom:4px solid #deb77a!important;box-shadow:0 4px 0 #343944!important}
 body[data-dfy-display=game] .tabbar a,body[data-dfy-display=game] .userbar{color:#f9edcb!important}
 body[data-dfy-display=game] .ps-room{background:#f7f6f3!important}
 body[data-dfy-display=game] .mainmenuwrapper{background:linear-gradient(140deg,#f7f6f3dd,#f7f6f3f5)!important;border:4px solid #686d79;border-radius:8px;box-shadow:5px 5px 0 #34394444;padding:28px}
 body[data-dfy-display=game] .mainmenuwrapper .button,body[data-dfy-display=game] .ps-popup .button{border:2px solid #686d79!important;border-radius:3px!important;box-shadow:0 3px 0 #343944;background:#f7f6f3;color:#343944}
 body[data-dfy-display=game] .ps-popup{border:3px solid #686d79;border-radius:5px;box-shadow:5px 5px 0 #34394455}
 body[data-dfy-display=game] .ad,body[data-dfy-display=game] .ads,body[data-dfy-display=game] .ad-container,body[data-dfy-display=game] .adslot,body[data-dfy-display=game] .adsbygoogle{display:none!important}
 .dfy-game-room{overflow:auto!important;background:#f7f6f3!important}
 .dfy-game-layout{display:grid;grid-template-columns:minmax(0,680px) minmax(210px,260px);justify-content:center;gap:15px;padding:18px;box-sizing:border-box;min-height:100%;color:#343944;font-family:'Microsoft YaHei',system-ui,sans-serif}
 .dfy-game-screen{min-width:0}.dfy-game-title{display:flex;justify-content:space-between;align-items:center;padding:13px 17px;border:3px solid #343944;border-bottom:0;background:#343944;color:#f7f6f3;letter-spacing:2px;font-size:15px}.dfy-game-title small{font:11px monospace;color:#d8dbe1;letter-spacing:1px}
 .dfy-game-arena{position:relative;overflow:hidden;box-sizing:border-box;border:4px solid #686d79;background:#d8dbe1;box-shadow:inset 0 0 0 4px #d8dbe1,5px 5px 0 #34394422}
 .dfy-game-arena>.battle{position:absolute!important;left:var(--stage-left,8px)!important;top:8px!important;width:640px!important;height:360px!important;margin:0!important;border:0!important;transform-origin:top left!important;box-shadow:none!important}
 .dfy-game-arena img{image-rendering:pixelated!important}.dfy-game-arena .backdrop{image-rendering:pixelated;opacity:1!important;filter:saturate(.9) contrast(1.04)}
 .dfy-game-arena .statbar{font-family:'Microsoft YaHei',monospace!important}.dfy-game-arena .statbar strong{background:#f7f6f3;border:2px solid #686d79;border-radius:2px;padding:3px 7px;box-shadow:2px 2px 0 #34394444}
 .dfy-game-arena .hpbar{border:2px solid #343944!important;border-radius:2px!important;background:#343944!important;box-shadow:2px 2px 0 #34394433}.dfy-game-arena .hpbar .hp{border-radius:0!important}.dfy-game-arena .turn{font-family:monospace!important;color:#f7f6f3!important;background:#343944!important;border:2px solid #dfc385;border-radius:2px!important}
 .dfy-game-command{margin-top:15px;border:3px solid #686d79;background:#f7f6f3;box-shadow:4px 4px 0 #34394422;padding:14px}.dfy-game-command-title{font-size:12px;font-weight:bold;letter-spacing:3px;color:#a4a9b4;padding-bottom:9px;border-bottom:2px dashed #d8dbe1;margin-bottom:10px}
 .dfy-game-command>.battle-controls{position:static!important;top:auto!important;left:auto!important;right:auto!important;max-width:none!important;width:auto!important;padding:0!important;background:transparent!important}
 .dfy-game-command .movemenu{display:flex;flex-wrap:wrap;gap:8px}.dfy-game-command .movemenu button{flex:1 1 42%;width:auto!important;min-height:58px!important;border-radius:3px!important;border-width:2px!important;box-shadow:0 3px 0 #34394455;text-shadow:none!important;font-size:15px!important}
 .dfy-game-command .switchmenu button,.dfy-game-command .teamorder button{border-radius:3px!important;border:2px solid #a4a9b4!important;background:#f7f6f3;box-shadow:0 2px 0 #686d7955}
 .dfy-game-command button:hover:not(:disabled){filter:brightness(1.08);translate:0 -1px}.dfy-game-command button:active:not(:disabled){translate:0 2px;box-shadow:none}.dfy-game-command button:focus-visible{outline:3px solid #c58e31;outline-offset:3px}
 .dfy-game-record{min-width:0;align-self:start;border:3px solid #686d79;background:#f7f6f3;box-shadow:4px 4px 0 #34394422}.dfy-game-record>summary{padding:14px;background:#d8dbe1;cursor:pointer;font-weight:bold;letter-spacing:2px}
 .dfy-game-record>.battle-log{position:static!important;width:auto!important;height:480px!important;max-height:60vh;overflow:auto!important;border:0!important;background:#fff9e8!important;color:#343944!important;padding:12px!important;box-sizing:border-box;font-size:12px;line-height:1.8}
 .dfy-game-record>.battle-log-add{position:static!important;width:auto!important;padding:8px;background:#f7f6f3;border:0!important}.dfy-game-room>.battle-chat-toggle,.dfy-game-room>.battle-userlist,.dfy-game-room>.battle-userlist-minimized{display:none!important}
 body[data-dfy-display=game] #room-teambuilder{background:linear-gradient(145deg,#f7f6f3,#f7f6f3)!important;color:#343944}
 body[data-dfy-display=game] #room-teambuilder .teamlist{max-width:1050px;margin:16px auto;display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px}
 body[data-dfy-display=game] #room-teambuilder .teamlist>li{border:3px solid #a4a9b4;border-radius:4px;background:#f7f6f3;box-shadow:4px 4px 0 #686d792b;padding:10px;list-style:none}
 body[data-dfy-display=game] #room-teambuilder .setchart{border:3px solid #686d79!important;border-radius:4px!important;background-color:#f7f6f3!important;box-shadow:4px 4px 0 #686d792b!important;margin-bottom:18px!important}
 body[data-dfy-display=game] #room-teambuilder .setchart input{border-radius:2px!important;border-color:#d8dbe1!important;background:#f7f6f3!important;color:#343944!important}
 body[data-dfy-display=game] #room-teambuilder .setchart .setcell-pokemon{background:#d8dbe1!important;image-rendering:pixelated}
 body[data-dfy-display=game] #room-teambuilder .teambar button{border-radius:3px!important;background-color:#f7f6f3!important;border:2px solid #a4a9b4!important;image-rendering:pixelated}
 .dfy-game-particle{position:absolute;width:13px;height:13px;pointer-events:none;z-index:30;box-shadow:4px 4px 0 #ffffff55}
 body[data-dfy-display=game] .dfy-native-source{display:none!important}
 .dfy-game-buttons{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.dfy-game-buttons:empty{display:none}
 .dfy-game-action{appearance:none;border:2px solid #686d79!important;border-radius:3px!important;background:#f7f6f3!important;color:#343944!important;box-shadow:0 3px 0 #34394440;padding:12px 15px;min-height:50px;text-align:left;font:14px 'Microsoft YaHei',sans-serif;cursor:pointer;display:flex;flex-direction:column;justify-content:center;gap:5px;position:relative}
 .dfy-game-action small{font-size:11px;color:#a4a9b4}.dfy-game-action[data-native-action=chooseMove]{border-left:7px solid var(--move-color,#a4a9b4)!important;min-height:65px;font-weight:bold}.dfy-game-action[data-native-action=search]{background:#686d79!important;color:#f7f6f3!important;font-weight:bold;min-height:70px}
 .dfy-game-action:disabled{opacity:.45;cursor:default;box-shadow:none}.dfy-game-action:hover:not(:disabled){filter:brightness(1.04)}.dfy-game-action:focus-visible{outline:3px solid #d3a649;outline-offset:2px}
 .dfy-game-action img{height:45px;width:65px;object-fit:contain;image-rendering:pixelated;float:left}.dfy-game-check{display:flex;align-items:center;gap:8px;padding:12px;border:2px solid #a4a9b4;background:#f7f6f3;color:#686d79;font-size:13px}.dfy-game-status{font-size:13px;color:#a4a9b4;padding:10px;white-space:pre-line}
 .dfy-game-hub{max-width:980px;margin:20px auto;padding:22px;box-sizing:border-box;color:#343944}.dfy-game-hub-scene{height:200px;border:4px solid #686d79;background:linear-gradient(#d8dbe1 0 58%,#a4a9b4 58% 65%,#d8dbe1 65%);position:relative;overflow:hidden;margin-bottom:20px;box-shadow:5px 5px 0 #34394422}.dfy-game-hub-scene:after{content:'';position:absolute;bottom:18px;left:20%;right:20%;height:16px;background:#a4a9b488;box-shadow:18px -12px 0 #a4a9b477}.dfy-game-hub-scene img{position:absolute;bottom:33px;width:150px;height:150px;object-fit:contain;image-rendering:pixelated;z-index:1}.dfy-game-hub-scene img:first-child{left:20%}.dfy-game-hub-scene img:last-child{right:20%}
 .dfy-game-hub h2{font-size:23px;margin:0 0 18px}.dfy-game-hub .dfy-game-buttons{grid-template-columns:repeat(3,minmax(0,1fr))}.dfy-game-hub .dfy-game-status{border:2px solid #d8dbe1;background:#f7f6f3;margin-top:15px}
 body[data-dfy-display=game] .header{height:48px!important}body[data-dfy-display=game] .header>.logo,body[data-dfy-display=game] .header>.maintabbarbottom,body[data-dfy-display=game] .header>.tabbar,body[data-dfy-display=game] .header>.userbar{display:none!important}
 .dfy-game-navigation{display:flex;align-items:center;gap:8px;height:44px;padding:0 12px;overflow:auto}.dfy-game-navigation button{flex:0 0 auto;min-height:30px;padding:5px 12px;border:1px solid #a4a9b4;background:#686d79;color:#f7f6f3;border-radius:3px;font:12px 'Microsoft YaHei';cursor:pointer}.dfy-game-navigation button[aria-current=true]{background:#d8dbe1;color:#343944}.dfy-game-navigation span{color:#d8dbe1;white-space:nowrap;font-size:12px}
 .dfy-game-team-card{border:3px solid #a4a9b4;background:#f7f6f3;padding:15px;box-shadow:4px 4px 0 #686d7922;margin-bottom:16px}.dfy-game-team-card h3{margin:0 0 8px}.dfy-game-team-sprites{display:flex;gap:6px;margin:10px 0;flex-wrap:wrap}.dfy-game-team-sprites figure{flex:1;text-align:center;margin:0;min-width:75px;font-size:12px}.dfy-game-team-sprites img{height:75px;width:90px;object-fit:contain;image-rendering:pixelated}.dfy-game-team-sprites figcaption{margin-top:5px}.dfy-game-team-card button{display:inline-block;margin:6px 10px 0 0}
 body[data-dfy-display=game]{background:#eff0f3!important;background-image:none!important;color:#353a45}
 body[data-dfy-display=game] .header{background:#d64d56!important;border-bottom:3px solid #393d48!important;box-shadow:0 2px 0 #ffffff!important}
 body[data-dfy-display=game] .ps-room{background:#eff0f3!important}
 .dfy-game-navigation button{border-color:#b23b46;background:#bc3d48;color:#fff}
 .dfy-game-navigation button[aria-current=true]{background:#fff;color:#ba3e47;border-color:#fff}
 .dfy-game-navigation span{color:#fff4f4}
 .dfy-game-navigation button[aria-current=true]:before{content:'';display:inline-block;width:11px;height:11px;border:1px solid #3d414b;border-radius:50%;margin-right:6px;vertical-align:-2px;background:radial-gradient(circle,#fff 0 20%,#3d414b 24% 35%,transparent 39%),linear-gradient(#dc535d 0 43%,#3d414b 44% 56%,#fff 57%)}
 .dfy-game-action[data-native-action=search]{background:#d64d56!important;color:#fff!important;border-color:#b53e47!important}
 .dfy-game-hub-scene{height:150px;border:2px solid #454b57;background:linear-gradient(#f7f6f3 0 65%,#e0e2e7 65% 72%,#f0efeb 72%);box-shadow:0 3px 0 #343a4619}
 .dfy-game-hub-scene:after{background:#cfd2d9;box-shadow:18px -12px 0 #dcdfe5}
 .dfy-game-hub{max-width:840px}.dfy-game-team-card{background:#fff;border:2px solid #d8dbe2;border-top:4px solid #d64d56;box-shadow:0 3px 0 #343a4612}
 @media(max-width:1000px){.dfy-game-layout{grid-template-columns:minmax(0,1fr);padding:12px}.dfy-game-record>.battle-log{height:220px!important}.dfy-game-record{margin-top:0}}
 @media(prefers-reduced-motion:reduce){.dfy-game-particle{display:none}.dfy-game-command button{translate:none!important}}
 `;document.head.append(style);
 const typeAnimations={Fire:'flamethrower',Water:'waterpulse',Electric:'thunderbolt',Grass:'energyball',Ice:'icebeam',Fighting:'closecombat',Poison:'sludgebomb',Ground:'earthquake',Flying:'airslash',Psychic:'psychic',Bug:'bugbuzz',Rock:'powergem',Ghost:'shadowball',Dragon:'dragonpulse',Dark:'darkpulse',Steel:'flashcannon',Fairy:'dazzlinggleam',Normal:'tackle'};
 const colors={Fire:'#f78039',Water:'#5baef1',Electric:'#f7dc54',Grass:'#88c45d',Ice:'#a5e2de',Fighting:'#b65f47',Poison:'#b470ca',Ground:'#d3ad66',Flying:'#afc9ed',Psychic:'#f68baa',Bug:'#b7c746',Rock:'#b7a47a',Ghost:'#9580bf',Dragon:'#9d8bdf',Dark:'#727080',Steel:'#b7cbd2',Fairy:'#ecb3d9',Normal:'#e6ddc6'};
 function mirror(source,target,state){
  const nodes=[...source.querySelectorAll('button,input[type=checkbox]')].filter(n=>!n.closest('.dfy-game-buttons')&&!n.closest('[hidden]')&&(()=>{for(let p=n;p&&p!==source;p=p.parentElement){if(getComputedStyle(p).display==='none')return false;}return true;})());
  const signature=nodes.map(n=>[n.name,n.value,n.name==='openTimer'?'timer':n.textContent,n.disabled,n.checked,n.className].join('|')).join('\n');
  if(state.signature===signature&&nodes.every((n,i)=>n.name==='openTimer'||state.nodes?.[i]===n))return;
  state.signature=signature;state.nodes=nodes;target.replaceChildren();
  for(const native of nodes){
   if(dual&&['selectMove','selectSwitch'].includes(native.name))continue;
   if(native.type==='checkbox'){
    const label=element('label','dfy-game-check'),check=document.createElement('input');check.type='checkbox';check.dataset.nativeToggle=native.name;check.checked=native.checked;check.disabled=native.disabled;label.append(check,document.createTextNode(({terastallize:'太晶化',megaevo:'超级进化',zmove:'Ｚ招式',dynamax:'极巨化'})[native.name]||zh(native.closest('label')?.textContent?.trim()||native.name)));
    check.addEventListener('click',e=>{e.stopPropagation();if(native.isConnected&&!native.disabled)native.click();queue();});target.append(label);continue;
   }
   const button=element('button','dfy-game-action');button.type='button';button.dataset.nativeAction=native.name||'';button.dataset.nativeValue=native.value;button.disabled=native.disabled||native.classList.contains('disabled');
   const switchIndex=native.dataset.tooltip?.match(/^(?:switchpokemon|pokemon)\|(\d+)$/)?.[1];
   if(switchIndex!==undefined&&(['chooseSwitch','chooseDisabled','chooseTeamPreview'].includes(native.name)||(!native.name&&native.disabled)))button.dataset.switchIndex=switchIndex;
   const action=native.name,text=native.textContent.replace(/\s+/g,' ').trim();
   const move=native.dataset.move;let label=move?zh(move):names[action]||zh(text)||'确认';
   if(action==='joinRoom')label=({teambuilder:'队伍盒',ladder:'排行榜',battles:'观战',rooms:'聊天室',lobby:'大厅聊天',resources:'规则资料'})[native.value]||zh(text);
   if(['chooseSwitch','chooseTeamPreview','chooseMoveTarget','chooseSwitchTarget'].includes(action)){label=zh(native.childNodes.length?[...native.childNodes].filter(n=>n.nodeType===3).map(n=>n.textContent).join('').trim():text)||label;}
   button.append(element('span','',label));
   if(move){const m=window.Dex?.moves.get(move);button.style.setProperty('--move-color',colors[m?.type]||colors.Normal);button.append(element('small','',(zh(m?.type)||'')+' · '+(native.querySelector('.pp')?.textContent||'')));}
   else if(action==='format')button.append(element('small','',zh(text)));
   else if(action==='team'){
    const team=window.Storage?.teams?.[window.app?.rooms?.['']?.curTeamIndex];
    button.append(element('small','',team?.name||'选择一支出战队伍'));
    if(team){const row=element('span','dfy-team-miniatures');for(const p of Storage.unpackTeam(team.team)||[]){const img=element('img','');img.src='dfy-asset://battle/sprite/'+Dex.species.get(p.species).id+'/front/normal/M';img.alt=zh(p.species);img.title=zh(p.species);row.append(img);}button.append(row);}
   }
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(!native.isConnected||native.disabled)return;if(action==='team'&&window.__dfyLobby){window.__dfyLobby.chooseTeam(native,button);}else native.click();queue();});
   target.append(button);
  }
 }
 function shell(){
  if(!window.app)return;
  const root=window.app?.rooms?.['']?.el;if(root){
   if(!lobby||lobby.root!==root||!lobby.view.isConnected){const view=element('section','dfy-game-hub'),scene=element('div','dfy-game-hub-scene');for(const name of ['pikachu','charizard']){const img=element('img','');img.src='dfy-asset://battle/sprite/'+name+'/front/normal/M';img.alt=zh(name);scene.append(img);}const buttons=element('div','dfy-game-buttons'),status=element('div','dfy-game-status');view.append(element('h2','','对战大厅'),scene,buttons,status);root.append(view);lobby={root,view,buttons,status};}
   for(const child of root.children)if(child!==lobby.view)child.classList.add('dfy-native-source');
   mirror(root.querySelector('.mainmenu')||root,lobby.buttons,lobby);
   const text=window.app?.user?.get('named')?'当前训练家：'+app.user.get('name'):'尚未登录';if(lobby.status.textContent!==text)lobby.status.textContent=text;
  }
  const header=document.querySelector('.header');if(header){
   if(!nav?.isConnected){nav=element('nav','dfy-game-navigation');header.append(nav);}
   const tabs=[...document.querySelectorAll('.tabbar a')].filter(a=>a.textContent.trim()&&!a.classList.contains('closebutton')&&a.getAttribute('href')?.startsWith('/'));
   const key=tabs.map(a=>a.getAttribute('href')+'|'+a.textContent+'|'+a.className).join(';')+'|'+(app.user?.get('name')||'');
   if(nav.dataset.key!==key){nav.dataset.key=key;nav.replaceChildren();for(const a of tabs){const href=a.getAttribute('href'),button=element('button','',({'/':'大厅','/teambuilder':'队伍','/ladder':'排行'})[href]||(href.startsWith('/battle-')?'对战':zh(a.textContent.replace(/×/g,'').trim())));button.setAttribute('aria-current',String(a.classList.contains('cur')||a.parentElement?.classList.contains('cur')));button.onclick=e=>{e.stopPropagation();a.click();};nav.append(button);}const login=document.querySelector('.userbar button[name=login],.userbar button[name=rename],.userbar button[name=changeName]');if(login){const b=element('button','',app.user?.get('named')?app.user.get('name'):'登录');b.onclick=e=>{e.stopPropagation();login.click();};nav.append(b);}}
  }
  const builder=window.app?.rooms?.teambuilder,host=builder?.el;if(host&&!playEdition){
   if(!teamRoom||teamRoom.host!==host||!teamRoom.view.isConnected){const view=element('section','dfy-game-hub');host.append(view);teamRoom={host,view};}
   for(const child of host.children)if(child!==teamRoom.view)child.classList.add('dfy-native-source');
   const teams=window.Storage?.teams||[],key=JSON.stringify(teams.map(t=>[t.name,t.format,t.team]))+'|'+builder.curTeamIndex;
   if(teamRoom.key!==key){teamRoom.key=key;const view=teamRoom.view;view.replaceChildren(element('h2','','队伍盒'));const fresh=element('button','dfy-game-action','新建队伍');fresh.onclick=()=>{pending={type:'game-team-edit'};};view.append(fresh);
    teams.forEach((team,index)=>{const card=element('article','dfy-game-team-card');card.append(element('h3','',team.name||'未命名队伍'));const sprites=element('div','dfy-game-team-sprites');for(const set of Storage.unpackTeam(team.team)||[]){const fig=document.createElement('figure'),img=element('img','');const sprite=window.Dex?.getSpriteData(set.species,0,{gen:5});img.src=sprite?.url||'https://play.pokemonshowdown.com/sprites/gen5/0.png';img.alt=zh(set.species);fig.append(img,element('figcaption','',zh(set.species)));sprites.append(fig);}card.append(sprites);const edit=element('button','dfy-game-action','编辑配装'),use=element('button','dfy-game-action','选为当前队伍');edit.onclick=()=>{pending={type:'game-team-edit',index};};use.onclick=()=>{const home=app.rooms[''];home.curTeamIndex=index;home.curFormat=team.format;home.updateTeams?.();home.updateFormats?.();app.focusRoom('');};card.append(edit,use);view.append(card);});
   }
  }
 }
 function restoreShell(){for(const node of document.querySelectorAll('.dfy-native-source'))node.classList.remove('dfy-native-source');lobby?.view.remove();teamRoom?.view.remove();nav?.remove();lobby=teamRoom=nav=null;}
 function particles(scene,move,participants){
  if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
  const root=scene.$frame?.[0]?.closest('.dfy-game-arena');if(!root)return;
  const from=participants[0]?.sprite?.$el?.[0],to=(participants[1]||participants[0])?.sprite?.$el?.[0];if(!from||!to)return;
  const r=root.getBoundingClientRect(),a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
  for(let i=0;i<7;i++){const p=element('i','dfy-game-particle');p.style.background=colors[move.type]||colors.Normal;root.append(p);const x=a.x+a.width/2-r.x,y=a.y+a.height/2-r.y,tx=b.x+b.width/2-r.x,ty=b.y+b.height/2-r.y;
   const anim=p.animate?.([{transform:`translate(${x}px,${y}px) scale(.4)`,opacity:0},{offset:.2,opacity:1},{transform:`translate(${tx+(i-3)*8}px,${ty+(i%3-1)*12}px) scale(1.4)`,opacity:0}],{duration:500,delay:i*30,easing:'ease-out'});if(anim)anim.finished.then(()=>p.remove(),()=>p.remove());else p.remove();
  }
 }
 function mountRoom(room){
  const host=room.el||room.$el?.[0],scene=room.battle?.scene;if(!host||!scene||rooms.has(room)||!host.isConnected)return;
  const stage=host.querySelector(':scope > .battle'),controls=host.querySelector(':scope > .battle-controls'),log=host.querySelector(':scope > .battle-log'),chat=host.querySelector(':scope > .battle-log-add');if(!stage||!controls)return;
  const stageStyle=stage.getAttribute('style');const original=[stage,controls,log,chat].filter(Boolean).map(node=>({node,next:node.nextSibling}));
  const layout=element('section','dfy-game-layout'),screen=element('div','dfy-game-screen'),header=element('header','dfy-game-title'),name=element('b','','宝可梦对战'),turn=element('small','','对战中');header.append(name,turn);
  const arena=element('div','dfy-game-arena'),command=element('section','dfy-game-command'),record=element('section','dfy-game-record');record.append(element('header','dfy-record-header','对战记录'));
  const buttons=element('div','dfy-game-buttons'),status=element('div','dfy-game-status');controls.classList.add('dfy-native-source');arena.append(stage);command.append(element('div','dfy-game-command-title','行动指令'),buttons,status,controls);screen.append(header,arena,command);if(log)record.append(log);if(chat)record.append(chat);layout.append(screen,record);host.prepend(layout);host.classList.add('dfy-game-room');
  const pixel=window.__dfyPixelBattle?.({room,battle:room.battle,arena,command,dictionary});
  const resize=()=>{if(!arena.isConnected)return;if(pixel){arena.style.height='auto';return;}const scale=Math.max(.3,Math.min((arena.clientWidth-16)/640,(window.innerHeight-310)/360,1.35));stage.style.transform=`scale(${scale})`;stage.style.setProperty('--stage-left',Math.max(8,(arena.clientWidth-640*scale)/2)+'px');arena.style.height=360*scale+16+'px';};
  const observer=new ResizeObserver(resize);observer.observe(arena);const oldLayout=room.updateLayout,oldMove=scene.runMoveAnim;
  room.updateLayout=function(...args){const r=oldLayout?.apply(this,args);resize();return r;};
  if(!pixel)scene.runMoveAnim=function(moveid,participants){const move=this.battle.dex.moves.get(moveid);const known=window.BattleMoveAnims?.[moveid];if(!known&&this.animating){const fallback=move.category==='Status'?null:typeAnimations[move.type];if(window.BattleMoveAnims?.[fallback])return oldMove.call(this,fallback,participants);particles(this,move,participants);this.wait?.(650);return;}return oldMove.call(this,moveid,participants);};
  rooms.set(room,{host,layout,original,observer,oldLayout,oldMove,scene,turn,controls,buttons,status,stageStyle,stage,pixel});resize();scene.updateGen?.();
  // Refresh visible sprites only; do not seek/reset the battle or its choices.
  for(const side of room.battle.sides||[])for(const pokemon of side.active||[])pokemon?.sprite?.reset?.(pokemon);
 }
 function restoreRoom(room,state){state.pixel?.dispose();state.observer.disconnect();if(state.stageStyle===null)state.stage.removeAttribute('style');else state.stage.setAttribute('style',state.stageStyle);room.updateLayout=state.oldLayout;if(!state.pixel)state.scene.runMoveAnim=state.oldMove;for(const {node,next}of [...state.original].reverse())state.host.insertBefore(node,next?.parentNode===state.host?next:null);state.layout.remove();state.host.classList.remove('dfy-game-room');room.updateLayout?.();state.scene.updateGen?.();for(const side of room.battle.sides||[])for(const p of side.active||[])p?.sprite?.reset?.(p);}
 function scan(){scheduled=false;if(mode!=='game')return;if(window.Dex&&originalPrefs&&Dex.prefs===originalPrefs)Dex.prefs=function(key){return key==='bwgfx'?!dual:['noanim','nogif'].includes(key)?false:originalPrefs.call(this,key);};shell();for(const room of Object.values(window.app?.rooms||{}))if(room.id?.startsWith('battle-'))mountRoom(room);for(const [room,s]of rooms){if(!s.host.isConnected){s.pixel?.dispose();s.observer.disconnect();rooms.delete(room);continue;}s.pixel?.sync();const text='第 '+(room.battle.turn||0)+' 回合';if(s.turn.textContent!==text)s.turn.textContent=text;mirror(s.controls,s.buttons,s);s.pixel?.afterMirror?.();const status=s.controls.querySelector('.whatdo')?.textContent||(!s.nodes?.length?s.controls.textContent.trim():'');if(s.status.textContent!==status)s.status.textContent=zh(status);}}
 function queue(){if(!scheduled){scheduled=true;requestAnimationFrame(scan);}}
 const observer=new MutationObserver(queue);observer.observe(document.body,{childList:true,subtree:true});
 function imageError(event){const img=event.target;if(mode!=='game'||!(img instanceof HTMLImageElement)||!img.closest('.dfy-game-layout'))return;const src=img.getAttribute('src')||'';if(/\/sprites\/gen5ani/.test(src)){img.src=src.replace('/gen5ani','/gen5').replace(/\.gif(?=\?|$)/,'.png');}else if(/\/sprites\/gen5[^/]*\/(?!0\.png)/.test(src)){img.src='https://play.pokemonshowdown.com/sprites/gen5/0.png';}}
 document.addEventListener('error',imageError,true);
 window.__dfyGame={evidence(){return [...rooms].map(([room,s])=>({room:room.id,events:s.pixel?.evidence||[],field:s.pixel?.field?.info()}));},pull(){const value=pending;pending=null;return value;},configure(config={}){mode=config.mode==='web'?'web':'game';document.body.dataset.dfyDisplay=mode;if(mode==='web'){if(window.Dex&&originalPrefs)Dex.prefs=originalPrefs;for(const [room,state]of rooms)restoreRoom(room,state);rooms.clear();restoreShell();}else scan();},dispose(){this.configure({mode:'web'});observer.disconnect();document.removeEventListener('error',imageError,true);style.remove();delete window.__dfyGame;},get mode(){return mode;}};
 window.__dfyGame.configure({mode});
}
module.exports={mount};
