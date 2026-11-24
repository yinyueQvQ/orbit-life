import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {randomBytes} from 'node:crypto';
import {accountSchema,nodeStore} from '../server/store.mjs';import {createAccountAPI} from '../server/accounts.mjs';import {keyVault} from '../server/key-vault.mjs';import {mediaAPI,validateImage,exportMedia} from '../server/media.mjs';import {applyChange,newState} from '../shared/domain.mjs';
const image={id:'test-image-private-1234',dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aRP8AAAAASUVORK5CYII=',width:1,height:1};
test('private images are scoped by owner, cannot overwrite existing images, and reject active/oversized content',async()=>{const db=new DatabaseSync(':memory:');db.exec(accountSchema);const store=nodeStore(db);try{assert.equal((await mediaAPI(store,'first','/api/media','POST',image)).status,200);assert.equal((await mediaAPI(store,'other','/api/media/'+image.id,'GET',{})).status,404);assert.equal((await mediaAPI(store,'first','/api/media/'+image.id,'GET',{})).data.dataUrl,image.dataUrl);assert.throws(()=>validateImage({...image,dataUrl:'data:image/svg+xml;base64,PHN2Zy8+'}));assert.throws(()=>validateImage({...image,width:9000}));const state=applyChange(newState(),{action:'journal',date:'2026-10-29',kind:'随记',title:'照片',content:'',tags:[],images:[image.id]},'2026-10-29');assert.deepEqual(state.journal[0].images,[image.id]);assert.throws(()=>applyChange(newState(),{action:'journal',date:'2026-10-29',kind:'随记',content:'',tags:[],images:[]},'2026-10-29'));}finally{db.close()}});
test('account AI keys are encrypted at rest and never returned in account data',async()=>{const db=new DatabaseSync(':memory:');db.exec(accountSchema);const store=nodeStore(db),vault=keyVault(store,randomBytes(32).toString('base64')),api=createAccountAPI({store,vault,complete:async()=>{}});const req=async(path,body,token)=>{const response=await api(new Request('https://orbit.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Orbit-Client':'native',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined}));return {status:response.status,data:await response.json()}};try{const user=await req('/api/auth/register',{username:'vault_user',password:'strong-qa-test-password'});const token=user.data.token,key='example-provider-key-for-unit-test';assert.equal((await req('/api/account/ai',{key},token)).status,200);const stored=db.prepare('SELECT value FROM orbit_ai_secrets').get().value;assert(!stored.includes(key));assert.equal(await vault.get(user.data.user.id),key);assert.equal((await req('/api/account/ai',null,token)).data.configured,true);assert(!JSON.stringify((await req('/api/account/export',null,token)).data).includes(key));assert.equal((await req('/api/life',{action:'journal',date:'2026-10-29',kind:'观察',content:'wrong owner photo',tags:[],images:[image.id]},token)).status,400);}finally{db.close()}});

test('music is private, survives backup from both record types and may be removed',async()=>{
 const db=new DatabaseSync(':memory:');
 db.exec(accountSchema);
 const store=nodeStore(db);
 const id='test-audio-0001';
 const dataUrl='data:audio/wav;base64,'+Buffer.from('RIFF0000WAVE').toString('base64');
 try{
  await mediaAPI(store,'owner','/api/media','POST',{id,dataUrl});
  assert.equal((await mediaAPI(store,'other','/api/media/'+id,'GET')).status,404);
  const audio={id,name:'memory.wav'};
  let state=applyChange(newState(),{action:'memo',content:'',audio});
  state=applyChange(state,{action:'journal',date:'2026-10-29',kind:'随记',content:'',audio});
  assert.deepEqual((await exportMedia(store,'owner',state)).map(({id})=>id),[id]);
  state=applyChange(state,{action:'updateMemo',id:state.memos[0].id,content:'记忆',audio:null});
  assert.equal(state.memos[0].audio,null);
  assert.equal((await exportMedia(store,'owner',state)).length,1);
  state=applyChange(state,{action:'deleteJournal',id:state.journal[0].id});
  assert.equal((await exportMedia(store,'owner',state)).length,0);
 }finally{db.close()}
});
