'use client';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {LayoutDashboard,CheckCheck,Wallet,Timer,ListTodo,CalendarDays,BarChart3,Sparkles,UserRound,MoreHorizontal,X,RefreshCw,FileText,BookOpen,StickyNote} from 'lucide-react';
import {Starfield} from '../components/cosmic-scene';
import SyncStatus from '../components/sync-status';
import LaunchScreen from '../components/launch-screen';

import {watchTheme} from '../client/theme';
import ThemeToggle from '../components/theme-toggle';
const JournalPanel=lazy(()=>import('../components/journal-panel'));
const DocumentPlanner=lazy(()=>import('../components/document-planner'));
import ReminderCenter from '../components/reminder-center';
import LoginGate from '../components/login-gate';
const HabitManager=lazy(()=>import('../components/habit-manager'));
const FocusPanel=lazy(()=>import('../components/focus-panel'));
const FinanceSpace=lazy(()=>import('../components/finance-space'));
const Planner=lazy(()=>import('../components/planner'));
const MemoPanel=lazy(()=>import('../components/memo-panel'));
const AccountPanel=lazy(()=>import('../components/account-panel'));
import {Dashboard,CalendarView,Insights,PetView} from '../components/life-views';
import {api,installClient,clearRevision} from '../client/api.mjs';
import './v2.css';
import './paper.css';
import './cosmos.css';
import './motion.css';
import './performance.css';
import './interaction.css';
import './observatory.css';
import './workspace-navigation.css';
import {useDialogAccessibility} from '../hooks/use-dialog-accessibility';
const pages=[['home','今天',LayoutDashboard],['habits','习惯打卡',CheckCheck],['focus','专注时光',Timer],['ledger','财务空间',Wallet],['journal','随心记（日记）',BookOpen],['memos','备忘录',StickyNote],['documents','PDF 每日计划',FileText],['notes','目标与待办',ListTodo],['calendar','打卡日历',CalendarDays],['insights','数据洞察',BarChart3],['pet','团团伙伴',Sparkles],['account','账号与数据',UserRound]] as const;
type PageId=(typeof pages)[number][0];
const pageById = Object.fromEntries(pages.map(page => [page[0], page])) as Record<PageId, (typeof pages)[number]>;
const primaryPages = [
 ['home', '今天'], ['notes', '待办'], ['focus', '专注'], ['ledger', '财务']
] as const;
const primaryIds: ReadonlySet<PageId> = new Set(primaryPages.map(([id]) => id));
const featureGroups: ReadonlyArray<{ label: string; ids: readonly PageId[] }> = [
 { label: '日常行动', ids: ['home', 'notes', 'habits', 'focus', 'documents'] },
 { label: '记录与回顾', ids: ['journal', 'memos', 'calendar', 'insights'] },
 { label: '财务', ids: ['ledger'] },
 { label: '助手与设置', ids: ['pet', 'account'] }
];
const featureKeywords:Record<PageId,string>={account:'备份 恢复 同步 登录 设置',pet:'AI 聊天',notes:'行动 任务 待办 目标',ledger:'记账 收支 储蓄 预算 下月规划',documents:'PDF 导入 计划',home:'首页 总览',habits:'打卡 习惯',journal:'日记 照片 回顾',memos:'临时 长期 口号 签名 sign 灵感 文案',focus:'计时 番茄钟 休息',calendar:'历史 打卡 习惯',insights:'统计 趋势'};
const featureDescriptions:Record<PageId,string>={home:'生活总览',notes:'目标 · 行动待办',ledger:'收支 · 储蓄 · 预算',memos:'口号 · 签名 · 常用文案',journal:'随手记录 · 周月回顾',documents:'PDF → 每日待办',pet:'聊天与 AI 助手',account:'登录 · 备份 · 同步',habits:'管理习惯与打卡',focus:'开始专注或休息',calendar:'历史打卡记录',insights:'成长与趋势'};
const matchesFeature=(id:PageId,label:string,query:string)=>query.trim().toLowerCase().split(/\s+/).every(word=>(label+' '+featureKeywords[id]).toLowerCase().includes(word));
const descriptions:Record<PageId,string>={memos:'临时想法随手存，常用口号、签名与文案长期留用。',journal:'记录见闻、想法与感受，用照片和文字留住今天。',documents:'从 PDF 梳理行动、核对来源、关联目标，再为每项任务留一段专注时间。',home:'照顾好今天的小事，未来会慢慢清晰。',habits:'创建、编辑、搜索习惯，也可以管理每一天的打卡记录。',focus:'自定义一段专注，按真实时间计时，每份投入都被记录。',ledger:'收支、储蓄目标与下月规划，在一个空间里有序衔接。',notes:'查看所有待办，也可以按目标整理任务。',calendar:'回看打卡的足迹，记录属于自己的节奏。',insights:'真实的数据，记录那些看似微小的变化。',pet:'和团团说说今天，也让它帮你整理生活。',account:'管理登录、数据备份、同步与 AI 设置。'};
export default function Home(){
 useDialogAccessibility();
 const [launch,setLaunch]=useState(true),[hidden,setHidden]=useState(false);
 const finishLaunch=useCallback(()=>setLaunch(false),[]);
 const pageContent=useRef<HTMLDivElement>(null);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 const [focusRequest,setFocusRequest]=useState<any>(null);
 const [session,setSession]=useState<any>(null),[authReady,setAuthReady]=useState(false),[data,setData]=useState<any>(null),[page,setPage]=useState<PageId>('home'),[financeTab,setFinanceTab]=useState('ledger'),[more,setMore]=useState(false),[search,setSearch]=useState(''),[error,setError]=useState(''),[refreshing,setRefreshing]=useState(false);
 useEffect(watchTheme,[]);
 useEffect(()=>{installClient();void api('/api/auth/me').then((j:any)=>{if(j.user)setSession(j);else if(localStorage.getItem('orbit.guest')==='yes')setSession({user:null,mode:'guest'});}).catch(()=>{if(localStorage.getItem('orbit.guest')==='yes')setSession({user:null,mode:'guest'});}).finally(()=>setAuthReady(true));const expired=()=>{clearRevision();setSession(null);setFocusRequest(null);setMore(false);setPage('home');setData(null);setError('登录已过期，请重新登录。')};window.addEventListener('orbit:session-expired',expired);return()=>{window.removeEventListener('orbit:session-expired',expired);}},[]);
 const currentSession=useRef(session);currentSession.current=session;
 const loading=useRef<{session:object;repeat:boolean;promise:Promise<void>}|null>(null);
 const reload=useCallback(async(manual=true)=>{
  if(!session)return;
  if(manual)setRefreshing(true);
  const active=loading.current;
  if(active&&active.session===session){if(manual)active.repeat=true;return active.promise}
  const ticket={session,repeat:false,promise:Promise.resolve()};
  loading.current=ticket;
  ticket.promise=(async()=>{
   try{
    do{
     ticket.repeat=false;
     try{
      const next=await api('/api/life');
      if(currentSession.current!==session)return;
      setData((previous:any)=>previous&&next.revision!==undefined&&previous.revision===next.revision&&previous.offline===next.offline?previous:previous&&next.revision===undefined&&JSON.stringify(previous)===JSON.stringify(next)?previous:next);
      setError('');
     }catch(error){if(currentSession.current===session)setError((error as Error).message)}
    }while(ticket.repeat&&currentSession.current===session);
   }finally{if(loading.current===ticket){loading.current=null;setRefreshing(false)}}
  })();
  return ticket.promise;
 },[session]);
 useEffect(()=>{if(!session)return;void reload();let last=Date.now();const refresh=()=>{if(document.visibilityState==='visible'&&Date.now()-last>1500){last=Date.now();void reload(false)}};const changed=()=>void reload();const id=session.mode==='cloud'?setInterval(refresh,20000):undefined;window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);window.addEventListener('orbit:changed',changed);return()=>{if(id)clearInterval(id);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('orbit:changed',changed)}},[session,reload]);
 const nav=useCallback((value:string)=>{if(value==='forecast'||value==='ledger')setFinanceTab(value);const target=pages.find(([id])=>id===(value==='forecast'?'ledger':value));if(!target)return;setPage(target[0]);setMore(false);setSearch('');window.scrollTo({top:0,behavior:'instant'})},[]);
 useEffect(()=>{const route=(e:any)=>{if(pages.some(([id])=>id===e.detail)||e.detail==='forecast')nav(e.detail)};window.addEventListener('orbit:navigate',route);const native=(window as any).OrbitNative;if(native?.launchRoute?.()==='notes')setPage('notes');return()=>window.removeEventListener('orbit:navigate',route)},[nav]);
 useEffect(()=>{const focus=(e:any)=>{setFocusRequest({...e.detail,requestId:crypto.randomUUID()});nav('focus')};window.addEventListener('orbit:focus-task',focus);return()=>window.removeEventListener('orbit:focus-task',focus)},[nav]);
 useEffect(()=>{if(!launch)pageContent.current?.querySelector("h1")?.focus({preventScroll:true})},[page,launch]);
 useEffect(()=>{(window as any).orbitHandleBack=()=>{const dialog=document.querySelector<HTMLElement>('[role="dialog"][aria-modal="true"]');if(dialog){const close=dialog.querySelector<HTMLButtonElement>('button[aria-label="关闭"]');if(close&&!close.disabled)close.click();return true}if(more){setMore(false);return true}if(page!=='home'){nav('home');return true}return false};return()=>{delete (window as any).orbitHandleBack}},[more,page,nav]);
 if(launch)return <LaunchScreen ready={authReady} onDone={finishLaunch}/>;
 if(!session)return <LoginGate notice={error} onSuccess={j=>{setError('');localStorage.removeItem('orbit.guest');clearRevision();setFocusRequest(null);setSession(j);setPage('home');setData(null)}} onGuest={async()=>{await api('/api/auth/guest',{});setError('');localStorage.setItem('orbit.guest','yes');clearRevision();setSession({user:null,mode:'guest'});setData(null)}}/>;
 const searchTerm = search.trim();
 const menuGroups = featureGroups.map(group => ({
  ...group,
  ids: group.ids.filter(id => searchTerm ? matchesFeature(id, pageById[id][1], searchTerm) : !primaryIds.has(id))
 })).filter(group => group.ids.length);

 return <div className={'v2-app '+(hidden?'motion-paused':'')}>
  <Starfield/>
  <aside className="v2-sidebar">
   <button className="v2-logo" onClick={()=>nav('home')}><span className="orbit-brand-mark" aria-hidden="true">✦</span><b>ORBIT</b><small>星轨</small></button>
   <nav className="v2-side-nav workspace-sidebar-nav" aria-label="主导航">
    {featureGroups.map(({label, ids}) => <div key={label}>
     <span className="nav-group-label">{label}</span>
     {ids.map(id => {
      const [,name,Icon] = pageById[id];
      return <button key={id} aria-current={page===id?'page':undefined} data-active={page===id} onClick={()=>nav(id)}>
       <Icon size={18}/><span>{name}</span>
      </button>;
     })}
    </div>)}
   </nav>
   <div className="workspace-profile">
    <span aria-hidden="true">{session.user?.displayName?.slice(0,1)||'✦'}</span>
    <div><strong>{session.user?.displayName||'访客空间'}</strong><small>{session.mode==='cloud'?'云端账号':session.mode==='local'?'本机账号':'仅本机'}</small></div>
   </div>
  </aside>
  <main className="v2-main"><header className="v2-topbar"><button className="v2-mobile-brand" aria-label="返回首页" onClick={()=>nav('home')}><span className="orbit-brand-mark" aria-hidden="true">✦</span><b>ORBIT</b></button><div className="v2-breadcrumb">我的空间 <span>/</span> {pageById[page][1]}</div><div className="v2-top-actions"><ThemeToggle/>{data&&<ReminderCenter key={session.user?.id||'guest'} data={data} accountKey={session.user?.id||'guest'} onNav={nav} onChange={()=>void reload()}/>}<SyncStatus key={session.user?.id||session.mode} mode={session.mode}/><button className="v2-icon" aria-label="刷新数据" disabled={refreshing} aria-busy={refreshing} onClick={()=>void reload()}><RefreshCw size={17} className={refreshing?'spinning':''}/></button></div></header>
 <div className="v2-content"><div key={page} ref={pageContent} className="page-transition">{page!=='home'&&<section className="v2-page-heading"><h1 tabIndex={-1}>{pageById[page][1]}</h1><p>{descriptions[page]}</p></section>}{error&&<div className="v2-error" role="alert">{error}<button disabled={refreshing} onClick={()=>void reload()}>{refreshing?'正在重试…':'重新连接'}</button></div>}{!data?(!error&&<div className="v2-card v2-empty" role="status"><span className="spinning">✦</span><h3>正在读取你的生活记录…</h3></div>):<Suspense fallback={<div className="v2-card v2-empty" role="status">正在打开这个空间…</div>}>{page==='home'&&<Dashboard data={data} onChange={()=>reload()} onNav={nav}/>}{page==='habits'&&<HabitManager data={data} onChange={()=>void reload()}/>}{page==='journal'&&<JournalPanel data={data} onChange={()=>void reload()} onNav={nav}/>}{page==='documents'&&<DocumentPlanner data={data} onChange={()=>void reload()} onFocus={task=>{setFocusRequest({...task,requestId:crypto.randomUUID()});nav('focus')}}/>}{page==='focus'&&<FocusPanel key={session.user?.id||session.mode} request={focusRequest} data={data} accountKey={session.user?.id||'guest'} onChange={()=>void reload()}/>}{page==='ledger'&&<FinanceSpace key={financeTab} initialTab={financeTab} data={data} onChange={()=>void reload()}/>}{page==='notes'&&<Planner mode="notes"/>}{page==='memos'&&<MemoPanel memos={data.memos??[]} onChange={reload}/>}{page==='calendar'&&<CalendarView data={data} onNav={nav}/>}{page==='insights'&&<Insights data={data}/>}{page==='pet'&&<PetView data={data} onChange={()=>void reload()}/>}{page==='account'&&<AccountPanel session={session} onChange={()=>void reload()} onLogout={()=>{setError('');setSession(null);setFocusRequest(null);setData(null);setPage('home')}}/>}</Suspense>}</div></div></main>
  <nav className="v2-bottom-nav workspace-bottom-nav" aria-label="主导航">
   {primaryPages.map(([id,label]) => {
    const [,,Icon] = pageById[id];
    return <button key={id} aria-current={page===id?'page':undefined} data-active={page===id&&!more} onClick={()=>nav(id)}>
     <span className="workspace-tab-icon"><Icon size={19} aria-hidden="true"/></span><span>{label}</span>
    </button>;
   })}
   <button aria-label="更多功能" aria-expanded={more} data-active={!primaryIds.has(page)||more} onClick={()=>{setSearch('');setMore(!more)}}>
    <span className="workspace-tab-icon"><MoreHorizontal size={21} aria-hidden="true"/></span><span>更多</span>
   </button>
  </nav>
  {more && <div className="more-overlay" onClick={()=>setMore(false)}>
   <section className="more-sheet workspace-menu" role="dialog" aria-modal="true" aria-labelledby="workspace-menu-title" onClick={event=>event.stopPropagation()}>
    <div className="workspace-menu-header">
     <div className="v2-section-heading">
      <h2 id="workspace-menu-title">更多功能</h2>
      <button className="v2-icon" aria-label="关闭" onClick={()=>setMore(false)}><X size={20}/></button>
     </div>
     <label className="feature-search">搜索功能<input value={search} onChange={event=>setSearch(event.target.value)} placeholder="例如：记账、日记、备份" type="search"/></label>
    </div>
    <div className="workspace-menu-groups">
     {menuGroups.map(({label, ids}) => <section className="workspace-menu-group" key={label}>
      <h3>{label}</h3>
      {ids.map(id => {
       const [,name,Icon] = pageById[id];
       return <button key={id} aria-current={page===id?'page':undefined} onClick={()=>nav(id)}>
        <span className="workspace-menu-icon"><Icon size={18} aria-hidden="true"/></span><span><strong>{name}</strong><small>{featureDescriptions[id]}</small></span>
       </button>;
      })}
     </section>)}
     {!menuGroups.length && <p role="status">没有找到功能，试试“记账”或“备份”。</p>}
    </div>
   </section>
  </div>}
 </div>;
}
