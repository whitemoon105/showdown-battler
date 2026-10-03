'use strict';
const {ipcRenderer,webFrame}=require('electron');
window.addEventListener('dfy:navigate',event=>{if(['accounts','teams','rules'].includes(event.detail))ipcRenderer.send('dfy:showdown-navigate',event.detail);});
// webContents.executeJavaScript waits for every remote image to finish loading.
// Run at DOM readiness in the page's main world instead, before revealing the view.
window.addEventListener('DOMContentLoaded',async()=>{
 try{
  const code=await ipcRenderer.invoke('dfy:showdown-bootstrap');
  if(!code)return;
  await webFrame.executeJavaScriptInIsolatedWorld(0,[{code}]);
  ipcRenderer.send('dfy:showdown-ready');
 }catch(error){ipcRenderer.send('dfy:showdown-ready',String(error.message||error));}
},{once:true});
