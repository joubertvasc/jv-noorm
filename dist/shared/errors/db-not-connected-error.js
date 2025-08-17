"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBNotConnectedError = void 0;
class DBNotConnectedError extends Error {
    constructor(message) {
        super(message || 'db-not-connected');
    }
}
exports.DBNotConnectedError = DBNotConnectedError;
