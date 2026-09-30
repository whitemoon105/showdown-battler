'use strict';
// Runs inside the existing Showdown client. The native client retains ownership
// of search, PM, challenge, team validation, and popup selection handlers.
function install({css='',dictionary={}}={}) {
 if(window.__dfyLobby){window.__dfyLobby.refresh();return;}
 const style=document.createElement('style');style.id='dfy-lobby-theme';style.textContent=css;document.head.append(style);
 const make=(tag,cls,text)=>{const node=document.createElement(tag);node.className=cls;if(text)node.textContent=text;return node;};
 const setText=(node,text)=>{if(node&&node.textContent!==text)node.textContent=text;};
 const game=()=>document.body?.dataset.dfyDisplay==='game';
 let scheduled=false,started=0,queueState='',lastFocus=null;
 const labels={makeChallenge:'发送挑战',cancelChallenge:'取消挑战',dismissChallenge:'返回私聊',acceptChallenge:'接受挑战',rejectChallenge:'拒绝挑战',challenge:'发起挑战',pm:'私聊',close:'取消'};
 const visible=node=>!!node&&node.style.display!=='none'&&!node.hidden;
 function closePopup(){window.app?.closePopup?.();if(lastFocus?.isConnected)lastFocus.focus();}
 function chooseTeam(native,button){
  const home=app.rooms[''],format=native.closest('form')?.querySelector('[name=format]')?.value||home.curFormat;
  const Picker=TeamPopup.extend({selectTeam(value){
   const i=Number(value);if(!Number.isInteger(i)||!Storage.teams[i])return;
   native.value=String(i);native.innerHTML=TeamPopup.renderTeam(i);home.curTeamIndex=i;home.curTeamFormat=format;
   this.close();home.updateTeams?.();
  }});
  lastFocus=button;app.addPopup(Picker,{team:String(home.curTeamIndex??-1),format,sourceEl:button,folderToggleOn:false,folderNotExpanded:[]});refreshPopups();
 }
 function refreshPopups(){
  for(const popup of document.querySelectorAll('.ps-popup')){
   const formats=!!popup.querySelector('[name=formats]'),user=!!popup.querySelector('button[name=pm],button[name=challenge]');
   const prompt=popup.querySelector('input[name=data]'),teams=!!popup.querySelector('[name=selectTeam]');
   popup.classList.toggle('dfy-team-popup',teams);
   popup.classList.add('dfy-popup');popup.classList.toggle('dfy-format-popup',formats);
   if(!popup.querySelector(':scope>.dfy-popup-header')){
    const header=make('header','dfy-popup-header'),close=make('button','dfy-popup-close','关闭 ×');close.type='button';close.setAttribute('aria-label','关闭当前窗口');
    header.append(make('strong','',formats?'选择对战规则':teams?'选择出战队伍':user?'训练家':prompt?'查找训练家':'对战选项'),close);popup.prepend(header);
    close.onclick=e=>{e.preventDefault();e.stopPropagation();closePopup();};
   }
   if(teams){
    for(const button of popup.querySelectorAll('[name=selectTeam]')){
     const team=Storage.teams?.[Number(button.value)];if(!team)continue;
     const key=team.name+'|'+team.team;if(button.dataset.teamCard===key)continue;button.dataset.teamCard=key;
     button.replaceChildren(make('strong','',team.name||'未命名队伍'));
     const row=make('span','dfy-team-card-roster');for(const p of Storage.unpackTeam(team.team)||[]){const figure=make('span',''),img=make('img','');img.src='dfy-asset://battle/sprite/'+Dex.species.get(p.species).id+'/front/normal/M';img.alt=dictionary[p.species]||p.species;figure.append(img,make('small','',img.alt));row.append(figure);}button.append(row);
    }
    for(const heading of popup.querySelectorAll('h3')){if(/^(Other|其他)/i.test(heading.textContent))setText(heading,'其他队伍');else if(/ teams$/i.test(heading.textContent))setText(heading,heading.textContent.replace(/ teams$/i,' 队伍'));}
    for(const button of popup.querySelectorAll('[name=teambuilder]'))setText(button,'队伍编辑器');
   }
   if(formats){const input=popup.querySelector('input[name=search]');if(input)input.placeholder='搜索规则，例如 OU、随机对战';}
   if(prompt){prompt.placeholder='输入训练家名称';prompt.setAttribute('aria-label','训练家名称');const submit=popup.querySelector('[type=submit]');if(submit)setText(submit,'查找');}
   for(const button of popup.querySelectorAll('button[name]'))if(labels[button.name])setText(button,labels[button.name]);
  }
 }
 function refreshPM(home,root){
  // The legacy client renders activitymenu next to the room wrapper in some
  // builds and inside it in others, so use the global fallback as well.
  const activity=root.querySelector('.activitymenu')||document.querySelector('.activitymenu'),box=home.$pmBox?.[0]||activity?.querySelector('.pmbox');
  if(!activity||!box)return;
  activity.classList.add('dfy-social-dock');
  const windows=[...box.querySelectorAll('.pm-window[data-userid]')].filter(visible);
  root.classList.toggle('dfy-has-pm',windows.length>0);
  for(const pm of windows){
   pm.classList.add('dfy-pm-window');
   const title=pm.querySelector('h3');
   for(const [selector,label]of [['.closebutton','关闭私聊'],['.minimizebutton','收起私聊']]){const button=title?.querySelector(selector);if(button){button.setAttribute('aria-label',label);button.title=label;}}
   const challenge=pm.querySelector('.pm-challenge');setText(challenge,'发起挑战');
   for(const button of pm.querySelectorAll('button[name]'))if(labels[button.name])setText(button,labels[button.name]);
   for(const label of pm.querySelectorAll('.challenge label.label')){const text=label.firstChild;if(text?.nodeType===3){if(text.textContent.trim()==='Format:')text.textContent='对战规则';if(text.textContent.trim()==='Team:')text.textContent='出战队伍';}}
   const intro=pm.querySelector('.challenge form>p:first-child');if(intro){const text=intro.textContent.trim();if(/^Challenge .+\?$/.test(text))setText(intro,'邀请 '+(pm.dataset.name||'').trim()+' 进行对战');else if(/^Challenging .+\.\.\.$/.test(text))setText(intro,'已发送挑战，等待对方回应…');}
   const textarea=pm.querySelector('textarea[name=message]'),form=textarea?.closest('form');
   if(textarea){textarea.placeholder='输入消息 · Enter 发送，Shift + Enter 换行';textarea.setAttribute('aria-label','私聊消息');}
   if(form&&!form.querySelector('.dfy-pm-send')){
    const send=make('button','dfy-pm-send','发送');send.type='button';form.append(send);
    send.onclick=e=>{e.preventDefault();e.stopPropagation();if(!textarea.value.trim())return;home.submitPM({currentTarget:textarea,preventDefault(){},stopPropagation(){}});textarea.focus();};
   }
  }
 }
 function refreshSearch(home,root,hub){
  const native=root.querySelector('.mainmenu button[name=search]'),cancel=root.querySelector('.mainmenu button[name=cancelSearch]');
  const searches=Array.isArray(home.searching)?home.searching.length:!!home.searching;
  const state=searches?'searching':cancel?'connecting':'';
  if(state!==queueState){queueState=state;if(state&&!started)started=Date.now();if(!state)started=0;}
  let panel=hub.querySelector('.dfy-match-status');
  if(!panel){panel=make('div','dfy-match-status');panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');const label=make('div',''),title=make('strong',''),detail=make('span',''),stop=make('button','dfy-match-cancel','取消匹配');label.append(title,detail);stop.type='button';stop.onclick=e=>{e.preventDefault();e.stopPropagation();home.cancelSearch();refresh();};panel.append(make('i','dfy-match-spinner'),label,stop);hub.append(panel);}
  panel.hidden=!state;
  if(state){setText(panel.querySelector('strong'),state==='searching'?'正在寻找对手…':'正在连接匹配…');const elapsed=Math.max(0,Math.floor((Date.now()-started)/1000)),format=root.querySelector('.mainmenu button[name=format]')?.textContent.trim()||'';setText(panel.querySelector('span'),format+' · 已等待 '+elapsed+' 秒');}
  const mirrored=hub.querySelector('[data-native-action=search]');
  if(mirrored){setText(mirrored.querySelector('span'),state==='searching'?'正在匹配…':state==='connecting'?'正在连接…':'开始对战');mirrored.disabled=!!state||!!native?.disabled||!!native?.classList.contains('disabled');mirrored.setAttribute('aria-busy',String(!!state));}
  // There is one prominent cancel action in the waiting card, not two copies.
  for(const button of hub.querySelectorAll('[data-native-action=cancelSearch]'))button.hidden=true;
 }
 function refresh(){
  scheduled=false;
  const home=window.app?.rooms?.[''],root=home?.el,hub=root?.querySelector(':scope>.dfy-game-hub');
  // The pure client intentionally has no Friends surface in either display
  // mode. Chat and challenge remain available from Find a user.
  if(root){
   for(const button of root.querySelectorAll('.mainmenu button[name=send][value="/friends"],[data-native-action=send][data-native-value="/friends"]'))button.hidden=true;
  }
  if(!game()){refreshPopups();return;}
  if(root&&hub){
   root.classList.add('dfy-lobby-room');
   refreshSearch(home,root,hub);refreshPM(home,root);
  }
  refreshPopups();
 }
 const queue=()=>{if(!scheduled){scheduled=true;requestAnimationFrame(refresh);}};
 const observer=new MutationObserver(records=>{if(records.some(r=>!r.target.closest?.('.dfy-match-status,.dfy-popup-header,.dfy-pm-send')))queue();});
 observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['data-dfy-display','style','hidden','disabled']});
 document.addEventListener('click',e=>{if(game()&&e.target.closest('[data-native-action=format],[data-native-action=finduser]'))lastFocus=e.target.closest('button');},true);
 document.addEventListener('keydown',e=>{if(game()&&e.key==='Escape'&&document.querySelector('.dfy-popup')){e.preventDefault();e.stopImmediatePropagation();closePopup();}},true);
 const timer=setInterval(()=>{if(game()&&queueState)refresh();},1000);
 window.__dfyLobby={refresh,chooseTeam,destroy(){observer.disconnect();clearInterval(timer);style.remove();delete window.__dfyLobby;}};
 refresh();
}
module.exports={install};
