import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title:'星轨 ORBIT · 每一天，都算数', description:'习惯打卡、轻松记账与星际宠物，让微小行动闪闪发光。' };
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>) {return <html lang="zh-CN"><body>{children}</body></html>}
