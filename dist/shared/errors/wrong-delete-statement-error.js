"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WrongDeleteStatementError = void 0;
class WrongDeleteStatementError extends Error {
    constructor(message) {
        super(message || 'wrong-delete-statement');
    }
}
exports.WrongDeleteStatementError = WrongDeleteStatementError;
