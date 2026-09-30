'use strict';
const project={author:'白月遥',thanks:'loving1096',repository:'https://github.com/whitemoon105/showdown-battler',notice:'本软件仅供交流，免费使用，不涉及任何商业行为。'};
function create({app,updater,shell,logger,send,isPlaying}){
 let state={phase:'idle',version:app.getVersion(),...project},busy=false;
 const set=next=>{state={...state,...next};send({type:'update',...state});return state;};
 updater.autoDownload=false;updater.autoInstallOnAppQuit=false;updater.allowDowngrade=false;updater.allowPrerelease=false;
 updater.setFeedURL({provider:'github',owner:'whitemoon105',repo:'showdown-battler',private:false});
 updater.on('checking-for-update',()=>set({phase:'checking',message:'正在检查公开版本…'}));
 updater.on('update-available',info=>set({phase:'available',latest:info.version,message:'发现新版本 '+info.version}));
 updater.on('update-not-available',()=>set({phase:'current',message:'当前已是最新版本'}));
 updater.on('download-progress',p=>set({phase:'downloading',percent:Math.floor(p.percent),message:'正在下载更新 '+Math.floor(p.percent)+'%'}));
 updater.on('update-downloaded',info=>set({phase:'ready',latest:info.version,message:'更新已准备好，结束对局后可重启安装'}));
 updater.on('error',error=>{logger.error('update.failed',error);set({phase:'error',message:'更新未完成，请检查网络后重试，或打开仓库下载安装包。'});});
 async function perform(kind){
  if(!app.isPackaged)return set({phase:'development',message:'开发版本不执行安装，请使用发布版检查更新。'});
  if(busy)return state;busy=true;
  try{if(kind==='check')await updater.checkForUpdates();else if(kind==='download'){if(state.phase!=='available')throw Error('请先检查新版本');set({phase:'downloading',percent:0,message:'正在准备下载…'});await updater.downloadUpdate();}return state;}
  catch(error){logger.error('update.operation-failed',error);return set({phase:'error',message:'更新未完成，请检查网络后重试，或打开仓库下载安装包。'});}finally{busy=false;}
 }
 return{
  'update-status':()=>state,'update-check':()=>perform('check'),'update-download':()=>perform('download'),
  'update-install':async()=>{if(state.phase!=='ready')throw Error('更新尚未下载完成');if(await isPlaying())throw Error('请先结束当前对局，再重启安装更新');set({phase:'installing',message:'正在重启安装更新…'});setTimeout(()=>updater.quitAndInstall(false,true),300);return state;},
  'project-open':async()=>{await shell.openExternal(project.repository);return{};}
 };
}
module.exports={project,create};
