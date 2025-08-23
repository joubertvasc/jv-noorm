/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Connection } from 'mysql2/promise';
import { PoolClient } from 'pg';
import { format } from 'date-fns';
import { ITableMetaDataResultSet } from './interfaces/ITableMetaDataResultSet';
import { IDBInsertResult } from '../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../db/interfaces/IDBDeleteResult';
import { IDeleteOptions } from './interfaces/IDeleteOptions';
import { WrongDeleteStatementError } from '../shared/errors/wrong-delete-statement-error';
import { DBError } from '../shared/errors/db-error';
import { env } from '../env';

export abstract class BaseDB {
  private softDelete = false;
  private metadata: ITableMetaDataResultSet[] | undefined;

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
    transaction?: Connection | PoolClient;
  }): Promise<any>;
  protected abstract execCommand(args: {
    command: string;
    values: any;
    verboseHeader: string;
    transaction?: Connection | PoolClient;
  }): Promise<any>;

  public abstract queryRow(args: {
    sql: string;
    values?: any;
    transaction?: Connection | PoolClient;
  }): Promise<any | null>;
  public abstract queryRows(args: {
    sql: string;
    values?: any;
    transaction?: Connection | PoolClient;
  }): Promise<any[] | null>;
  public abstract insert(args: {
    command: string;
    values?: any;
    transaction?: Connection | PoolClient;
  }): Promise<IDBInsertResult>;
  public abstract update(args: {
    command: string;
    values?: any;
    transaction?: Connection | PoolClient;
  }): Promise<IDBUpdateResult>;
  protected abstract internalDelete(args: {
    command: string;
    values?: any;
    transaction?: Connection | PoolClient;
  }): Promise<IDBDeleteResult>;
  public abstract exec(args: { command: string; values?: any; transaction?: Connection | PoolClient }): Promise<any>;
  public abstract startTransaction(): Promise<Connection | PoolClient>;

  public async beginTransaction(): Promise<Connection | PoolClient> {
    return this.startTransaction();
  }

  public abstract commit(transaction: Connection | PoolClient): Promise<void>;
  public abstract rollback(transaction: Connection | PoolClient): Promise<void>;
  protected abstract getDBMetadata(transaction?: Connection | PoolClient): Promise<ITableMetaDataResultSet[]>;

  public async delete(args: {
    command: string;
    values?: any;
    options?: IDeleteOptions;
    transaction?: Connection | PoolClient;
  }): Promise<IDBDeleteResult> {
    try {
      if ((this.isSoftDelete() || args.options?.softDelete === true) && args.options?.softDelete !== false) {
        const regex = /delete\s+from\s+([`"\[\]\w.]+)/i;
        const match = args.command.match(regex);
        if (match) {
          const deletedAt: { date: Date; userId?: number; userName?: string } = { date: new Date() };

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

  log(header: string, log: string): void {
    if (env.DB_VERBOSE) console.log(`${header} (${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}): ${log}`);
  }
}
