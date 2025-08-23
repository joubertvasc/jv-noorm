/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { isArray } from 'lodash';
import { ITableMetaDataResultSet } from '../../db/interfaces/ITableMetaDataResultSet';
import { IColumnMetaDataResultSet } from '../../db/interfaces/IColumnMetaDataResultSet';
import { BaseDB } from '../../db/BaseDB';
import { DBMetadataNotLoadedError } from '../../shared/errors/db-metadata-not-loaded';
import { TableDoesNotExistsError } from '../../shared/errors/table-does-not-exists-error';
import { DBNotConnectedError } from '../../shared/errors/db-not-connected-error';
import { InvalidMetadataError } from '../../shared/errors/invalid-metadata-error';
import { DBError } from '../../shared/errors/db-error';
import { env } from '../../env';
import { DBType } from '../../enum/dbType';
import { BadPrimaryKeyFormatError } from '../../shared/errors/bad-primary-key-format-error';
import { Connection } from 'mysql2/promise';
import { PoolClient } from 'pg';
import { IDeleteOptions } from '../../db/interfaces/IDeleteOptions';
import { ITableConstraintsResultSet } from '../../db/interfaces/ITableConstraintsResultSet';
import { ConstraintError } from '../../shared/errors/constraint-error';

export interface IPrimaryKeyQuery {
  cmd: string;
  values: any[];
}

enum Operation {
  CREATE,
  UPDATE,
  DELETE,
}

enum DeleteRule {
  RESTRICT = 'RESTRICT',
  CASCADE = 'CASCADE',
  NOACTION = 'NO ACTION',
}

export class BasicCrud {
  private tableName: string | undefined;
  private metadata: ITableMetaDataResultSet | undefined;
  private db: BaseDB | undefined;
  private createdAtColumn;
  private updatedAtColumn;
  private deletedAtColumn;

  public constructor(params: { tableName: string; db: BaseDB }) {
    const { tableName, db } = params;
    // Optionally store db if needed: this.db = db;
    this.tableName = tableName;
    this.db = db;

    try {
      if (!db.getMetadata()) throw new DBMetadataNotLoadedError();

      this.metadata = db.getMetadata().find(table => table.tableName === tableName);

      if (!this.metadata) throw new TableDoesNotExistsError(`${tableName} does-not-exists`);

      this.createdAtColumn = this.db.findCreatedAtColumn(this.tableName as string);
      this.updatedAtColumn = this.db.findUpdatedAtColumn(this.tableName as string);
      this.deletedAtColumn = this.db.findDeletedAtColumn(this.tableName as string);
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  public async create(args: { data: Record<string, any>; withTransaction?: boolean }): Promise<any> {
    let { data, withTransaction } = args;

    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    await this.verifyDataFields(data, Operation.CREATE);

    const transaction = withTransaction ? await this.db.startTransaction() : undefined;

    try {
      data = await this.hookBeforeCreate(data);
      if (data) {
        data = await this.hookBeforeSave(data);

        if (data) {
          const fields: string[] = [];
          const params: string[] = [];
          const values: any[] = [];
          let idx = 1;

          Object.keys(data).forEach(key => {
            let column: IColumnMetaDataResultSet | undefined;
            if (this.metadata && this.metadata.columns) {
              [column] = this.metadata.columns.filter(col => col.columnName === key);
            }

            if (!column) throw new InvalidMetadataError();

            if (!column.primaryKey || !column.autoIncrement) {
              fields.push(key);
              values.push(data[key]);
              params.push(env.DB_TYPE === DBType.MariaDB ? '?' : `$${idx}`); // Different param syntax for PostgreSQL
              idx++;
            }
          });

          if (fields.length > 0) {
            const hasAutoincrement = this.metadata.columns.some(column => {
              return column.autoIncrement;
            });

            if (this.createdAtColumn) {
              if (!fields.includes(this.createdAtColumn)) {
                fields.push(this.createdAtColumn);
                values.push(new Date());
                params.push(env.DB_TYPE === DBType.MariaDB ? '?' : `$${idx}`);
              }
            }

            const command = `INSERT INTO ${this.tableName}(${fields.join(', ')}) 
                                  VALUES (${params.join(', ')}) 
                                  ${env.DB_TYPE === DBType.PostgreSQL && hasAutoincrement ? ' RETURNING id' : ''}`;
            const result = await this.db.insert({ command, values });

            if (hasAutoincrement && Number(result.id || '0') > 0) {
              data = await this.get(Number(result.id));
            }

            await this.hookAfterCreate(data);
            await this.hookAfterSave(data);

            if (transaction) this.db.commit(transaction);

            return data;
          }
        }
      }
    } catch (err: any) {
      if (transaction) this.db.rollback(transaction);

      throw new DBError(err.message);
    }
  }

  public async update(args: { key: any; data: Record<string, any>; withTransaction: boolean }): Promise<any> {
    let { key, data, withTransaction } = args;

    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    await this.verifyDataFields(data, Operation.UPDATE);
    if (!(await this.verifyRow(key))) return false;

    const transaction = withTransaction ? await this.db.startTransaction() : undefined;

    try {
      const primaryKey = this.getTablePrimaryKey();
      if (isArray(primaryKey)) {
        if (primaryKey.length !== key.length) {
          throw new BadPrimaryKeyFormatError();
        }

        for (let i = 0; i < primaryKey.length; i++) {
          data[(primaryKey[i] = key[i])];
        }
      } else {
        data[primaryKey] = key;
      }

      data = await this.hookBeforeUpdate(key, data);
      if (data) {
        data = await this.hookBeforeSave(data);

        if (data) {
          if (this.updatedAtColumn) data[this.updatedAtColumn] = new Date();

          const fields: string[] = [];
          const values: any[] = [];

          Object.keys(data).forEach(key => {
            let column: IColumnMetaDataResultSet | undefined;
            if (this.metadata && this.metadata.columns) {
              [column] = this.metadata.columns.filter(column => column.columnName === key);
            }

            if (!column) throw new InvalidMetadataError(`Column ${key} does not exists on table ${this.tableName}`);

            if (!column.primaryKey || !column.autoIncrement) {
              fields.push(key);
              values.push(data[key]);
            }
          });

          if (fields.length > 0) {
            let command = `UPDATE ${this.tableName}
                              SET `;

            let idx = 1;
            for (let column = 0; column < fields.length; column++) {
              command += `${fields[column]} = ${env.DB_TYPE === DBType.MariaDB ? '?' : `$${idx}`}${column < fields.length - 1 ? ',' : ''}\n`;
            }

            let primaryKeyInfo = this.mountTableWherePrimaryKey(key);
            command += ` WHERE ${primaryKeyInfo.cmd}`;
            primaryKeyInfo.values.forEach(value => {
              values.push(value);
            });

            await this.db.update({ command, values });

            data = await this.get(key);

            await this.hookAfterUpdate(key, data);
            await this.hookAfterSave(data);

            if (transaction) this.db.commit(transaction);

            return data;
          }
        }
      }
    } catch (err: any) {
      if (transaction) this.db.rollback(transaction);

      throw new DBError(err.message);
    }
  }

  public async delete(args: {
    key: any;
    transaction?: Connection | PoolClient;
    options?: IDeleteOptions;
  }): Promise<boolean> {
    let { key, transaction, options } = args;

    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    const primaryKeyInfo = this.mountTableWherePrimaryKey(key);
    const constraints = this.db.getTableReferencedConstraints(this.tableName as string);

    // Hard delete? Uses de database rules.
    if ((this.db.isSoftDelete() || options?.softDelete === true) && options?.softDelete !== false) {
      // Soft delete? We must delete every single child record, if we can
      try {
        if (constraints && constraints.length > 0) {
          // Let's verify childs restritions to prevent this soft delete.
          if (!this.hanbleDeleteRestrictions(constraints, key)) {
            if (transaction) this.db.rollback(transaction);
            return false;
          }

          // Do the soft delete
          const deletedAtValue: any = {
            date: new Date(),
          };

          if (options?.userId) deletedAtValue['userId'] = options.userId;
          if (options?.userName) deletedAtValue['userName'] = options.userName;

          primaryKeyInfo.values.unshift(JSON.stringify(deletedAtValue));
          await this.db.update({
            command: `UPDATE ${this.tableName}
                       SET ${this.deletedAtColumn} = ${env.DB_TYPE === DBType.MariaDB ? '?' : '$1'}
                     WHERE ${primaryKeyInfo.cmd}`,
            values: [primaryKeyInfo.values],
            transaction,
          });

          // Let's verify if there are cascade childs to delete too.
          const cascade = constraints.filter(c => c.deleteRule === DeleteRule.CASCADE);

          if (cascade && cascade.length > 0) {
            for (const cascadeTable of cascade) {
              if (!(await this.deleteRecursively(args))) {
                throw new ConstraintError(`record-in-use-in-table: ${cascadeTable.tableName}`);
              }
            }
          }
        }

        if (transaction) this.db.commit(transaction);

        return true;
      } catch (err: any) {
        if (transaction) this.db.rollback(transaction);

        throw new DBError(err.message);
      }
    } else {
      return await this.handleHardDelete(constraints, primaryKeyInfo);
    }
  }

  private async handleHardDelete(
    constraints: ITableConstraintsResultSet[],
    primaryKeyInfo: IPrimaryKeyQuery,
  ): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    try {
      await this.db.delete({
        command: `DELETE FROM ${this.tableName} WHERE ${primaryKeyInfo.cmd}`,
        values: primaryKeyInfo.values,
      });

      return true;
    } catch (err: any) {
      if (err.message.includes('foreign key constraint fails')) {
        const indexPhrase = 'fails (`' + env.DB_DATABASE + '`.`';

        let table = err.message.substr(err.message.indexOf(indexPhrase) + indexPhrase.length);
        table = table.substr(0, table.indexOf('`'));

        const casedTable = constraints.filter(c => c.tableName.toLowerCase() === table.toLowerCase());
        const resourcedTableName = casedTable && casedTable.length > 0 ? casedTable[0].tableName : table;
        throw new ConstraintError(`record-in-use-in-table: ${resourcedTableName.tableName}`);
      }

      throw new DBError(err.message);
    }
  }

  private async hanbleDeleteRestrictions(constraint: ITableConstraintsResultSet[], key: any): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    const restrict = constraint.filter(c => c.deleteRule === DeleteRule.RESTRICT);

    if (restrict && restrict.length > 0) {
      for (const restrictTable of restrict) {
        const childCrud = new BasicCrud({ tableName: restrictTable.tableName, db: this.db });

        const referencedColumns = childCrud.metadata?.columns.filter(
          column => column.referencedTable === this.tableName,
        );

        if (referencedColumns && referencedColumns.length > 0) {
          let where = `WHERE ${this.deletedAtColumn} IS NULL\n`;

          referencedColumns.forEach(column => {
            where += `AND ${column.columnName} = ?\n`;
          });

          const amount: any = (await this.db.queryRow({
            sql: `SELECT COUNT(*) AS amount FROM ${restrictTable.tableName} ${where}`,
            values: isArray(key) ? key : [key],
          })) as unknown;

          if (amount.amount > 0) {
            throw new ConstraintError('recordInUseInTable ' + childCrud.metadata?.tableName);
          }
        }
      }
    }

    return true;
  }

  private async deleteRecursively(args: {
    key: any;
    transaction?: Connection | PoolClient;
    options?: IDeleteOptions;
  }): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();
    if (!this.tableName) throw new InvalidMetadataError();

    const { key, transaction, options } = args;

    const childTable = new BasicCrud({ tableName: this.tableName, db: this.db });

    const referencedColumns = childTable.metadata?.columns.filter(
      column => column.referencedTable && column.referencedTable === this.tableName,
    );

    if (referencedColumns && referencedColumns.length > 0) {
      let where = '';

      referencedColumns.forEach(column => {
        where += `${where === '' ? 'WHERE' : 'AND'} ${column.columnName} = ${env.DB_TYPE === DBType.MariaDB ? '?' : '$1'} `;
      });

      const primaryKeys = childTable.getTablePrimaryKey();

      const rows: any = (await this.db.queryRows({
        sql: `SELECT ${typeof primaryKeys === 'string' ? primaryKeys : primaryKeys.join(', ')} 
                FROM ${childTable.tableName} 
               ${where}`,
        values: isArray(key) ? key : [key],
        transaction,
      })) as unknown;

      if (rows && rows.length > 0) {
        for (const row of rows) {
          const keys = [];

          if (isArray(primaryKeys)) {
            primaryKeys.forEach(pk => keys.push(pk));
          } else {
            keys.push(primaryKeys);
          }

          const constraints = this.db.getTableReferencedConstraints(this.tableName);
          if (constraints) {
            // Let's verify if there are restrition childs preventing this soft delete.
            if (!this.hanbleDeleteRestrictions(constraints, keys)) {
              return false;
            }
          }

          const primaryKeyInfo = childTable.mountTableWherePrimaryKey(row.id);
          const deletedAtValue: any = {
            date: new Date(),
          };

          if (options?.userId) deletedAtValue['userId'] = options.userId;
          if (options?.userName) deletedAtValue['userName'] = options.userName;

          primaryKeyInfo.values.unshift(JSON.stringify(deletedAtValue));
          await this.db.update({
            command: `UPDATE ${this.tableName} 
                         SET ${this.deletedAtColumn} = ${env.DB_TYPE === DBType.MariaDB ? '?' : '$1'} 
                       WHERE ${primaryKeyInfo.cmd}`,
            values: primaryKeyInfo.values,
            transaction,
          });

          const cascade = constraints.filter(c => c.deleteRule === DeleteRule.CASCADE);

          if (cascade && cascade.length > 0) {
            for (const cascadeTable of cascade) {
              await childTable.deleteRecursively({
                key: primaryKeyInfo.values.length === 1 ? primaryKeyInfo.values[0].id : primaryKeyInfo.values,
                transaction,
                options,
              });
            }
          }
        }
      }
    }

    return true;
  }

  public async get(key: any): Promise<any> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    const primaryKeyInfo = this.mountTableWherePrimaryKey(key);

    const columns = this.metadata.columns.map(column => column.columnName);

    const query = `SELECT ${columns.join(', ')} 
                     FROM ${this.tableName}
                    WHERE ${primaryKeyInfo.cmd}`;

    return this.db.queryRow({ sql: query, values: primaryKeyInfo.values });
  }

  public async list(key: any, filters?: any): Promise<any> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    return true;
  }

  public async dropdownList(columns: any, filters?: any): Promise<any> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    return true;
  }

  // Hooks are here to be overhide if overrided class need more control
  public async hookBeforeSave(data: object): Promise<object> {
    return data;
  }

  public async hookAfterSave(data: object): Promise<object> {
    return data;
  }

  public async hookBeforeCreate(data: object): Promise<object> {
    return data;
  }

  public async hookAfterCreate(data: object): Promise<object> {
    return data;
  }

  public async hookBeforeUpdate(key: any, data: object): Promise<object> {
    return data;
  }

  public async hookAfterUpdate(key: any, data: object): Promise<object> {
    return data;
  }

  public async hookBeforeDelete(key: any, data: object): Promise<object> {
    return data;
  }

  public async hookAfterDelete(key: any, data: object): Promise<object> {
    return data;
  }

  // Generic function to verify if a specific row exists on table, based on primary key
  public async verifyRow(key: any, softDeleted: boolean = false): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    let primaryKeyInfo = this.mountTableWherePrimaryKey(key, softDeleted);

    let queryCmd = `SELECT COUNT(*) AS amount 
                      FROM ${this.tableName} 
                     WHERE ${!softDeleted ? `${this.deletedAtColumn} IS NULL AND ` : ''} ${primaryKeyInfo.cmd}`;

    try {
      const result = await this.db.queryRow({ sql: queryCmd, values: primaryKeyInfo.values });

      return result && result.amount > 0;
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  // Generic function to return the where section of a query based on primary key
  public mountTableWherePrimaryKey(key: any, softDeleted: boolean = false): IPrimaryKeyQuery {
    if (!this.db) throw new DBNotConnectedError();

    const primaryKey = this.getTablePrimaryKey();
    const values = [];

    if (
      (isArray(primaryKey) && !isArray(key)) ||
      (!isArray(primaryKey) && isArray(key)) ||
      (isArray(primaryKey) && isArray(key) && primaryKey.length !== key.length)
    ) {
      throw new BadPrimaryKeyFormatError();
    }

    let cmd = `${this.deletedAtColumn && !softDeleted ? `${this.deletedAtColumn} IS NULL AND ` : ''}`;

    if (!isArray(primaryKey)) {
      cmd = `${primaryKey} =  ${env.DB_TYPE === DBType.MariaDB ? '?' : `$1`}`;
      values.push(key);
    } else {
      for (let column = 0; column <= primaryKey.length; column++) {
        cmd += `${primaryKey[column]} = ${env.DB_TYPE === DBType.MariaDB ? '?' : `$${column + 1}`}${column < primaryKey.length - 1 ? ' AND ' : ''}`;
        values.push(key[column]);
      }
    }

    return {
      cmd,
      values,
    };
  }

  // Get table primary key info
  public getTablePrimaryKey(): string | string[] {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    const keys: string[] = [];

    this.metadata.columns.forEach(column => {
      if (column.primaryKey) {
        keys.push(column.columnName);
      }
    });

    return keys.length === 1 ? keys[0] : keys;
  }

  // Can be overrided for more controls
  public async verifyDataFields(data: object, operation: Operation, primaryKey?: number): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    this.metadata.columns = this.metadata.columns as IColumnMetaDataResultSet[];

    for (const column of this.metadata.columns) {
      try {
        await this.verifyField(column, this.metadata, data, operation, primaryKey);
      } catch (err: any) {
        throw new DBError(err.message);
      }
    }

    return true;
  }

  // To be overrided for more control
  public async verifyField(
    column: IColumnMetaDataResultSet,
    tableMetadata: ITableMetaDataResultSet,
    data: Record<string, any>,
    operation: Operation,
    primaryKey?: number,
  ): Promise<boolean> {
    // Verify if the field is not nullable. If it's not, verify for a default value
    if (!this.db) throw new DBNotConnectedError();
    if (!this.metadata) throw new DBMetadataNotLoadedError();

    if (!column.isNullable && !data[column.columnName] && !column.autoIncrement) {
      if (column.defaultValue) {
        if (this.createdAtColumn && column.columnName !== this.createdAtColumn) {
          data[column.columnName] =
            column.dataType === 'char' || column.dataType === 'varchar'
              ? (column.defaultValue as string).replace(/[']/g, '')
              : column.defaultValue;
        }
      } else if (column.primaryKey && operation !== Operation.UPDATE) {
        throw new Error('fieldNotSent: ' + column.columnName); // TODO
      }
    }

    // Verify the field size
    if (
      data[column.columnName] &&
      (column.dataType === 'char' || column.dataType === 'varchar') &&
      data[column.columnName].length > (column.length as number)
    ) {
      throw new ConstraintError('fieldSizeExcedeed field: ' + column.columnName + ' maxSize: ' + String(column.length));
    }

    // Verify parent constraint
    if (column.referencedTable && column.referencedColumn) {
      const exists = await this.db.queryRow({
        sql: `SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END AS recordExists
                FROM ${column.referencedTable}
               WHERE ${column.referencedColumn} = ?
                 AND ${this.deletedAtColumn} IS NULL`,
        values: [data[column.columnName]],
      });

      if (!exists || !exists.recordExists) {
        throw new ConstraintError(
          'valueDoesNotExistsOnParent value: ' + data[column.columnName] + ' table: ' + tableMetadata.tableName,
        );
      }
    }

    // Verify Unique Key
    if (column.uniqueKey) {
      const uniqueKeyVerificationParams = [data[column.columnName]];
      if (primaryKey) uniqueKeyVerificationParams.push(primaryKey);

      const exists = await this.db.queryRow({
        sql: `SELECT COUNT(*) AS amount
                FROM ${this.tableName}
               WHERE ${column.columnName} = ?
                ${primaryKey ? ` AND id <> ?` : ''}
                AND ${this.deletedAtColumn} IS NULL`,
        values: uniqueKeyVerificationParams,
      });

      if (exists && exists.amount > 0) {
        throw new ConstraintError(
          'valueAlreadyExistsOnParent value: ' + data[column.columnName] + ' column: column.humanName',
        );
      }
    }

    return true;
  }
}
