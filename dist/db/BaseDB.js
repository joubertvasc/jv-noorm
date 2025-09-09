"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDB = void 0;
const date_fns_1 = require("date-fns");
const events_1 = __importDefault(require("events"));
const env_1 = require("../env");
const wrong_delete_statement_error_1 = require("../shared/errors/wrong-delete-statement-error");
const db_error_1 = require("../shared/errors/db-error");
class BaseDB extends events_1.default {
    softDelete = false;
    metadata;
    asyncLocalStorage;
    constructor(asyncLocalStorage) {
        super();
        this.asyncLocalStorage = asyncLocalStorage;
    }
    isSoftDelete() {
        return this.softDelete;
    }
    setSoftDelete(useSoftDelete) {
        this.softDelete = useSoftDelete;
    }
    getMetadata() {
        return this.metadata || [];
    }
    async connect() {
        await this.internalConnect();
        this.metadata = await this.getDBMetadata();
    }
    async beginTransaction() {
        return this.startTransaction();
    }
    async updateMetadata() {
        this.metadata = await this.getDBMetadata();
    }
    async delete(args) {
        try {
            if ((this.isSoftDelete() || args.options?.softDelete === true) && args.options?.softDelete !== false) {
                const regex = /delete\s+from\s+([`"\[\]\w.]+)/i;
                const match = args.command.match(regex);
                if (match) {
                    const deletedAt = { date: new Date() };
                    if (args.options?.userId)
                        deletedAt.userId = args.options.userId;
                    if (args.options?.userName)
                        deletedAt.userName = args.options.userName;
                    args.command = args.command.toLowerCase().replace(`delete from ${match[1]}`, `UPDATE ${match[1]} 
                SET deleted_at = '${JSON.stringify(deletedAt)}'`);
                    const deleted = await this.update({
                        command: args.command,
                        values: args.values,
                        transaction: args.transaction,
                    });
                    return {
                        rowsDeleted: deleted.rowsUpdated,
                    };
                }
                throw new wrong_delete_statement_error_1.WrongDeleteStatementError();
            }
            else {
                return await this.internalDelete({ command: args.command, values: args.values, transaction: args.transaction });
            }
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    getTableMetadata(tableName) {
        if (!this.metadata)
            return null;
        const tableMetadata = this.metadata?.filter((table) => {
            return tableName.toLowerCase() === table.tableName.toLowerCase();
        });
        if (!tableMetadata || tableMetadata.length === 0)
            return null;
        return tableMetadata[0];
    }
    findCreatedAtColumn(table) {
        const tableMetadata = this.getTableMetadata(table);
        if (!tableMetadata)
            return null;
        for (const column of tableMetadata.columns) {
            if (column.columnName.toLowerCase() === 'created_at' || column.columnName.toLowerCase() === 'createdat') {
                return column.columnName;
            }
        }
        return null;
    }
    findUpdatedAtColumn(table) {
        const tableMetadata = this.getTableMetadata(table);
        if (!tableMetadata)
            return null;
        for (const column of tableMetadata.columns) {
            if (column.columnName.toLowerCase() === 'updated_at' || column.columnName.toLowerCase() === 'updatedat') {
                return column.columnName;
            }
        }
        return null;
    }
    findDeletedAtColumn(table) {
        const tableMetadata = this.getTableMetadata(table);
        if (!tableMetadata)
            return null;
        for (const column of tableMetadata.columns) {
            if (column.columnName.toLowerCase() === 'deleted_at' || column.columnName.toLowerCase() === 'deletedat') {
                return column.columnName;
            }
        }
        return null;
    }
    getTableReferencedConstraints(referencedTableName) {
        if (!this.metadata)
            return [];
        const constraints = [];
        for (const table of this.metadata) {
            for (const column of table.columns) {
                if (column.referencedTable && column.referencedTable === referencedTableName) {
                    constraints.push({
                        deleteRule: column.deleteRule || 'NO ACTION',
                        tableName: table.tableName,
                        columnName: column.columnName,
                        constraintName: column.constraintName || '',
                        referencedTable: column.referencedTable || '',
                        referencedColumn: column.referencedColumn || '',
                    });
                }
            }
        }
        return constraints;
    }
    emitCrudEvent(operation, args) {
        this.emit(operation, args);
    }
    getLoggedUser() {
        if (!this.asyncLocalStorage)
            return {};
        const store = this.asyncLocalStorage.getStore();
        const userId = store?.userId;
        const userName = store?.userName;
        return {
            userId,
            userName,
        };
    }
    log(header, log) {
        if (env_1.env.DB_VERBOSE)
            console.log(`${header} (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${log}`);
    }
}
exports.BaseDB = BaseDB;
