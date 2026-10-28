import {newState,validateBackup,normalizeState} from '../shared/domain.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
export function installMobile(){
 const native=window.OrbitNative;if(!native)return;
 const waiting=new Map();let next=1,remoteMode=Boolean(native.hasSession?.());
 window.__orbitNativeResult=(id,data)=>{const p=waiting.get(id);if(!p)return;clearTimeout(p.timer);waiting.delete(id);data.error?p.reject(Error(data.error)):p.resolve(data);};
 const bridge=body=>new Promise((resolve,reject)=>{const id=String(next++),timer=setTimeout(()=>{waiting.delete(id);reject(Error('手机服务等待超时，请检查网络'));},['import','importPdf'].includes(body.type)?300000:180000);waiting.set(id,{resolve,reject,timer});native.request(id,JSON.stringify(body));});
 const storageKey='orbit.workspace.v1';
 function guestLoad(){if(native.loadWorkspace){const stored=native.loadWorkspace('guest');if(stored)return normalizeState(JSON.parse(stored));const legacy=localStorage.getItem(storageKey);const state=legacy?normalizeState(JSON.parse(legacy)):newState();native.saveWorkspace('guest',JSON.stringify(state));return state;}return normalizeState(JSON.parse(localStorage.getItem(storageKey)||JSON.stringify(newState())));}
 function guestSave(s){if(native.saveWorkspace){if(native.saveWorkspace('guest',JSON.stringify(s))===false)throw Error('本机保存失败或数据量超出空间限制，请导出备份后再试。');}else localStorage.setItem(storageKey,JSON.stringify(s));}
 guestLoad();
 const workspace=createWorkspace({load:guestLoad,save:guestSave,configured:()=>native.configured(),complete:body=>bridge({type:'complete',body})});
 const original=window.fetch.bind(window);
 const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);if(url.origin!==location.origin||!url.pathname.startsWith('/api/'))return original(input,options);
 const method=options.method||'GET';let body={};try{if(options.body)body=JSON.parse(options.body);}catch{return response(400,{error:'格式无效'})}
 if(url.pathname==='/api/auth/guest'){native.clearSession?.();remoteMode=false;return response(200,{ok:true});}
 if(url.pathname==='/api/guest/export')return response(200,guestLoad());
 if(url.pathname.startsWith('/api/auth/')||remoteMode){
 if(url.pathname==='/api/auth/me'&&!remoteMode)return response(200,{user:null});
 const result=await bridge({type:'remote',path:url.pathname,method,body});
 if(result.status<300&&result.data?.user)remoteMode=true;if(url.pathname==='/api/auth/logout'&&result.status<300)remoteMode=false;
 return response(result.status,result.data);
 }
 const result=await workspace(url.pathname,method,body);return response(result.status,result.data);
 };
 const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){original(this.href).then(r=>r.text()).then(content=>native.saveDocument(this.download,content));return;}click.call(this)};
 window.OrbitMobile={pickPdf:()=>bridge({type:'importPdf'}),backup:()=>native.saveDocument('orbit-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(guestLoad())),restore:async()=>{const answer=await bridge({type:'import'}),s=validateBackup(normalizeState(JSON.parse(answer.content)));if(JSON.stringify(s).length>2000000)throw Error('备份太大');guestSave(s);window.dispatchEvent(new Event('orbit:changed'));}};
}
