/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { isArray } from 'lodash';

import { BaseDB } from '../../db/BaseDB';
import { ConnectionPool } from '../../db/ConnectionPool';
import { IColumnMetaDataResultSet } from '../../db/interfaces/IColumnMetaDataResultSet';
import { IDeleteOptions } from '../../db/interfaces/IDeleteOptions';
import { ISchemaMetaDataResultSet } from '../../db/interfaces/ISchemaMetaDataResultSet';
import { ITableConstraintsResultSet } from '../../db/interfaces/ITableConstraintsResultSet';
import { DBType } from '../../enum/dbType';
import { DeleteRule } from '../../enum/deleteRule';
import { Operation } from '../../enum/operations';
import { env } from '../../env';
import { BadPrimaryKeyFormatError } from '../../shared/errors/bad-primary-key-format-error';
import { ConstraintError } from '../../shared/errors/constraint-error';
import { DBError } from '../../shared/errors/db-error';
import { DBMetadataNotLoadedError } from '../../shared/errors/db-metadata-not-loaded';
import { DBNotConnectedError } from '../../shared/errors/db-not-connected-error';
import { FieldSizeExcedeedError } from '../../shared/errors/field-size-excedeed-error';
import { InvalidDropdownConfigError } from '../../shared/errors/invalid-dropdown-config-error';
import { InvalidMetadataError } from '../../shared/errors/invalid-metadata-error';
import { MissingFieldError } from '../../shared/errors/missing-field-error';
import { TableDoesNotExistsError } from '../../shared/errors/table-does-not-exists-error';
import { ValueAlreadyExistsOnParentError } from '../../shared/errors/value-already-exists-on-parent-error';
import { ValueDoesNotExistsOnParentError } from '../../shared/errors/value-does-not-exists-on-parent-error';
import { IDropDown } from '../interfaces/IDropDown';
import { IListResult } from '../interfaces/IListResult';
import { IMetadata } from '../interfaces/IMetadata';

export interface IPrimaryKeyQuery {
  cmd: string;
  values: any[];
}

export class BasicCrud {
  public tableName: string | undefined;
  public schemaMetadata: ISchemaMetaDataResultSet | undefined;
  public db: BaseDB | undefined;
  public createdAtColumn;
  public updatedAtColumn;
  public deletedAtColumn;
  public isMariaDB: boolean = false;
  public isPostgreSQL: boolean = false;
  public keyField: string | undefined;
  public listField: string | undefined;
  private metadata: IMetadata[] | undefined;

  public constructor(params: {
    tableName: string;
    db: BaseDB;
    keyField?: string;
    listField?: string;
    softDelete?: boolean;
    metadata?: IMetadata[];
  }) {
    const { tableName, db, keyField, listField, softDelete, metadata } = params;

    this.tableName = tableName;
    this.db = db;
    this.isMariaDB = env.DB_TYPE === DBType.MariaDB;
    this.isPostgreSQL = env.DB_TYPE === DBType.PostgreSQL;
    this.db.setSoftDelete(softDelete === true ? true : false);
    this.metadata = metadata;

    try {
      if (!db.getMetadata()) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

      this.schemaMetadata = db.getMetadata().find(table => table.tableName === tableName);

      if (!this.schemaMetadata)
        throw new TableDoesNotExistsError(this.messageForTableDoesNotExistsError(this.findTableHumanName(tableName)));

      this.createdAtColumn = this.db.findCreatedAtColumn(this.tableName as string);
      this.updatedAtColumn = this.db.findUpdatedAtColumn(this.tableName as string);
      this.deletedAtColumn = this.db.findDeletedAtColumn(this.tableName as string);
      this.listField = listField;

      if (keyField) {
        this.keyField = keyField;
      } else {
        const primaryKey = this.getTablePrimaryKey();
        if (!isArray(primaryKey)) {
          this.keyField = primaryKey;
        }
      }
    } catch (err: any) {
      throw new Error(err.message);
    }
  }

  public messageForDBNotConnectedError(): string {
    return 'db-not-connected';
  }

  public messageForDBMetadataNotLoadedError(): string {
    return 'db-schemaMetadata-not-loaded';
  }

  public messageForBadPrimaryKeyFormatError(): string {
    return 'bad-primary-key-format-error';
  }

  public messageForTableDoesNotExistsError(tableName: string): string {
    return `${tableName} does-not-exists`;
  }

  public messageForInvalidMetadataError(key: string, tableName: string): string {
    return `Column ${key} does-not-exists-on-table ${tableName}`;
  }

  public messageForConstraintError(tableName: string): string {
    return `record-in-use-in-table: ${tableName}`;
  }

  public messageForInvalidDropdownConfigError(missingField: string): string {
    return `${missingField} field-not-defined-for-dropdown-list.`;
  }

  public messageForMissingFieldError(columnName: string): string {
    return `field-not-sent: ${columnName}`;
  }

  public messageForFieldSizeExcedeedError(columnName: string, maxSize: number): string {
    return `fieldSizeExcedeed field: ${columnName} maxSize: ${String(maxSize)}`;
  }

  public messageForValueDoesNotExistsOnParentError(value: string, tableName: string): string {
    return `valueDoesNotExistsOnParent value: ${value} column: ${tableName}.`;
  }

  public messageForValueAlreadyExistsOnParentError(value: string, columnName: string): string {
    return `valueAlreadyExistsOnParent value: ${value} column: ${columnName}`;
  }

  private findTableHumanName(tableName: string): string {
    if (!this.metadata) return tableName;

    const table = this.metadata.find(m => m.tableName === this.tableName);

    if (!table || !table.columns || table.columns.length === 0) return tableName;

    return table.humanName;
  }

  private findColumnHumanName(columnName: string, tableName?: string): string {
    if (!this.metadata) return columnName;

    const table = this.metadata.find(m => m.tableName === (tableName || this.tableName));
    if (!table || !table.columns || table.columns.length === 0) return columnName;

    const column = table.columns.find(c => c.columnName === columnName);
    if (!column || !column.humanName) return columnName;

    return column.humanName;
  }

  public async create(params: { data: Record<string, any>; transaction?: ConnectionPool }): Promise<any> {
    let { data } = params;
    const { transaction } = params;

    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    await this.verifyDataFields(data, Operation.CREATE);

    try {
      data = await this.hookBeforeCreate({ data, transaction });
      if (data) {
        data = await this.hookBeforeSave({ data, transaction });

        if (data) {
          const fields: string[] = [];
          const params: string[] = [];
          const values: any[] = [];
          let idx = 1;

          Object.keys(data).forEach((key: string) => {
            let column: IColumnMetaDataResultSet | undefined;
            if (this.schemaMetadata && this.schemaMetadata.columns) {
              [column] = this.schemaMetadata.columns.filter(col => col.columnName === key);
            }

            if (!column) {
              throw new InvalidMetadataError(
                this.messageForInvalidMetadataError(key, this.findTableHumanName(this.tableName || '')),
              );
            }

            if ((!column.primaryKey || !column.autoIncrement) && data[key] !== undefined) {
              fields.push(key);
              values.push(data[key]);
              params.push(this.isMariaDB ? '?' : `$${idx}`); // Different param syntax for PostgreSQL
              idx++;
            }
          });

          if (fields.length > 0) {
            const hasAutoincrement = this.schemaMetadata.columns.some(column => {
              return column.autoIncrement;
            });

            const primaryKey = this.schemaMetadata.columns.filter(column => {
              return column.primaryKey;
            });

            const hasUUID = primaryKey && primaryKey.length === 1 && primaryKey[0].columnType.toLowerCase() === 'uuid';
            const primaryKeyField = primaryKey && primaryKey.length === 1 && primaryKey[0].columnName;

            if (this.createdAtColumn) {
              if (!fields.includes(this.createdAtColumn)) {
                fields.push(this.createdAtColumn);
                values.push(new Date());
                params.push(this.isMariaDB ? '?' : `$${idx}`);
              }
            }

            const command = `INSERT INTO ${this.tableName}(${fields.join(', ')}) VALUES (${params.join(', ')}) ${hasAutoincrement || hasUUID ? ` returning ${primaryKeyField}` : ''}`;
            const result = await this.db.insert({ command, values, transaction });

            if (
              (hasAutoincrement || hasUUID) &&
              result.id &&
              ((typeof result.id === 'number' && result.id > 0) || (typeof result.id === 'string' && result.id !== ''))
            ) {
              data = await this.get({ key: result.id, transaction });
            }

            await this.hookAfterCreate({ data, transaction });
            await this.hookAfterSave({ data, transaction });

            return data;
          }
        }
      }
    } catch (err: any) {
      if (err.message.startsWith('Column') && err.message.endsWith('cannot be null')) {
        const exceptionParts = err.message.split(' ');
        throw new MissingFieldError(this.messageForMissingFieldError(this.findColumnHumanName(exceptionParts[1])));
      }

      throw new DBError(err.message);
    }
  }

  public async update(params: { key: any; data: Record<string, any>; transaction?: ConnectionPool }): Promise<any> {
    let { data } = params;
    const { key, transaction } = params;

    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    // await this.verifyDataFields(data, Operation.UPDATE);
    if (!(await this.verifyRow(key))) return false;

    try {
      const primaryKey = this.getTablePrimaryKey();
      if (isArray(primaryKey)) {
        if (primaryKey.length !== key.length) {
          throw new BadPrimaryKeyFormatError(this.messageForBadPrimaryKeyFormatError());
        }

        for (let i = 0; i < primaryKey.length; i++) {
          data[primaryKey[i]] = key[i];
        }
      } else {
        data[primaryKey] = key;
      }

      data = await this.hookBeforeUpdate({ key, data, transaction });
      if (data) {
        data = await this.hookBeforeSave({ data, transaction });

        if (data) {
          if (this.updatedAtColumn) data[this.updatedAtColumn] = new Date();

          const fields: string[] = [];
          const values: any[] = [];

          Object.keys(data).forEach((key: string) => {
            let column: IColumnMetaDataResultSet | undefined;
            if (this.schemaMetadata && this.schemaMetadata.columns) {
              [column] = this.schemaMetadata.columns.filter(column => column.columnName === key);
            }

            if (!column) {
              throw new InvalidMetadataError(
                this.messageForInvalidMetadataError(key, this.findTableHumanName(this.tableName || '')),
              );
            }

            if ((!column.primaryKey || !column.autoIncrement) && data[key] !== undefined) {
              fields.push(key);
              values.push(data[key]);
            }
          });

          if (fields.length > 0) {
            let command = `UPDATE ${this.tableName}
                              SET `;

            const idx = 1;
            for (let column = 0; column < fields.length; column++) {
              command += `${fields[column]} = ${this.isMariaDB ? '?' : `$${idx}`}${column < fields.length - 1 ? ',' : ''}\n`;
            }

            const primaryKeyInfo = this.mountTableWherePrimaryKey(key);
            command += ` WHERE ${primaryKeyInfo.cmd}`;
            primaryKeyInfo.values.forEach(value => {
              values.push(value);
            });

            await this.db.update({ command, values, transaction });

            data = await this.get({ key, transaction });

            await this.hookAfterUpdate({ key, data, transaction });
            await this.hookAfterSave({ data, transaction });

            return data;
          }
        }
      }
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async delete(params: { key: any; transaction?: ConnectionPool; options?: IDeleteOptions }): Promise<boolean> {
    const { key, transaction, options } = params;

    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    try {
      const primaryKeyInfo = this.mountTableWherePrimaryKey(key);
      const constraints = this.db.getTableReferencedConstraints(this.tableName as string);

      if (!(await this.hookBeforeDelete({ key, transaction }))) return false;

      // Hard delete? Uses de database rules.
      if ((this.db.isSoftDelete() || options?.softDelete === true) && options?.softDelete !== false) {
        // Soft delete? We must delete every single child record, if we can
        try {
          if (constraints && constraints.length > 0) {
            // Let's verify childs restritions to prevent this soft delete.
            if (!(await this.hanbleDeleteRestrictions(constraints, key))) {
              return false;
            }
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
                         SET ${this.deletedAtColumn} = ${this.isMariaDB ? '?' : '$1'}
                       WHERE ${primaryKeyInfo.cmd}`,
            values: primaryKeyInfo.values,
            transaction,
          });

          // Let's verify if there are cascade childs to delete too.
          const cascade = constraints.filter(c => c.deleteRule === DeleteRule.CASCADE);

          if (cascade && cascade.length > 0) {
            for (const cascadeTable of cascade) {
              if (
                !(await this.deleteRecursively({
                  tableName: cascadeTable.tableName,
                  key,
                  transaction,
                  options,
                }))
              ) {
                throw new ConstraintError(
                  this.messageForConstraintError(this.findTableHumanName(cascadeTable.tableName)),
                );
              }
            }
          }
        } catch (err: any) {
          throw new DBError(err.message);
        }
      } else {
        await this.handleHardDelete(constraints, primaryKeyInfo, transaction);
      }

      return await this.hookAfterDelete({ key, transaction });
    } catch (error: any) {
      throw new DBError(error.message);
    }
  }

  private async handleHardDelete(
    constraints: ITableConstraintsResultSet[],
    primaryKeyInfo: IPrimaryKeyQuery,
    transaction?: ConnectionPool,
  ): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    try {
      await this.db.delete({
        command: `DELETE FROM ${this.tableName} WHERE ${primaryKeyInfo.cmd}`,
        values: primaryKeyInfo.values,
        transaction,
      });

      return true;
    } catch (err: any) {
      if (err.message.includes('foreign key constraint fails')) {
        const indexPhrase = 'fails (`' + env.DB_DATABASE + '`.`';

        let table = err.message.substr(err.message.indexOf(indexPhrase) + indexPhrase.length);
        table = table.substr(0, table.indexOf('`'));

        const casedTable = constraints.filter(c => c.tableName.toLowerCase() === table.toLowerCase());
        const resourcedTableName = casedTable && casedTable.length > 0 ? casedTable[0].tableName : table;
        throw new ConstraintError(
          this.messageForConstraintError(this.findTableHumanName(resourcedTableName.tableName)),
        );
      }

      throw new DBError(err.message);
    }
  }

  private async hanbleDeleteRestrictions(constraint: ITableConstraintsResultSet[], key: any): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    const restrict = constraint.filter(c => c.deleteRule === DeleteRule.RESTRICT);

    if (restrict && restrict.length > 0) {
      for (const restrictTable of restrict) {
        const childCrud = new BasicCrud({ tableName: restrictTable.tableName, db: this.db });

        const referencedColumns = childCrud.schemaMetadata?.columns.filter(
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
            throw new ConstraintError(
              this.messageForConstraintError(this.findTableHumanName(childCrud.schemaMetadata?.tableName || '')),
            );
          }
        }
      }
    }

    return true;
  }

  private async deleteRecursively(params: {
    tableName: string;
    key: any;
    transaction?: ConnectionPool;
    options?: IDeleteOptions;
  }): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());
    if (!this.tableName) throw new InvalidMetadataError();

    const { key, transaction, options } = params;

    const childTable = new BasicCrud({ tableName: params.tableName, db: this.db });

    const referencedColumns = childTable.schemaMetadata?.columns.filter(
      column => column.referencedTable && column.referencedTable === this.tableName,
    );

    if (referencedColumns && referencedColumns.length > 0) {
      let where = '';

      referencedColumns.forEach(column => {
        where += `${where === '' ? 'WHERE' : 'AND'} ${column.columnName} = ${this.isMariaDB ? '?' : '$1'} `;
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

          const constraints = this.db.getTableReferencedConstraints(params.tableName);
          if (constraints && constraints.length > 0) {
            // Let's verify if there are restrition childs preventing this soft delete.
            if (!(await this.hanbleDeleteRestrictions(constraints, keys))) {
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
            command: `UPDATE ${childTable.tableName} 
                         SET ${childTable.deletedAtColumn} = ${childTable.isMariaDB ? '?' : '$1'} 
                       WHERE ${primaryKeyInfo.cmd}`,
            values: primaryKeyInfo.values,
            transaction,
          });

          const cascade = constraints.filter(c => c.deleteRule === DeleteRule.CASCADE);

          if (cascade && cascade.length > 0) {
            for (const cascadeTable of cascade) {
              await childTable.deleteRecursively({
                tableName: cascadeTable.tableName,
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

  public async get(params: { key: any; transaction?: ConnectionPool }): Promise<any> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    const primaryKeyInfo = this.mountTableWherePrimaryKey(params.key);

    const columns = this.schemaMetadata.columns.map(column => column.columnName);

    const query = `SELECT ${columns.join(', ')} 
                     FROM ${this.tableName}
                    WHERE ${primaryKeyInfo.cmd}`;

    return this.db.queryRow({ sql: query, values: primaryKeyInfo.values, transaction: params.transaction });
  }

  public async list(params?: {
    key?: any;
    fields?: string;
    filters?: Record<string, any>;
    orderBy?: string;
    orderDirection?: string;
    page?: number;
    offset?: number;
    limit?: number;
    softDeleted?: boolean;
    includeAuditingFields?: boolean;
    transaction?: ConnectionPool;
  }): Promise<IListResult> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    const columns: IColumnMetaDataResultSet[] = params?.includeAuditingFields
      ? this.schemaMetadata.columns
      : this.schemaMetadata.columns
          .map(c => {
            if (
              c.columnName !== this.createdAtColumn &&
              c.columnName !== this.updatedAtColumn &&
              c.columnName !== this.deletedAtColumn
            ) {
              return c;
            }
            return undefined;
          })
          .filter((c): c is IColumnMetaDataResultSet => c !== undefined);

    let sql = `SELECT %%PROJECTION%% FROM ${this.tableName}\n`;
    let projection = '';

    if (params?.fields) {
      projection += params.fields;
    } else {
      for (let columnIdx = 0; columnIdx < columns.length; columnIdx++) {
        const columnName = columns[columnIdx].columnName;
        projection += `${columnName}${columnIdx < columns.length - 1 ? ', ' : ''}`;
      }
    }
    projection += '\n';

    const conditions: string[] = [];
    const values: any[] = [];
    if (params && params.key) {
      const primaryKeyInfo = this.mountTableWherePrimaryKey(params.key);

      conditions.push(primaryKeyInfo.cmd);
      if (isArray(primaryKeyInfo.values)) {
        primaryKeyInfo.values.forEach((vl: any) => {
          values.push(vl);
        });
      } else {
        values.push(primaryKeyInfo.values);
      }
    }

    if (params && params.filters) {
      if (!isArray(params.filters)) {
        params.filters = [params.filters];
      }
      let idx = 1;
      (params.filters as Record<string, any>[]).forEach((flt: Record<string, any>) => {
        Object.keys(flt).forEach((key: string) => {
          conditions.push(`${key} = ${this.isMariaDB ? '?' : `$${idx}`}`);
          values.push(flt[key]);
          idx++;
        });
      });
    }

    if (this.deletedAtColumn && params?.softDeleted === true) {
      conditions.push(this.deletedAtColumn + ` IS NULL`);
    }

    for (let conditionIdx = 0; conditionIdx < conditions.length; conditionIdx++) {
      sql += `${conditionIdx === 0 ? 'WHERE' : '  AND'} ${conditions[conditionIdx]}\n`;
    }

    const count = await this.db.queryRow({
      sql: sql.replace('%%PROJECTION%%', 'COUNT(*) AS amount'),
      values,
      transaction: params?.transaction || undefined,
    });

    if (params && params.orderBy) {
      if (!params.offset && params.page && params.page > 0 && params.limit) {
        params.offset = (params.page - 1) * params.limit;
      }

      sql += ` ORDER BY ${params.orderBy} ${params.orderDirection || ' ASC'} 
      ${params.limit ? ` LIMIT ${params.offset || ''}${params.offset ? ', ' : ''}${params.limit || ''}` : ''}`;
    }

    const rows = await this.db.queryRows({
      sql: sql.replace('%%PROJECTION%%', projection),
      values,
      transaction: params?.transaction || undefined,
    });

    return {
      count: count.amount,
      rows: rows || [],
    };
  }

  public async dropdownList(params: {
    filters?: Record<string, any>;
    rawCondition?: string;
    orderBy?: string;
    orderDirection?: string;
    offset?: number;
    limit?: number;
    softDeleted?: boolean;
    transaction?: ConnectionPool;
  }): Promise<IDropDown[]> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    if (!this.keyField) throw new InvalidDropdownConfigError(this.messageForInvalidDropdownConfigError('Key'));
    if (!this.listField) throw new InvalidDropdownConfigError(this.messageForInvalidDropdownConfigError('List'));

    let sql = `SELECT ${this.keyField} AS value, ${this.listField} AS label
                 FROM ${this.tableName}\n`;

    const conditions: string[] = [];
    const values: any[] = [];
    if (params && params.filters) {
      if (!isArray(params.filters)) {
        params.filters = [params.filters];
      }
      let idx = 1;
      (params.filters as Record<string, any>[]).forEach((flt: Record<string, any>) => {
        Object.keys(flt).forEach((key: string) => {
          conditions.push(`${key} = ${this.isMariaDB ? '?' : `$${idx}`}`);
          values.push(flt[key]);
          idx++;
        });
      });
    }

    if (params && params.rawCondition) {
      conditions.push(params.rawCondition);
    }

    if (this.deletedAtColumn && params?.softDeleted === true) {
      conditions.push(this.deletedAtColumn + ` IS NULL`);
    }

    for (let conditionIdx = 0; conditionIdx < conditions.length; conditionIdx++) {
      sql += `${conditionIdx === 0 ? 'WHERE' : '  AND'} ${conditions[conditionIdx]}\n`;
    }

    if (params && params.orderBy) {
      sql += ` ORDER BY ${params.orderBy} ${params.orderDirection || ' ASC'}`;
    }

    return (await this.db.queryRows({
      sql,
      values,
      transaction: params?.transaction || undefined,
    })) as unknown as IDropDown[];
  }

  // Hooks are here to be overhide if overrided class need more control
  public async hookBeforeSave(params: { data: Record<string, any>; transaction?: ConnectionPool }): Promise<any> {
    return params.data;
  }

  public async hookAfterSave(params: {
    data: Record<string, any>;
    transaction?: ConnectionPool;
  }): Promise<Record<string, any>> {
    return params.data;
  }

  public async hookBeforeCreate(params: {
    data: Record<string, any>;
    transaction?: ConnectionPool;
  }): Promise<Record<string, any>> {
    return params.data;
  }

  public async hookAfterCreate(params: {
    data: Record<string, any>;
    transaction?: ConnectionPool;
  }): Promise<Record<string, any>> {
    return params.data;
  }

  public async hookBeforeUpdate(params: {
    key: any;
    data: Record<string, any>;
    transaction?: ConnectionPool;
  }): Promise<Record<string, any>> {
    return params.data;
  }

  public async hookAfterUpdate(params: {
    key: any;
    data: Record<string, any>;
    transaction?: ConnectionPool;
  }): Promise<Record<string, any>> {
    return params.data;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async hookBeforeDelete(params: { key: any; transaction?: ConnectionPool }): Promise<boolean> {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async hookAfterDelete(params: { key: any; transaction?: ConnectionPool }): Promise<boolean> {
    return true;
  }

  // Generic function to verify if a specific row exists on table, based on primary key
  public async verifyRow(key: any, softDeleted: boolean = false): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    const primaryKeyInfo = this.mountTableWherePrimaryKey(key, softDeleted);

    const queryCmd = `SELECT COUNT(*) AS amount 
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
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());

    const primaryKey = this.getTablePrimaryKey();
    const values = [];

    if (
      (isArray(primaryKey) && !isArray(key)) ||
      (!isArray(primaryKey) && isArray(key)) ||
      (isArray(primaryKey) && isArray(key) && primaryKey.length !== key.length)
    ) {
      throw new BadPrimaryKeyFormatError(this.messageForBadPrimaryKeyFormatError());
    }

    let cmd = `${this.deletedAtColumn && !softDeleted ? `${this.deletedAtColumn} IS NULL AND ` : ''}`;

    if (!isArray(primaryKey)) {
      cmd = `${primaryKey} =  ${this.isMariaDB ? '?' : `$1`}`;
      values.push(key);
    } else {
      for (let column = 0; column <= primaryKey.length; column++) {
        cmd += `${primaryKey[column]} = ${this.isMariaDB ? '?' : `$${column + 1}`}${column < primaryKey.length - 1 ? ' AND ' : ''}`;
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
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    const keys: string[] = [];

    this.schemaMetadata.columns.forEach(column => {
      if (column.primaryKey) {
        keys.push(column.columnName);
      }
    });

    return keys.length === 1 ? keys[0] : keys;
  }

  // Can be overrided for more controls
  public async verifyDataFields(data: object, operation: Operation, primaryKey?: number): Promise<boolean> {
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    this.schemaMetadata.columns = this.schemaMetadata.columns as IColumnMetaDataResultSet[];

    for (const column of this.schemaMetadata.columns) {
      try {
        await this.verifyField(column, this.schemaMetadata, data, operation, primaryKey);
      } catch (err: any) {
        throw new DBError(err.message);
      }
    }

    return true;
  }

  public async verifyField(
    column: IColumnMetaDataResultSet,
    tableMetadata: ISchemaMetaDataResultSet,
    data: Record<string, any>,
    operation: Operation,
    primaryKey?: number,
  ): Promise<boolean> {
    // Verify if the field is not nullable. If it's not, verify for a default value
    if (!this.db) throw new DBNotConnectedError(this.messageForDBNotConnectedError());
    if (!this.schemaMetadata) throw new DBMetadataNotLoadedError(this.messageForDBMetadataNotLoadedError());

    if (!column.isNullable && data[column.columnName] === undefined && !column.autoIncrement && !column.defaultValue) {
      //   if (this.createdAtColumn && column.columnName !== this.createdAtColumn) {
      //     data[column.columnName] =
      //       column.dataType === 'char' || column.dataType === 'varchar'
      //         ? (column.defaultValue as string).replace(/[']/g, '')
      //         : column.defaultValue;
      //   }
      // } else if (column.primaryKey && operation !== Operation.UPDATE) {
      throw new MissingFieldError(this.messageForMissingFieldError(this.findColumnHumanName(column.columnName)));
    }

    // Verify the field size
    if (
      data[column.columnName] &&
      (column.dataType === 'char' || column.dataType === 'varchar') &&
      data[column.columnName].length > (column.length as number)
    ) {
      throw new FieldSizeExcedeedError(
        this.messageForFieldSizeExcedeedError(this.findColumnHumanName(column.columnName), column.length || 0),
      );
    }

    // Verify parent constraint
    if (data[column.columnName] && column.referencedTable && column.referencedColumn) {
      const exists = await this.db.queryRow({
        sql: `SELECT CASE WHEN COUNT(*) > 0 THEN true ELSE false END AS recordExists
                FROM ${column.referencedTable}
               WHERE ${column.referencedColumn} = ?
                 AND ${this.deletedAtColumn} IS NULL`,
        values: [data[column.columnName]],
      });

      if (!exists || !exists.recordExists) {
        throw new ValueDoesNotExistsOnParentError(
          this.messageForValueDoesNotExistsOnParentError(
            data[column.columnName],
            this.findTableHumanName(tableMetadata.tableName),
          ),
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
        throw new ValueAlreadyExistsOnParentError(
          this.messageForValueAlreadyExistsOnParentError(
            data[column.columnName],
            this.findColumnHumanName(column.columnName),
          ),
        );
      }
    }

    return true;
  }
}
