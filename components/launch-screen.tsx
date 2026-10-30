'use client';
import {useEffect,useState} from 'react';
export default function LaunchScreen({ready,onDone}:{ready:boolean;onDone:()=>void}){
 const [elapsed,setElapsed]=useState(false),[leaving,setLeaving]=useState(false);
 useEffect(()=>{const timer=setTimeout(()=>setElapsed(true),650);return()=>clearTimeout(timer)},[]);
 useEffect(()=>{if(!ready||!elapsed)return;setLeaving(true);const timer=setTimeout(onDone,320);return()=>clearTimeout(timer)},[ready,elapsed,onDone]);
 return <div className={'launch-screen '+(leaving?'launch-leaving':'')} role="status" aria-label="星轨正在启动"><div className="launch-orbit"><span>✦</span><div className="launch-mascot"><i/><i/><b>ω</b></div></div><p className="launch-kicker">YOUR LITTLE UNIVERSE</p><h1>星轨 <span>ORBIT</span></h1><p>和团团一起，点亮今天。</p><div className="launch-dots" aria-hidden="true"><i/><i/><i/></div><small>{ready?'准备好啦，出发吧':'正在打开你的生活空间…'}</small></div>
}
