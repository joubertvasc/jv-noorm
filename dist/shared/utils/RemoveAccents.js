"use strict";
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
