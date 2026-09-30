'use strict';
const fs=require('node:fs'),path=require('node:path');
// Only dimensions and key existence belong in the renderer, not source metadata.
const assetMeta=Object.fromEntries(Object.entries(require('../assets/battle-media/manifest.json')).map(([key,value])=>[key,{width:value.width,height:value.height,animated:value.animated}]));
const dictionary=require('../assets/zh-dictionary.json');
function script({mode='game',playEdition=false}={}){
 const battle={css:fs.readFileSync(path.join(__dirname,'../assets/battle-ui.css'),'utf8'),dictionary,assetMeta};
 const lobby={css:fs.readFileSync(path.join(__dirname,'../assets/lobby-ui.css'),'utf8'),dictionary};
 const field=require('./battle-field.cjs');
 return 'window.__dfySpriteDimensions='+require('../core/battle-scale.cjs').spriteDimensions.toString()+';('+require('./battle-choice.cjs').install.toString()+')();('+require('./battle-inspector.cjs').install.toString()+')();window.__dfyReadFieldState='+field.readFieldState.toString()+';('+field.install.toString()+')();('+require('./play-battle.cjs').install.toString()+')('+JSON.stringify(battle)+');('+require('./showdown-game.cjs').mount.toString()+')('+JSON.stringify({mode,dictionary,dual:true,playEdition})+');('+require('./showdown-lobby.cjs').install.toString()+')('+JSON.stringify(lobby)+');document.head.append(document.getElementById("dfy-dual-theme"));';
}
module.exports={script};
