'use client';

import {useState} from 'react';
import {Music2} from 'lucide-react';
import {api} from '../client/api.mjs';
import {audioLimit,audioTypes} from '../shared/attachments.mjs';

export type AudioReference = {id:string; name:string};

export function AudioField({audio}: {audio?:AudioReference|null}) {
 return <div className="memory-audio">
  <label>音乐片段（可选）<input name="music" type="file" accept=".mp3,.m4a,.ogg,.wav"/><small>MP3、M4A、OGG、WAV，最多 400 KB。</small></label>
  {audio&&<><MemoryAudio key={audio.id} audio={audio}/><label className="memory-audio-remove"><input name="removeMusic" type="checkbox"/> 移除已有音乐</label></>}
 </div>;
}

export async function saveWithAudio(form:FormData, change:Record<string,unknown>) {
 const file=form.get('music');
 let newId:string|undefined;
 try {
  if(file instanceof File&&file.name) {
   const extension=file.name.split('.').pop()?.toLowerCase() as keyof typeof audioTypes;
   const type=Object.hasOwn(audioTypes,extension)?audioTypes[extension]:undefined;
   if(!type||file.size===0||file.size>audioLimit)throw Error('请选择 400 KB 以内的 MP3、M4A、OGG 或 WAV 片段');
   const dataUrl=await new Promise<string>((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(String(reader.result));
    reader.onerror=()=>reject(Error('无法读取这段音乐，请重新选择'));
    reader.readAsDataURL(new Blob([file],{type}));
   });
   newId=crypto.randomUUID();
   await api('/api/media',{id:newId,dataUrl});
   change.audio={id:newId,name:file.name.slice(0,120)};
  } else if(form.has('removeMusic')) change.audio=null;
  await api('/api/life',change);
 } catch(error) {
  if(newId)await api('/api/media/'+newId,undefined,'DELETE').catch(()=>{});
  throw error;
 }
}

export function MemoryAudio({audio}: {audio?:AudioReference|null}) {
 const [source,setSource]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 if(!audio)return null;
 async function load(id:string) {
  setBusy(true);setError('');
  try {
   const result=await api('/api/media/'+id);
   if(!result.dataUrl?.startsWith('data:audio/'))throw Error('音乐附件无法读取');
   setSource(result.dataUrl);
  } catch(error) {setError((error as Error).message)}
  finally {setBusy(false)}
 }
 return <div className="memory-audio">
  {source?<><small>{audio.name}</small><audio aria-label={audio.name} controls src={source} onError={()=>setError('当前设备无法播放这个音频格式')}/></>:<button type="button" className="v2-secondary" disabled={busy} onClick={()=>void load(audio.id)}><Music2 size={15}/>{busy?'加载音乐…':audio.name}</button>}
  {error&&<small className="v2-error" role="alert">{error}</small>}
 </div>;
}
