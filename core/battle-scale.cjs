'use strict';
function spriteDimensions({width,height,heightm=1.5,front=true,gen=9,doubles=false,slot=0,dynamax=false}){
 const w=Math.max(1,width),h=Math.max(1,height),near=!front;
 const shape=Math.min(1.22,Math.max(.95,Math.pow(w/h,.12)));
 const stature=Math.max(.72,Math.min(1.85,Math.sqrt((heightm||1.5)/1.6)*shape));
 const perspective=near?(gen===5?2:1.5):1;
 const depth=doubles?(near?(slot===0?.91:1):(slot===1?.94:1)):1;
 const size=depth*(near?(doubles?136:150):(doubles?88:100))*stature*(dynamax?1.6:1),fit=size/Math.max(w,h)/perspective;
 const renderedHeight=Math.round(h*fit),ground=near?326:224,center=near?245:135;
 return{w:Math.max(1,Math.round(w*fit)),h:Math.max(1,renderedHeight),y:(ground-center)/perspective-renderedHeight/2};
}
module.exports={spriteDimensions};
