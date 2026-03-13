import Database from 'better-sqlite3';
import path from 'path';

export class SqliteDatabase {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const projectRoot = process.cwd();
    const finalPath = dbPath || path.join(projectRoot, 'uzbechka.db');
    this.db = new Database(finalPath);
    // Enable WAL mode for better concurrency
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
  }

  // Simplified sync-to-async wrapper to match existing API usage
  prepare(sql: string) {
    // Convert PostgreSQL $1, $2 to SQLite ? if needed, 
    // but better-sqlite3 supports $ (named or pos), 
    // however usually ? is safest for basic migration.
    // Our pg-wrapper was converting ? to $1. We might need to do the reverse or just support $1.
    
    let sqliteSql = sql;
    // Simple regex to convert $1, $2... to ?
    sqliteSql = sqliteSql.replace(/\$\d+/g, '?');

    const stmt = this.db.prepare(sqliteSql);

    return {
      all: async (...params: any[]) => {
        return stmt.all(...params);
      },
      get: async (...params: any[]) => {
        return stmt.get(...params);
      },
      run: async (...params: any[]) => {
        const info = stmt.run(...params);
        return {
          changes: info.changes,
          lastInsertRowid: info.lastInsertRowid
        };
      }
    };
  }

  async exec(sql: string) {
    this.db.exec(sql);
  }

  async transaction(callback: () => Promise<void>) {
    const txn = this.db.transaction(async () => {
      await callback();
    });
    await txn();
  }

  pragma(query: string) {
    return this.db.pragma(query);
  }
}
