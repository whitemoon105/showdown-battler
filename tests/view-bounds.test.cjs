const test=require('node:test'),assert=require('node:assert/strict');
const {viewBounds}=require('../core/view-bounds.cjs'),{battleCamera}=require('../core/battle-scale.cjs');
test('embedded battle bounds use host zoom exactly once and stay inside the native content',()=>{
 const css={x:20,y:120,width:660,height:300},content={width:1060,height:680};
 assert.deepEqual(viewBounds(css,content,1.5),{x:30,y:180,width:990,height:450});
 assert.deepEqual(viewBounds(css,content,1.25),{x:25,y:150,width:825,height:375});
 assert.deepEqual(viewBounds(css,{width:800,height:600},1.5),{x:30,y:180,width:770,height:420});
 assert.deepEqual(css,{x:20,y:120,width:660,height:300});
});
test('narrow arena camera preserves uniform scale while fitting between horizontal HUD rows',()=>{
 const bounds=[{x:100,y:120,w:180,h:210},{x:380,y:150,w:220,h:110}];
 for(const width of [300,480,680])for(const height of [400,550,1000]){
  const c=battleCamera({width,height,bounds,leftInset:16,rightInset:16,topInset:85,bottomInset:110,centered:true,doubles:true});
  for(const b of bounds){assert(b.x*c.scale+c.left>=16);assert((b.x+b.w)*c.scale+c.left<=width-16);assert(b.y*c.scale+c.top>=85);assert((b.y+b.h)*c.scale+c.top<=height-110);}
 }
});
