const crypto=require('node:crypto');
class Accounts{
  constructor(store,secure){this.store=store;this.secure=secure;}
  list(){return this.store.get('bot-accounts',[]).map(({password,...a})=>({...a,role:a.role||'ai',hasPassword:!!password}));}
  setDefault(id){const rows=this.store.get('bot-accounts',[]),row=rows.find(a=>a.id===id);if(!row)throw Error('账号不存在');this.store.set('bot-accounts',rows.map(a=>({...a,isDefault:a.server===row.server&&(a.role||'ai')===(row.role||'ai')?a.id===id:a.isDefault})));return this.list();}
  save(input){const username=String(input.username||'').trim();if(!/^[A-Za-z0-9][A-Za-z0-9 _-]{0,18}$/.test(username))throw Error('用户名需为 1–19 位英文、数字或空格');if(!this.secure.isEncryptionAvailable())throw Error('系统加密不可用');const rows=this.store.get('bot-accounts',[]),old=rows.find(a=>a.id===input.id);let password=old?.password;if(input.password){if(String(input.password).length>200)throw Error('密码过长');password=this.secure.encryptString(String(input.password)).toString('base64');}if(!password)throw Error('请输入密码');const row={id:old?.id||crypto.randomUUID(),label:String(input.label||username).slice(0,60),username,password,server:input.server==='china'?'china':'international',role:input.role==='player'?'player':input.role==='ai'?'ai':old?.role||'ai',isDefault:!!input.isDefault,updatedAt:new Date().toISOString()};this.store.set('bot-accounts',[row,...rows.filter(a=>a.id!==row.id).map(a=>({...a,isDefault:row.isDefault&&a.server===row.server&&(a.role||'ai')===row.role?false:a.isDefault}))]);return this.list();}
  remove(id){this.store.set('bot-accounts',this.store.get('bot-accounts',[]).filter(a=>a.id!==id));return this.list();}
  credentials(id){const row=this.store.get('bot-accounts',[]).find(a=>a.id===id);if(!row)throw Error('账号不存在');try{return{server:row.server||'international',username:row.username,password:this.secure.decryptString(Buffer.from(row.password,'base64'))};}catch{throw Error('该密码无法解密，请在账号管理中重新保存');}}
}
module.exports={Accounts};
