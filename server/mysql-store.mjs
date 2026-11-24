import {createHash} from 'node:crypto';
import {createPool} from 'mysql2/promise';

const tableOptions = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin';
export const accountTables = {
 orbit_users: 'id VARCHAR(36) PRIMARY KEY, username VARCHAR(32) NOT NULL UNIQUE, display_name VARCHAR(64) NOT NULL, password_hash VARCHAR(255) NOT NULL, recovery_hash VARCHAR(128) NOT NULL, created_at BIGINT NOT NULL',
 orbit_sessions: 'token_hash VARCHAR(128) PRIMARY KEY, user_id VARCHAR(36) NOT NULL, expires BIGINT NOT NULL, FOREIGN KEY (user_id) REFERENCES orbit_users(id) ON DELETE CASCADE',
 orbit_workspaces: 'user_id VARCHAR(36) PRIMARY KEY, value LONGTEXT NOT NULL, revision BIGINT NOT NULL DEFAULT 0, updated_at BIGINT NOT NULL, FOREIGN KEY (user_id) REFERENCES orbit_users(id) ON DELETE CASCADE',
 orbit_requests: 'user_id VARCHAR(36) NOT NULL, request_id VARCHAR(120) NOT NULL, result LONGTEXT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY (user_id,request_id)',
 orbit_limits: 'bucket VARCHAR(128) PRIMARY KEY, attempts BIGINT NOT NULL, expires BIGINT NOT NULL',
 orbit_ai_secrets: 'user_id VARCHAR(36) PRIMARY KEY, value TEXT NOT NULL, updated_at BIGINT NOT NULL',
 orbit_media: 'owner VARCHAR(36) NOT NULL, id VARCHAR(80) NOT NULL, data_url LONGTEXT NOT NULL, width INT NOT NULL, height INT NOT NULL, created_at BIGINT NOT NULL, PRIMARY KEY (owner,id)',
};

export function orbitMysqlPool(env = process.env) {
 const url = new URL(env.ORBIT_MYSQL_URL || env.MYSQL_URL || 'about:blank');
 const database = decodeURIComponent(url.pathname.slice(1));
 if (url.protocol !== 'mysql:' || !url.hostname || !url.username || !database) {
  throw Error('请配置 ORBIT_MYSQL_URL 或 MYSQL_URL，连接到专用的 MySQL 数据库');
 }
 return createPool({
  host: url.hostname.replace(/^\[|\]$/g, ''),
  port: Number(url.port || 3306),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  database,
  charset: 'UTF8MB4_BIN',
  decimalNumbers: true,
  connectionLimit: 10,
  queueLimit: 100,
  ...(env.ORBIT_MYSQL_TLS === '1' ? {ssl: {rejectUnauthorized: true}} : {}),
 });
}

export async function bootstrapMysql(pool, migrate) {
 const connection = await pool.getConnection();
 try {
  const [[{name}]] = await connection.query('SELECT DATABASE() AS name');
  const lock = 'orbit:' + createHash('sha256').update(name).digest('hex').slice(0, 48);
  const [[{acquired}]] = await connection.execute('SELECT GET_LOCK(?,60) AS acquired', [lock]);
  if (acquired !== 1) throw Error('等待 MySQL 初始化超时');
  for (const [name, columns] of Object.entries(accountTables)) {
   await connection.query(`CREATE TABLE IF NOT EXISTS ${name} (${columns}) ${tableOptions}`);
  }
  await connection.query(`CREATE TABLE IF NOT EXISTS orbit_migrations (name VARCHAR(64) PRIMARY KEY, applied_at BIGINT NOT NULL) ${tableOptions}`);
  await migrate(connection);
 } finally {
  // Closing the dedicated connection releases the initialization lock on failure too.
  connection.destroy();
 }
}

function queries(connection) {
 return {
  async get(sql, ...args) {
   const [rows] = await connection.execute(sql, args);
   return rows[0];
  },
  async run(sql, ...args) {
   const [result] = await connection.execute(sql, args);
   return {changes: result.affectedRows};
  },
 };
}

async function inTransaction(pool, work) {
 const connection = await pool.getConnection();
 try {
  await connection.beginTransaction();
  const result = await work(queries(connection));
  await connection.commit();
  return result;
 } catch (error) {
  try {
   await connection.rollback();
  } catch {
   connection.destroy();
  }
  throw error;
 } finally {
  connection.release();
 }
}

export function mysqlStore(pool) {
 const store = queries(pool);
 return Object.assign(store, {
  incrementLimit(bucket, expires, now) {
   return inTransaction(pool, async tx => {
    await tx.run(
     `INSERT INTO orbit_limits VALUES (?,1,?) AS incoming
      ON DUPLICATE KEY UPDATE attempts=IF(orbit_limits.expires<?,1,orbit_limits.attempts+1),
      expires=IF(orbit_limits.expires<?,incoming.expires,orbit_limits.expires)`,
     bucket, expires, now, now
    );
    return (await tx.get('SELECT attempts FROM orbit_limits WHERE bucket=?', bucket)).attempts;
   });
  },
  initializeWorkspace(uid, value, updatedAt) {
   return store.run('INSERT INTO orbit_workspaces VALUES (?,?,0,?) AS incoming ON DUPLICATE KEY UPDATE user_id=incoming.user_id', uid, value, updatedAt);
  },
  saveSecret(uid, value, updatedAt) {
   return store.run('INSERT INTO orbit_ai_secrets VALUES (?,?,?) AS incoming ON DUPLICATE KEY UPDATE value=incoming.value,updated_at=incoming.updated_at', uid, value, updatedAt);
  },
  withWorkspace(uid, work) {
   return inTransaction(pool, async tx => {
    await tx.get('SELECT id FROM orbit_users WHERE id=? FOR UPDATE', uid);
    return work(tx);
   });
  },
 });
}
