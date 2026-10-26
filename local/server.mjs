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
db.exec('PRAGMA journal_mode=WAL;');
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
async function api(req,res,path){if(req.method!=='GET'&&req.headers.origin!=='http://'+host+':'+port)return json(res,403,{error:'无效来源'});let body={};if(req.method==='POST'){try{let raw='';for await(const c of req){raw+=c;if(raw.length>20000)return json(res,413,{error:'请求过长'});}body=JSON.parse(raw);}catch{return json(res,400,{error:'格式无效'});}}const result=await workspace(path,req.method,body);return json(res,result.status,result.data);}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer(async(req,res)=>{if(req.headers.host!==`${host}:${port}`)return json(res,403,{error:'仅允许本机访问'});const url=new URL(req.url,`http://${host}:${port}`);if(url.pathname==='/api/local-health')return json(res,200,{app:'orbit-local',pid:process.pid});if(['/api/chat','/api/chat/actions','/api/life'].includes(url.pathname))return api(req,res,url.pathname);if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'不支持此操作'});try{const relative=decodeURIComponent(url.pathname==='/'?'/local.html':url.pathname);const base=path.join(root,'dist-local');const file=path.resolve(base,'.'+relative);if(!file.startsWith(base+path.sep)||!existsSync(file))return json(res,404,{error:'文件不存在'});res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:readFileSync(file));}catch{return json(res,400,{error:'请求无效'});}});
server.on('error',e=>{console.error(e.code==='EADDRINUSE'?'星轨已在运行，打开 http://127.0.0.1:'+port:e.message);process.exitCode=1;});
server.listen(port,host,()=>console.log(`星轨本地版已启动：http://${host}:${port}\n数据目录：${dataDir}\n关闭请使用“停止星轨.cmd”。`));
process.on('SIGINT',()=>server.close(()=>{db.close();process.exit(0)}));
