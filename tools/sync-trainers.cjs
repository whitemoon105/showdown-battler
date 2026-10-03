'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {fetch}=require('undici'),{load}=require('cheerio'),{imageInfo}=require('../core/battle-assets.cjs');
const base='https://play.pokemonshowdown.com/sprites/trainers/',dir=path.resolve(__dirname,'../assets/trainers');
async function download(url){const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status+' '+url);return Buffer.from(await response.arrayBuffer());}
(async()=>{
 const html=(await download(base)).toString(),$=load(html),names=[...new Set($('a').toArray().map(a=>$(a).attr('href')).filter(n=>/^[a-z0-9-]+\.png$/.test(n)))].sort();
 if(!names.includes('unknown.png')||names.length<100)throw Error('Unexpected trainer index');fs.mkdirSync(dir,{recursive:true});
 const manifest={},errors=[];let next=0,done=0;
 await Promise.all(Array.from({length:10},async()=>{while(next<names.length){const file=names[next++],url=base+file;try{let bytes;for(let attempt=0;attempt<3;attempt++){try{bytes=await download(url);break;}catch(e){if(attempt===2)throw e;}}const meta=imageInfo(bytes);if(meta.type!=='image/png'||!meta.width||!meta.height||bytes.length>512000)throw Error('Invalid trainer image');fs.writeFileSync(path.join(dir,file),bytes);manifest[file]={url,sha256:crypto.createHash('sha256').update(bytes).digest('hex'),bytes:bytes.length,width:meta.width,height:meta.height};}catch(e){errors.push({file,error:e.message});}if(++done%200===0)console.log(done+'/'+names.length);}}));
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(Object.fromEntries(Object.entries(manifest).sort()),null,2)+'\n');console.log(JSON.stringify({total:names.length,saved:Object.keys(manifest).length,bytes:Object.values(manifest).reduce((n,m)=>n+m.bytes,0),errors}));if(errors.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
