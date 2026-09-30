'use strict';
const crypto=require('crypto');
const confirmed=new Map();
const theme=`body{background:radial-gradient(ellipse at 75% 15%,#ffe9ee,transparent 50%),#eff3fa!important;font-family:'Microsoft YaHei',sans-serif!important}.header,.ps-room{visibility:hidden!important;pointer-events:none!important}.ps-overlay{background:transparent!important}.ps-popup{position:fixed!important;top:50%!important;left:50%!important;transform:translate(-50%,-45%);width:410px!important;max-height:78vh;overflow:auto;box-sizing:border-box;padding:28px!important;border:1px solid #fff!important;border-radius:22px!important;box-shadow:0 18px 70px #52678b28!important;color:#4c5d79!important;background:#ffffffef!important;line-height:1.9}.ps-popup h2{font-size:21px!important;color:#43526e!important;border:0!important}.ps-popup input:not([type=checkbox]){box-sizing:border-box;width:100%;padding:11px!important;border:1px solid #dce3ef!important;border-radius:9px!important;background:#f9fbff!important;color:#4b5872!important;font:14px 'Microsoft YaHei'!important;box-shadow:none!important}.ps-popup button{border:1px solid #df6177!important;border-radius:9px!important;padding:9px 18px!important;background:#d96177!important;color:#fff!important;box-shadow:0 3px 0 #ad4358!important;transition:transform .15s,box-shadow .15s!important}.ps-popup button:hover{transform:translateY(-2px);box-shadow:0 5px 0 #ad4358,0 8px 16px #8b516325!important}.ps-popup button:active{transform:translateY(1px);box-shadow:0 1px 0 #ad4358!important}#sb-register-brand{position:fixed;left:0;right:0;top:38px;text-align:center;color:#52617a;font:700 20px 'Microsoft YaHei';pointer-events:none}#sb-register-brand small{display:block;font-size:12px;font-weight:400;color:#9ba6b8;margin-top:9px}.ps-popup .textbox:focus{outline:2px solid #e398a8;outline-offset:2px}`;
function step({username,password,stage}){
 const a=window.app;if(!a?.user?.challstr)return{};
 if(a.user.get('registered')&&a.user.get('name').toLowerCase().replace(/[^a-z0-9]/g,'')===username.toLowerCase().replace(/[^a-z0-9]/g,''))return{done:true};
 if(stage==='name'){
  if(a.user.get('name')===username){document.querySelector('button[name="openOptions"]')?.click();return{stage:'register'};}
  const input=document.querySelector('.ps-popup input[name="username"]');
  if(input){input.value=username;document.querySelector('.ps-popup button[type="submit"]')?.click();}else document.querySelector('button[name="login"]')?.click();
 }else if(stage==='register'){
  document.querySelector('button[name="register"]')?.click();
  const first=document.querySelector('.ps-popup input[name="password"]'),second=document.querySelector('.ps-popup input[name="cpassword"]');
  if(first&&second){first.value=password;second.value=password;document.querySelector('.ps-popup input[name="captcha"]')?.focus();return{stage:'verification'};}
 }
 return{};
}
async function register({parent,store,input}){
 const username=String(input.username||'').trim(),password=String(input.password||''),server=input.server==='china'?'china':'international';
 if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,18}$/.test(username))throw Error('用户名需为 1–19 位英文、数字或空格');
 if(password.length<5||password.length>200)throw Error('密码需为 5–200 个字符');
 if(password!==input.confirm)throw Error('两次输入的密码不同');
 const {BrowserWindow,session}=require('electron'),partition='showdown-register-'+crypto.randomUUID(),s=session.fromPartition(partition),settings=store.settings();
 await s.setProxy({mode:'direct'});s.setPermissionRequestHandler((a,b,done)=>done(false));
 const win=new BrowserWindow({parent,modal:true,width:780,height:800,title:'Showdown对战器 · 注册账号',autoHideMenuBar:true,backgroundColor:'#f1f4fa',webPreferences:{partition,sandbox:true,nodeIntegration:false,contextIsolation:true}});
 const url=server==='china'?settings.chinaUrl:'https://play.pokemonshowdown.com',origin=new URL(url).origin;win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',(e,url)=>{if(new URL(url).origin!==origin)e.preventDefault();});
 try{
  await win.loadURL(url);await win.webContents.insertCSS(theme);
  await win.webContents.executeJavaScript(`(()=>{const header=document.createElement('div');header.id='sb-register-brand';header.textContent='Showdown对战器';const sub=document.createElement('small');sub.textContent='创建训练家账号 · 完成服务器验证';header.append(sub);document.body.append(header);})()`);
  const translation=require('fs').readFileSync(require('path').join(__dirname,'../assets/ps-china.user.js'),'utf8');await win.webContents.executeJavaScript(translation.replace('var QQ = $.noConflict();','var QQ = window.jQuery;').replaceAll('NodeFilter.SHOW_Element','(NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)')).catch(()=>{});
  let stage='name';const end=Date.now()+300000;
  while(!win.isDestroyed()&&Date.now()<end){const result=await win.webContents.executeJavaScript('('+step.toString()+')('+JSON.stringify({username,password,stage})+')');if(result.done){const token=crypto.randomUUID();confirmed.set(token,{username,password,server,label:username,at:Date.now()});return{registered:true,token,username};}if(result.stage)stage=result.stage;await new Promise(r=>setTimeout(r,600));}
  throw Error('注册已取消或超时，没有保存未验证的账号');
 }finally{if(!win.isDestroyed())win.close();}
}
function take(token){const value=confirmed.get(token);if(!value||Date.now()-value.at>600000)throw Error('注册确认已过期，请用添加账号保存登录信息');confirmed.delete(token);const {at,...credentials}=value;return credentials;}
module.exports={register,take,step,theme};
