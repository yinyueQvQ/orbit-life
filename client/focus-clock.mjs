// Keep the phase and task identity when a completed timer is restarted.
export function toggleClock(clock, now = Date.now()) {
 if (clock.pending) return clock;
 if (clock.running) return {...clock, running:false, remaining:Math.max(0, Math.ceil((clock.deadline-now)/1000))};
 if (clock.remaining>0) return {...clock, running:true, deadline:now+clock.remaining*1000};
 return {...clock, id:crypto.randomUUID(), running:true, remaining:clock.duration, deadline:now+clock.duration*1000, pending:false, synced:false};
}

// Reject partial/corrupted persisted sessions before they can drive a live timer.
export function restoreClock(value){
 if(!value||typeof value!=='object'||typeof value.id!=='string'||!value.id||!['focus','break'].includes(value.phase)||typeof value.label!=='string')return null;
 if(!Number.isInteger(value.duration)||value.duration<60||value.duration>43200||!Number.isInteger(value.remaining)||value.remaining<0||value.remaining>value.duration)return null;
 if(!['running','pending','synced'].every(k=>typeof value[k]==='boolean')||!Number.isFinite(value.deadline)||value.deadline<0)return null;
 if(value.running&&(value.deadline===0||value.pending||value.synced)||value.pending&&(value.phase!=='focus'||value.remaining!==0)||value.synced&&value.remaining!==0)return null;
 return {...value};
}
