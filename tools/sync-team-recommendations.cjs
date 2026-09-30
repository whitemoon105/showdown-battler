'use strict';
const fs=require('fs'),path=require('path');
const {fetch}=require('undici'),{Dex}=require('../core/dex.cjs');
const {loadRecommendations}=require('../core/team-recommendations.cjs');
(async()=>{
 const directory=path.join(__dirname,'../assets/recommendations');fs.mkdirSync(directory,{recursive:true});
 const root=await (await fetch('https://www.smogon.com/stats/')).text();
 const month=[...root.matchAll(/href="(\d{4}-\d{2})\//g)].map(x=>x[1]).sort().pop();
 const list=await (await fetch('https://www.smogon.com/stats/'+month+'/chaos/')).text();
 const available=new Set([...list.matchAll(/href="([a-z0-9]+)-\d+\.json"/g)].map(x=>x[1]));
 const formats=Dex.formats.all().filter(f=>f.name&&f.mod&&f.searchShow!==false&&!f.team&&!f.name.includes('@@@'));
 const queue=formats.filter(f=>available.has(f.id)),results=[];
 await Promise.all(Array.from({length:3},async()=>{
  while(queue.length){
   const f=queue.shift();const file=path.join(directory,f.id+'.json');if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));if(old.source==='smogon'){results.push({format:f.id,source:old.source,species:Object.keys(old.stats).length});continue;}}const result=await loadRecommendations(f.id,undefined,{force:true});
   if(result.source!=='unavailable'){fs.writeFileSync(path.join(directory,f.id+'.json'),JSON.stringify(result));results.push({format:f.id,source:result.source,species:Object.keys(result.stats).length});}
   else results.push({format:f.id,error:result.networkIssue});
   console.log(f.id,result.source,Object.keys(result.stats).length);
  }
 }));
 fs.writeFileSync(path.join(directory,'index.json'),JSON.stringify({month,results,unavailable:formats.filter(f=>!available.has(f.id)).map(f=>f.id)},null,2));
})();
