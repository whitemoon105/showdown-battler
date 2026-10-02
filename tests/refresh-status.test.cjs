'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
test('unanswered refresh expires, cannot overwrite edits later, and enables manual retry',async()=>{
 let expire,resolveLate;const status={setAttribute(k,v){this[k]=v;}},button={};
 const S={format:'gen9ou',page:'teams',draft:'',teamEditorData:{catalog:{recommendationMonth:'2026-08'}}};
 const context={window:{addEventListener(){}},document:{addEventListener(){},querySelector:q=>q==='#team-data-source'?status:q==='[data-action=team-resource-retry]'?button:null},setTimeout:fn=>{expire=fn;return 1;},clearTimeout(){},console};
 vm.runInNewContext(fs.readFileSync(require.resolve('../ui/team-editor.js'),'utf8'),context);
 const job=context.window.DfyTeamEditor.refresh(S,()=>new Promise(r=>resolveLate=r),()=>assert.fail('must not replace editor after timeout'),()=>{});
 assert.equal(status['aria-busy'],'true');assert.equal(button.disabled,true);expire();await job;
 assert.equal(status['aria-busy'],'false');assert.equal(button.disabled,false);assert.match(status.textContent,/已保留本地数据/);
 resolveLate({catalog:{recommendationMonth:'2099-01'}});await Promise.resolve();assert.equal(S.teamEditorData.catalog.recommendationMonth,'2026-08');
 S.forceRefresh=true;await context.window.DfyTeamEditor.refresh(S,async()=>({catalog:{recommendationMonth:'2026-09'}}),()=>{},()=>{});
 assert.equal(S.teamEditorData.catalog.recommendationMonth,'2026-09');assert.equal(status['aria-busy'],'false');
});
