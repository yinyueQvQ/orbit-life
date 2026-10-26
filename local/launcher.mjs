import {spawn} from 'node:child_process';
import {writeFileSync,readFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const address='http://127.0.0.1:4318';
const pidFile=path.join(root,'local/.server.pid');
async function health(){try{const r=await fetch(address+'/api/local-health',{signal:AbortSignal.timeout(1000)});return await r.json();}catch{return null;}}
let current=await health();
if(process.argv.includes('--stop')){
 if(current?.app==='orbit-local'&&existsSync(pidFile)&&Number(readFileSync(pidFile,'utf8'))===current.pid){process.kill(current.pid);console.log('星轨已停止，数据已保留。');}else console.log('未找到由启动器启动的星轨服务。');
}else{
 if(!current){const child=spawn(process.execPath,[path.join(root,'local/server.mjs')],{cwd:root,detached:true,windowsHide:true,stdio:'ignore'});child.unref();writeFileSync(pidFile,String(child.pid));
 for(let i=0;i<40;i++){await new Promise(r=>setTimeout(r,250));current=await health();if(current?.app==='orbit-local')break;}}
 if(current?.app!=='orbit-local')throw Error('启动失败，请运行 node local/server.mjs 查看错误。');
 spawn('rundll32.exe',['url.dll,FileProtocolHandler',address],{detached:true,windowsHide:true,stdio:'ignore'}).unref();
 console.log('星轨已启动：'+address);
}
