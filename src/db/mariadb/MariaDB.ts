/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Pool, PoolConnection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { env } from '../../env';
import { DBError } from '../../shared/errors/db-error';
import { DBNotConnectedError } from '../../shared/errors/db-not-connected-error';
import { BaseDB } from '../BaseDB';
import { ConnectionPool } from '../ConnectionPool';
import { ITableMetaDataResultSet } from '../interfaces/ITableMetaDataResultSet';
import { initPool } from './pool';

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // ms

export default class MariaDB extends BaseDB {
  private pool: Pool | undefined;
  retries = 0;

  public async internalConnect(): Promise<Pool | null> {
    while (this.retries < MAX_RETRIES) {
      try {
        // Se já existe um pool ativo, não criar outro
        if (this.pool && !this.isPoolClosed()) {
          return this.pool;
        }

        this.pool = initPool({
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_DATABASE,
          host: env.DB_HOST,
          port: env.DB_PORT,
          connectionLimit: env.DB_MAX_POOL,
          idleTimeout: 300000,
        });

        // Configurar eventos do pool para debug
        this.setupPoolEvents();

        await this.pool.query('SELECT 1');
        if (env.DB_VERBOSE) this.log('CONNECT', 'DB Connected');

        this.retries = 0; // Reset retries on successful connection
        this.emit('connected');

        return this.pool;
      } catch (err: any) {
        this.retries++;
        this.log('ERROR', `DB pool error (retries ${this.retries}): ${err.message}`);

        if (this.retries >= MAX_RETRIES) {
          throw new DBError('Max number of retries. Aborting...');
        }

        this.log('INFO', `Retrying again in ${RETRY_DELAY / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }

    return null;
  }

  private setupPoolEvents(): void {
    if (!this.pool) return;

    this.pool.on('connection', connection => {
      if (env.DB_VERBOSE) this.log('POOL', `Nova conexão estabelecida: ${connection.threadId}`);
    });
  }

  private isPoolClosed(): boolean {
    return !this.pool || (this.pool as any)._closed === true;
  }

  private async ensureConnection(): Promise<void> {
    if (this.isPoolClosed()) {
      this.log('INFO', 'Pool fechado, reconectando...');
      await this.internalConnect();
    }
  }

  public async close(): Promise<void> {
    if (this.pool && !this.isPoolClosed()) {
      try {
        await this.pool.end();
        if (env.DB_VERBOSE) this.log('CLOSE', 'Pool fechado com sucesso');
        this.emit('closed');
      } catch (err: any) {
        this.log('ERROR', `Erro ao fechar pool: ${err.message}`);
      } finally {
        this.pool = undefined;
      }
    }
  }

  protected async query(args: {
    sql: string;
    values: any;
    verboseHeader: string;
    transaction?: ConnectionPool;
  }): Promise<RowDataPacket[] | null> {
    let connection: PoolConnection | undefined;

    try {
      await this.ensureConnection();
      if (!this.pool) throw new DBNotConnectedError();

      this.log(args.verboseHeader, args.sql);
      connection = args.transaction ? (args.transaction as PoolConnection) : await this.pool.getConnection();
      if (!connection) throw new DBNotConnectedError();

      const result = await connection.query<RowDataPacket[]>(args.sql, args.values);
      return !result ? null : result[0];
    } catch (err: any) {
      throw new DBError(err.message);
    } finally {
      if (connection && !args.transaction) {
        connection.release();
      }
    }
  }

  protected async execCommand(args: {
    command: string;
    values: any;
    verboseHeader: string;
    transaction?: ConnectionPool;
  }): Promise<ResultSetHeader> {
    let connection: ConnectionPool | undefined;

    try {
      await this.ensureConnection();
      if (!this.pool) throw new DBNotConnectedError();

      this.log(args.verboseHeader, args.command);
      let response;

      connection = args.transaction ? (args.transaction as PoolConnection) : await this.pool.getConnection();
      if (!connection) throw new DBNotConnectedError();

      const [result] = await connection.execute<ResultSetHeader>(args.command, args.values);
      response = result ? result : ({} as ResultSetHeader);

      this.emitCrudEvent(args.verboseHeader, {
        command: args.command,
        values: args.values,
        inTransaction: !!args.transaction,
        result: response,
        user: this.getLoggedUser(),
      });

      return response;
    } catch (err: any) {
      throw new DBError(err.message);
    } finally {
      if (connection && !args.transaction) {
        connection.release();
      }
    }
  }

  public async queryRow(args: {
    sql: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<RowDataPacket | null> {
    try {
      const rows = await this.query({
        sql: args.sql + ` LIMIT 1`,
        values: args.values,
        verboseHeader: 'QUERYROW',
        transaction: args.transaction,
      });

      if (!rows) return null;

      return rows[0];
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async queryRows(args: {
    sql: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<RowDataPacket[] | null> {
    try {
      return await this.query({
        sql: args.sql,
        values: args.values,
        verboseHeader: 'QUERYROWS',
        transaction: args.transaction,
      });
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async insert(args: { command: string; values?: any; transaction?: ConnectionPool }): Promise<IDBInsertResult> {
    try {
      if (args.command.includes(' returning ')) {
        const insertResult = await this.query({
          sql: args.command,
          values: args.values,
          transaction: args.transaction,
          verboseHeader: 'INSERT',
        });

        return {
          rowsInserted: insertResult?.length || 0,
          id: insertResult && insertResult[0] && typeof insertResult[0].id !== 'undefined' ? insertResult[0].id : null,
        };
      } else {
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
        } else {
          return {
            rowsInserted: 0,
            id: null,
          };
        }
      }
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async update(args: { command: string; values?: any; transaction?: ConnectionPool }): Promise<IDBUpdateResult> {
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
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  protected async internalDelete(args: {
    command: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<IDBDeleteResult> {
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

  public async exec(args: { command: string; values?: any; transaction?: ConnectionPool }): Promise<ResultSetHeader> {
    try {
      return await this.execCommand({
        command: args.command,
        values: args.values,
        verboseHeader: 'EXEC',
        transaction: args.transaction,
      });
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async startTransaction(): Promise<ConnectionPool> {
    await this.ensureConnection();
    if (!this.pool) throw new DBNotConnectedError();

    this.log('STARTTRANSACTION', '');

    try {
      const connection = (await this.pool.getConnection()) as PoolConnection;
      await connection.beginTransaction();

      // Retorna a conexão como Connection para compatibilidade
      return connection as ConnectionPool;
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async commit(transaction: ConnectionPool): Promise<void> {
    if (!this.pool) throw new DBNotConnectedError();
    this.log('COMMIT', '');

    try {
      await (transaction as PoolConnection).commit();
    } catch (err: any) {
      throw new DBError(err.message);
    } finally {
      // ✅ CORREÇÃO: Cast para PoolConnection para acessar release()
      (transaction as PoolConnection).release();
    }
  }

  public async rollback(transaction: ConnectionPool): Promise<void> {
    if (!this.pool) throw new DBNotConnectedError();
    this.log('ROLLBACK', '');

    try {
      await (transaction as PoolConnection).rollback();
    } catch (err: any) {
      throw new DBError(err.message);
    } finally {
      // ✅ CORREÇÃO: Cast para PoolConnection para acessar release()
      (transaction as PoolConnection).release();
    }
  }

  protected async getDBMetadata(transaction?: ConnectionPool): Promise<ITableMetaDataResultSet[]> {
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
        values: [env.DB_DATABASE],
        transaction,
      });

      if (tables) {
        for (const table of tables) {
          table.columns = JSON.parse(table.columns || '[]');
        }
      }

      return (tables as unknown as ITableMetaDataResultSet[]) ?? [];
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }
}
