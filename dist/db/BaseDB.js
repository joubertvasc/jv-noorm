"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseDB = void 0;
const wrong_delete_statement_error_1 = require("../shared/errors/wrong-delete-statement-error");
const db_error_1 = require("../shared/errors/db-error");
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
}
exports.BaseDB = BaseDB;
