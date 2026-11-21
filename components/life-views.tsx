'use client';
import {useRef,useState} from 'react';
import {ArrowUpRight,Check,ChevronLeft,ChevronRight,CheckCheck,ListTodo,Plus,Sparkles,Timer} from 'lucide-react';
import PetChat from './pet-chat';
import {visibleTasks,dueLabel} from '../client/task-list.mjs';
import {api} from '../client/api.mjs';
export const day=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
export const cash=(n:number)=>new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(n/100);
type TodayHabit = {id:string; name:string; days?:number[]; archived?:boolean; icon?:string};
type TodayTask = {id:string; title:string; due?:string; goalId?:string};

export function Dashboard({data,onChange,onNav}:{data:any;onChange:()=>Promise<void>;onNav:(v:string)=>void}){
 const date=day();
 const weekday=new Date(date+'T12:00:00').getDay();
 const label=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Shanghai'}).format(new Date(date+'T12:00:00+08:00'));
 const checked=new Set(data.checks.filter((check:{date:string})=>check.date===date).map((check:{habit:string})=>check.habit));
 const habits:TodayHabit[]=data.habits.filter((habit:TodayHabit)=>!habit.archived&&(!habit.days||habit.days.includes(weekday)));
 const pendingHabits=habits.filter(habit=>!checked.has(habit.id));
 const completedHabits=habits.filter(habit=>checked.has(habit.id));
 const tasks:TodayTask[]=visibleTasks(data.notes,{filter:'todo',today:date});
 const goals=new Map<string,string>(data.goals.map((goal:{id:string;title:string})=>[goal.id,goal.title]));

 const [quickNote,setQuickNote]=useState('');
 const [pending,setPending]=useState('');
 const [feedback,setFeedback]=useState<{section:'tasks'|'habits'; text:string; error?:boolean}|null>(null);
 const saving=useRef(false);
 const tasksHeading=useRef<HTMLHeadingElement>(null);
 const habitsHeading=useRef<HTMLHeadingElement>(null);

 function showSection(heading:HTMLHeadingElement|null){
  heading?.focus({preventScroll:true});
  heading?.scrollIntoView({block:'start'});
 }

 async function complete(section:'tasks'|'habits', body:{action:string;id?:string;date?:string;done?:boolean;title?:string}, message:string){
  if(saving.current)return false;
  saving.current=true;
  setPending(body.id||'new-note');
  setFeedback(null);
  try{
   await api('/api/life',body);
   await onChange();
   setFeedback({section,text:message});
   return true;
  }catch(error){
   setFeedback({section,text:(error as Error).message,error:true});
   return false;
  }finally{
   saving.current=false;
   setPending('');
  }
 }

 function feedbackFor(section:'tasks'|'habits'){
  if(feedback?.section!==section)return null;
  return <p className={feedback.error?'v2-error':'v2-muted'} role={feedback.error?'alert':'status'}>{feedback.text}</p>;
 }

 return <div className="today-dashboard">
  <section className="v2-card today-overview">
   <div className="today-hero-copy">
    <p className="v2-muted"><time dateTime={date}>{label}</time></p>
    <h1 tabIndex={-1}>今天</h1>
   </div>
   <div className="today-totals">
    <button type="button" aria-label={`查看待办，共 ${tasks.length} 项`} onClick={()=>showSection(tasksHeading.current)}><ListTodo size={17} aria-hidden="true"/><span><strong>{tasks.length}</strong> 项待办</span></button>
    <button type="button" aria-label={`查看今日打卡，已完成 ${completedHabits.length} 项，共 ${habits.length} 项`} onClick={()=>showSection(habitsHeading.current)}><CheckCheck size={17} aria-hidden="true"/><span><strong>{completedHabits.length}/{habits.length}</strong> 已打卡</span></button>
   </div>
  </section>

  <div className="today-panels">
   <section className="v2-card today-panel today-task-panel" aria-labelledby="today-task-title">
    <div className="v2-section-heading">
     <h2 id="today-task-title" ref={tasksHeading} tabIndex={-1}><span className="today-panel-icon"><ListTodo size={19} aria-hidden="true"/></span>待办</h2>
     <button className="v2-text" onClick={()=>onNav('notes')}>所有待办 <ArrowUpRight size={15}/></button>
    </div>
    <form className="quick-note" onSubmit={async event=>{
     event.preventDefault();
     const title=quickNote.trim();
     if(title&&await complete('tasks',{action:'note',title},'已添加待办。'))setQuickNote('');
    }}>
     <label htmlFor="home-quick-note">快速添加待办</label>
     <div>
      <input id="home-quick-note" maxLength={120} value={quickNote} disabled={Boolean(pending)} onChange={event=>setQuickNote(event.target.value)} placeholder="写下要做的事"/>
      <button className="v2-primary" disabled={Boolean(pending)||!quickNote.trim()}><Plus size={16} aria-hidden="true"/>{pending==='new-note'?'保存中…':'添加'}</button>
     </div>
    </form>
    {feedbackFor('tasks')}
    {tasks.length ? <ul className="today-list">{tasks.slice(0,4).map(task=><li className="dashboard-note" key={task.id}>
     <button className="check-btn" aria-label={'完成'+task.title} disabled={Boolean(pending)} onClick={()=>void complete('tasks',{action:'updateNote',id:task.id,done:true},'已完成待办，可在待办页撤销。')}><Check size={13} aria-hidden="true"/></button>
     <div>
      <strong>{task.title}</strong>
      {task.goalId&&goals.has(task.goalId)&&<small>{goals.get(task.goalId)}</small>}
      {task.due&&<small>{task.due} 截止 {dueLabel(task,date)}</small>}
     </div>
     <button className="v2-text today-focus-link" aria-label={'专注于'+task.title} onClick={()=>window.dispatchEvent(new CustomEvent('orbit:focus-task',{detail:task}))}><Timer size={14} aria-hidden="true"/>专注</button>
    </li>)}</ul> : <p className="v2-muted today-empty"><CheckCheck size={17} aria-hidden="true"/>没有待处理的事项</p>}
   </section>

   <section className="v2-card today-panel today-habit-panel" aria-labelledby="today-habit-title">
    <div className="v2-section-heading">
     <h2 id="today-habit-title" ref={habitsHeading} tabIndex={-1}><span className="today-panel-icon"><CheckCheck size={19} aria-hidden="true"/></span>今日打卡</h2>
     <button className="v2-text" onClick={()=>onNav('habits')}>{data.habits.length ? '管理习惯' : '添加习惯'} <ArrowUpRight size={15}/></button>
    </div>
    {habits.length>0&&<div className="today-progress">
     <span>今日进度</span><strong>{completedHabits.length} / {habits.length}</strong>
     <progress aria-label="今日打卡进度" max={habits.length} value={completedHabits.length}/>
    </div>}
    {feedbackFor('habits')}
    <div className="today-habits"><div className="habit-section">
     {pendingHabits.slice(0,4).map(habit=><button key={habit.id} disabled={Boolean(pending)} aria-label={'完成今日打卡：'+habit.name} onClick={()=>void complete('habits',{action:'check',id:habit.id,date,done:true},habit.name+'已打卡，可在习惯管理中撤销。')}>
      <span>{habit.icon||'✦'}</span><div><strong>{habit.name}</strong></div><em>{pending===habit.id?'保存中…':'打卡 ✓'}</em>
     </button>)}
     {pendingHabits.length>4&&<button className="v2-text" onClick={()=>onNav('habits')}>查看剩余 {pendingHabits.length-4} 项</button>}
     {!pendingHabits.length&&<p className="v2-muted today-empty"><Sparkles size={17} aria-hidden="true"/>{habits.length?'今天的习惯已全部打卡':'今天没有安排习惯'}</p>}
    </div>
    {completedHabits.length>0&&<details className="habit-section">
     <summary>已打卡 <span>{completedHabits.length}</span></summary>
     <ul className="today-completed">{completedHabits.map(habit=><li key={habit.id}><Check size={14} aria-hidden="true"/> {habit.name}</li>)}</ul>
    </details>}</div>
   </section>
  </div>
 </div>;
}
export function CalendarView({data,onNav}:{data:any;onNav:(v:string)=>void}){
 const [month,setMonth]=useState(day().slice(0,7)),[selected,setSelected]=useState(day());function shift(n:number){const d=new Date(month+'-15T12:00:00');d.setMonth(d.getMonth()+n);setMonth(d.toISOString().slice(0,7));}const rows=data.checks.filter((c:any)=>c.date===selected);
 return <div className="v2-calendar-layout"><section className="v2-card"><div className="v2-section-heading"><h2>坚持的轨迹</h2><div className="v2-month-switch"><button className="v2-icon" aria-label="上个月" onClick={()=>shift(-1)}><ChevronLeft/></button><strong>{month.replace('-','年')}月</strong><button className="v2-icon" aria-label="下个月" onClick={()=>shift(1)}><ChevronRight/></button></div></div><div className="v2-calendar">{['一','二','三','四','五','六','日'].map(x=><span className="v2-weekday" key={x}>周{x}</span>)}{Array.from({length:(new Date(month+'-01T12:00:00').getDay()+6)%7},(_,i)=><span key={'blank'+i}/>)}{Array.from({length:new Date(Number(month.slice(0,4)),Number(month.slice(5)),0).getDate()},(_,i)=>{const value=month+'-'+String(i+1).padStart(2,'0'),count=data.checks.filter((c:any)=>c.date===value).length;return <button key={value} data-selected={selected===value} data-today={day()===value} className="v2-calendar-day" onClick={()=>setSelected(value)}><strong>{i+1}</strong><span>{count?'●'.repeat(Math.min(count,4)):''}</span><small>{count?count+' 次':''}</small></button>})}</div></section><aside className="v2-card calendar-detail"><span className="v2-eyebrow">DAILY FOOTPRINTS</span><h2>{selected}</h2><p className="v2-muted">{rows.length} 次打卡记录</p>{rows.length?rows.map((c:any)=><article className="v2-record" key={c.id}><span className="v2-record-icon">{data.habits.find((h:any)=>h.id===c.habit)?.icon||'✓'}</span><div><strong>{data.habits.find((h:any)=>h.id===c.habit)?.name||'历史习惯'}</strong><small>{c.note||'今天又向前迈了一小步'}</small></div></article>):<div className="v2-empty"><p>这一天还没有记录。</p></div>}<button className="v2-secondary full" onClick={()=>onNav('habits')}>查看、编辑或补记打卡 ↗</button></aside></div>;
}
export function Insights({data}:{data:any}){const date=day();const days=Array.from({length:7},(_,i)=>{const d=new Date(date+'T12:00:00');d.setDate(d.getDate()-6+i);const key=d.toISOString().slice(0,10);return {key,count:data.checks.filter((c:any)=>c.date===key).length}}),max=Math.max(1,...days.map(x=>x.count));return <div><div className="v2-metrics"><div className="v2-card"><span>累计打卡</span><strong>{data.checks.length}<small>次</small></strong></div><div className="v2-card"><span>活跃习惯</span><strong>{data.habits.filter((h:any)=>!h.archived).length}<small>个</small></strong></div><div className="v2-card"><span>完成待办</span><strong>{data.notes.filter((n:any)=>n.done).length}<small>条</small></strong></div><div className="v2-card"><span>专注总时长</span><strong>{data.profile.focus}<small>分钟</small></strong></div></div><div className="insights-grid"><section className="v2-card"><h2>最近七天的行动</h2><div className="v2-chart">{days.map(d=><div key={d.key}><span>{d.count}</span><i style={{height:Math.max(4,d.count/max*170)}}/><small>{d.key.slice(5)}</small></div>)}</div></section><section className="v2-card"><h2>每一点坚持都有回响</h2>{[[1,'初次闪耀'],[7,'积少成多'],[30,'星光旅人'],[100,'恒星之心']].map(([n,label])=><div className="v2-achievement" data-unlocked={data.checks.length>=Number(n)} key={n}><span>✦</span><strong>{label}</strong><small>{data.checks.length>=Number(n)?'已点亮':`${data.checks.length}/${n} 次打卡`}</small></div>)}</section></div></div>}
export function PetView({data,onChange}:{data:any;onChange:()=>void}){const [happy,setHappy]=useState(false),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);return <div className="v2-pet-layout"><section className="v2-card v2-pet-home"><span className="v2-eyebrow">YOUR COSMIC COMPANION</span><h2>你好呀，我是团团。</h2><p className="v2-muted">靠你的坚持，收集星光的小精灵。</p><div className={'pet-scene large '+(happy?'excited':'')} role="button" tabIndex={0} aria-label="摸摸团团" onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.currentTarget.click()}}} onClick={()=>{setHappy(true);setMessage('团团开心地蹭了蹭你的手，今天也一起努力吧。');setTimeout(()=>setHappy(false),1200)}}><div className="pet-orbit o1"/><div className="pet-orbit o2"/><span className="star s1">✧</span><span className="star s2">✦</span><div className="pet-shadow"/><div className="pet"><div className="ear left"/><div className="ear right"/><div className="pet-body"><i className="eye left"/><i className="eye right"/><i className="blush left"/><i className="blush right"/><span className="mouth">ω</span><span className="pet-spark">✦</span></div><div className="foot left"/><div className="foot right"/></div></div><p className="pet-touch-hint">轻轻点我，或者喂我一颗星光 ✧</p><div className="v2-pet-stats"><div><small>成长等级</small><strong>Lv.{Math.floor(data.checks.length/10)+1}</strong></div><div><small>可用星能量</small><strong>{Math.max(0,data.checks.length*10-data.profile.feeds*10)} ✦</strong></div><div><small>温暖投喂</small><strong>{data.profile.feeds} 次</strong></div></div><button className="v2-primary full" disabled={busy} onClick={async()=>{setBusy(true);try{await api('/api/life',{action:'feed'});onChange();setHappy(true);setMessage('团团吃饱啦，好幸福。谢谢你今天的努力！');setTimeout(()=>setHappy(false),1200)}catch(e){setMessage((e as Error).message)}finally{setBusy(false)}}}>喂食团团 · 10 星能量</button><p className="pet-bubble" role="status">{message||'完成一次打卡获得10能量，每10次打卡升一级。'}</p></section><PetChat/></div>}
