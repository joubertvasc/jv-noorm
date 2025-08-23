"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDB = void 0;
const date_fns_1 = require("date-fns");
const wrong_delete_statement_error_1 = require("../shared/errors/wrong-delete-statement-error");
const db_error_1 = require("../shared/errors/db-error");
const env_1 = require("../env");
class BaseDB {
    softDelete = false;
    metadata;
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
    log(header, log) {
        if (env_1.env.DB_VERBOSE)
            console.log(`${header} (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${log}`);
    }
}
exports.BaseDB = BaseDB;
