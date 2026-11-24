import {APP_VERSION} from '../shared/config.mjs';
import {ensureApk} from './apk-download.mjs';
import http from 'node:http';import {isIP} from 'node:net';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {bootstrapMysql,mysqlStore,orbitMysqlPool} from '../server/mysql-store.mjs';
import {migrateSqlite} from './migrate-sqlite.mjs';
import {createAccountAPI,callDeepSeek} from '../server/accounts.mjs';import {keyVault} from '../server/key-vault.mjs';
const root=fileURLToPath(new URL('../',import.meta.url)),dataDir=process.env.ORBIT_DATA_DIR||'/data',port=Number(process.env.PORT||8080),origin=process.env.ORBIT_PUBLIC_ORIGIN||('https://'+process.env.RAILWAY_PUBLIC_DOMAIN);
if(!/^https?:\/\//.test(origin))throw Error('请配置 ORBIT_PUBLIC_ORIGIN');if(process.env.RAILWAY_PROJECT_ID&&!process.env.RAILWAY_VOLUME_MOUNT_PATH)throw Error('请先为星轨挂载持久化存储卷');
const pool=orbitMysqlPool(),store=mysqlStore(pool);
const api=createAccountAPI({store,complete:callDeepSeek,vault:keyVault(store,process.env.ORBIT_ENCRYPTION_KEY)});
try {
 await bootstrapMysql(pool,connection=>migrateSqlite(connection,path.join(dataDir,'orbit.sqlite'),process.env.ORBIT_MIGRATE_SQLITE==='1'));
} catch(error) {
 await pool.end();
 throw error;
}
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.wasm':'application/wasm','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.ttf':'font/ttf'};
const security={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; img-src 'self' data: blob:; font-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'"};
const json=(res,status,data)=>{res.writeHead(status,{...security,'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data))};
function peerAddress(req){
 const client=req.headers['x-real-ip'];
 if(process.env.RAILWAY_PROJECT_ID&&typeof client==='string'&&isIP(client))return client;
 return req.socket.remoteAddress||'proxy';
}
async function health(res){
 try{await store.get('SELECT 1');return json(res,200,{ok:true,version:APP_VERSION,storage:'persistent'});}
 catch{return json(res,503,{ok:false,error:'数据库暂时不可用'});}
}
const server=http.createServer(async(req,res)=>{try{const url=new URL(req.url,origin);if(url.origin!==new URL(origin).origin)return json(res,403,{error:'请求来源无效'});if(url.pathname==='/download/android.apk'&&['GET','HEAD'].includes(req.method)){try{const apk=await ensureApk(dataDir);res.writeHead(200,{...security,'Content-Type':'application/vnd.android.package-archive','Content-Length':apk.size,'Content-Disposition':'attachment; filename=Orbit-Life-Android.apk','Cache-Control':'public, max-age=3600'});if(req.method==='HEAD')res.end();else fs.createReadStream(apk.file).pipe(res);}catch(e){json(res,503,{error:e.message})}return;}if(url.pathname==='/api/health')return await health(res);if(url.pathname.startsWith('/api/')){let raw='';for await(const part of req){raw+=part;if(Buffer.byteLength(raw)>8388608)return json(res,413,{error:'请求内容过大'});}const headers={'X-Orbit-Peer':peerAddress(req)};for(const name of ['content-type','cookie','authorization','x-orbit-client','x-orbit-ai-key','origin'])if(req.headers[name])headers[name]=req.headers[name];const response=await api(new Request(url,{method:req.method,headers,body:!['GET','HEAD'].includes(req.method)?raw:undefined}));res.writeHead(response.status,{...security,...Object.fromEntries(response.headers)});res.end(await response.text());return;}if(!['GET','HEAD'].includes(req.method))return json(res,405,{error:'方法不支持'});const base=path.join(root,'dist-local'),file=path.resolve(base,'.'+decodeURIComponent(url.pathname==='/'?'/local.html':url.pathname));if(!file.startsWith(base+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return json(res,404,{error:'文件不存在'});res.writeHead(200,{...security,'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':path.extname(file)==='.html'?'no-cache':'public, max-age=3600'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);}catch{json(res,500,{error:'服务暂时不可用，请稍后重试'})}});
server.listen(port,'0.0.0.0',()=>console.log('Orbit account service ready on port '+port));
const stop=()=>server.close(async()=>{await pool.end()});process.once('SIGTERM',stop);process.once('SIGINT',stop);
