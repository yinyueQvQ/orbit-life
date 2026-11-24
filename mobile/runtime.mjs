import {validateMedia,mediaReferences} from '../server/media.mjs';
import {newState,validateBackup,normalizeState} from '../shared/domain.mjs';
import {createWorkspace} from '../shared/workspace.mjs';
export function installMobile(){
 const native=window.OrbitNative;if(!native)return;
 const waiting=new Map();let next=1,remoteMode=Boolean(native.hasSession?.());
 window.__orbitNativeResult=(id,data)=>{const p=waiting.get(id);if(!p)return;clearTimeout(p.timer);waiting.delete(id);data.error?p.reject(Error(data.error)):p.resolve(data);};
 const bridge=body=>new Promise((resolve,reject)=>{const id=String(next++),timer=setTimeout(()=>{waiting.delete(id);reject(Error('手机服务等待超时，请检查网络'));},['import','importPdf','importImage'].includes(body.type)?300000:180000);waiting.set(id,{resolve,reject,timer});native.request(id,JSON.stringify(body));});
 const storageKey='orbit.workspace.v1';
 async function guestLoad(){
  if(native.loadWorkspace){
   const stored=await native.loadWorkspace('guest');
   if(stored)return normalizeState(JSON.parse(stored));
   return normalizeState(JSON.parse(localStorage.getItem(storageKey)||JSON.stringify(newState())));
  }
  return normalizeState(JSON.parse(localStorage.getItem(storageKey)||JSON.stringify(newState())));
 }
 async function guestSave(s){
  const previous=mediaReferences(await guestLoad());
  if(native.saveWorkspace){
   if(await native.saveWorkspace('guest',JSON.stringify(s))===false)throw Error('本机保存失败或数据量超出空间限制，请导出备份后再试。');
  }else localStorage.setItem(storageKey,JSON.stringify(s));
  const used=new Set(mediaReferences(s));
  await Promise.all(previous.filter(id=>!used.has(id)).map(id=>native.deleteGuestImage?.(id)));
 }
 async function guestBackup(){
  const state=await guestLoad();
  const images=await Promise.all(mediaReferences(state).map(id=>native.loadGuestImage(id)));
  return {...state,_media:images.filter(Boolean).map(raw=>JSON.parse(raw))};
 }
 const workspace=createWorkspace({load:guestLoad,save:guestSave,configured:()=>native.configured(),complete:body=>bridge({type:'complete',body})});
 let guestWrites=Promise.resolve();
 function writeGuest(operation){
  const result=guestWrites.then(operation);
  guestWrites=result.then(()=>{},()=>{});
  return result;
 }
 const original=window.fetch.bind(window);
 const appURL=new URL(location.href);
 const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
 window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,appURL);if(url.protocol!==appURL.protocol||url.host!==appURL.host||!url.pathname.startsWith('/api/'))return original(input,options);
 const method=options.method||'GET';let body={};try{if(options.body)body=JSON.parse(options.body);}catch{return response(400,{error:'格式无效'})}
 if(url.pathname==='/api/auth/guest'){await native.clearSession?.();remoteMode=false;return response(200,{ok:true});}
 if(url.pathname==='/api/guest/state')return response(200,await guestLoad());
 if(url.pathname==='/api/guest/export')return response(200,await guestBackup());
 if(url.pathname.startsWith('/api/guest/media/')||(!remoteMode&&url.pathname.startsWith('/api/media'))){try{if(method==='POST'){const image=validateMedia(body);if(!await native.saveGuestImage(JSON.stringify(image)))throw Error('图片保存失败');return response(200,{id:image.id,width:image.width,height:image.height});}const id=url.pathname.split('/').pop();if(method==='DELETE'){if(mediaReferences(await guestLoad()).includes(id))return response(409,{error:'图片仍被使用'});await native.deleteGuestImage(id);return response(200,{ok:true});}const raw=await native.loadGuestImage(id);return raw?response(200,JSON.parse(raw)):response(404,{error:'本机图片不存在'});}catch(e){return response(400,{error:e.message})}}

 if(url.pathname.startsWith('/api/auth/')||remoteMode){
 if(url.pathname==='/api/auth/me'&&!remoteMode)return response(200,{user:null});
 const result=await bridge({type:'remote',path:url.pathname,method,body});
 if(result.status<300&&result.data?.user)remoteMode=true;if(url.pathname==='/api/auth/logout'&&result.status<300)remoteMode=false;
 return response(result.status,result.data);
 }
 const handle=()=>workspace(url.pathname,method,body);const result=method==='GET'?await handle():await writeGuest(handle);return response(result.status,result.data);
 };
 const click=HTMLAnchorElement.prototype.click;HTMLAnchorElement.prototype.click=function(){if(this.download&&this.href.startsWith('blob:')){original(this.href).then(r=>r.text()).then(content=>native.saveDocument(this.download,content));return;}click.call(this)};
 window.OrbitMobile={
  pickImage:()=>bridge({type:'importImage'}),
  pickPdf:()=>bridge({type:'importPdf'}),
  backup:async()=>native.saveDocument('orbit-backup-'+new Date().toISOString().slice(0,10)+'.json',JSON.stringify(await guestBackup())),
  restore:async()=>{
   const answer=await bridge({type:'import'}),input=JSON.parse(answer.content);
   const images=input._media||[];
   delete input._media;
   const state=validateBackup(normalizeState(input));
   if(JSON.stringify(state).length>2200000)throw Error('文字备份太大');
   await writeGuest(async()=>{
    for(const item of images){
     const image=validateMedia(item);
     if(!await native.saveGuestImage(JSON.stringify(image)))throw Error('图片恢复失败');
    }
    await guestSave(state);
   });
   window.dispatchEvent(new Event('orbit:changed'));
  }
 };
}
