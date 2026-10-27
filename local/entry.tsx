import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import {installMobile} from '../mobile/runtime.mjs';

import '../app/globals.css';
(window as any).__ORBIT_LOCAL__=true;
const mobile=Boolean((window as any).OrbitNative);if(mobile)installMobile();
class StartupBoundary extends React.Component<{children:React.ReactNode},{error:string}>{state={error:''};static getDerivedStateFromError(error:Error){return {error:error.message||'页面启动失败'}};componentDidMount(){(window as any).__ORBIT_READY__=true;(window as any).OrbitNative?.ready?.()}render(){return this.state.error?<div className="orbit-boot"><strong>星轨启动遇到问题</strong><p>{this.state.error}</p><small>你的数据没有被清除。请重试，或反馈这条提示。</small><button onClick={()=>location.reload()}>重新加载</button></div>:this.props.children}}
createRoot(document.getElementById('root')!).render(<StartupBoundary><Home/></StartupBoundary>);
