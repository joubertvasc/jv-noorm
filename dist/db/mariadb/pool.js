"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initPool = initPool;
exports.getPool = getPool;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("../../env");
const pool_not_initialized_error_1 = require("../../shared/errors/pool-not-initialized-error");
let pool;
function initPool(config) {
    if (!pool) {
        pool = promise_1.default.createPool({
            ...config,
            waitForConnections: true,
            queueLimit: 0,
            idleTimeout: 300000,
        });
        if (env_1.env.DB_VERBOSE)
            console.log('✅ DB connection Pool started');
    }
    return pool;
}
function getPool() {
    if (!pool) {
        throw new pool_not_initialized_error_1.PoolNotInitializedError();
    }
    return pool;
}
