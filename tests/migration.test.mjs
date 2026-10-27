import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {newState,applyChange} from '../shared/domain.mjs';
import {mergeLocalData} from '../shared/migration.mjs';
import {accountSchema,nodeStore} from '../server/store.mjs';
import {createAccountAPI} from '../server/accounts.mjs';
function localData(){let s=applyChange(newState(),{action:'habit',name:'本机阅读',goal:'十分钟',icon:'📖',category:'学习'});s=applyChange(s,{action:'check',id:s.habits[0].id,date:'2026-10-01',done:true});s=applyChange(s,{action:'focus',minutes:75,sessionId:'local-focus',label:'读书'});return s;}
test('migration preserves cloud edits and local originals, and repeated copies add nothing',()=>{
 const local=localData(),original=structuredClone(local);const cloud=mergeLocalData(newState(),local).state;
 cloud.habits[0].name='云端已编辑';cloud.profile.budget=9999;
 const result=mergeLocalData(cloud,local);assert.equal(result.state.habits[0].name,'云端已编辑');assert.equal(result.state.profile.budget,9999);assert.equal(result.state.checks.length,1);assert.equal(result.state.profile.focus,75);assert.deepEqual(Object.values(result.added),[0,0,0,0,0,0]);assert.deepEqual(local,original);
 result.state.habits[0].name='后来改动';assert.equal(local.habits[0].name,'本机阅读');
});
test('register and login do not migrate data; explicit authenticated migration requires current revision',async()=>{
 const db=new DatabaseSync(':memory:');db.exec(accountSchema);const api=createAccountAPI({store:nodeStore(db),complete:async()=>{}});
 const request=async(path,body,token)=>{const r=await api(new Request('https://orbit.test'+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json','X-Orbit-Client':'native',...(token?{Authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined}));return {status:r.status,data:await r.json()};};
 try{const registered=await request('/api/auth/register',{username:'migrate_user',password:'migration-test-password'}),token=registered.data.token;const local=localData();assert.equal((await request('/api/life',null,token)).data.habits.length,0);assert.equal((await request('/api/account/migrate',{state:local,revision:0})).status,401);const migrated=await request('/api/account/migrate',{state:local,revision:0},token);assert.equal(migrated.status,200);assert.equal(migrated.data.added.habits,1);assert.equal((await request('/api/account/migrate',{state:local,revision:0},token)).status,409);assert.equal((await request('/api/account/migrate',{state:local,revision:1},token)).data.added.habits,0);assert.equal(local.habits.length,1);}finally{db.close()}
});
