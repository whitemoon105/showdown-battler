'use strict';
// 保留理由：测试窗口需要实际合成帧，但实体鼠标不能打断 Chromium 注入的点击与悬停，也不应抢占用户焦点。
const flags=['--disable-features=CalculateNativeWinOcclusion','--disable-renderer-backgrounding','--disable-background-timer-throttling'];
async function isolate(app){await app.evaluate(({BrowserWindow,webContents,app})=>{for(const wc of webContents.getAllWebContents())wc.setBackgroundThrottling(false);app.on('web-contents-created',(_,wc)=>wc.setBackgroundThrottling(false));for(const w of BrowserWindow.getAllWindows()){w.setIgnoreMouseEvents(true);w.setSkipTaskbar(true);w.showInactive();}});}
module.exports={flags,isolate};
