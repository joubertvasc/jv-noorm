"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvNotDefinedError = void 0;
class EnvNotDefinedError extends Error {
    constructor(message) {
        super(message ?? 'env-not-defined');
    }
}
exports.EnvNotDefinedError = EnvNotDefinedError;
