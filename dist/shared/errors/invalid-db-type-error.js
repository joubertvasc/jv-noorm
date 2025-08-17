"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidDBTypeError = void 0;
class InvalidDBTypeError extends Error {
    constructor(message) {
        super(message || 'invalid-db-type');
    }
}
exports.InvalidDBTypeError = InvalidDBTypeError;
