'use strict';
// Serialized into the trusted Showdown frame. The shortcut uses the same public
// protocol as its random-battle button and never supplies a constructed team.
function randomBattle(cancel=false){
 const client=window.app;
 if(!client?.user?.get('named'))throw Error('请先登录或在对战大厅设置昵称');
 if(cancel){client.send('/cancelsearch');return{searching:false};}
 if(!window.BattleFormats?.gen9randombattle?.searchShow)throw Error('服务器尚未载入随机对战规则，请稍后重试');
 if(Object.values(client.rooms).some(r=>r.request?.side&&!r.battle?.ended))throw Error('请先完成当前对局');
 const searches=client.rooms['']?.searching||client.searching;
 if(searches?.length||searches&&Object.keys(searches).length)throw Error('已有匹配正在进行');
 client.send('/utm null');client.send('/search gen9randombattle');client.focusRoom('');
 return{searching:true,format:'gen9randombattle'};
}
function replay(record){
 if(!record.lines?.length)throw Error('这条记录没有本地回放');
 const id='battle-gen9ou-local'+record.id.replace(/[^0-9]/g,'');
 if(!app.rooms[id])app.receive('>'+id+'\n|init|battle\n|title|本地回放\n'+record.lines.join('\n'));
 app.focusRoom(id);app.rooms[id].battle.seekTurn(0);app.rooms[id].battle.play();return{opened:true};
}
module.exports={randomBattle,replay};
