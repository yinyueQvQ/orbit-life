import {createAccountAPI,callDeepSeek} from '../server/accounts.mjs';
import {accountSchema,nodeStore} from '../server/store.mjs';
import {SYNC_URL} from '../shared/config.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
import {newState} from '../shared/domain.mjs';
import {hasKey,readKey} from './credentials.mjs';
import http from 'node:http';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,existsSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=fileURLToPath(new URL('../',import.meta.url));
const dataDir=process.env.ORBIT_DATA_DIR||path.join(root,'data');
mkdirSync(dataDir,{recursive:true});
const db=new DatabaseSync(path.join(dataDir,'orbit.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
db.exec(accountSchema);
db.exec(readFileSync(path.join(root,'drizzle/0000_thin_dakota_north.sql'),'utf8').replaceAll('CREATE TABLE ','CREATE TABLE IF NOT EXISTS '));
const owner='local-owner';
db.prepare('INSERT OR IGNORE INTO profiles (owner) VALUES (?)').run(owner);
const port=Number(process.env.ORBIT_PORT||4318),host='127.0.0.1';
const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
const all=(sql,...p)=>db.prepare(sql).all(...p),run=(sql,...p)=>db.prepare(sql).run(...p);
const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(value));};
const str=(s,max=80)=>typeof s==='string'&&s.trim().length>0&&s.length<=max;

db.exec('CREATE TABLE IF NOT EXISTS local_workspace (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)');
if(!db.prepare('SELECT id FROM local_workspace WHERE id=1').get()){
 const initial=newState();initial.habits=all('SELECT * FROM habits WHERE owner=? ORDER BY created,rowid',owner);initial.checks=all('SELECT * FROM checks WHERE owner=?',owner);initial.transactions=all('SELECT * FROM transactions WHERE owner=? ORDER BY date DESC,rowid DESC',owner);initial.profile=db.prepare('SELECT * FROM profiles WHERE owner=?').get(owner);
 if(db.prepare("SELECT name FROM sqlite_master WHERE name='local_chat'").get())initial.messages=all('SELECT role,content,created FROM local_chat ORDER BY id');
 db.prepare('INSERT INTO local_workspace VALUES (1,?)').run(JSON.stringify(initial));
}
const workspace=createWorkspace({load:()=>JSON.parse(db.prepare('SELECT value FROM local_workspace WHERE id=1').get().value),save:s=>db.prepare('UPDATE local_workspace SET value=? WHERE id=1').run(JSON.stringify(s)),configured:hasKey,complete:async body=>{
 const key=await readKey();if(!key)throw Error('请先配置密钥');
 try{const r=await fetch('https://api.deepseek.com/chat/completions',{method:'POST',redirect:'error',signal:AbortSignal.timeout(45000),headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw Error(({401:'密钥无效，请重新配置',402:'DeepSeek余额不足',429:'请求繁忙，请稍后重试'})[r.status]||'DeepSeek暂时不可用');return await r.json();}catch(e){if(e.name==='TimeoutError'||e.name==='TypeError')throw Error('网络连接失败或超时');throw e;}
}});
async function api(req,res,path){if(req.method!=='GET'&&req.headers.origin!=='http://'+host+':'+port)return json(res,403,{error:'无效来源'});let body={};if(req.method==='POST'){try{let raw='';for await(const c of req){raw+=c;if(raw.length>180000)return json(res,413,{error:'请求过长'});}body=JSON.parse(raw);}catch{return json(res,400,{error:'格式无效'});}}const result=await workspace(path,req.method,body);return json(res,result.status,result.data);}
const accountAPI=createAccountAPI({store:nodeStore(db),complete:callDeepSeek});
const cloud=process.env.ORBIT_SYNC_URL||SYNC_URL;
const readCookie=(req,name)=>req.headers.cookie?.split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
async function accounts(req,res,url){
 try{
 if(req.method!=='GET'&&req.headers.origin!=='http://'+host+':'+port)return json(res,403,{error:'无效请求来源'});
 let raw='';if(req.method==='POST')for await(const part of req){raw+=part;if(raw.length>2200000)return json(res,413,{error:'请求过长'});}
 if(url.pathname==='/api/auth/guest'){res.setHeader('Set-Cookie',['orbit_cloud_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0','orbit_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0']);return json(res,200,{ok:true});}
 let body={};try{body=raw?JSON.parse(raw):{}}catch{return json(res,400,{error:'请求格式无效'})}
 const remoteToken=readCookie(req,'orbit_cloud_session'),useCloud=Boolean(remoteToken)||body.mode==='cloud';
 if(url.pathname==='/api/guest/export')return json(res,200,JSON.parse(db.prepare('SELECT value FROM local_workspace WHERE id=1').get().value));
 if(!useCloud&&!readCookie(req,'orbit_session')&&!url.pathname.startsWith('/api/auth/'))return api({...req,headers:req.headers,method:req.method,[Symbol.asyncIterator]:async function*(){if(raw)yield raw}},res,url.pathname);
 let headers={'Content-Type':'application/json',Origin:new URL(useCloud?cloud:'http://'+host+':'+port).origin};
 let target=new URL(url.pathname,useCloud?cloud:'http://'+host+':'+port);
 if(useCloud){headers['X-Orbit-Client']='native';if(remoteToken)headers.Authorization='Bearer '+remoteToken;}else if(req.headers.cookie)headers.Cookie=req.headers.cookie;
 if((url.pathname.startsWith('/api/chat')||url.pathname==='/api/plans/draft'||url.pathname==='/api/journal/reflect')&&hasKey())headers['X-Orbit-AI-Key']=await readKey();
 let response;if(useCloud){response=await fetch(target,{method:req.method,headers,body:req.method==='POST'?raw:undefined,redirect:'error',signal:AbortSignal.timeout(180000)});}else{response=await accountAPI(new Request(target,{method:req.method,headers,body:req.method==='POST'?raw:undefined}));}
 let data;try{data=await response.json()}catch{return json(res,503,{error:response.status===403?'云端网关拒绝连接（403），尚未验证账号密码。本机数据保留。':'云端返回异常（'+response.status+'），请稍后重试。本机数据保留。'})}
 const cookies=[];if(useCloud&&data.token){cookies.push('orbit_cloud_session='+data.token+'; HttpOnly; Path=/; SameSite=Lax; Max-Age=2592000');cookies.push('orbit_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');delete data.token;}
 if(!useCloud&&response.headers.get('set-cookie')){cookies.push(response.headers.get('set-cookie'));cookies.push('orbit_cloud_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');}
 if(url.pathname==='/api/auth/logout'){cookies.push('orbit_cloud_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');cookies.push('orbit_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');}
 if(data.user)data.mode=useCloud?'cloud':'local';if(cookies.length)res.setHeader('Set-Cookie',cookies);return json(res,response.status,data);
 }catch{return json(res,503,{error:'无法连接账号服务。离线数据不会被清除，请检查网络后重试。'})}
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.wasm':'application/wasm','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{if(req.headers.host!==`${host}:${port}`)return json(res,403,{error:'仅允许本机访问'});const url=new URL(req.url,`http://${host}:${port}`);if(url.pathname==='/api/local-health')return json(res,200,{app:'orbit-local',pid:process.pid});if(url.pathname.startsWith('/api/'))return accounts(req,res,url);if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'不支持此操作'});try{const relative=decodeURIComponent(url.pathname==='/'?'/local.html':url.pathname);const base=path.join(root,'dist-local');const file=path.resolve(base,'.'+relative);if(!file.startsWith(base+path.sep)||!existsSync(file))return json(res,404,{error:'文件不存在'});res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:readFileSync(file));}catch{return json(res,400,{error:'请求无效'});}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'星轨已在运行，打开 http://127.0.0.1:'+port:e.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`星轨本地版已启动：http://${host}:${port}\n数据目录：${dataDir}\n关闭请使用“停止星轨.cmd”。`));
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0)}));
