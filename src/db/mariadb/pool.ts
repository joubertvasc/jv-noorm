import mysql, { Pool, PoolOptions } from 'mysql2/promise';
import { env } from '../../env';
import { PoolNotInitializedError } from '../../shared/errors/pool-not-initialized-error';

let pool: Pool;

export function initPool(config: PoolOptions): Pool {
  if (!pool) {
    pool = mysql.createPool({
      ...config,
      waitForConnections: true,
      queueLimit: 0,
    });

    if (env.DB_VERBOSE) console.log('✅ DB connection Pool started');
  }

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new PoolNotInitializedError();
  }

  return pool;
}
