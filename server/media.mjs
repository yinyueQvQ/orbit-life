import {audioLimit,audioTypes,mediaId,mediaReferences} from '../shared/attachments.mjs';
export {mediaReferences} from '../shared/attachments.mjs';

export const mediaSchema=`CREATE TABLE IF NOT EXISTS orbit_media (owner TEXT NOT NULL,id TEXT NOT NULL,data_url TEXT NOT NULL,width INTEGER NOT NULL,height INTEGER NOT NULL,created_at INTEGER NOT NULL,PRIMARY KEY(owner,id));`;
export function validateImage(input){
 const id=input.id||crypto.randomUUID();if(typeof id!=='string'||!/^[-a-zA-Z0-9_]{8,80}$/.test(id))throw Error('图片编号无效');
 const match=typeof input.dataUrl==='string'&&input.dataUrl.match(/^data:image\/(jpeg|png|webp);base64,([a-zA-Z0-9+/]+=*)$/);if(!match||match[2].length>550000)throw Error('图片格式无效或超过400KB，请重新选择');
 let bytes;try{bytes=atob(match[2])}catch{throw Error('图片编码无效')}
 const signature=match[1]==='jpeg'?bytes.charCodeAt(0)===255&&bytes.charCodeAt(1)===216&&bytes.charCodeAt(2)===255:match[1]==='png'?bytes.slice(1,4)==='PNG':bytes.slice(0,4)==='RIFF'&&bytes.slice(8,12)==='WEBP';if(!signature||bytes.length>410000)throw Error('图片内容与格式不一致');
 if(!Number.isInteger(input.width)||!Number.isInteger(input.height)||input.width<1||input.height<1||input.width>1800||input.height>1800)throw Error('图片尺寸无效');
 return {id,dataUrl:input.dataUrl,width:input.width,height:input.height};
}
export function validateMedia(input){
 if(typeof input?.dataUrl!=='string'||!input.dataUrl.startsWith('data:audio/'))return validateImage(input);
 const id=input.id||crypto.randomUUID();
 if(!mediaId(id))throw Error('音乐编号无效');
 const match=input.dataUrl.match(/^data:(audio\/[a-z0-9]+);base64,([a-zA-Z0-9+/]+=*)$/);
 if(!match||!Object.values(audioTypes).includes(match[1])||match[2].length>Math.ceil(audioLimit/3)*4)throw Error('请选择 400 KB 以内的 MP3、M4A、OGG 或 WAV 片段');
 let bytes;try{bytes=atob(match[2])}catch{throw Error('音乐编码无效')}
 const signatures={
  'audio/mpeg':()=>bytes.startsWith('ID3')||(bytes.charCodeAt(0)===255&&(bytes.charCodeAt(1)&224)===224),
  'audio/mp4':()=>bytes.slice(4,8)==='ftyp',
  'audio/ogg':()=>bytes.startsWith('OggS'),
  'audio/wav':()=>bytes.startsWith('RIFF')&&bytes.slice(8,12)==='WAVE'
 };
 if(bytes.length>audioLimit||!signatures[match[1]]())throw Error('音乐内容与格式不一致');
 return {id,dataUrl:input.dataUrl,width:0,height:0};
}
export async function mediaAPI(store,owner,path,method,body){
 if(path==='/api/media'&&method==='POST'){const image=validateMedia(body);if(!await store.get('SELECT id FROM orbit_media WHERE owner=? AND id=?',owner,image.id)){const quota=await store.get('SELECT count(*) AS total,coalesce(sum(length(data_url)),0) AS used FROM orbit_media WHERE owner=?',owner);if(quota.total>=1000||quota.used+image.dataUrl.length>200*1024*1024)throw Error('附件空间已满，请先导出备份并整理');await store.run('INSERT INTO orbit_media VALUES (?,?,?,?,?,?)',owner,image.id,image.dataUrl,image.width,image.height,Date.now());}return {status:200,data:{id:image.id,width:image.width,height:image.height}};}
 const match=path.match(/^\/api\/media\/([-a-zA-Z0-9_]{8,80})$/);if(match&&method==='DELETE'){const workspace=owner==='local-guest'?await store.get('SELECT value FROM local_workspace WHERE id=1'):await store.get('SELECT value FROM orbit_workspaces WHERE user_id=?',owner);if(workspace&&mediaReferences(JSON.parse(workspace.value)).includes(match[1]))return {status:409,data:{error:'附件仍被记录使用，请先移除后保存记录'}};await store.run('DELETE FROM orbit_media WHERE owner=? AND id=?',owner,match[1]);return {status:200,data:{ok:true}};}
 if(match&&method==='GET'){const row=await store.get('SELECT id,data_url,width,height FROM orbit_media WHERE owner=? AND id=?',owner,match[1]);return row?{status:200,data:{id:row.id,dataUrl:row.data_url,width:row.width,height:row.height}}:{status:404,data:{error:'附件不存在或不属于当前账号'}};}
 return {status:404,data:{error:'附件接口不存在'}};
}
export async function assertOwnedMedia(store,owner,ids){for(const id of ids)if(!await store.get('SELECT id FROM orbit_media WHERE owner=? AND id=?',owner,id))throw Error('有附件尚未上传到当前账号，请重新选择后保存');}
export async function exportMedia(store,owner,state){const images=[];for(const id of mediaReferences(state)){const row=await store.get('SELECT id,data_url,width,height FROM orbit_media WHERE owner=? AND id=?',owner,id);if(row)images.push({id:row.id,dataUrl:row.data_url,width:row.width,height:row.height});}return images;}
