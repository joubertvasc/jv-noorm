"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PoolNotInitializedError = void 0;
class PoolNotInitializedError extends Error {
    constructor(message) {
        super(message || 'pool-not-initialized');
    }
}
exports.PoolNotInitializedError = PoolNotInitializedError;
