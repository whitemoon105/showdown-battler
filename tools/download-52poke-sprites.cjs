'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fetch}=require('undici'),{load}=require('cheerio');
const {Dex}=require('../core/dex.cjs'),{imageInfo}=require('../core/battle-assets.cjs');
const dictionary=require('../assets/zh-dictionary.json');
const directory=path.join(__dirname,'../assets/battle-media'),manifestPath=path.join(directory,'manifest.json');
const manifest=JSON.parse(fs.readFileSync(manifestPath,'utf8')),pages=new Map(),downloads=new Map();
const suffixes={'Mega':'M','Mega-X':'MX','Mega-Y':'MY','Mega-Z':'MZ','Gmax':'GM','Alola':'A','Galar':'G','Hisui':'H','Paldea':'P','Primal':'P','Therian':'T','Origin':'O','Sky':'S','Low-Key':'L','Wellspring':'W','Hearthflame':'H','Cornerstone':'C','Teal-Tera':'T','Wellspring-Tera':'WT','Hearthflame-Tera':'HT','Cornerstone-Tera':'CT','F':'_f','Attack':'A','Defense':'D','Speed':'S','Heat':'H','Wash':'W','Frost':'F','Fan':'S','Mow':'C','Blade':'B','Unbound':'U','Black':'B','White':'W','Resolute':'R','Pirouette':'P','Dusk-Mane':'DM','Dawn-Wings':'DW','Ultra':'U','Four':'F','Three-Segment':'T','Bloodmoon':'B','Crowned':'C','Rapid-Strike':'R','Shadow':'S','Ice':'I','Droopy':'D','Stretchy':'S','Terastal':'T','Stellar':'S'};
async function request(url){
 const r=await fetch(url,{headers:{Referer:'https://wiki.52poke.com/','user-agent':'ShowdownBattler/0.5.6'},signal:AbortSignal.timeout(12000)});
 if(!r.ok){await r.body?.cancel();throw Error('HTTP '+r.status);}
 return Buffer.from(await r.arrayBuffer());
}
function normalize(raw){
 let u=raw.startsWith('//')?'https:'+raw:raw;
 u=u.replace('https://s1.52poke.com/','https://media.52poke.com/');
 return u.includes('/thumb/')?u.replace('/thumb/','/').replace(/\/[^/]+$/,''):u;
}
function wikiCandidates(html,s){
 const $=load(html),suffix=s.forme?suffixes[s.forme]:'';
 if(suffix===undefined)return [];
 const urls=[...new Set($('img').map((i,n)=>$(n).attr('src')).get().map(normalize))];
 return urls.filter(u=>{
  const m=decodeURIComponent(u).match(/\/Spr_(\d[a-z])_(\d+)([^/]*?)\.(?:png|gif)$/);
  if(!m||Number(m[2])!==s.num||m[3].endsWith('_s'))return false;
  return m[3]===suffix||(!s.forme&&m[3]==='_m');
 }).sort((a,b)=>{
  const score=u=>/Spr_6x_/.test(u)?0:/Spr_7s_/.test(u)?1:/Spr_8s_/.test(u)?2:/Spr_9s_/.test(u)?3:10;
  return score(a)-score(b);
 });
}
async function page(s){
 const name=s.baseSpecies||s.name;
 if(!pages.has(name))pages.set(name,request('https://wiki.52poke.com/zh-hans/'+encodeURIComponent(dictionary[name]||name)).then(b=>b.toString('utf8')));
 return pages.get(name);
}
async function asset(url){
 if(!downloads.has(url))downloads.set(url,request(url).then(bytes=>({bytes,...imageInfo(bytes)})));
 return downloads.get(url);
}
function save(key,url,asset,source){
 const ext=asset.type==='image/gif'?'.gif':asset.type==='image/webp'?'.webp':'.png';
 const file=crypto.createHash('sha256').update(asset.bytes).digest('hex')+ext;
 fs.writeFileSync(path.join(directory,file),asset.bytes);
 const {bytes,...info}=asset;
 const value={file,url,source,...info,bytes:bytes.length,verified:true};
 manifest[key]=value;
 const s=Dex.species.get(key.split('/')[1]);
 if(!s.gender||s.gender==='N'||s.gender==='M')manifest[key.replace(/\/M$/,'/F')]=value;
 return value;
}
async function sync(key){
 const s=Dex.species.get(key.split('/')[1]);let urls=[];
 try{urls=wikiCandidates(await page(s),s);}catch{}
 let staticAsset=null;
 for(const url of urls.slice(0,5))try{
  const a=await asset(url);
  if(a.animated){save(key,url,a,'52poke');return 'wiki-animated';}
  if(!staticAsset)staticAsset={url,a};
 }catch{}
 // Keep form identity exact when the wiki has no matching form image.
 if(staticAsset){save(key,staticAsset.url,staticAsset.a,'52poke');return 'wiki-static';}
 for(const folder of ['ani','gen5'])try{
  const url='https://play.pokemonshowdown.com/sprites/'+folder+'/'+s.spriteid+(folder==='ani'?'.gif':'.png'),a=await asset(url);
  save(key,url,a,'showdown-exact-form');return a.animated?'fallback-animated':'fallback-static';
 }catch{}
 return 'unresolved';
}
async function main(){
 const targets=Object.keys(manifest).filter(k=>/^sprite\/[^/]+\/front\/normal\/M$/.test(k)&&(!process.env.ONLY_SPECIES||process.env.ONLY_SPECIES.split(',').includes(k.split('/')[1])));
 const counts={},unresolved=[];let done=0;
 const queue=[...targets];await Promise.all(Array.from({length:4},async()=>{
  while(queue.length){const key=queue.shift();const result=await sync(key);counts[result]=(counts[result]||0)+1;if(result==='unresolved')unresolved.push(key);
   if(++done%50===0){fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));console.log(done+'/'+targets.length,counts);}
  }
 }));
 // Measure actual chunks/frames instead of inferring animation from filenames.
 for(const [key,entry] of Object.entries(manifest))if(entry.file&&/\.(png|gif|webp)$/.test(entry.file)){
  try{Object.assign(entry,imageInfo(fs.readFileSync(path.join(directory,entry.file))));}catch{}
 }
 fs.writeFileSync(manifestPath,JSON.stringify(manifest,null,2));
 const report={at:new Date().toISOString(),counts,unresolved};
 fs.writeFileSync(path.join(directory,'sprite-sync-report.json'),JSON.stringify(report,null,2));console.log(report);
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1});
module.exports={wikiCandidates};
