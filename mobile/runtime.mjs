import {newState,validateBackup} from '../shared/domain.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
export function installMobile(){
 const native=window.OrbitNative;if(!native)return;
 const waiting=new Map();let next=1;
 window.__orbitNativeResult=(id,data)=>{const p=waiting.get(id);if(!p)return;clearTimeout(p.timer);waiting.delete(id);data.error?p.reject(Error(data.error)):p.resolve(data);};
 const bridge=body=>new Promise((resolve,reject)=>{const id=String(next++);const timer=setTimeout(()=>{waiting.delete(id);reject(Error('手机服务等待超时'));},60000);waiting.set(id,{resolve,reject,timer});native.request(id,JSON.stringify(body));});
 const storageKey='orbit.workspace.v1';
 if(!localStorage.getItem(storageKey))localStorage.setItem(storageKey,JSON.stringify(newState()));
 const workspace=createWorkspace({load:()=>JSON.parse(localStorage.getItem(storageKey)),save:s=>localStorage.setItem(storageKey,JSON.stringify(s)),configured:()=>native.configured(),complete:body=>bridge({type:'complete',body})});
 const original=window.fetch.bind(window);
 window.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin===location.origin&&url.pathname.startsWith('/api/')){let body={};try{if(options.body)body=JSON.parse(options.body);}catch{return new Response(JSON.stringify({error:'格式无效'}),{status:400});}const result=await workspace(url.pathname,options.method||'GET',body);return new Response(JSON.stringify(result.data),{status:result.status,headers:{'Content-Type':'application/json'}});}return original(input,options);};
 const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){original(this.href).then(r=>r.text()).then(content=>native.saveDocument(this.download,content));return;}click.call(this)};
 window.OrbitMobile={backup:()=>native.saveDocument('orbit-backup-'+new Date().toISOString().slice(0,10)+'.json',localStorage.getItem(storageKey)),restore:async()=>{const answer=await bridge({type:'import'});const s=validateBackup(JSON.parse(answer.content));if(JSON.stringify(s).length>2000000)throw Error('备份太大');s.pending=[];localStorage.setItem(storageKey,JSON.stringify(s));window.dispatchEvent(new Event('orbit:changed'));window.dispatchEvent(new Event('orbit:configured'));location.reload();}};
}
