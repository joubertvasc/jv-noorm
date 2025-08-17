"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolNotInitializedError = void 0;
class PoolNotInitializedError extends Error {
    constructor(message) {
        super(message || 'pool-not-initialized');
    }
}
exports.PoolNotInitializedError = PoolNotInitializedError;
