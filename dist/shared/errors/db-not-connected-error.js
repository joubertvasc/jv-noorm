"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBNotConnectedError = void 0;
class DBNotConnectedError extends Error {
    constructor(message) {
        super(message || 'db-not-connected');
    }
}
exports.DBNotConnectedError = DBNotConnectedError;
