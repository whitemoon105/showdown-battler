'use strict';
const fs=require('node:fs'),path=require('node:path');
// Only dimensions and key existence belong in the renderer, not source metadata.
const bundledMeta=Object.fromEntries(Object.entries(require('../assets/battle-media/manifest.json')).map(([key,value])=>[key,{width:value.width,height:value.height,animated:value.animated}]));
const dictionary=require('../assets/zh-dictionary.json');
const descriptions=require('../core/move-descriptions.cjs').moveDescriptions();
function script({mode='game',playEdition=false}={}){
 const assetMeta=require('./battle-asset-protocol.cjs').metadata()||bundledMeta;
 const battle={css:fs.readFileSync(path.join(__dirname,'../assets/rule-tooltips.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../assets/battle-intro.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../assets/battle-ui.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../assets/battle-result.css'),'utf8'),dictionary,assetMeta,descriptions};
 const ruleSummaries=Object.fromEntries(require('../core/dex.cjs').formats().filter(f=>f.supported).map(f=>[f.id,require('../core/rule-summary.cjs').summary(f.id)]));
 const ruleTips='('+require('../ui/rule-tooltips.js').install.toString()+')({get:id=>Promise.resolve('+JSON.stringify(ruleSummaries)+'[id]||{name:id,lines:["本地尚未收录此规则，请更新规则后查看"],bans:[],note:"实际出战由服务器复核"})});';
 const lobby={playEdition,css:fs.readFileSync(path.join(__dirname,'../assets/lobby-ui.css'),'utf8')+'\n'+fs.readFileSync(path.join(__dirname,'../assets/game-surfaces.css'),'utf8'),dictionary};
 const field=require('./battle-field.cjs');
 return ruleTips+'('+require('./battle-intro.cjs').install.toString()+')();window.__dfySpriteAssetKeys='+require('../core/sprite-assets.cjs').spriteAssetKeys.toString()+';('+require('./battle-move-info.cjs').install.toString()+')();window.__dfyBattleCamera='+require('../core/battle-scale.cjs').battleCamera.toString()+';window.__dfySpriteDimensions='+require('../core/battle-scale.cjs').spriteDimensions.toString()+';('+require('./battle-choice.cjs').install.toString()+')();('+require('./battle-inspector.cjs').install.toString()+')();window.__dfyReadFieldState='+field.readFieldState.toString()+';('+field.install.toString()+')();('+require('./battle-audio.cjs').install.toString()+')();window.__dfyReadBattleResult='+require('./battle-result.cjs').readResult.toString()+';('+require('./battle-result.cjs').install.toString()+')();('+require('./play-battle.cjs').install.toString()+')('+JSON.stringify(battle)+');('+require('./showdown-game.cjs').mount.toString()+')('+JSON.stringify({mode,dictionary,dual:true,playEdition})+');('+require('./showdown-lobby.cjs').install.toString()+')('+JSON.stringify(lobby)+');('+require('./showdown-surfaces.cjs').install.toString()+')('+JSON.stringify({dictionary})+');document.head.append(document.getElementById("dfy-dual-theme"));';
}
module.exports={script};
