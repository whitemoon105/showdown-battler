'use strict';
function viewBounds(bounds,content,zoom=1){
 const z=Number.isFinite(zoom)&&zoom>0?zoom:1;
 const x=Math.max(0,Math.min(content.width-1,Math.round(bounds.x*z))),y=Math.max(0,Math.min(content.height-1,Math.round(bounds.y*z)));
 return{x,y,width:Math.max(1,Math.min(Math.round(bounds.width*z),content.width-x)),height:Math.max(1,Math.min(Math.round(bounds.height*z),content.height-y))};
}
module.exports={viewBounds};
