export const audioLimit = 400000;
export const audioTypes = {mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg',wav:'audio/wav'};
export const mediaId = value => typeof value==='string' && /^[-a-zA-Z0-9_]{8,80}$/.test(value);

export function audioReference(value) {
 if (value == null) return null;
 if (!mediaId(value.id) || typeof value.name!=='string' || !value.name.trim() || value.name.length>120) throw Error('音乐附件无效');
 return {id:value.id,name:value.name.trim()};
}

export function mediaReferences(state) {
 const journal=state.journal||[], memos=state.memos||[];
 return [...new Set([...journal.flatMap(entry=>entry.images||[]), ...[...journal,...memos].flatMap(entry=>entry.audio?[entry.audio.id]:[])])];
}
