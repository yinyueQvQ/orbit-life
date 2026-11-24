import {mediaSchema} from './media.mjs';
export const accountSchema=mediaSchema+`CREATE TABLE IF NOT EXISTS orbit_ai_secrets (user_id TEXT PRIMARY KEY,value TEXT NOT NULL,updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orbit_users (id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE, display_name TEXT NOT NULL, password_hash TEXT NOT NULL, recovery_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orbit_sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES orbit_users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orbit_workspaces (user_id TEXT PRIMARY KEY REFERENCES orbit_users(id) ON DELETE CASCADE, value TEXT NOT NULL, revision INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS orbit_requests (user_id TEXT NOT NULL, request_id TEXT NOT NULL, result TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY(user_id,request_id));
CREATE TABLE IF NOT EXISTS orbit_limits (bucket TEXT PRIMARY KEY, attempts INTEGER NOT NULL, expires INTEGER NOT NULL);`;
function sqliteAccountStore(store) {
 return Object.assign(store, {
  async incrementLimit(bucket, expires, now) {
   const row = await store.get(
    'INSERT INTO orbit_limits (bucket,attempts,expires) VALUES (?,1,?) ON CONFLICT(bucket) DO UPDATE SET attempts=CASE WHEN expires<? THEN 1 ELSE attempts+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING attempts',
    bucket, expires, now, now
   );
   return row.attempts;
  },
  initializeWorkspace(uid, value, updatedAt) {
   return store.run('INSERT OR IGNORE INTO orbit_workspaces VALUES (?,?,0,?)', uid, value, updatedAt);
  },
  saveSecret(uid, value, updatedAt) {
   return store.run('INSERT INTO orbit_ai_secrets VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at', uid, value, updatedAt);
  },
  withWorkspace(_uid, work) {
   return work(store);
  },
 });
}

export function nodeStore(db){return sqliteAccountStore({get:async(sql,...args)=>db.prepare(sql).get(...args),all:async(sql,...args)=>db.prepare(sql).all(...args),run:async(sql,...args)=>{const r=db.prepare(sql).run(...args);return {changes:Number(r.changes)}}});}
export function d1Store(db){return sqliteAccountStore({get:async(sql,...args)=>db.prepare(sql).bind(...args).first(),all:async(sql,...args)=>(await db.prepare(sql).bind(...args).all()).results,run:async(sql,...args)=>{const r=await db.prepare(sql).bind(...args).run();return {changes:r.meta.changes||0}}});}
