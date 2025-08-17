"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = require("./pool");
const date_fns_1 = require("date-fns");
const env_1 = require("../../env");
const db_error_1 = require("../../shared/errors/db-error");
const BaseDB_1 = require("../BaseDB");
const db_not_connected_error_1 = require("../../shared/errors/db-not-connected-error");
const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // ms
class MariaDB extends BaseDB_1.BaseDB {
    pool;
    retries = 0;
    async internalConnect() {
        while (this.retries < MAX_RETRIES) {
            try {
                this.pool = (0, pool_1.initPool)({
                    user: env_1.env.DB_USER,
                    password: env_1.env.DB_PASSWORD,
                    database: env_1.env.DB_DATABASE,
                    host: env_1.env.DB_HOST,
                    port: env_1.env.DB_PORT,
                    connectionLimit: env_1.env.DB_MAX_POOL,
                });
                await this.pool.query('SELECT 1');
                if (env_1.env.DB_VERBOSE)
                    console.log('✅ DB Connected');
                return this.pool;
            }
            catch (err) {
                this.retries++;
                console.error(`❌ DB pool error (retries ${this.retries}):`, err);
                if (this.retries >= MAX_RETRIES) {
                    throw new db_error_1.DBError('Max number of retries. Aborting...');
                }
                console.log(`⏳ Retrying again in ${RETRY_DELAY / 1000}s...`);
                await new Promise(res => setTimeout(res, RETRY_DELAY));
            }
        }
        return null;
    }
    async close() {
        this.pool?.end();
    }
    async query(args) {
        try {
            if (!this.pool)
                throw new db_not_connected_error_1.DBNotConnectedError();
            if (env_1.env.DB_VERBOSE) {
                console.log(`${args.verboseHeader} (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${args.sql}`);
            }
            const connection = args.transaction ? args.transaction : await this.pool.getConnection();
            if (!connection)
                throw new db_not_connected_error_1.DBNotConnectedError();
            const result = await connection.query(args.sql, args.values);
            if (!args.transaction)
                connection.destroy();
            return !result ? null : result[0];
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async execCommand(args) {
        try {
            if (!this.pool)
                throw new db_not_connected_error_1.DBNotConnectedError();
            if (env_1.env.DB_VERBOSE) {
                console.log(`${args.verboseHeader} (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${args.command}`);
            }
            const connection = args.transaction ? args.transaction : await this.pool.getConnection();
            if (!connection)
                throw new db_not_connected_error_1.DBNotConnectedError();
            const [result] = await connection.execute(args.command, args.values);
            if (!args.transaction)
                connection.destroy();
            return result ? result : {};
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async queryRow(args) {
        try {
            const rows = await this.query({
                sql: args.sql + ` LIMIT 1`,
                values: args.values,
                verboseHeader: 'QUERYROW',
                transaction: args.transaction,
            });
            if (!rows)
                return null;
            return rows[0];
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async queryRows(args) {
        try {
            return await this.query({
                sql: args.sql,
                values: args.values,
                verboseHeader: 'QUERYROWS',
                transaction: args.transaction,
            });
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async insert(args) {
        try {
            const insertResult = await this.execCommand({
                command: args.command,
                values: args.values,
                verboseHeader: 'INSERT',
                transaction: args.transaction,
            });
            if (insertResult) {
                return {
                    rowsInserted: insertResult.affectedRows,
                    id: insertResult.affectedRows === 1 ? insertResult.insertId : null,
                };
            }
            else {
                return {
                    rowsInserted: 0,
                    id: null,
                };
            }
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async update(args) {
        try {
            const updated = await this.execCommand({
                command: args.command,
                values: args.values,
                verboseHeader: 'UPDATE',
                transaction: args.transaction,
            });
            return {
                rowsUpdated: updated.affectedRows,
            };
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async internalDelete(args) {
        const deleted = await this.execCommand({
            command: args.command,
            values: args.values,
            verboseHeader: 'DELETE',
            transaction: args.transaction,
        });
        return {
            rowsDeleted: deleted.affectedRows,
        };
    }
    async exec(args) {
        try {
            return await this.execCommand({
                command: args.command,
                values: args.values,
                verboseHeader: 'EXEC',
                transaction: args.transaction,
            });
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async startTransaction() {
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (env_1.env.DB_VERBOSE)
            console.log(`STARTTRANSACTION (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')})`);
        try {
            const connection = await this.pool.getConnection();
            await connection.beginTransaction();
            return connection;
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async commit(transaction) {
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (env_1.env.DB_VERBOSE)
            console.log(`COMMIT (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')})`);
        try {
            await transaction.commit();
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async rollback(transaction) {
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (env_1.env.DB_VERBOSE)
            console.log(`ROLLBACK (${(0, date_fns_1.format)(new Date(), 'yyyy-MM-dd HH:mm:ss')})`);
        try {
            await transaction.rollback();
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async getDBMetadata(transaction) {
        try {
            const tables = await this.queryRows({
                sql: `
        SELECT T.TABLE_NAME AS tableName, T.TABLE_TYPE AS tableType, T.Engine AS engine, 
               T.TABLE_COLLATION AS tableCollation, T.AUTO_INCREMENT AS autoIncrement,
               COALESCE((SELECT CONCAT ('[', 
                                  GROUP_CONCAT(JSON_OBJECT("columnName", C.COLUMN_NAME,
                                                           "ordinalPosition" , C.ORDINAL_POSITION,
                                                           "defaultValue", C.COLUMN_DEFAULT,
                                                           "isNullable", CASE WHEN C.IS_NULLABLE = 'YES' THEN true ELSE false END,
                                                           "dataType", C.DATA_TYPE,
                                                           "columnType", C.COLUMN_TYPE,
                                                           "length", C.CHARACTER_MAXIMUM_LENGTH,
                                                           "precision", C.NUMERIC_PRECISION,
                                                           "decimals", C.NUMERIC_SCALE,
                                                           "collation", C.COLLATION_NAME,
                                                           "primaryKey", CASE WHEN C.COLUMN_KEY = "PRI" THEN true ELSE false END,
                                                           "uniqueKey", CASE WHEN C.COLUMN_KEY = "UNI" THEN true ELSE false END,
                                                           "foreignKey", CASE WHEN C.COLUMN_KEY = "MUL" THEN true ELSE false END,
                                                           "autoIncrement", CASE WHEN C.EXTRA = "auto_increment" THEN true ELSE false END,
                                                           "constraintName", K.CONSTRAINT_NAME,
                                                           "referencedTable", K.REFERENCED_TABLE_NAME,
                                                           "referencedColumn", K.REFERENCED_COLUMN_NAME,
                                                           "updateRule", R.UPDATE_RULE,
                                                           "deleteRule", R.DELETE_RULE
                                                          ) ORDER BY C.ORDINAL_POSITION), ']')
                           FROM information_schema.COLUMNS C 
                           LEFT OUTER JOIN information_schema.KEY_COLUMN_USAGE K ON K.TABLE_NAME = C.TABLE_NAME AND 
                                                                                    K.COLUMN_NAME = C.COLUMN_NAME
                           LEFT OUTER JOIN information_schema.REFERENTIAL_CONSTRAINTS R ON R.CONSTRAINT_NAME = K.CONSTRAINT_NAME
                          WHERE C.TABLE_NAME = T.TABLE_NAME), '[]') AS columns
          FROM information_schema.TABLES T
         WHERE T.TABLE_SCHEMA = ?
         ORDER BY T.TABLE_NAME`,
                values: [env_1.env.DB_DATABASE],
                transaction,
            });
            if (tables) {
                for (const table of tables) {
                    table.columns = JSON.parse(table.columns || '[]');
                }
            }
            return tables ?? [];
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
}
exports.default = MariaDB;
