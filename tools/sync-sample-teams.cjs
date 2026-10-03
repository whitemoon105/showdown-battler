'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{fetch}=require('undici'),cheerio=require('cheerio');
const {formats,validate,TeamValidator,toID}=require('../core/dex.cjs');
const indexUrl='https://www.smogon.com/forums/threads/master-list-of-ps-sample-teams.3777422/';
const destination=path.join(__dirname,'../assets/sample-teams.json');
async function get(url,attempt=0){try{const response=await fetch(url,{signal:AbortSignal.timeout(18000),headers:{'user-agent':'ShowdownBattler sample-team sync'}});if(!response.ok)throw Error('HTTP '+response.status);const text=await response.text();if(text.length>6000000)throw Error('Source too large');return text;}catch(e){if(attempt<2){await new Promise(r=>setTimeout(r,600*(attempt+1)));return get(url,attempt+1);}throw e;}}
async function main(){
 const supported=new Set(formats().filter(f=>!f.random&&f.search&&f.supported).map(f=>f.id)),$=cheerio.load(await get(indexUrl)),sources={};
 $('.message-body').first().find('a').each((i,node)=>{const label=$(node).text().trim(),id=/^\[Gen \d\]/.test(label)?toID(label):'gen9'+toID(label),url=$(node).attr('href');if(supported.has(id)&&url?.startsWith('https://www.smogon.com/forums/threads/'))sources[id]=url;});
 sources.gen9vgc2024regg='https://www.smogon.com/forums/threads/vgc-25-regulation-g-sample-teams-thread.3747193/';
 const data={schema:1,syncedAt:new Date().toISOString(),indexUrl,formats:{},unavailable:{}},queue=Object.entries(sources);
 async function worker(){while(queue.length){const [format,url]=queue.shift(),teams=[],rejected=[];try{
  const html=cheerio.load(await get(url)),post=url.match(/(?:#|\/)post-(\d+)/)?.[1];let body=post?html('#post-'+post+' .message-body'):html('.message-body').first();if(!body.find('a[href*="pokepast.es"]').length)body=html('.message-body').filter((i,n)=>html(n).find('a[href*="pokepast.es"]').length>0).first();
  const pastes=[...new Set(body.find('a').map((i,n)=>html(n).attr('href')).get().filter(x=>/^https:\/\/pokepast\.es\/[a-f0-9]{16}\/?$/.test(x)))];
  for(const paste of pastes.slice(0,18)){try{
   const source=JSON.parse(await get(paste.replace(/\/$/,'')+'/json')),checked=validate(source.paste,format),max=new TeamValidator(format).ruleTable.maxTeamSize;
   // 只收录当前规则的完整合法队伍，不修补或混用其他赛制；保留理由：保留示例作者的配队意图，并避免新手拿到不能出战的队伍。
   if(!checked.valid||checked.team.length!==Math.min(6,max)){rejected.push({paste,errors:checked.errors});continue;}
   teams.push({id:crypto.createHash('sha256').update(format+'|'+paste).digest('hex').slice(0,16),format,title:String(source.title||'').slice(0,180),author:String(source.author||'').slice(0,100),sourceUrl:url,pasteUrl:paste,text:checked.text});if(teams.length===3)break;
  }catch(e){rejected.push({paste,error:e.message});}}
  if(teams.length)data.formats[format]=teams;else data.unavailable[format]={sourceUrl:url,reason:'No complete legal sample in the current engine',rejected};
 }catch(e){data.unavailable[format]={sourceUrl:url,reason:e.message};}
 console.log(format+': '+teams.length+' valid teams');}}
 await Promise.all([worker(),worker(),worker()]);
 for(const f of supported)if(!data.formats[f]&&!data.unavailable[f])data.unavailable[f]={reason:'No exact-format sample source in the directory'};
 fs.writeFileSync(destination,JSON.stringify(data,null,2)+'\n');console.log(JSON.stringify({formats:Object.keys(data.formats).length,teams:Object.values(data.formats).flat().length,unavailable:Object.keys(data.unavailable).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
