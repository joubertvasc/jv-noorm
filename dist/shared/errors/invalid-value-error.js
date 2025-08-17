"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidValueError = void 0;
class InvalidValueError extends Error {
    constructor(message) {
        super(message ?? 'invalid-value');
    }
}
exports.InvalidValueError = InvalidValueError;
