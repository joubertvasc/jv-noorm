"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PostgreSQL = void 0;
const BaseDB_1 = require("../../db/BaseDB");
const env_1 = require("../../env");
const db_schema_not_defined_error_1 = require("../../shared/errors/db-schema-not-defined-error");
const db_error_1 = require("../../shared/errors/db-error");
const pool_1 = require("./pool");
class PostgreSQL extends BaseDB_1.BaseDB {
    pgConnection;
    constructor() {
        super();
        if (!env_1.env.DB_SCHEMA)
            throw new db_schema_not_defined_error_1.DBSchemaNotDefinedError();
        this.pgConnection = (0, pool_1.initPool)({
            connectionString: `postgresql://${env_1.env.DB_USER}:${env_1.env.DB_PASSWORD}@${env_1.env.DB_HOST}:${env_1.env.DB_PORT}/${env_1.env.DB_DATABASE}?schema=${env_1.env.DB_SCHEMA}`,
            max: env_1.env.DB_MAX_POOL || 10,
            min: env_1.env.DB_MIN_POOL || 2,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000,
            maxLifetimeSeconds: 3600, // 1 hora ao invés de 1 minuto
        });
    }
    async internalConnect() {
        try {
            // Testa a conexão
            await this.pgConnection.query('SELECT 1');
            if (env_1.env.DB_VERBOSE)
                this.log('CONNECT', 'PostgreSQL Connected');
            return this.pgConnection;
        }
        catch (err) {
            this.log('ERROR', `PostgreSQL connection error: ${err.message}`);
            throw new db_error_1.DBError(`PostgreSQL connection failed: ${err.message}`);
        }
    }
    async close() {
        try {
            await (0, pool_1.closePool)();
            if (env_1.env.DB_VERBOSE)
                this.log('CLOSE', 'PostgreSQL Pool closed');
        }
        catch (err) {
            this.log('ERROR', `Error closing PostgreSQL pool: ${err.message}`);
        }
    }
    async query(args) {
        const client = (args.transaction ? args.transaction : await this.pgConnection.connect());
        try {
            this.log(args.verboseHeader, args.sql);
            const result = await client.query(args.sql, args.values);
            return result.rows;
        }
        finally {
            // Libera a conexão apenas se não estiver em transação
            if (!args.transaction) {
                client.release();
            }
        }
    }
    async execCommand(args) {
        const client = (args.transaction ? args.transaction : await this.pgConnection.connect());
        try {
            this.log(args.verboseHeader, args.command);
            const result = await client.query(args.command, args.values);
            return result.command === 'INSERT'
                ? {
                    rowCount: result.rowCount,
                    id: result.rows.length > 0 ? result.rows[0].id : 0,
                }
                : result.command === 'UPDATE' || result.command === 'DELETE'
                    ? {
                        rowCount: result.rowCount,
                    }
                    : result.rows;
        }
        finally {
            // Libera a conexão apenas se não estiver em transação
            if (!args.transaction) {
                client.release();
            }
        }
    }
    async queryRow(args) {
        const result = await this.query({
            sql: args.sql,
            values: args.values,
            verboseHeader: 'QUERYROW',
            transaction: args.transaction,
        });
        return result.length > 0 ? result[0] : [];
    }
    async queryRows(args) {
        const result = await this.query({
            sql: args.sql,
            values: args.values,
            verboseHeader: 'QUERYROWS',
            transaction: args.transaction,
        });
        return result;
    }
    async insert(args) {
        const result = await this.execCommand({
            command: args.command,
            values: args.values,
            verboseHeader: 'INSERT',
            transaction: args.transaction,
        });
        return {
            id: result.id,
            rowsInserted: result.rowCount,
        };
    }
    async update(args) {
        const result = await this.execCommand({
            command: args.command,
            values: args.values,
            verboseHeader: 'UPDATE',
            transaction: args.transaction,
        });
        return {
            rowsUpdated: result.rowCount,
        };
    }
    async internalDelete(args) {
        const result = await this.execCommand({
            command: args.command,
            values: args.values,
            verboseHeader: 'DELETE',
            transaction: args.transaction,
        });
        return {
            rowsDeleted: result.rowCount,
        };
    }
    async exec(args) {
        await this.execCommand({
            command: args.command,
            values: args.values,
            verboseHeader: 'EXEC',
            transaction: args.transaction,
        });
    }
    async startTransaction() {
        const client = await this.pgConnection.connect();
        this.log('STARTTRANSACTION', '');
        try {
            await client.query('BEGIN');
            return client;
        }
        catch (err) {
            // Se falhar ao iniciar a transação, libera a conexão
            client.release();
            throw err;
        }
    }
    async commit(transaction) {
        try {
            this.log('COMMIT', '');
            await transaction.query('COMMIT');
        }
        finally {
            // Sempre libera a conexão após commit
            transaction.release();
        }
    }
    async rollback(transaction) {
        try {
            this.log('ROLLBACK', '');
            await transaction.query('ROLLBACK');
        }
        finally {
            // Sempre libera a conexão após rollback
            transaction.release();
        }
    }
    async getDBMetadata(transaction) {
        const result = await this.queryRows({
            sql: `
        WITH table_info AS (
             SELECT N.nspname AS schema_name, C.relname AS table_name,
                    CASE C.relkind WHEN 'r' THEN 'BASE TABLE'
                                   WHEN 'v' THEN 'VIEW'
                                   WHEN 'm' THEN 'MATERIALIZED VIEW'
                                   WHEN 'f' THEN 'FOREIGN TABLE'
                                   WHEN 'p' THEN 'PARTITIONED TABLE'
                     END AS table_type,
                    C.oid AS table_oid
               FROM pg_class C
               JOIN pg_namespace N ON N.oid = C.relnamespace
              WHERE N.nspname = $1
        )
        SELECT T.table_name AS "tableName", T.table_type AS "tableType", NULL AS "engine", T.schema_name AS "tableSchema",
               COALESCE((SELECT json_agg(
                                  json_build_object(
                                              'columnName', A.attname,
                                              'ordinalPosition', A.attnum,
                                              'defaultValue', pg_get_expr(AD.adbin, AD.adrelid),
                                              'isNullable', NOT A.attnotnull,
                                              'dataType', format_type(A.atttypid, A.atttypmod),
                                              'length', ISC.character_maximum_length,
                                              'precision', ISC.numeric_precision,
                                              'scale', ISC.numeric_scale,
                                              'collation', COLL.collname,
                                              'identity', A.attidentity,   -- 'a'=ALWAYS, 'd'=BY DEFAULT
                                              'generated', A.attgenerated, -- 's' = stored
                                              'autoIncrement', (a.attidentity IN ('a','d')),
                                              'primaryKey', EXISTS (SELECT 1 
                                                                      FROM pg_constraint c
                                                                     WHERE c.conrelid = T.table_oid
                                                                       AND c.contype = 'p'
                                                                       AND A.attnum = ANY(c.conkey)),
                                              'uniqueKey', EXISTS (SELECT 1
                                                                     FROM pg_constraint c
                                                                    WHERE c.conrelid = T.table_oid
                                                                      AND c.contype = 'u'
                                                                      AND A.attnum = ANY(c.conkey)),
                                              'foreignKey', EXISTS (SELECT 1
                                                                      FROM pg_constraint c
                                                                     WHERE c.conrelid = T.table_oid
                                                                       AND c.contype = 'f'
                                                                       AND A.attnum = ANY(c.conkey)),
                                              'constraintName', FK.conname,
                                              'referencedTable', RT.relname,
                                              'referencedColumn', RC.attname,
                                              'updateRule', CASE FK.confupdtype WHEN 'a' THEN 'NO ACTION'
                                                                                WHEN 'r' THEN 'RESTRICT'
                                                                                WHEN 'c' THEN 'CASCADE'
                                                                                WHEN 'n' THEN 'SET NULL'
                                                                                WHEN 'd' THEN 'SET DEFAULT'
                                                             END,
                                              'deleteRule', CASE FK.confdeltype WHEN 'a' THEN 'NO ACTION'
                                                                                WHEN 'r' THEN 'RESTRICT'
                                                                                WHEN 'c' THEN 'CASCADE'
                                                                                WHEN 'n' THEN 'SET NULL'
                                                                                WHEN 'd' THEN 'SET DEFAULT'
                                                             END) ORDER BY A.attnum)
                           FROM pg_attribute A
                           LEFT JOIN pg_attrdef AD ON AD.adrelid = A.attrelid AND 
                                                      AD.adnum = A.attnum
                           LEFT JOIN pg_type T2 ON T2.oid = A.atttypid
                           LEFT JOIN pg_collation COLL ON COLL.oid = A.attcollation
                           LEFT JOIN pg_constraint FK ON FK.conrelid = T.table_oid AND 
                                                         FK.contype = 'f' AND 
                                                         A.attnum = ANY(fk.conkey)
                           LEFT JOIN pg_class RT ON RT.oid = FK.confrelid
                           LEFT JOIN LATERAL unnest(fk.confkey) WITH ORDINALITY ref_col_num(colnum, ord) ON true
                           LEFT JOIN pg_attribute RC ON RC.attrelid = RT.oid AND 
                                                             RC.attnum = ref_col_num.colnum
                           LEFT JOIN information_schema.columns ISC ON ISC.table_schema = T.schema_name AND 
                                                                       ISC.table_name = T.table_name AND 
                                                                       ISC.column_name = A.attname
                          WHERE A.attrelid = T.table_oid
                            AND A.attnum > 0
                            AND NOT A.attisdropped), '[]') AS "columns"
          FROM table_info T
         ORDER BY T.table_name`,
            values: [env_1.env.DB_SCHEMA],
            transaction,
        });
        return result;
    }
}
exports.PostgreSQL = PostgreSQL;
