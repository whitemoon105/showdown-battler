const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Dex}=require('../core/dex.cjs'),{describe}=require('../core/chinese-text.cjs'),{BattleAssets}=require('../core/battle-assets.cjs');
test('species sizing preserves silhouettes, relative mass and doubles depth for the complete local dex',()=>{
 const {spriteDimensions}=require('../core/battle-scale.cjs'),manifest=require('../assets/battle-media/manifest.json');
 const size=(id,front,slot=0)=>{const m=manifest['sprite/'+id+'/front/normal/M'],s=Dex.species.get(id);return spriteDimensions({width:m.width,height:m.height,heightm:s.heightm,front,doubles:true,slot});};
 for(const s of Dex.species.all()){const m=manifest['sprite/'+s.id+'/front/normal/M'];if(!m?.width||!m.height)continue;const near=size(s.id,false,1),far=size(s.id,true),left=size(s.id,false,0);assert(near.w>0&&near.h>0&&far.w>0&&far.h>0);assert(Math.abs(near.w*m.height-near.h*m.width)<=m.width+m.height,s.name+' aspect');assert(left.w<=near.w&&left.h<=near.h,s.name+' left depth');assert(far.w<near.w*1.5&&far.h<near.h*1.5,s.name+' far perspective');}
 const whale=size('kyogre',true),cloud=size('tornadus',true);assert(whale.w>cloud.w*1.5);assert(whale.w*whale.h>cloud.w*cloud.h);
});
test('modern ability and move descriptions contain Chinese effects rather than untranslated source',()=>{
 for(const ability of ['Protosynthesis','Orichalcum Pulse','Chlorophyll','Toxic Chain'])assert(/[\u3400-\u9fff]/.test(describe(Dex,Dex.abilities.get(ability)).shortDesc));
 assert.match(describe(Dex,Dex.abilities.get('Protosynthesis')).shortDesc,/30%.*50%/);
 assert.match(describe(Dex,Dex.moves.get('Hydro Steam')).shortDesc,/大晴天.*50%/);
 assert.match(describe(Dex,Dex.items.get('Ability Shield')).shortDesc,/特性.*无视/);
});
test('regional sprites retain their identity offline and battle front/back sprites animate',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'showdown-media-test-'));
 try{const a=new BattleAssets({directory:dir});
  for(const side of ['front','back']){const variant=await a.get('sprite/slowkinggalar/'+side+'/normal/M'),base=await a.get('sprite/slowking/'+side+'/normal/M');assert.notEqual(variant.file,base.file);assert(variant.animated);assert(!variant.sourceFallback);}
  for(const id of ['greattusk','kingambit','landorustherian'])for(const side of ['front','back'])assert((await a.get('sprite/'+id+'/'+side+'/normal/M')).animated,id+'/'+side);
  const ogerpon=await a.get('sprite/ogerponwellspring/front/normal/M');assert(!ogerpon.sourceFallback);assert.equal(ogerpon.species,'ogerponwellspring');assert(ogerpon.animated&&ogerpon.frames>1);
  // An unavailable form must remain identifiable as missing instead of borrowing its base form.
  const missing=await a.get('sprite/nonexistentforme/front/normal/M');assert.equal(missing.type,'image/svg+xml');
 }finally{fs.rmSync(dir,{recursive:true});}
});
