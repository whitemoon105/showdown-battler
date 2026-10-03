'use strict';
// 协议和渲染器共用同一回退顺序。保留理由：缺少异色或性别资源时，画面宽高必须匹配实际返回的图片。
function spriteAssetKeys(key){
 if(!key.startsWith('sprite/'))return[key];
 const [,id,side,tone,gender]=key.split('/');
 return [...new Set([key,'sprite/'+id+'/'+side+'/'+tone+'/M','sprite/'+id+'/'+side+'/normal/'+gender,'sprite/'+id+'/'+side+'/normal/M','sprite/'+id+'/front/normal/'+gender,'sprite/'+id+'/front/normal/M'])];
}
module.exports={spriteAssetKeys};
