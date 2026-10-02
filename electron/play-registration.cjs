'use strict';
const crypto=require('crypto');
const confirmed=new Map();
let activeWindow;
const theme=`body{background:radial-gradient(ellipse at 75% 15%,#ffe9ee,transparent 50%),#eff3fa!important;font-family:'Microsoft YaHei',sans-serif!important}.header,.ps-room{visibility:hidden!important;pointer-events:none!important}.ps-overlay{background:transparent!important}.ps-popup{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-45%);width:410px!important;max-height:78vh;overflow:auto;box-sizing:border-box;padding:28px!important;border:1px solid #fff!important;border-radius:22px!important;box-shadow:0 18px 70px #52678b28!important;color:#4c5d79!important;background:#ffffffef!important;line-height:1.9}.ps-popup h2{font-size:21px!important;color:#43526e!important;border:0!important}.ps-popup input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:11px!important;border:1px solid #dce3ef!important;border-radius:9px!important;background:#f9fbff!important;color:#4b5872!important;font:14px 'Microsoft YaHei'!important;box-shadow:none!important}.ps-popup button{border:1px solid #df6177!important;border-radius:9px!important;padding:9px 18px!important;background:#d96177!important;color:#fff!important;box-shadow:0 3px 0 #ad4358!important;transition:transform .15s,box-shadow .15s!important}.ps-popup button:hover{transform:translateY(-2px);box-shadow:0 5px 0 #ad4358,0 8px 16px #8b516325!important}.ps-popup button:active{transform:translateY(1px);box-shadow:0 1px 0 #ad4358!important}#sb-register-brand{position:fixed;left:0;right:0;top:38px;text-align:center;color:#52617a;font:700 20px 'Microsoft YaHei';pointer-events:none}#sb-register-brand small{display:block;font-size:12px;font-weight:400;color:#9ba6b8;margin-top:9px}.ps-popup .textbox:focus{outline:2px solid #e398a8;outline-offset:2px}`;
function step({username,password,stage}){
 const a=window.app;if(!a?.user?.challstr)return{};
 const same=String(a.user.get('name')||'').toLowerCase().replace(/[^a-z0-9]/g,'')===username.toLowerCase().replace(/[^a-z0-9]/g,'');
 if(stage==='verification'&&same&&a.user.get('registered')&&a.user.get('named'))return{done:true};
 const popup=document.querySelector('.ps-popup'),error=popup?.querySelector('.error')?.textContent||'';
 if(popup?.querySelector('input[autocomplete="current-password"],#g_id_onload')||/already.*(?:registered|exists)|name.*(?:registered|taken)|用户名.*(?:存在|注册)|名字.*注册/i.test(error))return{error:'这个用户名已被注册，请更换用户名。如果是你的账号，请取消注册，在“账号”中添加后登录。'};
 if(stage==='claiming'&&error)return{error:'服务器未接受此用户名：'+error};
 if(stage==='name'){a.user.rename(username);return{stage:'claiming'};}
 if(stage==='claiming'&&same&&a.user.get('named')){
  a.addPopup(window.RegisterPopup,{name:username});
  const first=document.querySelector('.ps-popup input[name="password"]'),second=document.querySelector('.ps-popup input[name="cpassword"]');
  if(first&&second){first.value=password;second.value=password;document.querySelector('.ps-popup input[name="captcha"]')?.focus();return{stage:'verification'};}
 }
 if(stage==='verification'&&!popup)return{error:'注册已取消，没有保存未验证的账号'};
 return{};
}
async function register({parent,store,input}){
 const username=String(input.username||'').trim(),password=String(input.password||''),server=input.server==='china'?'china':'international';
 if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,18}$/.test(username))throw Error('用户名需为 1–19 位英文、数字或空格');
 if(password.length<5||password.length>200)throw Error('密码需为 5–200 个字符');
 if(password!==input.confirm)throw Error('两次输入的密码不同');
 const {BrowserWindow,session}=require('electron'),partition='showdown-register-'+crypto.randomUUID(),s=session.fromPartition(partition),settings=store.settings();
 await s.setProxy({mode:'direct'});s.setPermissionRequestHandler((a,b,done)=>done(false));
 if(activeWindow&&!activeWindow.isDestroyed())throw Error('已有注册验证正在进行，请先完成或取消');
 const win=new BrowserWindow({parent,modal:true,show:false,width:780,height:800,title:'Showdown对战器 · 注册账号',autoHideMenuBar:true,backgroundColor:'#f1f4fa',webPreferences:{partition,sandbox:true,nodeIntegration:false,contextIsolation:true}});activeWindow=win;
 const url=server==='china'?settings.chinaUrl:'https://play.pokemonshowdown.com',origin=new URL(url).origin;win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==origin)e.preventDefault();});
 try{
  let loadTimer;try{await Promise.race([win.loadURL(url),new Promise((_,reject)=>loadTimer=setTimeout(()=>reject(Error('注册服务连接超时，请稍后重试')),20000))]);}finally{clearTimeout(loadTimer);}
  await win.webContents.insertCSS(theme+'body> :not(.ps-overlay):not(.ps-popup):not(#sb-register-brand){display:none!important}');
  await win.webContents.executeJavaScript(`(()=>{const header=document.createElement('div');header.id='sb-register-brand';header.textContent='Showdown对战器';const sub=document.createElement('small');sub.textContent='创建训练家账号 · 完成服务器验证';header.append(sub);document.body.append(header);})()`);
  const translation=require('fs').readFileSync(require('path').join(__dirname,'../assets/ps-china.user.js'),'utf8');await win.webContents.executeJavaScript(translation.replace('var QQ = $.noConflict();','var QQ = window.jQuery;').replaceAll('NodeFilter.SHOW_Element','(NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)')).catch(()=>{});
  let stage='name';const end=Date.now()+300000;
  const nameDeadline=Date.now()+25000;
  while(!win.isDestroyed()&&Date.now()<end){const result=await win.webContents.executeJavaScript('('+step.toString()+')('+JSON.stringify({username,password,stage})+')');if(result.error)throw Error(result.error);if(result.done){const token=crypto.randomUUID();confirmed.set(token,{username,password,server,label:username,at:Date.now()});return{registered:true,token,username};}if(result.stage){stage=result.stage;if(stage==='verification')win.show();}if(stage!=='verification'&&Date.now()>nameDeadline)throw Error('用户名检查超时，请检查网络后重试');await new Promise(r=>setTimeout(r,600));}
  throw Error('注册已取消或超时，没有保存未验证的账号');
 }finally{if(!win.isDestroyed())win.close();if(activeWindow===win)activeWindow=null;}
}
function take(token){const value=confirmed.get(token);if(!value||Date.now()-value.at>600000)throw Error('注册确认已过期，请用添加账号保存登录信息');confirmed.delete(token);const {at,...credentials}=value;return credentials;}
function cancel(){if(activeWindow&&!activeWindow.isDestroyed())activeWindow.close();}
module.exports={register,take,step,theme,cancel};
