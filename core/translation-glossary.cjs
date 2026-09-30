'use strict';
const {Dex}=require('./dex.cjs'),all=require('../assets/zh-dictionary.json');
const ambiguous=new Set(['Switch','Battle','Attack','Defense','Speed','Competitive','Pressure','Adaptability','Download','Victory Star','Run Away','Normal','Flying','Ground','Psychic','Fire','Water','Poison','Return','Refresh','Present','Pay Day','Celebrate','Morning Sun']);
const names=[...Dex.species.all(),...Dex.moves.all(),...Dex.items.all(),...Dex.abilities.all()].filter(x=>x.exists).map(x=>x.name);
const dictionary={...Object.fromEntries(names.filter(k=>all[k]&&!ambiguous.has(k)).map(k=>[k,all[k]])),Pokemon:'宝可梦',Pokémon:'宝可梦','Stealth Rock':'隐形岩'};
const keys=Object.keys(dictionary).filter(k=>/^[A-Z]/.test(k)||k.includes(' ')).sort((a,b)=>b.length-a.length);
const re=new RegExp('\\b('+keys.map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|')+')\\b','g');
function segments(text){const result=[];let start=0;for(const m of text.matchAll(re)){if(m.index>start)result.push({text:text.slice(start,m.index)});result.push({text:dictionary[m[0]],literal:true});start=m.index+m[0].length;}if(start<text.length)result.push({text:text.slice(start)});return result;}
function protect(text){const terms=[];const masked=text.replace(re,k=>{const id=terms.length;terms.push(dictionary[k]);return 'ZXQ'+id;});return{masked,restore(output){for(let i=0;i<terms.length;i++){const token=new RegExp('ZXQ\\s*'+i+'(?![0-9])','g');if(!token.test(output))return null;output=output.replace(token,()=>terms[i]);}return /ZXQ\s*\d/i.test(output)?null:output;},fallback:text.replace(re,k=>dictionary[k])};}
module.exports={segments,protect,dictionary};
