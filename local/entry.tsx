import {applyTheme, readTheme} from '../client/theme';
import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import {installMobile} from '../mobile/runtime.mjs';

import '../app/globals.css';
(window as any).__ORBIT_LOCAL__=Boolean((window as any).OrbitNative)||['127.0.0.1','localhost'].includes(location.hostname);
applyTheme(readTheme());
const native=(window as any).OrbitNative;
class StartupBoundary extends React.Component<{children:React.ReactNode},{error:string}>{state={error:''};static getDerivedStateFromError(error:Error){return {error:error.message||'页面启动失败'}};componentDidMount(){(window as any).__ORBIT_READY__=true;(window as any).OrbitNative?.ready?.()}render(){return this.state.error?<div className="orbit-boot"><strong>星轨启动遇到问题</strong><p>{this.state.error}</p><small>你的数据没有被清除。请重试，或反馈这条提示。</small><button onClick={()=>location.reload()}>重新加载</button></div>:this.props.children}}
async function start(){
 try{
  if(native){
   await native.initialize?.();
   installMobile();
  }
  createRoot(document.getElementById('root')!).render(<StartupBoundary><Home/></StartupBoundary>);
 }catch(error){
  const detail=document.getElementById('orbit-boot-detail');
  if(detail)detail.textContent=error instanceof Error?error.message:'本机服务启动失败，请重新打开应用。';
 }
}
void start();
