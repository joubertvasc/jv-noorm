"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DBSchemaNotDefinedError = void 0;
class DBSchemaNotDefinedError extends Error {
    constructor(message) {
        super(message || 'db-schema-not-defined');
    }
}
exports.DBSchemaNotDefinedError = DBSchemaNotDefinedError;
