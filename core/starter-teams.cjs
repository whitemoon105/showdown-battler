'use strict';
const {validate,TeamValidator}=require('./dex.cjs');
const cache=new Map();
function list(format){
 if(cache.has(format))return structuredClone(cache.get(format));
 const sources=[...(require('../assets/sample-teams.json').formats[format]||[]),...(require('../assets/builtin-starters.json')[format]||[])],result=[];
 for(const source of sources){
  const checked=validate(source.text,format),validator=new TeamValidator(format);
  if(!checked.valid||checked.team.length!==Math.min(6,validator.ruleTable.maxTeamSize))continue;
  result.push({...source,format,text:checked.text});
 }
 cache.set(format,result);return structuredClone(result);
}
module.exports={list};
