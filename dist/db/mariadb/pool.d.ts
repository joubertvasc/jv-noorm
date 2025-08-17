import { Pool, PoolOptions } from 'mysql2/promise';
export declare function initPool(config: PoolOptions): Pool;
export declare function getPool(): Pool;
