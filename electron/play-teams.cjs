'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {Dex,Teams,validate}=require('../core/dex.cjs');
const {createService}=require('./team-editor-service.cjs');
function checkFormat(format){const f=Dex.formats.get(String(format||'gen9ou'));if(!f.exists||f.team)throw Error('请选择支持自选队伍的规则');return f.id;}
// This function runs in the existing Showdown session. It changes the local
// team selection only; joining a ladder still requires the user's Battle click.
function selectTeam(team){
 if(!window.app?.rooms||!Array.isArray(window.Storage?.teams)||!Storage.saveTeams)throw Error('Showdown 队伍库尚未准备好');
 const builder=app.rooms.teambuilder;if(builder?.curTeam)builder.back?.();
 const index=Storage.teams.findIndex(t=>t.folder==='Showdown对战器'&&t.name===team.name&&t.format===team.format);
 if(index>=0)Storage.teams[index]=team;else Storage.teams.push(team);
 const selected=index>=0?index:Storage.teams.length-1;Storage.saveTeams();
 const home=app.rooms[''];if(home){home.curTeamIndex=selected;home.curFormat=team.format;home.updateTeams?.();home.updateFormats?.();}
 app.focusRoom?.('');return{imported:true,name:team.name,index:selected,format:team.format};
}
function handlers({store,parent,openView,contents,server,logger}){
 const editor=createService(store.root);
 const runEditor=async(method,p)=>{const started=Date.now();try{const result=await editor(method,{...p,format:checkFormat(p.format)});logger?.info('teams.'+method,{format:p.format,durationMs:Date.now()-started,source:result.catalog?.recommendationSource,month:result.catalog?.recommendationMonth,slot:p.index});return result;}catch(error){logger?.error('teams.'+method+'.failed',error,{format:p.format,slot:p.index,durationMs:Date.now()-started});throw error;}};
 const save=p=>{const format=checkFormat(p.format),checked=validate(p.text,format);if(!checked.valid)throw Error(checked.errors.join('\n'));const team={id:p.id||crypto.randomUUID(),name:String(p.name||'我的队伍').slice(0,80),format,positions:p.positions,text:checked.text,members:checked.team.map(m=>({species:m.species,item:m.item,ability:m.ability,moves:m.moves,teraType:m.teraType})),updatedAt:new Date().toISOString()};store.set('teams',[team,...store.get('teams',[]).filter(t=>t.id!==team.id)].slice(0,200));return team;};
 return{
  teams:()=>store.get('teams',[]),
  'team-editor-data':p=>runEditor('read',p),
  'team-editor-refresh':p=>runEditor('refresh',p),
  'team-editor-update':p=>runEditor('update',p),
  'team-validate':p=>validate(p.text,checkFormat(p.format)),
  'team-save':save,
  'team-delete':p=>store.set('teams',store.get('teams',[]).filter(t=>t.id!==p.id)),
  'team-draft':p=>{if(p?.save){const draft={text:String(p.text||'').slice(0,100000),name:String(p.name||'').slice(0,80),format:checkFormat(p.format),positions:p.positions,id:p.id||null};store.set('team-draft',draft);return draft;}return store.get('team-draft',{});},
  'team-import':async()=>{const r=await require('electron').dialog.showOpenDialog(parent(),{title:'导入 Showdown 队伍',filters:[{name:'队伍文本',extensions:['txt']}],properties:['openFile']});if(r.canceled)return null;const file=r.filePaths[0];if(fs.statSync(file).size>100000)throw Error('队伍文件过大');return fs.readFileSync(file,'utf8');},
  'team-export':async p=>{const r=await require('electron').dialog.showSaveDialog(parent(),{title:'导出队伍',defaultPath:path.join(store.root,'exports','team.txt'),filters:[{name:'队伍文本',extensions:['txt']}]});if(r.canceled)return null;fs.mkdirSync(path.dirname(r.filePath),{recursive:true});fs.writeFileSync(r.filePath,String(p.text||''),'utf8');return r.filePath;},
  'web-team':async p=>{const team=store.get('teams',[]).find(t=>t.id===p.id);if(!team)throw Error('请先保存队伍');const checked=validate(team.text,checkFormat(team.format));if(!checked.valid)throw Error(checked.errors.join('\n'));await openView(server());const wc=contents(),deadline=Date.now()+30000;let ready=false;while(Date.now()<deadline){try{ready=await wc.executeJavaScript('!!(window.app?.rooms&&Array.isArray(window.Storage?.teams)&&Storage.saveTeams)');}catch{}if(ready)break;await new Promise(r=>setTimeout(r,200));}if(!ready)throw Error('连接尚未完成，队伍已保存，请稍后重试发送');return wc.executeJavaScript('('+selectTeam.toString()+')('+JSON.stringify({name:team.name,format:team.format,team:checked.packed,gen:Dex.forFormat(team.format).gen,folder:'Showdown对战器',capacity:6})+')');},
 };
}
module.exports={handlers,selectTeam,checkFormat};
