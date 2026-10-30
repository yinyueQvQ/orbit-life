'use client';
import {memo,useEffect,useState} from 'react';
import {Cloud,CloudOff,HardDrive} from 'lucide-react';
export default memo(function SyncStatus({mode}:{mode:string}){
 const [sync,setSync]=useState({ok:true,at:0,offline:false});
 useEffect(()=>{const update=(event:Event)=>setSync((event as CustomEvent).detail);window.addEventListener('orbit:sync',update);return()=>window.removeEventListener('orbit:sync',update)},[]);
 return <span className={'v2-sync '+(!sync.ok?'is-offline':'')} title={sync.at?new Date(sync.at).toLocaleTimeString():''}>{mode==='guest'||mode==='local'?<HardDrive size={13}/>:sync.ok?<Cloud size={13}/>:<CloudOff size={13}/>}<span>{mode==='guest'?'仅本机':mode==='local'?'本机数据库':sync.ok?(sync.offline?'离线缓存':'已连接同步'):'连接中断'}</span></span>
});
