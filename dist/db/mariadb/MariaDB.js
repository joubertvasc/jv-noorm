"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const pool_1 = require("./pool");
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
                // Se já existe um pool ativo, não criar outro
                if (this.pool && !this.isPoolClosed()) {
                    return this.pool;
                }
                this.pool = (0, pool_1.initPool)({
                    user: env_1.env.DB_USER,
                    password: env_1.env.DB_PASSWORD,
                    database: env_1.env.DB_DATABASE,
                    host: env_1.env.DB_HOST,
                    port: env_1.env.DB_PORT,
                    connectionLimit: env_1.env.DB_MAX_POOL,
                    // Configurações adicionais para estabilidade
                    // acquireTimeout: 60000,
                    // timeout: 60000,
                    // reconnect: true,
                    idleTimeout: 300000,
                });
                // Configurar eventos do pool para debug
                this.setupPoolEvents();
                await this.pool.query('SELECT 1');
                if (env_1.env.DB_VERBOSE)
                    this.log('CONNECT', 'DB Connected');
                this.retries = 0; // Reset retries on successful connection
                this.emit('connected');
                return this.pool;
            }
            catch (err) {
                this.retries++;
                this.log('ERROR', `DB pool error (retries ${this.retries}): ${err.message}`);
                if (this.retries >= MAX_RETRIES) {
                    throw new db_error_1.DBError('Max number of retries. Aborting...');
                }
                this.log('INFO', `Retrying again in ${RETRY_DELAY / 1000}s...`);
                await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            }
        }
        return null;
    }
    setupPoolEvents() {
        if (!this.pool)
            return;
        this.pool.on('connection', connection => {
            if (env_1.env.DB_VERBOSE)
                this.log('POOL', `Nova conexão estabelecida: ${connection.threadId}`);
        });
    }
    isPoolClosed() {
        return !this.pool || this.pool._closed === true;
    }
    async ensureConnection() {
        if (this.isPoolClosed()) {
            this.log('INFO', 'Pool fechado, reconectando...');
            await this.internalConnect();
        }
    }
    async close() {
        if (this.pool && !this.isPoolClosed()) {
            try {
                await this.pool.end();
                if (env_1.env.DB_VERBOSE)
                    this.log('CLOSE', 'Pool fechado com sucesso');
                this.emit('closed');
            }
            catch (err) {
                this.log('ERROR', `Erro ao fechar pool: ${err.message}`);
            }
            finally {
                this.pool = undefined;
            }
        }
    }
    async query(args) {
        let connection;
        try {
            await this.ensureConnection();
            if (!this.pool)
                throw new db_not_connected_error_1.DBNotConnectedError();
            this.log(args.verboseHeader, args.sql);
            if (args.transaction) {
                // Para transações, usar a conexão passada diretamente
                const result = await args.transaction.query(args.sql, args.values);
                return !result ? null : result[0];
            }
            else {
                // Para queries normais, obter conexão do pool
                connection = await this.pool.getConnection();
                if (!connection)
                    throw new db_not_connected_error_1.DBNotConnectedError();
                const result = await connection.query(args.sql, args.values);
                return !result ? null : result[0];
            }
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
        finally {
            // ✅ CORREÇÃO: Apenas liberar se for conexão do pool (não transacional)
            if (connection && !args.transaction) {
                connection.release();
            }
        }
    }
    async execCommand(args) {
        let connection;
        try {
            await this.ensureConnection();
            if (!this.pool)
                throw new db_not_connected_error_1.DBNotConnectedError();
            this.log(args.verboseHeader, args.command);
            let response;
            if (args.transaction) {
                // Para transações, usar a conexão passada diretamente
                const [result] = await args.transaction.execute(args.command, args.values);
                response = result ? result : {};
            }
            else {
                // Para comandos normais, obter conexão do pool
                connection = await this.pool.getConnection();
                if (!connection)
                    throw new db_not_connected_error_1.DBNotConnectedError();
                const [result] = await connection.execute(args.command, args.values);
                response = result ? result : {};
            }
            this.emit(args.verboseHeader, {
                command: args.command,
                values: args.values,
                inTransaction: !!args.transaction,
                result: response,
                user: this.getLoggedUser(),
            });
            return response;
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
        finally {
            if (connection && !args.transaction) {
                connection.release();
            }
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
        await this.ensureConnection();
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        this.log('STARTTRANSACTION', '');
        try {
            const connection = (await this.pool.getConnection());
            await connection.beginTransaction();
            // Retorna a conexão como Connection para compatibilidade
            return connection;
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async commit(transaction) {
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        this.log('COMMIT', '');
        try {
            await transaction.commit();
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
        finally {
            // ✅ CORREÇÃO: Cast para PoolConnection para acessar release()
            transaction.release();
        }
    }
    async rollback(transaction) {
        if (!this.pool)
            throw new db_not_connected_error_1.DBNotConnectedError();
        this.log('ROLLBACK', '');
        try {
            await transaction.rollback();
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
        finally {
            // ✅ CORREÇÃO: Cast para PoolConnection para acessar release()
            transaction.release();
        }
    }
    async getDBMetadata(transaction) {
        try {
            const tables = await this.queryRows({
                sql: `
        SELECT T.TABLE_NAME AS tableName, T.TABLE_TYPE AS tableType, T.Engine AS engine, 
               T.TABLE_COLLATION AS tableCollation, 
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
                                                                                    K.COLUMN_NAME = C.COLUMN_NAME AND
                                                                                    K.CONSTRAINT_SCHEMA = C.TABLE_SCHEMA AND
                                                                                    K.CONSTRAINT_NAME <> 'PRIMARY'
                           LEFT OUTER JOIN information_schema.REFERENTIAL_CONSTRAINTS R ON R.CONSTRAINT_NAME = K.CONSTRAINT_NAME AND 
                                                                                           R.CONSTRAINT_SCHEMA = C.TABLE_SCHEMA
                          WHERE C.TABLE_NAME = T.TABLE_NAME
                            AND C.TABLE_SCHEMA = T.TABLE_SCHEMA), '[]') AS columns
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
