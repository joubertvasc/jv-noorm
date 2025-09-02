/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

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
      // reconnect: true,
      // acquireTimeout: 60000,
      // timeout: 60000,
      idleTimeout: 300000,
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
