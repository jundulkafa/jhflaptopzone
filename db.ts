import Database from 'better-sqlite3';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const isSqlite = !process.env.DATABASE_URL;
let sqliteDb: any = null;
let pool: any = null;

if (isSqlite) {
  sqliteDb = new Database('jhf_erp.db');
  sqliteDb.pragma('journal_mode = WAL');
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });
}

export const dbQuery = async (text: string, params: any[] = []) => {
  if (isSqlite) {
    const sqliteText = text.replace(/\$\d+/g, '?');
    const upperText = text.trim().toUpperCase();
    if (upperText.startsWith('SELECT') || upperText.startsWith('PRAGMA')) {
      const rows = sqliteDb.prepare(sqliteText).all(params);
      return { rows, rowCount: rows.length };
    } else {
      const result = sqliteDb.prepare(sqliteText).run(params);
      return { rows: [], rowCount: result.changes, lastInsertRowid: result.lastInsertRowid };
    }
  } else {
    return pool.query(text, params);
  }
};

export const getClient = async () => {
  if (isSqlite) {
    return {
      query: dbQuery,
      release: () => {},
      rollback: () => sqliteDb.prepare('ROLLBACK').run(),
      commit: () => sqliteDb.prepare('COMMIT').run(),
      begin: () => sqliteDb.prepare('BEGIN').run()
    };
  } else {
    const client = await pool.connect();
    return {
      query: (text: string, params: any[] = []) => client.query(text, params),
      release: () => client.release(),
      rollback: () => client.query('ROLLBACK'),
      commit: () => client.query('COMMIT'),
      begin: () => client.query('BEGIN'),
      rawClient: client
    };
  }
};

export { isSqlite };
export default isSqlite ? sqliteDb : pool;
