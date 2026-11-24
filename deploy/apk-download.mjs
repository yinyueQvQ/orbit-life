import fs from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';import {APP_VERSION} from '../shared/config.mjs';
import pinned from './android-release.json' with {type:'json'};
let pending;
export async function ensureApk(dataDir){
 const bundled=new URL('./Orbit-Life-Android.apk',import.meta.url);
 if(pinned.version===APP_VERSION){try{const bytes=await fs.readFile(bundled);if(bytes.length!==pinned.size||createHash('sha256').update(bytes).digest('hex')!==pinned.sha256)throw Error('随服务发布的安装包校验失败');return {file:bundled,size:bytes.length}}catch(error){if(error.code!=='ENOENT')throw error}}
 const dir=path.join(dataDir,'downloads'),file=path.join(dir,'Orbit-Life-Android-'+APP_VERSION+'.apk');
 try{const stat=await fs.stat(file);if(stat.size>1000000)return {file,size:stat.size}}catch{}
 if(!pending)pending=(async()=>{let asset;if(pinned.version===APP_VERSION){asset={size:pinned.size,digest:'sha256:'+pinned.sha256};}else{const metadata=await fetch('https://api.github.com/repos/yinyueQvQ/orbit-life/releases/tags/v'+APP_VERSION,{headers:{Accept:'application/vnd.github+json'},signal:AbortSignal.timeout(20000)});if(!metadata.ok)throw Error('新版安装包正在准备，请稍后重试');const release=await metadata.json();asset=release.assets.find(a=>a.name==='Orbit-Life-Android.apk');}if(!asset||!/^sha256:[a-f0-9]{64}$/.test(asset.digest||'')||asset.size>80000000)throw Error('安装包校验信息尚未就绪');const response=await fetch('https://github.com/yinyueQvQ/orbit-life/releases/download/v'+APP_VERSION+'/Orbit-Life-Android.apk',{signal:AbortSignal.timeout(120000)});if(!response.ok)throw Error('安装包获取失败，请稍后重试');const bytes=Buffer.from(await response.arrayBuffer());if(bytes.length!==asset.size||'sha256:'+createHash('sha256').update(bytes).digest('hex')!==asset.digest)throw Error('安装包校验失败，已停止下载');await fs.mkdir(dir,{recursive:true});await fs.writeFile(file+'.part',bytes);await fs.rename(file+'.part',file);return {file,size:bytes.length};})().finally(()=>{pending=null});
 return pending;
}
