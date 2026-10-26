import React from 'react';
import {createRoot} from 'react-dom/client';
import Home from '../app/page';
import {installMobile} from '../mobile/runtime.mjs';
import MobileBar from '../components/mobile-bar';
import '../app/globals.css';
(window as any).__ORBIT_LOCAL__=true;
const mobile=Boolean((window as any).OrbitNative);if(mobile)installMobile();
createRoot(document.getElementById('root')!).render(<>{mobile&&<MobileBar/>}<Home/></>);
