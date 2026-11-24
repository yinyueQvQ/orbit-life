// Stable display ordering only; never rewrite the user's records.
export function visibleTasks(notes,{query='',filter='all',today='',sort='due'}={}){
 const term=query.trim().toLocaleLowerCase();
 return notes.filter(n=>(filter==='all'||(filter==='done'?n.done:!n.done))&&(!term||(n.title+' '+(n.content||'')).toLocaleLowerCase().includes(term))).slice().sort((a,b)=>{
  if(sort!=='due')return 0;
  return Number(Boolean(a.done))-Number(Boolean(b.done))||(a.due||'9999-99-99').localeCompare(b.due||'9999-99-99');
 });
}
export function dueLabel(note,today){return note.done||!note.due?'':note.due<today?'已逾期':note.due===today?'今天到期':'';}

/** @template {{goalId?: string}} Task
 * @param {Task[]} tasks
 * @param {{id: string, title: string}[]} goals
 */
export function groupTasks(tasks,goals){
 const byId=new Map(goals.map(goal=>[goal.id,goal]));
 /** @type {Map<string,{goal:{id:string,title:string},items:Task[]}>} */
 const groups=new Map();
 const independent=[];
 for(const task of tasks){
  const goal=task.goalId&&byId.get(task.goalId);
  if(!goal){independent.push(task);continue;}
  let group=groups.get(goal.id);
  if(!group){group={goal,items:[]};groups.set(goal.id,group);}
  group.items.push(task);
 }
 return {groups:[...groups.values()],independent};
}
