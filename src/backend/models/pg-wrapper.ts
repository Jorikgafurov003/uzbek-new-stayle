import pg from 'pg';

const { Pool } = pg;

export class PgDatabase {
  private pool: pg.Pool;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || process.env.DATABASE_URL;
    if (!dbUrl) {
        console.warn('DATABASE_URL is not defined in the environment. Using generic localhost for now.');
    }
    this.pool = new Pool({
      connectionString: dbUrl || 'postgresql://postgres:postgres@localhost:5432/uzbechka',
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  // Simplified sync-like API for the transition
  // Note: All operations are actually async now, caller must await
  prepare(sql: string) {
    // Convert SQLite ? to PostgreSQL $1, $2, etc.
    let pgSql = sql;
    let paramCount = 1;
    while (pgSql.includes('?')) {
      pgSql = pgSql.replace('?', `$${paramCount}`);
      paramCount++;
    }

    return {
      all: async (...params: any[]) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows;
      },
      get: async (...params: any[]) => {
        const result = await this.pool.query(pgSql, params);
        return result.rows[0] || null;
      },
      run: async (...params: any[]) => {
        const result = await this.pool.query(pgSql, params);
        // Approximation for lastInsertRowid. This assumes RETURNING id is added to INSERTs
        // or we just return rowCount for now. True PostgreSQL requires 'RETURNING id' on the query.
        return {
          changes: result.rowCount,
          lastInsertRowid: result.rows.length > 0 ? result.rows[0].id : undefined
        };
      }
    };
  }

  async exec(sql: string) {
    await this.pool.query(sql);
  }

  async transaction(callback: () => Promise<void>) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await callback();
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  pragma(query: string) {
    // No-op for PostgreSQL
  }
}
