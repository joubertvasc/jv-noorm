"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FieldSizeExcedeedError = void 0;
class FieldSizeExcedeedError extends Error {
    constructor(message) {
        super(message ?? 'missing-field');
    }
}
exports.FieldSizeExcedeedError = FieldSizeExcedeedError;
