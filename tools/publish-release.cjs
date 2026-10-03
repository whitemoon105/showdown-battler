'use strict';
// 保留理由：更新必须同时发布安装器、blockmap 与 latest.yml，先校验草稿再公开，避免旧版下载不完整更新。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{execFileSync}=require('node:child_process');
const {fetch,ProxyAgent}=require('undici'),yaml=require('js-yaml');
const repo='whitemoon105/showdown-battler',version=require('../package.json').version,tag='v'+version;
const [mode,directory]=process.argv.slice(2);
if(!['check','stage','publish'].includes(mode))throw Error('Usage: node tools/publish-release.cjs check|stage|publish [artifact-directory]');
const git=(args,input)=>execFileSync('git',args,{input,encoding:'utf8',windowsHide:true,env:{...process.env,GIT_TERMINAL_PROMPT:'0',GCM_INTERACTIVE:'Never'},stdio:['pipe','pipe','pipe']}).trim();
// Credentials stay in memory; use this checkout's existing Git account and transport settings.
const credential=Object.fromEntries(git(['credential','fill'],'protocol=https\nhost=github.com\n\n').split('\n').filter(l=>l.includes('=')).map(l=>{const at=l.indexOf('=');return[l.slice(0,at),l.slice(at+1)];}));
if(!credential.password)throw Error('Git credential unavailable');
let dispatcher;try{const uri=git(['config','--get','http.proxy']);if(uri)dispatcher=new ProxyAgent({uri,headersTimeout:1800000,bodyTimeout:1800000});}catch{}
async function api(endpoint,{method='GET',body,raw,headers={}}={}){
 const response=await fetch(endpoint.startsWith('https:')?endpoint:'https://api.github.com/'+endpoint,{method,dispatcher,signal:AbortSignal.timeout(1800000),duplex:raw?'half':undefined,headers:{Authorization:'Bearer '+credential.password,'User-Agent':'ShowdownBattler-release',Accept:'application/vnd.github+json',...(body?{'Content-Type':'application/json'}:{}),...headers},body:raw||(body?JSON.stringify(body):undefined)});
 if(response.status===404||response.status===204)return null;
 const value=await response.json();if(!response.ok)throw Error('GitHub '+response.status+': '+(value.message||'request failed'));return value;
}
async function digest(file,algorithm,encoding){const hash=crypto.createHash(algorithm);for await(const bytes of fs.createReadStream(file))hash.update(bytes);return hash.digest(encoding);}
async function artifacts(){
 if(!directory)throw Error('Artifact directory required');
 const exe='ShowdownBattler-Setup-'+version+'-x64.exe',names=[exe,exe+'.blockmap','latest.yml'];
 const latest=yaml.load(fs.readFileSync(path.join(directory,'latest.yml'),'utf8'));
 if(latest.version!==version||latest.path!==exe||latest.files?.[0]?.url!==exe)throw Error('Update manifest targets another build');
 const sha512=await digest(path.join(directory,exe),'sha512','base64');if(latest.sha512!==sha512||latest.files[0].sha512!==sha512||latest.files[0].size!==fs.statSync(path.join(directory,exe)).size)throw Error('Update manifest checksum mismatch');
 return Promise.all(names.map(async name=>({name,file:path.join(directory,name),size:fs.statSync(path.join(directory,name)).size,sha256:await digest(path.join(directory,name),'sha256','hex')})));
}
async function verifyAssets(release,files){
 const remote=await api('repos/'+repo+'/releases/'+release.id+'/assets');
 for(const f of files){const asset=remote.find(a=>a.name===f.name);if(!asset||asset.state!=='uploaded'||asset.size!==f.size||asset.digest!=='sha256:'+f.sha256)throw Error('Remote checksum missing or mismatched: '+f.name);}
 console.log('All three remote assets match local SHA-256 hashes');
}
(async()=>{
 const user=await api('user');if(user.login!=='whitemoon105')throw Error('Unexpected publishing account');
 if(mode==='check'){const latest=await api('repos/'+repo+'/releases/latest');console.log({account:user.login,latest:latest?.tag_name,next:tag});return;}
 const files=await artifacts(),commit=git(['rev-parse','HEAD']);
 if(git(['status','--porcelain']))throw Error('Commit source changes before creating a release');
 const remoteCommit=git(['ls-remote','origin','refs/heads/codex/initial-release']).split(/\s/)[0];if(remoteCommit!==commit)throw Error('Push and verify this commit before creating a release');
 let release=(await api('repos/'+repo+'/releases?per_page=30')).find(r=>r.tag_name===tag);
 if(mode==='stage'){
  if(release&&!release.draft)throw Error('This version is already public; do not overwrite it');
  const changelog=fs.readFileSync(path.join(__dirname,'../CHANGELOG.md'),'utf8'),section=changelog.split('## '+version)[1]?.split('\n## ')[0]?.split('\n').slice(1).join('\n').trim();if(!section)throw Error('Missing changelog');
  if(!release)release=await api('repos/'+repo+'/releases',{method:'POST',body:{tag_name:tag,target_commitish:commit,name:'Showdown 对战器 '+version,draft:true,prerelease:false,body:section+'\n\n包括此前 0.5.9 开发迭代的双打镜头、单球登场及素材修复。\n\n旧版：关于与更新 → 检查更新 → 下载更新 → 重启并安装。也可直接下载安装包，保留本机账号与队伍。窗口固定 16:10，可等比缩放。\n\n作者：白月遥。特别鸣谢 loving1096。\n本软件仅供交流，免费使用，不涉及任何商业行为。'}});
  if(release.target_commitish!==commit)throw Error('Existing draft targets another commit');
  const remote=await api('repos/'+repo+'/releases/'+release.id+'/assets');
  for(const f of files){
   const existing=remote.find(a=>a.name===f.name);if(existing){if(existing.size===f.size&&existing.digest==='sha256:'+f.sha256)continue;if(existing.state==='starter'&&existing.size===0)await api('repos/'+repo+'/releases/assets/'+existing.id,{method:'DELETE'});else throw Error('Draft asset already exists with different content: '+f.name);}
   console.log('Uploading '+f.name+' ('+Math.round(f.size/1048576)+' MiB)');let sent=0,last=0;
   // 保留理由：异步迭代保留流的背压，不能提前添加 data 监听导致连接就绪前丢掉安装包字节。
   async function* chunks(){for await(const bytes of fs.createReadStream(f.file)){sent+=bytes.length;if(Date.now()-last>15000){last=Date.now();console.log(f.name+': '+Math.round(sent/f.size*100)+'% read into upload stream');}yield bytes;}}
   const asset=await api(release.upload_url.replace(/\{.*$/,'')+'?name='+encodeURIComponent(f.name),{method:'POST',raw:chunks(),headers:{'Content-Type':'application/octet-stream','Content-Length':String(f.size)}});console.log('Uploaded '+asset.name);
  }
  await verifyAssets(release,files);console.log({draft:release.id,tag,commit});return;
 }
 if(!release||release.target_commitish!==commit)throw Error('No verified draft for current commit');await verifyAssets(release,files);
 if(release.draft)release=await api('repos/'+repo+'/releases/'+release.id,{method:'PATCH',body:{draft:false,prerelease:false,make_latest:'true'}});
 const latest=await api('repos/'+repo+'/releases/latest');if(latest?.tag_name!==tag)throw Error('Release is not the current public update');
 console.log({published:release.html_url,version:latest.tag_name,assets:latest.assets.map(a=>a.name)});
})().catch(e=>{console.error(e.message,e.cause?.code||'');process.exitCode=1}).finally(()=>dispatcher?.close());
