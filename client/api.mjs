let installed=false,revision,sessionVersion=0;
let writeQueue=Promise.resolve();const reads=new Map();
export function installClient(){
 if(installed)return;installed=true;const original=window.fetch.bind(window);
 const appURL=new URL(location.href);
 const sameApp=url=>url.protocol===appURL.protocol&&url.host===appURL.host;
 const request=async(input,options={},version=sessionVersion)=>{
 if(version!==sessionVersion)throw Error('登录状态已变化，请重新操作');
 const url=new URL(typeof input==='string'?input:input.url,appURL);if(!sameApp(url)||!url.pathname.startsWith('/api/'))return original(input,options);
 const workspace=url.pathname==='/api/life';
 const sync=(ok,offline=false)=>window.dispatchEvent(new CustomEvent('orbit:sync',{detail:{ok,at:Date.now(),offline}}));
 let next={...options};if(workspace&&options.method==='POST'){const b=JSON.parse(options.body||'{}');b._requestId=b._requestId||crypto.randomUUID();if(revision!==undefined)b._revision=revision;next.body=JSON.stringify(b);}
 try{
  const response=await original(input,next);
  const data=workspace&&response.ok?await response.clone().json():null;
  if(version!==sessionVersion)throw Error('登录状态已变化，请重新操作');
  if(data){
   if(data.revision!==undefined)revision=Math.max(revision??data.revision,data.revision);
   sync(true,Boolean(data.offline));
  }else if(workspace&&response.status>=500)sync(false);
  if(response.status===401&&!url.pathname.startsWith('/api/auth/'))window.dispatchEvent(new Event('orbit:session-expired'));
  if(response.status===409)window.dispatchEvent(new Event('orbit:changed'));
  return response;
 }catch(error){if(workspace&&version===sessionVersion&&!options.signal?.aborted)sync(false);throw error;}
 };
 window.fetch=(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,appURL);
 if(!sameApp(url))return original(input,options);
 const method=(options.method||input.method||'GET').toUpperCase();
 const version=sessionVersion;
 if(url.pathname==='/api/life'&&method==='POST'){reads.clear();const result=writeQueue.then(()=>request(input,{...options,method},version));writeQueue=result.then(()=>{},()=>{});return result;}
 if(url.pathname==='/api/life'&&method==='GET'&&!options.signal){const key=url.href;let pending=reads.get(key);if(!pending){pending=writeQueue.then(()=>request(input,options,version));reads.set(key,pending);pending.finally(()=>{if(reads.get(key)===pending)reads.delete(key)}).catch(()=>{});}return pending.then(r=>r.clone());}
 return request(input,options);
 };
}
export function clearRevision(){
 sessionVersion++;
 revision=undefined;
 reads.clear();
 writeQueue=Promise.resolve();
}
export async function api(path,body,method=body?'POST':'GET'){
 const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});let data;try{data=await response.json()}catch{throw Error('服务器返回异常，请稍后重试')};if(!response.ok)throw Error(data.error||'请求失败');return data;
}
