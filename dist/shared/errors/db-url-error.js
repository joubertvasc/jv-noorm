"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBURLError = void 0;
class DBURLError extends Error {
    constructor(message) {
        super(message || 'invalid-database-url');
    }
}
exports.DBURLError = DBURLError;
