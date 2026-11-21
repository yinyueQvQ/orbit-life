// Keep the latest tap visible while serializing writes for each note.
export function createNoteToggleQueue({write,change,error,settled}){
 const pending=new Map();
 async function flush(id,entry){
  try{
   while(entry.desired!==entry.saved){
    const target=entry.desired;
    await write(id,target);
    entry.saved=target;
   }
  }catch(e){change(id,entry.saved);error(e);}
  finally{pending.delete(id);settled();}
 }
 return {
  toggle(note){
   let entry=pending.get(note.id);
   if(entry){entry.desired=!entry.desired;change(note.id,entry.desired);return;}
   entry={saved:Boolean(note.done),desired:!note.done};
   pending.set(note.id,entry);change(note.id,entry.desired);
   void flush(note.id,entry);
  },
  overlay(notes){return notes.map(note=>pending.has(note.id)?{...note,done:pending.get(note.id).desired}:note);}
 };
}
