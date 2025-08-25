"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableDoesNotExistsError = void 0;
class TableDoesNotExistsError extends Error {
    constructor(message) {
        super(message || 'table-does-not-exists');
    }
}
exports.TableDoesNotExistsError = TableDoesNotExistsError;
