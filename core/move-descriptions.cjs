'use strict';
const {Dex}=require('pokemon-showdown'),{describe}=require('./chinese-text.cjs');
// 旧世代和冠军规则只保存相对第九世代的效果差异。保留理由：悬停文字跟随当前规则，避免为每个模式重复注入完整文本。
function moveDescriptions(){
 const result={gen9:{}};
 for(const move of Dex.moves.all())result.gen9[move.id]=describe(Dex,move).shortDesc;
 for(const mod of ['gen1','gen2','gen3','gen4','gen5','gen6','gen7','gen8','champions']){const dex=Dex.mod(mod),values={};for(const move of dex.moves.all()){const text=describe(dex,move).shortDesc;if(text!==result.gen9[move.id])values[move.id]=text;}result[mod]=values;}
 return result;
}
module.exports={moveDescriptions};
