import { Pool, PoolConfig } from 'pg';
import { PoolNotInitializedError } from '../../shared/errors/pool-not-initialized-error';

let pool: Pool;

export function initPool(config: PoolConfig): Pool {
  if (!pool) {
    pool = new Pool({
      ...config,
      keepAlive: true,
      allowExitOnIdle: false,
    });
  }

  return pool;
}

export function getPool(): Pool {
  if (!pool) {
    throw new PoolNotInitializedError();
  }

  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
  }
}
