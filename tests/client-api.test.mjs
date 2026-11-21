import {test} from 'node:test';
import assert from 'node:assert/strict';

globalThis.location={href:'https://orbit.test/',origin:'https://orbit.test'};
globalThis.CustomEvent=class extends Event{constructor(type,options){super(type);this.detail=options.detail}};

test('client merges reads and submits consecutive writes with the latest revision',async()=>{
 const calls=[];let revision=1;
 globalThis.window={dispatchEvent(){},fetch:async(input,options={})=>{
  calls.push({input,options});await new Promise(r=>setTimeout(r,5));
  if(options.method==='POST'&&input==='/api/life'){assert.equal(JSON.parse(options.body)._revision,revision);revision++;}
  return Response.json({revision,notes:[]});
 }};
 const {installClient}=await import('../client/api.mjs');installClient();
 const responses=await Promise.all([window.fetch('/api/life'),window.fetch('/api/life')]);
 assert.equal(calls.length,1);assert.deepEqual(await responses[0].json(),await responses[1].json());
 await Promise.all([window.fetch('/api/life',{method:'POST',body:'{"action":"feed"}'}),window.fetch('/api/life',{method:'POST',body:'{"action":"feed"}'})]);
 assert.equal(revision,3);assert.equal(calls.length,3);
 await window.fetch('https://other.test/api/life',{method:'POST',body:'{}'});
 assert.equal(calls.at(-1).options.body,'{}');
});

test('changing sessions isolates pending reads, writes and sync events',async()=>{
 const events=[];
 const posts=[];
 let releaseOldRead;
 let releaseOldWrite;
 const oldRead=new Promise(resolve=>{releaseOldRead=resolve;});
 const oldWrite=new Promise(resolve=>{releaseOldWrite=resolve;});
 let switched=false;
 globalThis.window={
  dispatchEvent(event){events.push(event);},
  async fetch(input,options={}){
   if(options.method==='POST'){
    posts.push(JSON.parse(options.body));
    return switched?Response.json({revision:3}):oldWrite;
   }
   if(input.endsWith('?unavailable'))return Response.json({}, {status:503});
   return switched?Response.json({revision:2}):oldRead;
  }
 };
 const {installClient,clearRevision}=await import('../client/api.mjs?session-isolation');
 installClient();
 const firstWrite=assert.rejects(window.fetch('/api/life',{method:'POST',body:'{}'}),/登录状态已变化/);
 const queuedWrite=assert.rejects(window.fetch('/api/life',{method:'POST',body:'{}'}),/登录状态已变化/);
 const firstRead=assert.rejects(window.fetch('/api/life',{signal:new AbortController().signal}),/登录状态已变化/);
 await Promise.resolve();
 clearRevision();
 switched=true;
 assert.equal((await (await window.fetch('/api/life')).json()).revision,2);
 releaseOldRead(Response.json({revision:99}));
 releaseOldWrite(Response.json({}, {status:401}));
 await Promise.all([firstRead,firstWrite,queuedWrite]);
 assert.deepEqual(events.map(event=>event.type),['orbit:sync']);
 await window.fetch('/api/life',{method:'POST',body:'{}'});
 assert.equal(posts.length,2);
 assert.equal(posts[1]._revision,2);
 await window.fetch('/api/life?unavailable');
 assert.equal(events.at(-1).detail.ok,false);
});
