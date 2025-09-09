/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { format } from 'date-fns';
import EventEmitter from 'events';
import { AsyncLocalStorage } from 'node:async_hooks';
import { env } from '../env';
import { ConnectionPool } from './ConnectionPool';
import { ITableMetaDataResultSet } from './interfaces/ITableMetaDataResultSet';
import { ITableConstraintsResultSet } from './interfaces/ITableConstraintsResultSet';
import { IDBInsertResult } from '../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../db/interfaces/IDBDeleteResult';
import { IDeleteOptions } from './interfaces/IDeleteOptions';
import { WrongDeleteStatementError } from '../shared/errors/wrong-delete-statement-error';
import { DBError } from '../shared/errors/db-error';
import { ILoggedUser } from './interfaces/ILoggedUser';
import { ICrudEvent } from './interfaces/ICrudEvent';
import { Parser } from 'node-sql-parser';

export abstract class BaseDB extends EventEmitter {
  private softDelete = false;
  private metadata: ITableMetaDataResultSet[] | undefined;
  protected asyncLocalStorage: AsyncLocalStorage<any> | undefined;

  constructor(asyncLocalStorage?: AsyncLocalStorage<any>) {
    super();
    this.asyncLocalStorage = asyncLocalStorage;
  }

  public isSoftDelete() {
    return this.softDelete;
  }

  public setSoftDelete(useSoftDelete: boolean) {
    this.softDelete = useSoftDelete;
  }

  public getMetadata(): ITableMetaDataResultSet[] {
    return this.metadata || [];
  }

  public async connect(): Promise<any> {
    await this.internalConnect();

    this.metadata = await this.getDBMetadata();
  }

  protected abstract internalConnect(): Promise<any>;
  public abstract close(): Promise<any>;
  protected abstract query(args: {
    sql: string;
    values: any;
    verboseHeader: string;
    transaction?: ConnectionPool;
  }): Promise<any>;
  protected abstract execCommand(args: {
    command: string;
    values: any;
    verboseHeader: string;
    transaction?: ConnectionPool;
  }): Promise<any>;

  public abstract queryRow(args: { sql: string; values?: any; transaction?: ConnectionPool }): Promise<any | null>;
  public abstract queryRows(args: { sql: string; values?: any; transaction?: ConnectionPool }): Promise<any[] | null>;
  public abstract insert(args: {
    command: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<IDBInsertResult>;
  public abstract update(args: {
    command: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<IDBUpdateResult>;
  protected abstract internalDelete(args: {
    command: string;
    values?: any;
    transaction?: ConnectionPool;
  }): Promise<IDBDeleteResult>;
  public abstract exec(args: { command: string; values?: any; transaction?: ConnectionPool }): Promise<any>;
  public abstract startTransaction(): Promise<ConnectionPool>;

  public async beginTransaction(): Promise<ConnectionPool> {
    return this.startTransaction();
  }

  public abstract commit(transaction: ConnectionPool): Promise<void>;
  public abstract rollback(transaction: ConnectionPool): Promise<void>;
  protected abstract getDBMetadata(transaction?: ConnectionPool): Promise<ITableMetaDataResultSet[]>;

  public async updateMetadata(): Promise<void> {
    this.metadata = await this.getDBMetadata();
  }

  public async delete(args: {
    command: string;
    values?: any;
    options?: IDeleteOptions;
    transaction?: ConnectionPool;
  }): Promise<IDBDeleteResult> {
    try {
      if ((this.isSoftDelete() || args.options?.softDelete === true) && args.options?.softDelete !== false) {
        const regex = /delete\s+from\s+([`"\[\]\w.]+)/i;
        const match = args.command.match(regex);
        if (match) {
          const deletedAt: { date: Date; userId?: number | string; userName?: string } = { date: new Date() };

          if (args.options?.userId) deletedAt.userId = args.options.userId;
          if (args.options?.userName) deletedAt.userName = args.options.userName;

          args.command = args.command.toLowerCase().replace(
            `delete from ${match[1]}`,
            `UPDATE ${match[1]} 
                SET deleted_at = '${JSON.stringify(deletedAt)}'`,
          );

          const deleted = await this.update({
            command: args.command,
            values: args.values,
            transaction: args.transaction,
          });
          return {
            rowsDeleted: deleted.rowsUpdated,
          };
        }

        throw new WrongDeleteStatementError();
      } else {
        return await this.internalDelete({ command: args.command, values: args.values, transaction: args.transaction });
      }
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public getTableMetadata(tableName: string): ITableMetaDataResultSet | null {
    if (!this.metadata) return null;

    const tableMetadata: ITableMetaDataResultSet[] = this.metadata?.filter((table: ITableMetaDataResultSet) => {
      return tableName.toLowerCase() === table.tableName.toLowerCase();
    });

    if (!tableMetadata || tableMetadata.length === 0) return null;

    return tableMetadata[0];
  }

  public findCreatedAtColumn(table: string): string | null {
    const tableMetadata = this.getTableMetadata(table);

    if (!tableMetadata) return null;

    for (const column of tableMetadata.columns) {
      if (column.columnName.toLowerCase() === 'created_at' || column.columnName.toLowerCase() === 'createdat') {
        return column.columnName;
      }
    }

    return null;
  }

  public findUpdatedAtColumn(table: string): string | null {
    const tableMetadata = this.getTableMetadata(table);

    if (!tableMetadata) return null;

    for (const column of tableMetadata.columns) {
      if (column.columnName.toLowerCase() === 'updated_at' || column.columnName.toLowerCase() === 'updatedat') {
        return column.columnName;
      }
    }

    return null;
  }

  public findDeletedAtColumn(table: string): string | null {
    const tableMetadata = this.getTableMetadata(table);

    if (!tableMetadata) return null;

    for (const column of tableMetadata.columns) {
      if (column.columnName.toLowerCase() === 'deleted_at' || column.columnName.toLowerCase() === 'deletedat') {
        return column.columnName;
      }
    }

    return null;
  }

  public getTableReferencedConstraints(referencedTableName: string): ITableConstraintsResultSet[] {
    if (!this.metadata) return [];

    const constraints: ITableConstraintsResultSet[] = [];
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

  protected emitCrudEvent(operation: string, args: ICrudEvent): void {
    const parser = new Parser();
    const ast = parser.astify(args.command);

    // Safely extract table and columns from AST
    if (Array.isArray(ast)) {
      if (ast[0] && 'table' in ast[0]) {
        args.table = (ast[0] as any).table?.[0].table;
        args.columns = (ast[0] as any).columns;
      }
    } else if ('table' in ast) {
      args.table = (ast as any).table?.[0].table;
      args.columns = (ast as any).columns;
    }

    console.log(ast);
    this.emit(operation, args);
  }

  protected getLoggedUser(): ILoggedUser {
    if (!this.asyncLocalStorage) return {} as ILoggedUser;

    const store = this.asyncLocalStorage.getStore();
    const userId = (store as ILoggedUser)?.userId;
    const userName = (store as ILoggedUser)?.userName;

    return {
      userId,
      userName,
    };
  }

  log(header: string, log: string): void {
    if (env.DB_VERBOSE) console.log(`${header} (${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${log}`);
  }
}
