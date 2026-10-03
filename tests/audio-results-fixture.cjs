'use strict';
const {app,BrowserWindow}=require('electron'),fs=require('node:fs'),path=require('node:path');
app.setPath('userData',process.env.SHOWDOWN_AUDIO_TEST_HOME);app.disableHardwareAcceleration();
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:1100,height:760,show:false,webPreferences:{contextIsolation:true,sandbox:true,nodeIntegration:false,backgroundThrottling:false}});
 const css=fs.readFileSync(path.join(__dirname,'../assets/battle-result.css'),'utf8');
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>离线音频与结算验收</title><style>body{margin:28px;font-family:"Microsoft YaHei",sans-serif;background:#f4f6fa;color:#53637c}header{display:flex;gap:16px;height:48px;align-items:center}main{container-type:size;position:relative;border:1px solid #d9e3ec;border-radius:20px;height:440px;background:linear-gradient(#eef3f9,#fdfbf7)}button{border:1px solid #d8e0ea;border-radius:10px;padding:12px;background:white;color:#697791;cursor:pointer}#under-card{position:absolute;left:50%;top:44%;transform:translate(-50%,-50%)}footer{margin-top:16px}'+css+'</style><header><b>Showdown 对战器 · 本地结算验收</b></header><main><button id="under-card">后续操作</button></main><footer><button id="next">下一步</button></footer></html>'));
 await win.webContents.executeJavaScript('('+require('../electron/battle-audio.cjs').install.toString()+')();window.__dfyReadBattleResult='+require('../electron/battle-result.cjs').readResult.toString()+';('+require('../electron/battle-result.cjs').install.toString()+')();window.fixtureReady=true;');
});
app.on('window-all-closed',()=>app.quit());
