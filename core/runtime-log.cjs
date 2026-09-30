'use strict';
const fs=require('node:fs');
const path=require('node:path');

const SECRET_KEYS=new Set(['password','pass','token','assertion','secret','credential']);
function safe(value,depth=0){
  if(value===undefined)return undefined;
  if(depth>4)return '[truncated]';
  if(value instanceof Error)return{message:value.message,stack:value.stack};
  if(typeof value==='string')return value.length>4000?value.slice(0,4000)+'…':value;
  if(value===null||typeof value==='number'||typeof value==='boolean')return value;
  if(Array.isArray(value))return value.slice(0,40).map(v=>safe(v,depth+1));
  if(value&&typeof value==='object'){
    const result={};
    for(const [key,item] of Object.entries(value))if(!SECRET_KEYS.has(key.toLowerCase()))result[key]=safe(item,depth+1);
    return result;
  }
  return String(value);
}

class RuntimeLogger{
  constructor(root){
    this.directory=path.join(root,'logs');
    fs.mkdirSync(this.directory,{recursive:true});
    this.filePath=path.join(this.directory,'showdown-battler.jsonl');
    this.write('info','runtime.started',{pid:process.pid,version:require('../package.json').version,platform:process.platform,arch:process.arch,osRelease:require('node:os').release(),electron:process.versions.electron,node:process.versions.node});
  }
  write(level,event,data={}){
    const clean=safe(data),fields=clean&&typeof clean==='object'&&!Array.isArray(clean)?clean:{data:clean};
    const row={at:new Date().toISOString(),level,event,...fields};
    try{
      fs.appendFileSync(this.filePath,JSON.stringify(row)+'\n','utf8');
      const size=fs.statSync(this.filePath).size;
      if(size>8*1024*1024)this.rotate();
    }catch{}
  }
  rotate(){
    try{
      const archive=path.join(this.directory,`showdown-battler-${new Date().toISOString().replace(/[.:]/g,'-')}.jsonl`);
      fs.renameSync(this.filePath,archive);
      const files=fs.readdirSync(this.directory).filter(name=>/^showdown-battler-.*\.jsonl$/.test(name)).sort();
      for(const name of files.slice(0,-4))try{fs.unlinkSync(path.join(this.directory,name));}catch{}
    }catch{}
  }
  error(event,error,data={}){this.write('error',event,{...data,error:safe(error)});}
  warn(event,data={}){this.write('warn',event,data);}
  info(event,data={}){this.write('info',event,data);}
  exportTo(destination){
    fs.mkdirSync(path.dirname(destination),{recursive:true});
    if(path.resolve(destination)===path.resolve(this.filePath))return destination;
    const files=fs.readdirSync(this.directory).filter(name=>/^showdown-battler(?:-.*)?\.jsonl$/.test(name)).sort();
    fs.writeFileSync(destination,'','utf8');
    for(const name of files)fs.appendFileSync(destination,fs.readFileSync(path.join(this.directory,name)));
    return destination;
  }
}

module.exports={RuntimeLogger,safe};
