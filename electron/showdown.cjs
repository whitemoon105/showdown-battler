const {WebContentsView,session,shell,ipcMain}=require('electron');
// Each server owns a persistent browser session. Switching never reloads a battle.
class ShowdownViews {
  constructor(main,store,{translate,send,approved,presentation,log}){
    Object.assign(this,{main,store,translate,send,approved,presentation,log});this.views=new Map();this.active=null;this.visible=false;this.bounds=null;this.lockNotified=new Set();
    const entry=event=>[...this.views].find(([server,v])=>['international','china'].includes(server)&&v.webContents===event.sender&&event.senderFrame===event.sender.mainFrame&&this.approved(event.sender.getURL()));
    ipcMain.handle('dfy:showdown-bootstrap',event=>{if(!entry(event))throw Error('未知对战页面');return this.presentation?.()||'';});
    this.readyListener=(event,error)=>{const row=entry(event);if(!row)return;const [server,view]=row;if(error){this.log?.('showdown.bootstrap-failed',{server,error});this.send({type:'web-status',server,error:'对战界面加载失败：'+error});return;}view.presentationReady=true;this.layout({visible:this.visible});Promise.resolve(this.translate(view)).catch(e=>{this.log?.('showdown.translate-failed',{server,error:e.message});this.send({type:'web-status',server,error:e.message});});};
    ipcMain.on('dfy:showdown-ready',this.readyListener);
    this.navigateListener=(event,page)=>{if(entry(event)&&['accounts','teams'].includes(page))this.send({type:'navigate',page});};
    ipcMain.on('dfy:showdown-navigate',this.navigateListener);
  }
  checkIpLock(server,url){
    if(this.lockNotified.has(server))return;
    this.lockNotified.add(server);
    this.log?.('showdown.ip-lock-detected',{server,url});
    this.send({type:'network-lock',server,recovered:false});
  }
  async open(server){
    if(!['international','china'].includes(server))throw Error('服务器无效');
    let view=this.views.get(server);
    if(!view){
      const partition='persist:showdown-'+server,s=session.fromPartition(partition),settings=this.store.settings();
      await s.setProxy({mode:'direct'});
      s.setPermissionRequestHandler((_,__,done)=>done(false));
      s.on('will-download',(_,item)=>item.setSaveDialogOptions({defaultPath:require('../core/paths.cjs').downloads+'/'+require('node:path').basename(item.getFilename())}));
      view=new WebContentsView({webPreferences:{partition,preload:require('node:path').join(__dirname,'showdown-preload.cjs'),nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
      this.views.set(server,view);this.main.contentView.addChildView(view);view.setVisible(false);
      view.webContents.setWindowOpenHandler(({url})=>{if(/^https:\/\//.test(url))shell.openExternal(url);return{action:'deny'};});
      view.webContents.on('will-navigate',(e,url)=>{if(!this.approved(url)){e.preventDefault();if(/^https:\/\//.test(url))shell.openExternal(url);}});
      view.webContents.on('console-message',(_,level,message,line,sourceId)=>{if(level>=2)this.log?.('showdown.console',{server,level,message,line,sourceId});});
      view.webContents.on('render-process-gone',(_,details)=>this.log?.('showdown.render-process-gone',{server,details}));
      // Never expose an unstyled page while its game shell is being installed.
      view.presentationReady=false;
      view.webContents.on('did-start-navigation',(_,__,inPlace,isMain)=>{if(isMain&&!inPlace){this.lockNotified.delete(server);view.presentationReady=false;view.setVisible(false);}});
      view.webContents.on('dom-ready',async()=>{if(this.presentation)return;
        try{await this.translate(view);if(view.webContents.isDestroyed())return;view.presentationReady=true;this.layout({visible:this.visible});}
        catch(e){this.send({type:'web-status',server,error:'对战界面加载失败：'+e.message});}
      });
      view.webContents.on('did-finish-load',async()=>{const url=view.webContents.getURL();this.send({type:'web-status',server,loaded:true,url});try{const locked=await view.webContents.executeJavaScript(`(()=>{const text=document.body?.innerText||'';return /currently locked|IP[^\\n]{0,100}locked|被锁定|IP[^\\n]{0,100}封禁/i.test(text);})()`);if(locked)this.checkIpLock(server,url);}catch(error){this.log?.('showdown.lock-check-failed',{server,error:error.message});}});
      view.webContents.on('did-fail-load',(_,code,description,__,isMain)=>{if(isMain&&code!==-3){this.log?.('showdown.load-failed',{server,code,description});this.send({type:'web-status',server,error:description});}});
      const url=server==='china'?settings.chinaUrl:'https://play.pokemonshowdown.com';
      if(!this.approved(url))throw Error('服务器网址无效');
      view.webContents.loadURL(url).catch(e=>this.send({type:'web-status',server,error:e.message}));
    }
    this.active=server;this.layout({visible:true,bounds:this.bounds});return{opened:true,server,embedded:true};
  }
  layout({visible,bounds}){
    if(bounds){const size=this.main.getContentBounds();const x=Math.max(0,Math.round(bounds.x)),y=Math.max(0,Math.round(bounds.y));this.bounds={x,y,width:Math.max(1,Math.min(Math.round(bounds.width),size.width-x)),height:Math.max(1,Math.min(Math.round(bounds.height),size.height-y))};}
    this.visible=!!visible;
    for(const [server,view]of this.views){if(this.bounds)view.setBounds(this.bounds);view.setVisible(this.visible&&!!this.bounds&&server===this.active&&view.presentationReady!==false);}
    return{server:this.active,visible:this.visible};
  }
  async reload(){const view=this.views.get(this.active);if(view)view.webContents.reload();return{};}
  async openResource(url){
    const u=new URL(url);if(u.protocol!=='https:'||u.username||u.password||!['www.smogon.com','smogon.com','wiki.52poke.com'].includes(u.hostname))throw Error('仅支持公开资料站点');
    let view=this.views.get('reference');if(!view){const partition='persist:reference',s=session.fromPartition(partition);await s.setProxy({mode:'direct'});s.setPermissionRequestHandler((_,__,done)=>done(false));view=new WebContentsView({webPreferences:{partition,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});this.views.set('reference',view);this.main.contentView.addChildView(view);view.webContents.on('dom-ready',()=>this.translate(view));view.webContents.setWindowOpenHandler(({url})=>{try{const next=new URL(url);if(['www.smogon.com','smogon.com','wiki.52poke.com'].includes(next.hostname))this.openResource(url);else if(next.protocol==='https:')shell.openExternal(url);}catch{}return{action:'deny'};});view.webContents.on('will-navigate',(e,href)=>{if(!this.approved(href))e.preventDefault();});}
    this.active='reference';this.layout({visible:true,bounds:this.bounds});await view.webContents.loadURL(u.href);return{opened:true,url:u.href};
  }
  close(){ipcMain.removeHandler('dfy:showdown-bootstrap');ipcMain.removeListener('dfy:showdown-ready',this.readyListener);ipcMain.removeListener('dfy:showdown-navigate',this.navigateListener);for(const view of this.views.values())if(!view.webContents.isDestroyed())view.webContents.close();this.views.clear();}
}
module.exports={ShowdownViews};
