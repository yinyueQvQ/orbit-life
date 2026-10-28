export function dueReminders(state,hour=9){
 const records=[...(state.notes||[]).filter(n=>!n.done&&n.due).map(n=>({id:'note:'+n.id,title:n.title,date:n.due,kind:'note',recordId:n.id})),...(state.goals||[]).filter(g=>!g.done&&g.deadline).map(g=>({id:'goal:'+g.id,title:g.title,date:g.deadline,kind:'goal',recordId:g.id}))];
 return records.map(r=>({...r,at:Date.parse(r.date+'T'+String(hour).padStart(2,'0')+':00:00+08:00'),key:r.id+':'+r.date+':'+hour})).filter(r=>Number.isFinite(r.at)).sort((a,b)=>a.at-b.at);
}
