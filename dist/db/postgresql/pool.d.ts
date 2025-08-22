import { Pool, PoolConfig } from 'pg';
export declare function initPool(config: PoolConfig): Pool;
export declare function getPool(): Pool;
export declare function closePool(): Promise<void>;
