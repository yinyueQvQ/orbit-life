import {mediaAPI,assertOwnedMedia,mediaReferences,exportMedia} from './media.mjs';
import {hashPassword,verifyPassword,randomToken,digest} from './passwords.mjs';
import {newState,normalizeState,publicState,applyChange,validateBackup} from '../shared/domain.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
import {mergeLocalData} from '../shared/migration.mjs';
const COOKIE='orbit_session';
const json=(status,data,headers={})=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const cleanUser=u=>({id:u.id,username:u.username,displayName:u.display_name});
const username=v=>typeof v==='string'&&/^[a-zA-Z0-9_.-]{3,32}$/.test(v)?v.toLowerCase():null;
export function createAccountAPI({store,complete,vault=null}){
 async function limit(bucket,max,windowMs){const now=Date.now();const attempts=await store.incrementLimit(bucket,now+windowMs,now);if(attempts>max)throw Object.assign(Error('操作过于频繁，请稍后重试'),{status:429});}
 async function identity(req){const raw=req.headers.get('authorization')?.replace(/^Bearer /,'')||req.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);if(!raw)return null;const session=await store.get('SELECT u.*,s.token_hash FROM orbit_sessions s JOIN orbit_users u ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?',digest(raw),Date.now());return session;}
 const cookie=(token,req)=>`${COOKIE}=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=${token?2592000:0}${new URL(req.url).protocol==='https:'?'; Secure':''}`;
 async function issue(u,req,extra={}){const token=randomToken();await store.run('INSERT INTO orbit_sessions VALUES (?,?,?)',digest(token),u.id,Date.now()+30*86400000);const native=req.headers.get('x-orbit-client')==='native';return json(200,{user:cleanUser(u),mode:'cloud',...(native?{token}:{}),...extra},{'Set-Cookie':cookie(token,req)});}
 async function row(uid){let r=await store.get('SELECT * FROM orbit_workspaces WHERE user_id=?',uid);if(!r){await store.initializeWorkspace(uid,JSON.stringify(newState()),Date.now());r=await store.get('SELECT * FROM orbit_workspaces WHERE user_id=?',uid);}return r;}
 async function commit(uid,r,state){
  await store.withWorkspace(uid,async locked=>{
   const references=mediaReferences(state);
   await assertOwnedMedia(locked,uid,references);
   const changed=await locked.run('UPDATE orbit_workspaces SET value=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?',JSON.stringify(state),Date.now(),uid,r.revision);
   if(!changed.changes)throw Object.assign(Error('其他设备刚更新了数据，请刷新后确认再操作'),{status:409});
   const used=new Set(references);
   for(const id of mediaReferences(JSON.parse(r.value)))if(!used.has(id))await locked.run('DELETE FROM orbit_media WHERE owner=? AND id=?',uid,id);
  });
 }
 return async(req)=>{
 const path=new URL(req.url).pathname,method=req.method;const origin=req.headers.get('origin');
 if(method!=='GET'&&origin&&origin!==new URL(req.url).origin)return json(403,{error:'无效请求来源'});
 let b={};try{
 if(method==='POST'){const raw=await req.text();if(raw.length>2200000)return json(413,{error:'请求内容过大'});try{b=JSON.parse(raw||'{}')}catch{return json(400,{error:'请求格式无效'})}if(!b||typeof b!=='object'||Array.isArray(b))return json(400,{error:'请求格式无效'});}
 const user=await identity(req);const ip=digest(req.headers.get('cf-connecting-ip')||req.headers.get('x-orbit-peer')||'local').slice(0,24);
 if(path==='/api/auth/me'&&method==='GET')return json(200,{user:user?cleanUser(user):null,mode:'cloud'});
 if(path==='/api/auth/register'&&method==='POST'){
 await limit('register:'+ip,6,3600000);const name=username(b.username);if(!name)return json(400,{error:'账号须为3到32位字母、数字、点、横线或下划线'});if(await store.get('SELECT id FROM orbit_users WHERE username=?',name))return json(409,{error:'这个账号已经被使用'});
 const password=await hashPassword(b.password),recovery=randomToken(),u={id:crypto.randomUUID(),username:name,display_name:typeof b.displayName==='string'&&b.displayName.trim()?b.displayName.trim().slice(0,32):name};
 await store.run('INSERT INTO orbit_users VALUES (?,?,?,?,?,?)',u.id,u.username,u.display_name,password,digest(recovery),Date.now());await row(u.id);return issue(u,req,{recoveryCode:recovery});
 }
 if(path==='/api/auth/login'&&method==='POST'){
 await limit('login:'+ip,20,900000);const name=username(b.username);if(name)await limit('login-user:'+name,12,900000);const u=name?await store.get('SELECT * FROM orbit_users WHERE username=?',name):null;
 if(!u||!await verifyPassword(b.password,u.password_hash))return json(401,{error:'账号或密码不正确'});return issue(u,req);
 }
 if(path==='/api/auth/recover'&&method==='POST'){
 await limit('recover:'+ip,5,3600000);const name=username(b.username),u=name?await store.get('SELECT * FROM orbit_users WHERE username=?',name):null;if(!u||typeof b.recoveryCode!=='string'||digest(b.recoveryCode)!==u.recovery_hash)return json(400,{error:'账号或恢复码不正确'});const hash=await hashPassword(b.password),recovery=randomToken();await store.run('UPDATE orbit_users SET password_hash=?,recovery_hash=? WHERE id=?',hash,digest(recovery),u.id);await store.run('DELETE FROM orbit_sessions WHERE user_id=?',u.id);return issue(u,req,{recoveryCode:recovery});
 }
 if(!user)return json(401,{error:'请先登录你的星轨账号',code:'LOGIN_REQUIRED'});
 if(path==='/api/auth/logout'&&method==='POST'){await store.run('DELETE FROM orbit_sessions WHERE token_hash=?',user.token_hash);return json(200,{ok:true},{'Set-Cookie':cookie('',req)});}
 if(path==='/api/auth/password'&&method==='POST'){if(!await verifyPassword(b.currentPassword,user.password_hash))return json(400,{error:'当前密码不正确'});const hash=await hashPassword(b.password);await store.run('UPDATE orbit_users SET password_hash=? WHERE id=?',hash,user.id);await store.run('DELETE FROM orbit_sessions WHERE user_id=?',user.id);return issue(user,req);}
 if(path==='/api/account/ai'&&vault){if(method==='GET')return json(200,{configured:Boolean(await vault.get(user.id))});if(method==='DELETE'){await vault.clear(user.id);return json(200,{ok:true})}if(method==='POST'){if(typeof b.key!=='string'||b.key.trim().length<12||b.key.length>512)return json(400,{error:'请检查DeepSeek密钥'});await vault.set(user.id,b.key.trim());return json(200,{ok:true,configured:true})}}
 if(path==='/api/media'||path.startsWith('/api/media/')){const media=method==='GET'?await mediaAPI(store,user.id,path,method,b):await store.withWorkspace(user.id,locked=>mediaAPI(locked,user.id,path,method,b));return json(media.status,media.data);}
 const r=await row(user.id),state=normalizeState(JSON.parse(r.value));
 if(path==='/api/account/state'&&method==='GET')return json(200,{state,revision:r.revision,updatedAt:r.updated_at});
 if(path==='/api/account/export'&&method==='GET')return json(200,{state:{...state,_media:await exportMedia(store,user.id,state)},revision:r.revision,updatedAt:r.updated_at});
 if(path==='/api/account/migrate'&&method==='POST'){
 if(b.revision!==r.revision)return json(409,{error:'云端记录已更新，请重新预览迁移'});
 const result=mergeLocalData(state,b.state);await assertOwnedMedia(store,user.id,mediaReferences(result.state));await commit(user.id,r,result.state);return json(200,{ok:true,added:result.added});
 }
 if(path==='/api/account/import'&&method==='POST'){if(b.revision!==r.revision)return json(409,{error:'数据已变化，请重新确认导入'});const next=validateBackup(normalizeState(b.state));delete next._media;await assertOwnedMedia(store,user.id,mediaReferences(next));await commit(user.id,r,next);return json(200,{ok:true});}
 if(path==='/api/life'&&method==='GET')return json(200,{...publicState(state),revision:r.revision,updatedAt:r.updated_at});
 if(path==='/api/life'&&method==='POST'){
 if(b._requestId&&state._applied?.includes(b._requestId))return json(200,{ok:true,replayed:true,revision:r.revision});
 if(b._revision!==undefined&&b._revision!==r.revision)return json(409,{error:'其他设备已更新记录，请刷新后重试'});
 const next=applyChange(state,b);if(b.images)await assertOwnedMedia(store,user.id,b.images);if(typeof b._requestId==='string'&&b._requestId.length<=120)next._applied=[...(state._applied||[]),b._requestId].slice(-1000);await commit(user.id,r,next);return json(200,{ok:true,revision:r.revision+1});
 }
 if(path==='/api/chat'||path==='/api/chat/actions'||path==='/api/plans/draft'||path==='/api/journal/reflect'){
 if(method==='POST'&&(path==='/api/chat'||path==='/api/plans/draft'))await limit('chat:'+user.id,20,60000);
 const key=req.headers.get('x-orbit-ai-key')||(vault?await vault.get(user.id):null);const handler=createWorkspace({load:()=>state,save:s=>commit(user.id,r,s),configured:()=>Boolean(key),complete:body=>complete(body,key)});const result=await handler(path,method,b);return json(result.status,result.data);
 }
 return json(404,{error:'接口不存在'});
 }catch(e){if(e.code==='ER_DUP_ENTRY')return json(409,{error:'记录已存在，请刷新后重试'});if(e.sqlState||e.fatal)return json(503,{error:'数据库操作失败，请重试'});return json(e.status||400,{error:e.message?.includes('UNIQUE')?'账号已经被使用':e.message?.includes('SQLITE')?'数据库操作失败，请重试':e.message||'操作失败'});}
 };
}
export async function callDeepSeek(body,key){if(!key)throw Error('请先在本机配置 DeepSeek 密钥');try{const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(120000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(({401:'密钥无效，请重新配置',402:'DeepSeek余额不足',429:'AI请求繁忙，请稍后重试'})[r.status]||'AI服务暂时不可用');return await r.json();}catch(e){if(e.name==='TimeoutError'||e.name==='TypeError')throw Error('AI网络连接失败或超时');throw e;}}
