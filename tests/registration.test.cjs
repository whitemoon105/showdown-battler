'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {step}=require('../electron/play-registration.cjs');
function run(stage,{registered=false,named=false,name='Guest',error='',taken=false,popup=true}={}){
 const state={renames:[],popups:[],first:{},second:{}};
 const panel=popup?{querySelector:s=>s==='.error'?{textContent:error}:taken?{}:null}:null;
 const document={querySelector:s=>s==='.ps-popup'?panel:s.includes('cpassword')?state.second:s.includes('password')?state.first:null};
 const app={user:{challstr:'fixture',get:k=>({registered,named,name})[k],rename:n=>state.renames.push(n)},addPopup:(...args)=>state.popups.push(args)};
 const result=vm.runInNewContext('('+step.toString()+')('+JSON.stringify({stage,username:'TestUser',password:'fixture-only'})+')',{window:{app,RegisterPopup:function(){}},document});
 return{result,state};
}
test('registration reserves name once, never treats existing ID as success, and keeps captcha retry open',()=>{
 let r=run('name');assert.equal(r.result.stage,'claiming');assert.equal(r.state.renames.length,1);
 r=run('claiming',{taken:true,error:'The name you chose is registered.'});assert.match(r.result.error,/已被注册/);assert.equal(r.state.renames.length,0);assert.equal(r.state.first.value,undefined);
 r=run('claiming',{registered:true,named:true,name:'TestUser',taken:true});assert(!r.result.done);
 r=run('claiming',{name:'TestUser',named:true});assert.equal(r.result.stage,'verification');assert.equal(r.state.first.value,'fixture-only');assert.equal(r.state.second.value,'fixture-only');
 r=run('verification',{name:'TestUser',named:true,error:'Wrong captcha.'});assert(!r.result.done&&!r.result.error);
 r=run('verification',{name:'TestUser',named:true,registered:{loggedin:true}});assert(r.result.done);
 r=run('verification',{popup:false});assert.match(r.result.error,/取消/);
});
test('login rejects wrong passwords, accepts finished battles and blocks switching during active battles',async()=>{
 const {apply}=require('../electron/player-login.cjs');
 const attempt=async(ended,data)=>{
  const sent=[],app={user:{challstr:'fixture'},rooms:{battle:{id:'battle-fixture',request:{side:{}},battle:{ended}}},send:value=>sent.push(value)},$={post:(url,input,cb)=>{queueMicrotask(()=>cb(data));return{fail(){}};}};
  const result=vm.runInNewContext('('+apply.toString()+')({username:"TestUser",password:"fixture-only"})',{window:{app,$},app,$,setTimeout,clearTimeout,queueMicrotask});
  await result;return sent;
 };
 await assert.rejects(()=>attempt(true,{actionsuccess:false}),/登录失败/);
 await assert.rejects(()=>attempt(false,{assertion:'valid-fixture'}),/结束当前对局/);
 assert.deepEqual(await attempt(true,{assertion:'valid-fixture',actionsuccess:true}),['/trn TestUser,0,valid-fixture']);
});
test('registration window stays hidden for taken names and only opens a prepared verification form',async()=>{
 const fs=require('fs'),filename=require.resolve('../electron/play-registration.cjs');
 const scenario=async answers=>{
  const windows=[];class FakeWindow{constructor(options){this.options=options;this.visible=false;windows.push(this);this.webContents={setWindowOpenHandler(){},on(){},insertCSS:async css=>{assert(css.includes('body> :not(.ps-overlay)'));},executeJavaScript:async code=>code.startsWith('(function step')?answers.shift():undefined};}loadURL(){return Promise.resolve();}isDestroyed(){return!!this.closed;}show(){this.visible=true;}close(){this.closed=true;}}
  const module={exports:{}};vm.runInNewContext(fs.readFileSync(filename,'utf8'),{module,__dirname:require('path').dirname(filename),require:name=>name==='electron'?{BrowserWindow:FakeWindow,session:{fromPartition:()=>({setProxy:async()=>{},setPermissionRequestHandler(){}})}}:require(name),setTimeout:(fn,ms)=>ms===600?setTimeout(fn,0):setTimeout(fn,ms),clearTimeout,URL,console});
  let result,error;try{result=await module.exports.register({parent:{},store:{settings:()=>({chinaUrl:'https://china.psim.us'})},input:{username:'TestUser',password:'fixture-only',confirm:'fixture-only'}});}catch(e){error=e;}
  return{windows,result,error,take:module.exports.take};
 };
 const rejected=await scenario([{stage:'claiming'},{error:'用户名已被注册'}]);assert.match(rejected.error.message,/注册/);assert.equal(rejected.windows[0].options.show,false);assert(!rejected.windows[0].visible);assert(rejected.windows[0].closed);
 const verified=await scenario([{stage:'claiming'},{stage:'verification'},{done:true}]);assert(!verified.error,verified.error?.message);assert(verified.windows[0].visible);assert(verified.windows[0].closed);assert.equal(verified.take(verified.result.token).username,'TestUser');assert.throws(()=>verified.take(verified.result.token),/过期/);
});
