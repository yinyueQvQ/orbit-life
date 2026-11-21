import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createNoteToggleQueue} from '../client/note-toggle.mjs';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){
 const writes=[],errors=[],changes=[];let settled=0;
 const queue=createNoteToggleQueue({write:(id,done)=>new Promise((resolve,reject)=>writes.push({id,done,resolve,reject})),change:(id,done)=>changes.push({id,done}),error:e=>errors.push(e.message),settled:()=>settled++});
 return {queue,writes,errors,changes,get settled(){return settled;}};
}
test('a second tap cancels immediately and is saved after the first write',async()=>{
 const h=setup(),note={id:'a',done:false};
 h.queue.toggle(note);h.queue.toggle(note);
 assert.deepEqual(h.changes.map(x=>x.done),[true,false]);
 assert.equal(h.writes.length,1);
 assert.equal(h.queue.overlay([{...note,done:true}])[0].done,false);
 h.writes[0].resolve();await tick();
 assert.equal(h.writes[1].done,false);
 h.writes[1].resolve();await tick();assert.equal(h.settled,1);
});
test('rapid taps keep the latest intent without redundant writes',async()=>{
 const h=setup(),note={id:'a',done:false};
 h.queue.toggle(note);h.queue.toggle(note);h.queue.toggle(note);
 h.writes[0].resolve();await tick();
 assert.equal(h.writes.length,1);assert.equal(h.changes.at(-1).done,true);
});
test('failure restores the last saved state and permits retry',async()=>{
 const h=setup();h.queue.toggle({id:'a',done:false});h.queue.toggle({id:'a',done:true});
 h.writes[0].resolve();await tick();h.writes[1].reject(Error('offline'));await tick();
 assert.equal(h.changes.at(-1).done,true);assert.deepEqual(h.errors,['offline']);
 h.queue.toggle({id:'a',done:true});assert.equal(h.writes[2].done,false);
 h.writes[2].resolve();await tick();
});
test('independent notes retain their pending states during refresh',async()=>{
 const h=setup();h.queue.toggle({id:'a',done:false});h.queue.toggle({id:'b',done:true});
 assert.deepEqual(h.queue.overlay([{id:'a',done:false},{id:'b',done:true}]).map(x=>x.done),[true,false]);
 h.writes[0].resolve();h.writes[1].resolve();await tick();assert.equal(h.settled,2);
});
