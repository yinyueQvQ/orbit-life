import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toggleClock} from '../client/focus-clock.mjs';
const clock={id:'one',phase:'focus',duration:60,remaining:60,deadline:0,running:false,label:'Read',noteId:'task',pending:false,synced:false};
test('pause and resume preserve session identity and actual remaining time',()=>{
 const started=toggleClock(clock,1000);
 const paused=toggleClock(started,11500);
 assert.equal(paused.remaining,50);assert.equal(paused.running,false);
 const resumed=toggleClock(paused,20000);
 assert.equal(resumed.deadline,70000);assert.equal(resumed.id,'one');assert.equal(resumed.noteId,'task');
});
test('restarting a completed break keeps break phase and generates a new session',()=>{
 const next=toggleClock({...clock,phase:'break',remaining:0,synced:true},1000);
 assert.equal(next.phase,'break');assert.notEqual(next.id,'one');assert.equal(next.remaining,60);assert.equal(next.deadline,61000);assert.equal(next.synced,false);
});
test('pending completion cannot be restarted and expired pause never becomes negative',()=>{
 const pending={...clock,pending:true};assert.equal(toggleClock(pending),pending);
 assert.equal(toggleClock({...clock,running:true,deadline:10},1000).remaining,0);
});
