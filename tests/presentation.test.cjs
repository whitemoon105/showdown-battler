const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {Dex}=require('../core/dex.cjs'),{describe}=require('../core/chinese-text.cjs'),{BattleAssets}=require('../core/battle-assets.cjs');
test('official trainer portraits are bundled with verified sizes and provenance',()=>{
 const manifest=require('../assets/trainers/manifest.json'),crypto=require('node:crypto'),{imageInfo}=require('../core/battle-assets.cjs');assert(Object.keys(manifest).length>=1500);assert(manifest['unknown.png']);
 for(const [file,meta]of Object.entries(manifest)){assert.match(file,/^[a-z0-9-]+\.png$/);const bytes=fs.readFileSync(path.join(__dirname,'../assets/trainers',file)),decoded=imageInfo(bytes);assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),meta.sha256,file);assert.equal(decoded.width,meta.width);assert.equal(decoded.height,meta.height);assert.equal(meta.url,'https://play.pokemonshowdown.com/sprites/trainers/'+file);}
});
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
test('variant fallbacks use the actual decoded dimensions for both sprite sides',async()=>{
 const {spriteAssetKeys}=require('../core/sprite-assets.cjs'),{imageInfo}=require('../core/battle-assets.cjs'),manifest=require('../assets/battle-media/manifest.json');
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'showdown-sprite-dimensions-'));
 try{const assets=new BattleAssets({directory:dir});for(const species of ['kyogre','serperior','pikachu','ogerponwellspring'])for(const side of ['front','back'])for(const gender of ['M','F']){
  const key='sprite/'+species+'/'+side+'/shiny/'+gender,actual=await assets.get(key),meta=spriteAssetKeys(key).map(k=>manifest[k]).find(Boolean),decoded=imageInfo(actual.bytes);
  assert(meta);assert.equal(decoded.width,meta.width,key);assert.equal(decoded.height,meta.height,key);
 }}finally{fs.rmSync(dir,{recursive:true});}
});
test('battle move effects retain generation-specific Chinese text',()=>{
 const data=require('../core/move-descriptions.cjs').moveDescriptions();assert.match(data.gen9.thunderbolt,/麻痹/);assert.match(data.gen9.protect,/保护|攻击|招式/);assert(data.gen1&&data.champions);assert.notEqual(data.gen1.blizzard,data.gen9.blizzard);
});
test('renderer metadata includes existing exact cached variants with the protocol priority',async()=>{
 const manifest=require('../assets/battle-media/manifest.json'),key='sprite/kyogre/front/shiny/F',fixture=manifest['sprite/serperior/front/normal/M'],dir=fs.mkdtempSync(path.join(os.tmpdir(),'showdown-cached-sprite-'));
 try{fs.copyFileSync(path.join(__dirname,'../assets/battle-media',fixture.file),path.join(dir,fixture.file));fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({[key]:fixture,'sprite/absent/front/shiny/F':{...fixture,file:'0'.repeat(64)+'.gif'}}));const assets=new BattleAssets({directory:dir}),meta=assets.metadata(),resolved=await assets.get(key);assert.equal(meta[key].width,resolved.width);assert.equal(meta[key].height,resolved.height);assert(!meta['sprite/absent/front/shiny/F']);assert.equal(meta['sprite/kyogre/front/normal/M'].width,manifest['sprite/kyogre/front/normal/M'].width);}finally{fs.rmSync(dir,{recursive:true});}
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
