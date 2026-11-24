import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,applyChange,goalSavings,validateBackup} from '../shared/domain.mjs';
test('linked savings recalculate through edits, deletion, backup and goal removal',()=>{
 let s=applyChange(newState(),{action:'goal',title:'旅行',target:10000,saved:1000,financeScope:'linked'});const goalId=s.goals[0].id;
 s=applyChange(s,{action:'transaction',kind:'income',amount:3000,category:'工资',note:'分配到旅行',date:'2026-01-01',goalId});const id=s.transactions[0].id;
 assert.equal(goalSavings(s,s.goals[0]),4000);
 s=applyChange(s,{action:'updateTransaction',id,amount:2000,kind:'expense'});assert.equal(goalSavings(s,s.goals[0]),-1000);
 assert.equal(validateBackup(s).transactions[0].goalId,goalId);
 assert.throws(()=>applyChange(s,{action:'updateTransaction',id,goalId:'missing'}));
 s=applyChange(s,{action:'deleteTransaction',id});assert.equal(goalSavings(s,s.goals[0]),1000);
 s=applyChange(s,{action:'habit',name:'阅读',goal:'20分钟',category:'学习',icon:'书',goalId});
 s=applyChange(s,{action:'journal',date:'2026-01-01',kind:'随记',title:'旅行计划',content:'想去看海',tags:[],goalId});
 s=applyChange(s,{action:'deleteGoal',id:goalId});assert.equal(s.habits[0].goalId,'');assert.equal(s.journal[0].goalId,'');validateBackup(s);
});
test('deleted task detaches history without removing focus time',()=>{let s=applyChange(newState(),{action:'note',title:'行动'});const noteId=s.notes[0].id;s=applyChange(s,{action:'focus',minutes:25,noteId});s=applyChange(s,{action:'deleteNote',id:noteId});assert.equal(s.focusSessions[0].noteId,'');assert.equal(s.profile.focus,25)});

test('finance total follows unassigned transactions and switches scopes without duplicating money',()=>{
 let s=applyChange(newState(),{action:'goal',title:'存钱',target:100000,saved:1000});const id=s.goals[0].id;
 s=applyChange(s,{action:'transaction',kind:'income',amount:5000,category:'工资',note:'',date:'2026-01-01'});const tx=s.transactions[0].id;
 assert.equal(goalSavings(s,s.goals[0]),6000);
 s=applyChange(s,{action:'updateTransaction',id:tx,amount:2000,kind:'expense'});assert.equal(goalSavings(s,s.goals[0]),-1000);
 s=applyChange(s,{action:'updateGoal',id,financeScope:'linked',group:'生活'});assert.equal(goalSavings(s,s.goals[0]),1000);
 s=applyChange(s,{action:'updateTransaction',id:tx,goalId:id});assert.equal(goalSavings(s,s.goals[0]),-1000);
 s=applyChange(s,{action:'deleteTransaction',id:tx});assert.equal(goalSavings(s,s.goals[0]),1000);
 s=applyChange(s,{action:'note',title:'准备',goalId:id,group:'第一阶段'});s=applyChange(s,{action:'updateNote',id:s.notes[0].id,done:true});
 const restored=validateBackup(s);assert.equal(restored.notes[0].group,'第一阶段');assert.equal(restored.goals[0].group,'生活');assert.equal(restored.notes[0].done,true);
 assert.throws(()=>applyChange(s,{action:'updateGoal',id,financeScope:'fake'}));
});
