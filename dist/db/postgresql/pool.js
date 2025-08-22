"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPool = initPool;
exports.getPool = getPool;
exports.closePool = closePool;
const pg_1 = require("pg");
const pool_not_initialized_error_1 = require("../../shared/errors/pool-not-initialized-error");
let pool;
function initPool(config) {
    if (!pool) {
        pool = new pg_1.Pool({
            ...config,
            keepAlive: true,
            allowExitOnIdle: false,
        });
    }
    return pool;
}
function getPool() {
    if (!pool) {
        throw new pool_not_initialized_error_1.PoolNotInitializedError();
    }
    return pool;
}
async function closePool() {
    if (pool) {
        await pool.end();
    }
}
