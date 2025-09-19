"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeAccents = removeAccents;
function removeAccents(text) {
    if (!text)
        return '';
    if (typeof text !== 'string')
        return text;
    return typeof text === 'string'
        ? text
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/º/g, '.')
        : text;
}
