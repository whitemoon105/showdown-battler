'use strict';
const {app,BrowserWindow}=require('electron');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><defs><linearGradient id="red" x2="0.3" y2="1"><stop stop-color="#ed7286"/><stop offset="1" stop-color="#cb405b"/></linearGradient><linearGradient id="white" x2="0.2" y2="1"><stop stop-color="#ffffff"/><stop offset="1" stop-color="#e5eaf2"/></linearGradient></defs><circle cx="128" cy="139" r="105" fill="#34465c" opacity=".15"/><circle cx="128" cy="124" r="104" fill="url(#white)" stroke="#405269" stroke-width="12"/><path d="M24 124a104 104 0 0 1 208 0Z" fill="url(#red)"/><path d="M24 124a104 104 0 0 1 208 0" fill="none" stroke="#405269" stroke-width="12"/><path d="M26 124h204" stroke="#405269" stroke-width="14"/><circle cx="128" cy="124" r="39" fill="#fff" stroke="#405269" stroke-width="12"/><circle cx="128" cy="124" r="20" fill="#f5f7fc" stroke="#c9d1de" stroke-width="4"/><path d="M63 67a78 78 0 0 1 67-26" stroke="#fff" opacity=".45" stroke-width="9" stroke-linecap="round" fill="none"/></svg>';
app.disableHardwareAcceleration();app.whenReady().then(async()=>{
 const win=new BrowserWindow({width:256,height:256,show:false,frame:false,transparent:true,webPreferences:{offscreen:true}});
 await win.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent('<style>html,body{margin:0;width:256px;height:256px;background:transparent;overflow:hidden}</style>'+svg));
 const image=await win.webContents.capturePage({x:0,y:0,width:256,height:256});
 const sizes=[16,32,48,256],images=sizes.map(n=>image.resize({width:n,height:n,quality:'best'}).toPNG());
 const header=Buffer.alloc(6+16*sizes.length);header.writeUInt16LE(1,2);header.writeUInt16LE(sizes.length,4);let offset=header.length;
 images.forEach((b,i)=>{const p=6+i*16,n=sizes[i];header[p]=n===256?0:n;header[p+1]=n===256?0:n;header.writeUInt16LE(1,p+4);header.writeUInt16LE(32,p+6);header.writeUInt32LE(b.length,p+8);header.writeUInt32LE(offset,p+12);offset+=b.length;});
 fs.writeFileSync(path.join(root,'assets/icon.svg'),svg);fs.writeFileSync(path.join(root,'assets/icon.ico'),Buffer.concat([header,...images]));fs.writeFileSync(path.join(root,'assets/icon.png'),images[3]);
 win.destroy();app.quit();
}).catch(e=>{console.error(e);app.exit(1);});
