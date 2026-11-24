import test from 'node:test';
import assert from 'node:assert/strict';
import {newState,applyChange,publicState} from '../shared/domain.mjs';
import {aiPlan,localPlan,validatePlan} from '../shared/plans.mjs';
import {dueReminders} from '../shared/reminders.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
const input={title:'课程安排',start:'2026-10-28',end:'2026-10-30',filename:'课程.pdf',pages:[{page:1,text:'第一章阅读并整理笔记。第二章完成练习和复习。'}]};
test('PDF plans require explicit atomic confirmation and deduplicate retry; deletion retains goals and focus history',()=>{
 const plan=localPlan(input),original=newState();const state=applyChange(original,{action:'plan',plan,planId:'document-1',createGoal:true});assert.equal(original.notes.length,0);assert.equal(state.goals.length,1);assert.equal(state.notes.length,2);assert.equal(state.notes[0].goalId,state.goals[0].id);assert.equal(state.notes[0].sourcePages[0],1);assert.equal(applyChange(state,{action:'plan',plan,planId:'document-1',createGoal:true}).notes.length,2);
 const focused=applyChange(state,{action:'focus',minutes:30,noteId:state.notes[0].id,label:state.notes[0].title});assert.equal(focused.focusSessions[0].noteId,state.notes[0].id);const deleted=applyChange(focused,{action:'deletePlan',id:'document-1'});assert.equal(deleted.notes.length,0);assert.equal(deleted.goals.length,1);assert.equal(deleted.focusSessions.length,1);assert.equal(deleted.focusSessions[0].noteId,'');
 assert.throws(()=>validatePlan({...plan,tasks:[{...plan.tasks[0],date:'2026-11-15'}]}),/超出/);assert.throws(()=>applyChange(original,{action:'plan',plan:{...plan,tasks:[...plan.tasks,{title:'bad'}]},planId:'invalid',createGoal:true}));assert.equal(original.goals.length,0);
});
test('AI draft does not write workspace; malformed response and nonexistent source pages are rejected',async()=>{
 let state=newState(),writes=0;const workspace=createWorkspace({load:()=>state,save:s=>{writes++;state=s},configured:()=>true,complete:async()=>({choices:[{message:{content:JSON.stringify({summary:'建议安排',tasks:[{title:'阅读第一章',content:'整理要点',date:'2026-10-28',minutes:40,pages:[1]}]})}}]})});const response=await workspace('/api/plans/draft','POST',input);assert.equal(response.status,200);assert.equal(response.data.draft.tasks[0].minutes,40);assert.equal(writes,0);assert.equal(state.notes.length,0);
 await assert.rejects(()=>aiPlan(async()=>({choices:[{message:{content:'not json'}}]}),input),/有效计划/);await assert.rejects(()=>aiPlan(async()=>({choices:[{message:{content:JSON.stringify({tasks:[{title:'伪造页码',date:'2026-10-28',minutes:10,pages:[99]}]})}}]}),input),/不存在/);
});
test('reminders use Beijing time and remove completed/deleted tasks while respecting changed dates',()=>{
 let state=applyChange(newState(),{action:'plan',plan:localPlan(input),planId:'remind-plan'});const item=dueReminders(state,9)[0];assert.equal(item.at,Date.parse('2026-10-28T01:00:00Z'));const id=state.notes[0].id;state=applyChange(state,{action:'updateNote',id,due:'2026-10-30'});assert.equal(dueReminders(state,9).find(r=>r.recordId===id).date,'2026-10-30');state=applyChange(state,{action:'updateNote',id,done:true});assert(!dueReminders(state).some(r=>r.recordId===id));state=applyChange(state,{action:'deletePlan',id:'remind-plan'});assert.equal(dueReminders(state).length,0);assert.deepEqual(publicState({profile:{},notes:[]}).documentPlans,[]);
});

test('PDF planning passes the instruction and retries a draft exceeding the daily budget',async()=>{
 const input={title:'练习',filename:'练习.pdf',start:'2026-10-28',end:'2026-10-29',dailyMinutes:30,instruction:'关联英语目标，每天一项练习',pages:[{page:3,text:'先阅读整节课，再选择一个示例动手完成，最后回顾并记录重点。'}]};
 let calls=0;
 const result=await aiPlan(async({messages})=>{
  assert.equal(JSON.parse(messages[1].content).instruction,input.instruction);
  calls++;
  return {choices:[{message:{content:JSON.stringify({summary:'阅读并练习',goalId:'english',tasks:[{title:'读并练习',content:'做一个示例',pages:[3],date:input.start,minutes:calls===1?45:25}]})}}]};
 },input,[{id:'english',title:'英语目标'}]);
 assert.equal(calls,2);
 assert.equal(result.goalId,'english');
 assert.equal(result.tasks[0].minutes,25);
});
