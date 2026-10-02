'use strict';
async function login(wc,credentials){
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){const ready=await wc.executeJavaScript('!!window.app?.user?.challstr');if(ready)break;await new Promise(r=>setTimeout(r,500));}
 await wc.executeJavaScript('('+apply.toString()+')('+JSON.stringify(credentials)+')');
 const end=Date.now()+30000;
 while(Date.now()<end){
  const state=await wc.executeJavaScript('({name:window.app?.user?.get("name"),named:!!window.app?.user?.get("named"),error:document.querySelector(".ps-popup .error")?.textContent})');
  const id=s=>String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'');
  if(state.named&&id(state.name)===id(credentials.username))return{connected:true,username:state.name};
  if(state.error)throw Error('服务器未接受登录：'+state.error);
  await new Promise(r=>setTimeout(r,300));
 }
 throw Error('服务器尚未确认账号登录，请检查网络或稍后重试');
}
function apply({username,password}){
 if(!window.app?.user?.challstr)throw Error('网页尚未就绪');
 if(Object.values(app.rooms).some(r=>r.id?.startsWith('battle-')&&r.request?.side&&!r.battle?.ended))throw Error('请先结束当前对局，再切换账号');
 if(!window.$?.post)throw Error('客户端登录接口暂不可用');
 app.dismissPopups?.();
 return new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('登录服务响应超时')),25000);
  $.post('https://play.pokemonshowdown.com/api/login',{act:'login',name:username,pass:password,challstr:app.user.challstr},data=>{
   clearTimeout(timer);try{if(typeof data==='string')data=JSON.parse(data.replace(/^\]/,''));if(!data.assertion||data.assertion.startsWith(';')||data.actionsuccess===false)throw Error('登录失败，请检查账号密码');app.send('/trn '+username+',0,'+data.assertion);resolve({loginRequested:true});}catch(e){reject(e);}
  }).fail(()=>{clearTimeout(timer);reject(Error('登录服务连接失败'));});
 });
}
module.exports={login,apply};
