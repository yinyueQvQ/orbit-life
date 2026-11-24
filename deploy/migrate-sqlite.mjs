import {statSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {accountTables} from '../server/mysql-store.mjs';

const migration = 'railway-sqlite-v1';
const columns = {
 orbit_users: 'id,username,display_name,password_hash,recovery_hash,created_at',
 orbit_sessions: 'token_hash,user_id,expires',
 orbit_workspaces: 'user_id,value,revision,updated_at',
 orbit_requests: 'user_id,request_id,result,created_at',
 orbit_limits: 'bucket,attempts,expires',
 orbit_ai_secrets: 'user_id,value,updated_at',
 orbit_media: 'owner,id,data_url,width,height,created_at',
};

// Called with the MySQL initialization lock held, before accepting requests.
export async function migrateSqlite(connection, file, enabled) {
 const [applied] = await connection.execute('SELECT name FROM orbit_migrations WHERE name=?', [migration]);
 if (applied.length) return;
 const source = statSync(file, {throwIfNoEntry: false});
 if (!source && !enabled) return;
 if (!source?.isFile()) throw Error('找不到待迁移的 SQLite 数据库文件');
 if (!enabled) throw Error('检测到旧 SQLite 数据库。请先停止旧服务写入并备份，再设置 ORBIT_MIGRATE_SQLITE=1');

 const sqlite = new DatabaseSync(file, {readOnly: true});
 try {
  sqlite.exec('BEGIN');
  if (!sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='orbit_users'").get()) {
   throw Error('SQLite 来源文件缺少星轨账号表');
  }
  await connection.beginTransaction();
  try {
   const counts = {};
   for (const table of Object.keys(accountTables)) {
    const [existing] = await connection.query(`SELECT 1 FROM ${table} LIMIT 1`);
    if (existing.length) throw Error('MySQL 目标已有星轨数据，请使用空数据库迁移');
    const known = sqlite.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!known) {
     if (table === 'orbit_workspaces' || table === 'orbit_sessions') throw Error(`SQLite 来源文件缺少 ${table} 表`);
     continue;
    }
    const fields = columns[table];
    const placeholders = fields.split(',').map(() => '?').join(',');
    const insert = `INSERT INTO ${table} (${fields}) VALUES (${placeholders})`;
    let count = 0;
    for (const row of sqlite.prepare(`SELECT ${fields} FROM ${table}`).iterate()) {
     await connection.execute(insert, Object.values(row));
     count++;
    }
    counts[table] = count;
   }
   await connection.execute('INSERT INTO orbit_migrations VALUES (?,?)', [migration, Date.now()]);
   await connection.commit();
   console.log('SQLite 已迁移到 MySQL', counts);
  } catch (error) {
   await connection.rollback();
   throw error;
  }
 } finally {
  sqlite.close();
 }
}
