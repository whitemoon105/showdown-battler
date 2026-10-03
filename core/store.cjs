'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const defaults={translation:true,fallbackTranslation:true,pageTranslation:true,audioMuted:false,bgmVolume:100,effectsVolume:100,server:'international',showdownDisplay:'game',chinaUrl:'https://china.psim.us'};
function atomicWrite(file,value){
 fs.mkdirSync(path.dirname(file),{recursive:true});
 const temp=file+'.'+crypto.randomBytes(4).toString('hex')+'.tmp';
 fs.writeFileSync(temp,JSON.stringify(value,null,2));fs.renameSync(temp,file);
}
function readJson(file,fallback){try{return JSON.parse(fs.readFileSync(file,'utf8'));}catch{return structuredClone(fallback);}}
class Store{
 constructor(root){this.root=path.resolve(root);fs.mkdirSync(this.root,{recursive:true});}
 file(name){if(!/^[a-z0-9_-]+$/i.test(name))throw Error('无效的数据文件名');return path.join(this.root,name+'.json');}
 get(name,fallback={}){return readJson(this.file(name),fallback);}
 set(name,data){atomicWrite(this.file(name),data);return data;}
 // 保留理由：对战器只接收自己的设置，不继承训练器目录、代理端口或模型参数。
 settings(){const saved=this.get('settings'),result=Object.fromEntries(Object.entries(defaults).map(([k,v])=>[k,saved[k]??v]));
  // 保留理由：旧版总音量只在缺少独立音量时迁移，保留原有听感，下一次保存即移除旧字段。
  for(const key of ['bgmVolume','effectsVolume']){const value=Number(saved[key]??saved.audioVolume??defaults[key]);result[key]=Number.isFinite(value)?Math.min(100,Math.max(0,value)):100;}result.audioMuted=!!result.audioMuted;return result;
 }
 saveSettings(input){
  const next=this.settings();for(const key of Object.keys(defaults))if(key in input)next[key]=input[key];
  for(const key of ['bgmVolume','effectsVolume']){const value=Number(next[key]);if(!Number.isFinite(value))throw Error('音量必须为数字');next[key]=Math.min(100,Math.max(0,value));}next.audioMuted=!!next.audioMuted;
  if(!['game','web'].includes(next.showdownDisplay))throw Error('界面模式无效');
  if(!['international','china'].includes(next.server))throw Error('未知服务器');
  if(new URL(next.chinaUrl).protocol!=='https:')throw Error('国服网页地址必须使用 HTTPS');
  return this.set('settings',next);
 }
}
module.exports={Store,defaults,atomicWrite,readJson};
