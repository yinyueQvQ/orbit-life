import {randomBytes,createCipheriv,createDecipheriv} from 'node:crypto';
export function keyVault(store,encoded){
 const key=Buffer.from(encoded||'','base64');if(key.length!==32)throw Error('账号密钥加密配置无效');
 return {async get(uid){const row=await store.get('SELECT value FROM orbit_ai_secrets WHERE user_id=?',uid);if(!row)return null;const data=Buffer.from(row.value,'base64');const cipher=createDecipheriv('aes-256-gcm',key,data.subarray(0,12));cipher.setAuthTag(data.subarray(12,28));return Buffer.concat([cipher.update(data.subarray(28)),cipher.final()]).toString('utf8');},async set(uid,value){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);const encrypted=Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');await store.saveSecret(uid,encrypted,Date.now());},async clear(uid){await store.run('DELETE FROM orbit_ai_secrets WHERE user_id=?',uid);}};
}
