let installed=false,revision;
export function installClient(){
 if(installed)return;installed=true;const original=window.fetch.bind(window);
 window.fetch=async(input,options={})=>{
 const url=new URL(typeof input==='string'?input:input.url,location.href);if(!url.pathname.startsWith('/api/'))return original(input,options);
 let next={...options};if(url.pathname==='/api/life'&&options.method==='POST'){const b=JSON.parse(options.body||'{}');b._requestId=b._requestId||crypto.randomUUID();if(revision!==undefined)b._revision=revision;next.body=JSON.stringify(b);}
 try{const response=await original(input,next);if(url.pathname==='/api/life'&&response.ok){const data=await response.clone().json();if(data.revision!==undefined)revision=data.revision;window.dispatchEvent(new CustomEvent('orbit:sync',{detail:{ok:true,at:Date.now(),offline:Boolean(data.offline)}}));}
 if(response.status===401&&!url.pathname.startsWith('/api/auth/'))window.dispatchEvent(new Event('orbit:session-expired'));
 if(response.status===409){window.dispatchEvent(new Event('orbit:changed'));}
 return response;}catch(error){window.dispatchEvent(new CustomEvent('orbit:sync',{detail:{ok:false,at:Date.now()}}));throw error;}
 };
}
export function clearRevision(){revision=undefined;}
export async function api(path,body,method=body?'POST':'GET'){
 const response=await fetch(path,{method,headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});let data;try{data=await response.json()}catch{throw Error('服务器返回异常，请稍后重试')};if(!response.ok)throw Error(data.error||'请求失败');return data;
}
