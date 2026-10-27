export const beijingDay=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai'}).format(new Date());
export function newState(){return {focusSessions:[],timerSettings:{minutes:25,breakMinutes:5},habits:[],checks:[],transactions:[],goals:[],notes:[],pending:[],messages:[],profile:{budget:300000,pet_name:'团团',feeds:0,focus:0},forecast:{salary:0,bonus:0,deductions:0,other:0,expenses:0,savingTarget:0,currentSavings:0}};}
const fail=s=>{throw Error(s)};
const text=(v,n=120)=>typeof v==='string'&&v.trim()&&v.length<=n?v.trim():fail('请检查文字内容');
const amount=(v,zero=false)=>Number.isSafeInteger(v)&&v>=(zero?0:1)&&v<=100000000?v:fail('金额须为有效的非负数（单位为分）');
const date=(v,optional=false)=>{if(!v&&optional)return '';if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)fail('日期无效');return v};
const lookup=(list,id)=>list.find(x=>x.id===id)||fail('记录不存在');
export const actions=['habit','updateHabit','check','updateCheck','deleteCheck','deleteHabit','transaction','updateTransaction','deleteTransaction','budget','feed','focus','timerSettings','goal','updateGoal','deleteGoal','note','updateNote','deleteNote','forecast'];
export function applyChange(previous,b,day=beijingDay()){
 const s=structuredClone(normalizeState(previous)),id=()=>crypto.randomUUID();
 switch(b.action){
 case 'habit':{const h={id:id(),owner:'local-owner',name:text(b.name,80),goal:text(b.goal,80),category:['健康','学习','生活'].includes(b.category)?b.category:fail('分类无效'),icon:text(b.icon,10),created:day,days:[0,1,2,3,4,5,6],archived:false};if(b.days!==undefined){if(!Array.isArray(b.days)||!b.days.length||b.days.some(d=>!Number.isInteger(d)||d<0||d>6))fail('请选择有效的重复日');h.days=[...new Set(b.days)];}s.habits.push(h);break;}
 case 'updateHabit':{const h=lookup(s.habits,b.id);if(b.name!==undefined)h.name=text(b.name,80);if(b.goal!==undefined)h.goal=text(b.goal,80);if(b.category!==undefined)h.category=['健康','学习','生活'].includes(b.category)?b.category:fail('分类无效');if(b.icon!==undefined)h.icon=text(b.icon,10);if(b.days!==undefined){if(!Array.isArray(b.days)||!b.days.length||b.days.some(d=>!Number.isInteger(d)||d<0||d>6))fail('请选择有效的重复日');h.days=[...new Set(b.days)];}if(b.archived!==undefined){if(typeof b.archived!=='boolean')fail('归档状态无效');h.archived=b.archived;}break;}
 case 'check':{if(date(b.date)>day||typeof b.done!=='boolean')fail('日期或完成状态无效，不能记录未来');lookup(s.habits,b.id);const key=b.id+':'+b.date;const old=s.checks.find(c=>c.habit===b.id&&c.date===b.date);s.checks=s.checks.filter(c=>!(c.habit===b.id&&c.date===b.date));if(b.done)s.checks.push({id:old?.id||key,owner:'local-owner',habit:b.id,date:b.date,note:b.note===undefined?(old?.note||''):(b.note?text(b.note,500):'')});break;}
 case 'updateCheck':{const c=lookup(s.checks,b.id);if(b.date!==undefined){if(date(b.date)>day)fail('不能记录未来');if(s.checks.some(x=>x.id!==c.id&&x.habit===c.habit&&x.date===b.date))fail('该习惯在这天已经打卡');c.date=b.date;}if(b.note!==undefined)c.note=b.note?text(b.note,500):'';break;}
 case 'deleteCheck':lookup(s.checks,b.id);s.checks=s.checks.filter(x=>x.id!==b.id);break;
 case 'deleteHabit':lookup(s.habits,b.id);s.habits=s.habits.filter(x=>x.id!==b.id);s.checks=s.checks.filter(x=>x.habit!==b.id);break;
 case 'transaction':if(!['income','expense'].includes(b.kind))fail('收支类型无效');if(date(b.date)>day)fail('未来收入请写入规划，不能作为实际到账');s.transactions.unshift({id:id(),owner:'local-owner',amount:amount(b.amount),kind:b.kind,category:text(b.category,30),note:typeof b.note==='string'&&b.note.length<=120?b.note:fail('备注过长'),date:b.date});break;
 case 'deleteTransaction':lookup(s.transactions,b.id);s.transactions=s.transactions.filter(x=>x.id!==b.id);break;
 case 'budget':s.profile.budget=amount(b.amount);break;
 case 'feed':if(s.profile.feeds>=s.checks.length)fail('能量不足，先完成一次打卡吧');s.profile.feeds++;break;
 case 'focus':if(!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>720)fail('专注时长须为1到720分钟');if(b.sessionId&&s.focusSessions.some(x=>x.id===b.sessionId))break;s.profile.focus+=b.minutes;s.focusSessions.unshift({id:b.sessionId?text(b.sessionId,120):id(),minutes:b.minutes,label:b.label?text(b.label,80):'自由专注',date:day,completedAt:new Date().toISOString()});break;
 case 'timerSettings':if(!Number.isInteger(b.minutes)||b.minutes<1||b.minutes>720||!Number.isInteger(b.breakMinutes)||b.breakMinutes<1||b.breakMinutes>120)fail('专注1到720分钟，休息1到120分钟');s.timerSettings={minutes:b.minutes,breakMinutes:b.breakMinutes};break;
 case 'updateTransaction':{const old=lookup(s.transactions,b.id);const checked=applyChange(newState(),{...old,...b,action:'transaction'},day).transactions[0];Object.assign(old,checked,{id:old.id});break;}
 case 'goal':s.goals.push({id:id(),title:text(b.title,80),target:amount(b.target,true),saved:amount(b.saved||0,true),deadline:date(b.deadline,true),done:false});break;
 case 'updateGoal':{const g=lookup(s.goals,b.id);if(b.title!==undefined)g.title=text(b.title,80);if(b.target!==undefined)g.target=amount(b.target,true);if(b.saved!==undefined)g.saved=amount(b.saved,true);if(b.deadline!==undefined)g.deadline=date(b.deadline,true);if(b.done!==undefined){if(typeof b.done!=='boolean')fail('完成状态无效');g.done=b.done;}break;}
 case 'deleteGoal':lookup(s.goals,b.id);s.goals=s.goals.filter(x=>x.id!==b.id);s.notes.forEach(n=>{if(n.goalId===b.id)n.goalId=''});break;
 case 'note':if(b.goalId)lookup(s.goals,b.goalId);s.notes.unshift({id:id(),title:text(b.title,120),content:b.content?text(b.content,2000):'',goalId:b.goalId||'',due:date(b.due,true),done:false,created:day});break;
 case 'updateNote':{const n=lookup(s.notes,b.id);if(b.title!==undefined)n.title=text(b.title,120);if(b.content!==undefined)n.content=b.content?text(b.content,2000):'';if(b.goalId!==undefined){if(b.goalId)lookup(s.goals,b.goalId);n.goalId=b.goalId;}if(b.due!==undefined)n.due=date(b.due,true);if(b.done!==undefined){if(typeof b.done!=='boolean')fail('完成状态无效');n.done=b.done;}break;}
 case 'deleteNote':lookup(s.notes,b.id);s.notes=s.notes.filter(x=>x.id!==b.id);break;
 case 'forecast':{for(const k of Object.keys(s.forecast))if(b[k]!==undefined)s.forecast[k]=amount(b[k],true);break;}
 default:fail('不支持此操作');
 }return s;
}
export function forecastSummary(s){const f=s.forecast;const income=f.salary+f.bonus+f.other-f.deductions,available=income-f.expenses,gap=Math.max(0,f.savingTarget-available),next=new Date(beijingDay()+'T12:00:00');next.setDate(1);next.setMonth(next.getMonth()+1);return {month:next.toISOString().slice(0,7),income,expenses:f.expenses,available,target:f.savingTarget,gap,balance:f.currentSavings+available};}
export function publicState(s){s=normalizeState(s);const {messages,pending,_applied,...rest}=s;return {...rest,forecastSummary:forecastSummary(s)};}
export function readScope(s,scope){switch(scope){case 'habits':return {habits:s.habits,checks:s.checks.slice(-100)};case 'money':return {transactions:s.transactions.slice(0,60),budget:s.profile.budget};case 'goals':return {goals:s.goals,notes:s.notes};case 'forecast':return {...s.forecast,...forecastSummary(s)};case 'pet':return {level:Math.floor(s.checks.length/10)+1,energy:Math.max(0,s.checks.length*10-s.profile.feeds*10),feeds:s.profile.feeds,focusMinutes:s.profile.focus};default:return {habits:s.habits,goals:s.goals,notes:s.notes,forecast:{...s.forecast,...forecastSummary(s)},budget:s.profile.budget,totalChecks:s.checks.length,transactionCount:s.transactions.length};}}
export function confirmProposal(previous,id){const p=lookup(previous.pending,id);if(Date.now()>p.expires)fail('建议已过期，请让团团重新生成');const s=applyChange(previous,p.change);s.pending=s.pending.filter(x=>x.id!==id);return s;}
export function propose(s,change){if(!actions.includes(change.action))fail('不支持的 AI 操作');applyChange(s,change);const record=[...s.habits,...s.goals,...s.notes,...s.transactions].find(x=>x.id===change.id);const targetLabel=record?(record.name||record.title||[record.date,record.category,((record.amount||0)/100).toFixed(2)+'元'].join(' · ')):'';const goalLabel=change.goalId?s.goals.find(g=>g.id===change.goalId)?.title||'':'';return {id:crypto.randomUUID(),change,targetLabel,goalLabel,expires:Date.now()+20*60*1000};}

export function validateBackup(s){
 if(!s||typeof s!=='object')fail('备份格式无效');
 const lists=['habits','checks','transactions','goals','notes','pending','messages'];if(!lists.every(k=>Array.isArray(s[k])&&s[k].length<=50000)||!s.profile||!s.forecast)fail('备份格式无效');
 const ids=new Set();for(const name of ['habits','goals','notes','transactions'])for(const item of s[name]){if(!item||typeof item.id!=='string'||!item.id||item.id.length>120||ids.has(item.id))fail('备份记录ID无效');ids.add(item.id);}
 for(const h of s.habits){text(h.name,80);text(h.goal,80);text(h.icon,10);if(!['健康','学习','生活'].includes(h.category))fail('习惯分类无效');date(h.created);}
 for(const t of s.transactions){amount(t.amount);date(t.date);text(t.category,30);if(!['income','expense'].includes(t.kind)||typeof t.note!=='string'||t.note.length>120)fail('账目格式无效');}
 for(const c of s.checks){if(!c||!s.habits.some(h=>h.id===c.habit))fail('打卡关联无效');date(c.date);}
 for(const g of s.goals){text(g.title,80);amount(g.target,true);amount(g.saved,true);date(g.deadline,true);if(typeof g.done!=='boolean')fail('目标格式无效');}
 for(const n of s.notes){text(n.title,120);if(typeof n.content!=='string'||n.content.length>2000||typeof n.done!=='boolean')fail('备忘格式无效');date(n.due,true);if(n.goalId&&!s.goals.some(g=>g.id===n.goalId))fail('备忘关联无效');}
 amount(s.profile.budget);for(const key of ['feeds','focus'])if(!Number.isSafeInteger(s.profile[key])||s.profile[key]<0)fail('伙伴数据无效');
 for(const k of Object.keys(newState().forecast))amount(s.forecast[k],true);
 for(const m of s.messages)if(!m||!['user','assistant'].includes(m.role)||typeof m.content!=='string'||m.content.length>10000)fail('对话格式无效');
 return {...s,pending:[],messages:s.messages.slice(-60)};
}

export function normalizeState(value={}){const base=newState();return {...base,...value,profile:{...base.profile,...value.profile},forecast:{...base.forecast,...value.forecast},timerSettings:{...base.timerSettings,...value.timerSettings},focusSessions:value.focusSessions||[],habits:(value.habits||[]).map(h=>({...h,days:h.days||[0,1,2,3,4,5,6],archived:Boolean(h.archived)})),checks:(value.checks||[]).map(c=>({...c,note:c.note||''}))};}
