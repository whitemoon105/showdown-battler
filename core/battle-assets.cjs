'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fetch}=require('undici'),{load}=require('cheerio');
const {Dex}=require('pokemon-showdown');
const dictionary=require('../assets/zh-dictionary.json'),sources=require('../assets/battle-sources.json');
const {spriteAssetKeys}=require('./sprite-assets.cjs');
function imageInfo(bytes){
 if(bytes.subarray(0,6).toString().startsWith('GIF8')){
  let p=13,frames=0;const packed=bytes[10];if(packed&128)p+=3*(1<<((packed&7)+1));
  const blocks=()=>{while(p<bytes.length){const n=bytes[p++];if(!n)return;p+=n;}};
  while(p<bytes.length){const tag=bytes[p++];if(tag===0x3b)break;if(tag===0x21){p++;blocks();}else if(tag===0x2c){frames++;const flags=bytes[p+8];p+=9;if(flags&128)p+=3*(1<<((flags&7)+1));p++;blocks();}else throw Error('Invalid GIF block');}
  return{type:'image/gif',animated:frames>1,frames,width:bytes.readUInt16LE(6),height:bytes.readUInt16LE(8)};
 }
 if(bytes.subarray(1,4).toString()==='PNG'){let frames=1;for(let p=8;p+12<=bytes.length;){const size=bytes.readUInt32BE(p),type=bytes.toString('ascii',p+4,p+8);if(type==='acTL')frames=bytes.readUInt32BE(p+8);p+=12+size;}return{type:'image/png',animated:frames>1,frames,width:bytes.readUInt32BE(16),height:bytes.readUInt32BE(20)};}
 if(bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'){
  let frames=0,width,height;for(let p=12;p+8<=bytes.length;){const tag=bytes.toString('ascii',p,p+4),n=bytes.readUInt32LE(p+4),at=p+8;if(at+n>bytes.length)throw Error('Invalid WebP chunk');if(tag==='VP8X'){width=bytes.readUIntLE(at+4,3)+1;height=bytes.readUIntLE(at+7,3)+1;}if(tag==='ANMF')frames++;p=at+n+(n%2);}return{type:'image/webp',animated:frames>1,frames:frames||1,...(width?{width,height}:{})};
 }
 throw Error('Asset is not a supported image');
}
function itemPlaceholder(id){
 const text=String(id||'item').replace(/[^a-z0-9]/gi,'').slice(0,3).toUpperCase()||'ITM';
 const hue=[...String(id||'')].reduce((n,c)=>n+c.charCodeAt(0),0)%360;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="hsl(${hue} 68% 80%)"/><stop offset="1" stop-color="hsl(${hue} 52% 52%)"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="14" fill="#f7f9fd" stroke="#d8dfeb" stroke-width="2"/><path d="M19 25h26l3 25H16z" fill="url(#g)" stroke="#526074" stroke-width="2"/><path d="M24 25c0-9 16-9 16 0" fill="none" stroke="#526074" stroke-width="3"/><text x="32" y="42" text-anchor="middle" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#fff">${text}</text></svg>`;
 return {bytes:Buffer.from(svg),type:'image/svg+xml',cached:true,sourceFallback:true};
}
class BattleAssets{
 constructor({directory,bundled=path.join(__dirname,'../assets/battle-media'),settings=()=>({})}){Object.assign(this,{directory,bundled,settings});fs.mkdirSync(directory,{recursive:true});this.manifest=this.read(directory);this.seed=this.read(bundled);this.pending=new Map();this.pages=new Map();this.failures=new Map();}
 read(dir){try{return JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));}catch{return{};}}
 metadata(){const result={};for(const [entries,dir]of [[this.seed,this.bundled],[this.manifest,this.directory]])for(const [key,value]of Object.entries(entries)){if(result[key]||!/^[a-f0-9]{64}\.(png|gif|webp|ogg|wav|mp3)$/.test(value.file)||!fs.existsSync(path.join(dir,value.file)))continue;result[key]={width:value.width,height:value.height,animated:value.animated};}return result;}
 async download(url){const u=new URL(url);if(u.protocol!=='https:'||!['s1.52poke.com','media.52poke.com','wiki.52poke.com','play.pokemonshowdown.com','raw.githubusercontent.com','cdn.jsdelivr.net'].includes(u.hostname))throw Error('Unapproved asset host');const r=await fetch(url,{headers:{Referer:'https://wiki.52poke.com/'},signal:AbortSignal.timeout(10000),redirect:'error'});if(!r.ok){await r.body?.cancel();throw Error('Asset HTTP '+r.status);}let n=0,chunks=[];for await(const b of r.body){n+=b.length;if(n>12*1024*1024)throw Error('Asset too large');chunks.push(b);}return Buffer.concat(chunks);}
 async page(name){if(this.pages.has(name))return this.pages.get(name);const job=(async()=>{const url='https://wiki.52poke.com/zh-hans/'+encodeURIComponent(dictionary[name]||name),bytes=await this.download(url),$=load(bytes.toString());return [...new Set($('img').toArray().map(n=>$(n).attr('src')).filter(Boolean).map(u=>u.startsWith('//')?'https:'+u:u))].map(u=>u.includes('/thumb/')?u.replace('/thumb/','/').replace(/\/[^/]+$/,''):u);})();this.pages.set(name,job);return job;}
 async spriteCandidates(id,side,shiny,gender){const s=Dex.species.get(id);if(!s.exists)throw Error('Unknown species');const back=side==='back',suffix=s.forme?({'Mega':'M','Mega-X':'MX','Mega-Y':'MY','Alola':'A','Galar':'G','Hisui':'H','Paldea':'P'})[s.forme]:'';let wiki=[];
  if(suffix!==undefined)try{const urls=await this.page(s.baseSpecies||s.name);const num=String(s.num).padStart(3,'0');const re=new RegExp('/Spr_'+(back?'b_':'')+'([6789][a-z])_0?'+num+suffix+'(?:_([mf]))?'+(shiny?'_s':'')+'\\.png$');wiki=urls.filter(u=>re.test(decodeURIComponent(u))).filter(u=>!/_([mf])(?:_s)?\.png$/.test(u)||u.includes(gender==='F'?'_f':'_m')).sort((a,b)=>{const score=u=>/Spr_(?:b_)?6/.test(u)?0:/Spr_(?:b_)?7/.test(u)?1:2;return score(a)-score(b);});}catch{}
  if(s.num<=649&&!s.forme)wiki.push('https://s1.52poke.com/assets/sprite/gen5/'+String(s.num).padStart(3,'0')+(shiny?'s':'')+(gender==='F'?'f':'')+(back?'b':'')+'.gif');
  const sprite=s.spriteid||s.id;const fallback=['ani'+(back?'-back':'')+(shiny?'-shiny':'')+'/'+sprite+'.gif','gen5ani'+(back?'-back':'')+(shiny?'-shiny':'')+'/'+sprite+'.gif','ani'+(shiny?'-shiny':'')+'/'+sprite+'.gif'];return wiki.concat(fallback.flatMap(p=>[p,p.replace(/\.gif$/,'.png')]).map(p=>'https://play.pokemonshowdown.com/sprites/'+p));
 }
 async get(key){if(!/^(?:sprite\/[a-z0-9-]+\/(?:front|back)\/(?:normal|shiny)\/[MF]|item\/[a-z0-9-]+|(?:tera|type)\/[a-z]+|fx\/[a-z0-9-]+\.(?:png|gif)|audio\/[a-z0-9-]+\.wav|cry\/[0-9]+\.ogg|bgm\/[a-z0-9-]+\.mp3)$/.test(key))throw Error('Invalid asset key');const local=target=>{for(const [entries,dir]of [[this.seed,this.bundled],[this.manifest,this.directory]]){const info=entries[target];if(info&&/^[a-f0-9]{64}\.(png|gif|webp|ogg|wav|mp3)$/.test(info.file)){const file=path.join(dir,info.file);if(fs.existsSync(file))return{...info,bytes:fs.readFileSync(file),cached:true};}}return null;};for(const candidate of spriteAssetKeys(key)){const found=local(candidate);if(found)return candidate===key?found:{...found,sourceFallback:true};}
  if(key.startsWith('sprite/')){const placeholder=path.join(this.bundled,'../party-placeholder.svg');if(fs.existsSync(placeholder)){const bytes=fs.readFileSync(placeholder);return{bytes,type:'image/svg+xml',cached:true,sourceFallback:true};}}
  if(/^(audio|cry|bgm)\//.test(key))throw Error('Unbundled sound');
  if(this.failures.get(key)>Date.now())throw Error('Asset temporarily unavailable');if(this.pending.has(key))return this.pending.get(key);
  const promise=this.resolve(key).catch(e=>{this.failures.set(key,Date.now()+60000);if(key.startsWith('item/'))return itemPlaceholder(key.slice(5));throw e;}).finally(()=>this.pending.delete(key));this.pending.set(key,promise);return promise;
 }
 async resolve(key){const [kind,id,side,tone,gender]=key.split('/');const urls=kind==='sprite'?await this.spriteCandidates(id,side,tone==='shiny',gender):kind==='tera'?[sources.tera[id]]:kind==='item'?['https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/'+id+'.png','https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'+id+'.png']:['https://play.pokemonshowdown.com/fx/'+id];let last;
  for(const url of urls.filter(Boolean))try{const bytes=await this.download(url),info=imageInfo(bytes);if(kind==='sprite'&&!info.animated)continue;const hash=crypto.createHash('sha256').update(bytes).digest('hex'),file=hash+(info.type==='image/png'?'.png':info.type==='image/webp'?'.webp':'.gif');fs.writeFileSync(path.join(this.directory,file),bytes);const entry={file,url,...info,bytes:bytes.length};this.manifest[key]=entry;fs.writeFileSync(path.join(this.directory,'manifest.json'),JSON.stringify(this.manifest,null,2));return{...entry,bytes,cached:false};}catch(e){last=e;}
  throw last||Error('No animated source for '+key);
 }
 async close(){}
}
module.exports={BattleAssets,imageInfo};
