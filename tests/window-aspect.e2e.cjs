'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process'),{_electron}=require('playwright'),fixture=require('./electron-fixture.cjs');
const out=process.env.SHOWDOWN_TEST_OUTPUT||path.resolve('test-results/aspect');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const env={...process.env,DFY_PLAY_HOME:out+'/window-data',DFY_PLAY_CACHE:out+'/window-cache'};delete env.ELECTRON_RUN_AS_NODE;
 const app=await _electron.launch({executablePath:path.resolve('node_modules/electron/dist/electron.exe'),args:[...fixture.flags,path.resolve('.')],env});
 try{
  await app.firstWindow();await fixture.isolate(app);
  const initial=await app.evaluate(({BrowserWindow})=>{const w=BrowserWindow.getAllWindows()[0];return{bounds:w.getBounds(),content:w.getContentBounds(),handle:w.getNativeWindowHandle().readBigUInt64LE().toString(),maximizable:w.isMaximizable(),fullscreenable:w.isFullScreenable(),resizable:w.isResizable()};});
  assert(Math.abs(initial.bounds.width/initial.bounds.height-1.6)<.002,JSON.stringify(initial));assert(initial.resizable);assert(!initial.maximizable&&!initial.fullscreenable);
  const script=`Add-Type @'
using System;
using System.Runtime.InteropServices;
public class AspectProbe {
 [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
 [DllImport("user32.dll")] public static extern IntPtr SendMessage(IntPtr h, uint msg, IntPtr edge, ref Rect r);
 public static int[] Check(long h, int edge, int w, int height) { var r=new Rect { Left=100, Top=100, Right=100+w, Bottom=100+height }; SendMessage(new IntPtr(h),0x214,new IntPtr(edge),ref r); return new[]{r.Right-r.Left,r.Bottom-r.Top}; }
}
'@
@(2300,100) | ForEach-Object { $width=$_; @(2,6,8) | ForEach-Object { $shape=[AspectProbe]::Check(${initial.handle},$_,$width,1500); [pscustomobject]@{edge=$_;proposedWidth=$width;width=$shape[0];height=$shape[1]} } } | ConvertTo-Json -Compress`;
  // Exercise WM_SIZING without moving the user's physical mouse or resizing another app.
  const edges=JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,encoding:'utf8'}));

  for(const r of edges)assert(Math.abs(r.width/r.height-1.6)<.006,JSON.stringify(r));
  const report={initial:{...initial,handle:undefined},edges,ratio:'16:10',nativeSizing:true};fs.writeFileSync(out+'/window-aspect.json',JSON.stringify(report,null,2));console.log(report);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
