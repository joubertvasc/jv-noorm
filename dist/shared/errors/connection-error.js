"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectionError = void 0;
class ConnectionError extends Error {
    constructor(message) {
        super(message);
    }
}
exports.ConnectionError = ConnectionError;
