import {normalizeState,validateBackup} from './domain.mjs';
const lists=['habits','checks','transactions','goals','notes','focusSessions'];
export function migrationCounts(state){return Object.fromEntries(lists.map(k=>[k,state[k]?.length||0]));}
export function mergeLocalData(current,incoming){
 const target=structuredClone(normalizeState(current));
 const source=validateBackup(normalizeState(incoming));
 if(!Array.isArray(source.focusSessions)||source.focusSessions.length>50000)throw Error('专注记录格式无效');
 for(const s of source.focusSessions)if(!s||typeof s.id!=='string'||!s.id||s.id.length>120||!Number.isInteger(s.minutes)||s.minutes<1||s.minutes>720||typeof s.label!=='string'||s.label.length>80||!/^\d{4}-\d{2}-\d{2}$/.test(s.date))throw Error('专注记录格式无效');
 const added=Object.fromEntries(lists.map(k=>[k,0]));
 for(const key of lists){
  const ids=new Set(target[key].map(x=>x.id));
  for(const item of source[key]){
   if(ids.has(item.id))continue;
   if(key==='checks'&&target.checks.some(x=>x.habit===item.habit&&x.date===item.date))continue;
   // Preserve cloud records on ID collision; importing never edits existing data.
   if(['habits','goals','notes','transactions'].includes(key)&&['habits','goals','notes','transactions'].some(k=>k!==key&&target[k].some(x=>x.id===item.id)))throw Error('记录编号冲突，请先分别导出备份');
   target[key].push(structuredClone(item));ids.add(item.id);added[key]++;
   if(key==='focusSessions')target.profile.focus+=item.minutes;
  }
 }
 target.transactions.sort((a,b)=>b.date.localeCompare(a.date));
 target.focusSessions.sort((a,b)=>(b.completedAt||b.date).localeCompare(a.completedAt||a.date));
 validateBackup(target);
 return {state:target,added};
}
