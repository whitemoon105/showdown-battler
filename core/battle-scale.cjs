'use strict';
function spriteDimensions({width,height,heightm=1.5,front=true,gen=9,doubles=false,slot=0,dynamax=false}){
 const w=Math.max(1,width),h=Math.max(1,height),near=!front;
 const shape=Math.min(1.22,Math.max(.95,Math.pow(w/h,.12)));
 const stature=Math.max(.72,Math.min(1.85,Math.sqrt((heightm||1.5)/1.6)*shape));
 const perspective=near?(gen===5?2:1.5):1;
 const depth=doubles?(near?(slot===0?.91:1):(slot===1?.94:1)):1;
 const base=(near?(doubles?174:186):(doubles?120:136))*stature;
 const size=depth*Math.min(base,doubles?(near?245:225):(near?290:252))*(dynamax?1.6:1),fit=size/Math.max(w,h)/perspective;
 const renderedHeight=Math.round(h*fit),ground=near?326:224,center=near?245:135;
 return{w:Math.max(1,Math.round(w*fit)),h:Math.max(1,renderedHeight),y:(ground-center)/perspective-renderedHeight/2};
}
// The whole scene shares one transform, including platforms and weather. Fit the
// stable silhouettes between the HUD columns; attacks never drive the camera.
function battleCamera({width,height,bounds=[],leftInset=0,rightInset=0,topInset=0,bottomInset=0,centered=false,doubles=false}){
 const valid=bounds.filter(b=>Number.isFinite(b.x+b.y+b.w+b.h)&&b.w>0&&b.h>0);
 const x1=Math.min(doubles?90:140,...valid.map(b=>b.x))-18,x2=Math.max(doubles?590:540,...valid.map(b=>b.x+b.w))+18;
 const y1=Math.min(125,...valid.map(b=>b.y))-28,y2=Math.max(360,...valid.map(b=>b.y+b.h))+8;
 const area=Math.max(1,width-leftInset-rightInset),room=Math.max(1,height-topInset-bottomInset-20),scale=Math.max(.01,Math.min(area/(x2-x1),room/(y2-y1),2.1));
 return {scale,left:leftInset+area/2-(x1+x2)*scale/2,top:centered?topInset+10+(room-(y2-y1)*scale)/2-y1*scale:height-bottomInset-10-y2*scale};
}
module.exports={spriteDimensions,battleCamera};
