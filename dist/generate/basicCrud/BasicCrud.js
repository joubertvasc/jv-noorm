"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicCrud = void 0;
const lodash_1 = require("lodash");
const db_metadata_not_loaded_1 = require("../../shared/errors/db-metadata-not-loaded");
const table_does_not_exists_error_1 = require("../../shared/errors/table-does-not-exists-error");
const db_not_connected_error_1 = require("../../shared/errors/db-not-connected-error");
const invalid_metadata_error_1 = require("../../shared/errors/invalid-metadata-error");
const db_error_1 = require("../../shared/errors/db-error");
const env_1 = require("../../env");
const dbType_1 = require("../../enum/dbType");
const bad_primary_key_format_error_1 = require("../../shared/errors/bad-primary-key-format-error");
const constraint_error_1 = require("../../shared/errors/constraint-error");
const operations_1 = require("../../enum/operations");
const deleteRule_1 = require("../../enum/deleteRule");
class BasicCrud {
    tableName;
    metadata;
    db;
    createdAtColumn;
    updatedAtColumn;
    deletedAtColumn;
    isMariaDB = false;
    isPostgreSQL = false;
    keyField;
    listField;
    constructor(params) {
        const { tableName, db } = params;
        // Optionally store db if needed: this.db = db;
        this.tableName = tableName;
        this.db = db;
        this.isMariaDB = env_1.env.DB_TYPE === dbType_1.DBType.MariaDB;
        this.isPostgreSQL = env_1.env.DB_TYPE === dbType_1.DBType.PostgreSQL;
        try {
            if (!db.getMetadata())
                throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
            this.metadata = db.getMetadata().find(table => table.tableName === tableName);
            if (!this.metadata)
                throw new table_does_not_exists_error_1.TableDoesNotExistsError(`${tableName} does-not-exists`);
            this.createdAtColumn = this.db.findCreatedAtColumn(this.tableName);
            this.updatedAtColumn = this.db.findUpdatedAtColumn(this.tableName);
            this.deletedAtColumn = this.db.findDeletedAtColumn(this.tableName);
            this.listField = params.listField;
            if (params.keyField) {
                this.keyField = params.keyField;
            }
            else {
                const primaryKey = this.getTablePrimaryKey();
                if (!(0, lodash_1.isArray)(primaryKey)) {
                    this.keyField = primaryKey;
                }
            }
        }
        catch (err) {
            throw new Error(err.message);
        }
    }
    async create(params) {
        let { data } = params;
        const { transaction } = params;
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        await this.verifyDataFields(data, operations_1.Operation.CREATE);
        try {
            data = await this.hookBeforeCreate({ data, transaction });
            if (data) {
                data = await this.hookBeforeSave({ data, transaction });
                if (data) {
                    const fields = [];
                    const params = [];
                    const values = [];
                    let idx = 1;
                    Object.keys(data).forEach((key) => {
                        let column;
                        if (this.metadata && this.metadata.columns) {
                            [column] = this.metadata.columns.filter(col => col.columnName === key);
                        }
                        if (!column)
                            throw new invalid_metadata_error_1.InvalidMetadataError();
                        if (!column.primaryKey || !column.autoIncrement || data[key] !== undefined || !column.defaultValue) {
                            fields.push(key);
                            values.push(data[key]);
                            params.push(this.isMariaDB ? '?' : `$${idx}`); // Different param syntax for PostgreSQL
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
                                params.push(this.isMariaDB ? '?' : `$${idx}`);
                            }
                        }
                        const command = `INSERT INTO ${this.tableName}(${fields.join(', ')}) 
                                  VALUES (${params.join(', ')}) 
                                  ${this.isPostgreSQL && hasAutoincrement ? ' RETURNING id' : ''}`;
                        const result = await this.db.insert({ command, values, transaction });
                        if (hasAutoincrement && Number(result.id || '0') > 0) {
                            data = await this.get({ key: Number(result.id) });
                        }
                        await this.hookAfterCreate({ data, transaction });
                        await this.hookAfterSave({ data, transaction });
                        return data;
                    }
                }
            }
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async update(params) {
        let { data } = params;
        const { key, transaction } = params;
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        // await this.verifyDataFields(data, Operation.UPDATE);
        if (!(await this.verifyRow(key)))
            return false;
        try {
            const primaryKey = this.getTablePrimaryKey();
            if ((0, lodash_1.isArray)(primaryKey)) {
                if (primaryKey.length !== key.length) {
                    throw new bad_primary_key_format_error_1.BadPrimaryKeyFormatError();
                }
                for (let i = 0; i < primaryKey.length; i++) {
                    data[(primaryKey[i] = key[i])];
                }
            }
            else {
                data[primaryKey] = key;
            }
            data = await this.hookBeforeUpdate({ key, data, transaction });
            if (data) {
                data = await this.hookBeforeSave({ data, transaction });
                if (data) {
                    if (this.updatedAtColumn)
                        data[this.updatedAtColumn] = new Date();
                    const fields = [];
                    const values = [];
                    Object.keys(data).forEach((key) => {
                        let column;
                        if (this.metadata && this.metadata.columns) {
                            [column] = this.metadata.columns.filter(column => column.columnName === key);
                        }
                        if (!column)
                            throw new invalid_metadata_error_1.InvalidMetadataError(`Column ${key} does not exists on table ${this.tableName}`);
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
                            command += `${fields[column]} = ${this.isMariaDB ? '?' : `$${idx}`}${column < fields.length - 1 ? ',' : ''}\n`;
                        }
                        let primaryKeyInfo = this.mountTableWherePrimaryKey(key);
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
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    async delete(params) {
        let { key, transaction, options } = params;
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        try {
            const primaryKeyInfo = this.mountTableWherePrimaryKey(key);
            const constraints = this.db.getTableReferencedConstraints(this.tableName);
            if (!(await this.hookBeforeDelete({ key, transaction })))
                return false;
            // Hard delete? Uses de database rules.
            if ((this.db.isSoftDelete() || options?.softDelete === true) && options?.softDelete !== false) {
                // Soft delete? We must delete every single child record, if we can
                try {
                    if (constraints && constraints.length > 0) {
                        // Let's verify childs restritions to prevent this soft delete.
                        if (!this.hanbleDeleteRestrictions(constraints, key)) {
                            return false;
                        }
                        // Do the soft delete
                        const deletedAtValue = {
                            date: new Date(),
                        };
                        if (options?.userId)
                            deletedAtValue['userId'] = options.userId;
                        if (options?.userName)
                            deletedAtValue['userName'] = options.userName;
                        primaryKeyInfo.values.unshift(JSON.stringify(deletedAtValue));
                        await this.db.update({
                            command: `UPDATE ${this.tableName}
                         SET ${this.deletedAtColumn} = ${this.isMariaDB ? '?' : '$1'}
                       WHERE ${primaryKeyInfo.cmd}`,
                            values: primaryKeyInfo.values,
                            transaction,
                        });
                        // Let's verify if there are cascade childs to delete too.
                        const cascade = constraints.filter(c => c.deleteRule === deleteRule_1.DeleteRule.CASCADE);
                        if (cascade && cascade.length > 0) {
                            for (const cascadeTable of cascade) {
                                if (!(await this.deleteRecursively({
                                    tableName: cascadeTable.tableName,
                                    key,
                                    transaction,
                                    options,
                                }))) {
                                    throw new constraint_error_1.ConstraintError(`record-in-use-in-table: ${cascadeTable.tableName}`);
                                }
                            }
                        }
                    }
                }
                catch (err) {
                    throw new db_error_1.DBError(err.message);
                }
            }
            else {
                await this.handleHardDelete(constraints, primaryKeyInfo, transaction);
            }
            return await this.hookAfterDelete({ key, transaction });
        }
        catch (error) {
            throw new db_error_1.DBError(error.message);
        }
    }
    async handleHardDelete(constraints, primaryKeyInfo, transaction) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        try {
            await this.db.delete({
                command: `DELETE FROM ${this.tableName} WHERE ${primaryKeyInfo.cmd}`,
                values: primaryKeyInfo.values,
                transaction,
            });
            return true;
        }
        catch (err) {
            if (err.message.includes('foreign key constraint fails')) {
                const indexPhrase = 'fails (`' + env_1.env.DB_DATABASE + '`.`';
                let table = err.message.substr(err.message.indexOf(indexPhrase) + indexPhrase.length);
                table = table.substr(0, table.indexOf('`'));
                const casedTable = constraints.filter(c => c.tableName.toLowerCase() === table.toLowerCase());
                const resourcedTableName = casedTable && casedTable.length > 0 ? casedTable[0].tableName : table;
                throw new constraint_error_1.ConstraintError(`record-in-use-in-table: ${resourcedTableName.tableName}`);
            }
            throw new db_error_1.DBError(err.message);
        }
    }
    async hanbleDeleteRestrictions(constraint, key) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        const restrict = constraint.filter(c => c.deleteRule === deleteRule_1.DeleteRule.RESTRICT);
        if (restrict && restrict.length > 0) {
            for (const restrictTable of restrict) {
                const childCrud = new BasicCrud({ tableName: restrictTable.tableName, db: this.db });
                const referencedColumns = childCrud.metadata?.columns.filter(column => column.referencedTable === this.tableName);
                if (referencedColumns && referencedColumns.length > 0) {
                    let where = `WHERE ${this.deletedAtColumn} IS NULL\n`;
                    referencedColumns.forEach(column => {
                        where += `AND ${column.columnName} = ?\n`;
                    });
                    const amount = (await this.db.queryRow({
                        sql: `SELECT COUNT(*) AS amount FROM ${restrictTable.tableName} ${where}`,
                        values: (0, lodash_1.isArray)(key) ? key : [key],
                    }));
                    if (amount.amount > 0) {
                        throw new constraint_error_1.ConstraintError('recordInUseInTable ' + childCrud.metadata?.tableName);
                    }
                }
            }
        }
        return true;
    }
    async deleteRecursively(params) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        if (!this.tableName)
            throw new invalid_metadata_error_1.InvalidMetadataError();
        const { key, transaction, options } = params;
        const childTable = new BasicCrud({ tableName: params.tableName, db: this.db });
        const referencedColumns = childTable.metadata?.columns.filter(column => column.referencedTable && column.referencedTable === this.tableName);
        if (referencedColumns && referencedColumns.length > 0) {
            let where = '';
            referencedColumns.forEach(column => {
                where += `${where === '' ? 'WHERE' : 'AND'} ${column.columnName} = ${this.isMariaDB ? '?' : '$1'} `;
            });
            const primaryKeys = childTable.getTablePrimaryKey();
            const rows = (await this.db.queryRows({
                sql: `SELECT ${typeof primaryKeys === 'string' ? primaryKeys : primaryKeys.join(', ')} 
                FROM ${childTable.tableName} 
               ${where}`,
                values: (0, lodash_1.isArray)(key) ? key : [key],
                transaction,
            }));
            if (rows && rows.length > 0) {
                for (const row of rows) {
                    const keys = [];
                    if ((0, lodash_1.isArray)(primaryKeys)) {
                        primaryKeys.forEach(pk => keys.push(pk));
                    }
                    else {
                        keys.push(primaryKeys);
                    }
                    const constraints = this.db.getTableReferencedConstraints(params.tableName);
                    if (constraints && constraints.length > 0) {
                        // Let's verify if there are restrition childs preventing this soft delete.
                        if (!this.hanbleDeleteRestrictions(constraints, keys)) {
                            return false;
                        }
                    }
                    const primaryKeyInfo = childTable.mountTableWherePrimaryKey(row.id);
                    const deletedAtValue = {
                        date: new Date(),
                    };
                    if (options?.userId)
                        deletedAtValue['userId'] = options.userId;
                    if (options?.userName)
                        deletedAtValue['userName'] = options.userName;
                    primaryKeyInfo.values.unshift(JSON.stringify(deletedAtValue));
                    await this.db.update({
                        command: `UPDATE ${childTable.tableName} 
                         SET ${childTable.deletedAtColumn} = ${childTable.isMariaDB ? '?' : '$1'} 
                       WHERE ${primaryKeyInfo.cmd}`,
                        values: primaryKeyInfo.values,
                        transaction,
                    });
                    const cascade = constraints.filter(c => c.deleteRule === deleteRule_1.DeleteRule.CASCADE);
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
    async get(params) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        const primaryKeyInfo = this.mountTableWherePrimaryKey(params.key);
        const columns = this.metadata.columns.map(column => column.columnName);
        const query = `SELECT ${columns.join(', ')} 
                     FROM ${this.tableName}
                    WHERE ${primaryKeyInfo.cmd}`;
        return this.db.queryRow({ sql: query, values: primaryKeyInfo.values, transaction: params.transaction });
    }
    async list(params) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        let sql = `SELECT `;
        for (let columnIdx = 0; columnIdx < this.metadata.columns.length; columnIdx++) {
            sql += `${this.metadata.columns[columnIdx].columnName}${columnIdx < this.metadata.columns.length - 1 ? ', ' : ''}`;
        }
        sql += '\n';
        sql += `  FROM ${this.tableName}\n`;
        let conditions = [];
        let values = [];
        if (params && params.key) {
            const primaryKeyInfo = this.mountTableWherePrimaryKey(params.key);
            conditions.push(primaryKeyInfo.cmd);
            if ((0, lodash_1.isArray)(primaryKeyInfo.values)) {
                primaryKeyInfo.values.forEach((vl) => {
                    values.push(vl);
                });
            }
            else {
                values.push(primaryKeyInfo.values);
            }
        }
        if (params && params.filters) {
            if (!(0, lodash_1.isArray)(params.filters)) {
                params.filters = [params.filters];
            }
            let idx = 1;
            params.filters.forEach((flt) => {
                Object.keys(flt).forEach((key) => {
                    conditions.push(`${key} = ${this.isMariaDB ? '?' : `$${idx}`}`);
                    values.push(flt[key]);
                    idx++;
                });
            });
        }
        if (this.deletedAtColumn && (!params || (params && !params.softDeleted))) {
            conditions.push(this.deletedAtColumn + ` IS NULL`);
        }
        for (let conditionIdx = 0; conditionIdx < conditions.length; conditionIdx++) {
            sql += `${conditionIdx === 0 ? 'WHERE' : '  AND'} ${conditions[conditionIdx]}\n`;
        }
        if (params && params.orderBy) {
            sql += ` ORDER BY ${params.orderBy} ${params.orderDirection || ' ASC'} 
      ${params.limit ? ` LIMIT ${params.offset || ''}${params.offset ? ', ' : ''}${params.limit || ''}` : ''}`;
        }
        return await this.db.queryRows({
            sql,
            values,
            transaction: params?.transaction || undefined,
        });
    }
    async dropdownList(params) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        if (!this.keyField)
            throw new invalid_metadata_error_1.InvalidMetadataError('Key field not defined for dropdown list');
        if (!this.listField)
            throw new invalid_metadata_error_1.InvalidMetadataError('List field not defined for dropdown list');
        let sql = `SELECT ${this.keyField} AS value, ${this.listField} AS label
                 FROM ${this.tableName}\n`;
        let conditions = [];
        let values = [];
        if (params && params.filters) {
            if (!(0, lodash_1.isArray)(params.filters)) {
                params.filters = [params.filters];
            }
            let idx = 1;
            params.filters.forEach((flt) => {
                Object.keys(flt).forEach((key) => {
                    conditions.push(`${key} = ${this.isMariaDB ? '?' : `$${idx}`}`);
                    values.push(flt[key]);
                    idx++;
                });
            });
        }
        if (this.deletedAtColumn && (!params || (params && !params.softDeleted))) {
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
        }));
    }
    // Hooks are here to be overhide if overrided class need more control
    async hookBeforeSave(params) {
        return params.data;
    }
    async hookAfterSave(params) {
        return params.data;
    }
    async hookBeforeCreate(params) {
        return params.data;
    }
    async hookAfterCreate(params) {
        return params.data;
    }
    async hookBeforeUpdate(params) {
        return params.data;
    }
    async hookAfterUpdate(params) {
        return params.data;
    }
    async hookBeforeDelete(params) {
        return true;
    }
    async hookAfterDelete(params) {
        return true;
    }
    // Generic function to verify if a specific row exists on table, based on primary key
    async verifyRow(key, softDeleted = false) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        let primaryKeyInfo = this.mountTableWherePrimaryKey(key, softDeleted);
        let queryCmd = `SELECT COUNT(*) AS amount 
                      FROM ${this.tableName} 
                     WHERE ${!softDeleted ? `${this.deletedAtColumn} IS NULL AND ` : ''} ${primaryKeyInfo.cmd}`;
        try {
            const result = await this.db.queryRow({ sql: queryCmd, values: primaryKeyInfo.values });
            return result && result.amount > 0;
        }
        catch (err) {
            throw new db_error_1.DBError(err.message);
        }
    }
    // Generic function to return the where section of a query based on primary key
    mountTableWherePrimaryKey(key, softDeleted = false) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        const primaryKey = this.getTablePrimaryKey();
        const values = [];
        if (((0, lodash_1.isArray)(primaryKey) && !(0, lodash_1.isArray)(key)) ||
            (!(0, lodash_1.isArray)(primaryKey) && (0, lodash_1.isArray)(key)) ||
            ((0, lodash_1.isArray)(primaryKey) && (0, lodash_1.isArray)(key) && primaryKey.length !== key.length)) {
            throw new bad_primary_key_format_error_1.BadPrimaryKeyFormatError();
        }
        let cmd = `${this.deletedAtColumn && !softDeleted ? `${this.deletedAtColumn} IS NULL AND ` : ''}`;
        if (!(0, lodash_1.isArray)(primaryKey)) {
            cmd = `${primaryKey} =  ${this.isMariaDB ? '?' : `$1`}`;
            values.push(key);
        }
        else {
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
    getTablePrimaryKey() {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        const keys = [];
        this.metadata.columns.forEach(column => {
            if (column.primaryKey) {
                keys.push(column.columnName);
            }
        });
        return keys.length === 1 ? keys[0] : keys;
    }
    // Can be overrided for more controls
    async verifyDataFields(data, operation, primaryKey) {
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        this.metadata.columns = this.metadata.columns;
        for (const column of this.metadata.columns) {
            try {
                await this.verifyField(column, this.metadata, data, operation, primaryKey);
            }
            catch (err) {
                throw new db_error_1.DBError(err.message);
            }
        }
        return true;
    }
    // To be overrided for more control
    async verifyField(column, tableMetadata, data, operation, primaryKey) {
        // Verify if the field is not nullable. If it's not, verify for a default value
        if (!this.db)
            throw new db_not_connected_error_1.DBNotConnectedError();
        if (!this.metadata)
            throw new db_metadata_not_loaded_1.DBMetadataNotLoadedError();
        if (!column.isNullable && data[column.columnName] === undefined && !column.autoIncrement && !column.defaultValue) {
            //   if (this.createdAtColumn && column.columnName !== this.createdAtColumn) {
            //     data[column.columnName] =
            //       column.dataType === 'char' || column.dataType === 'varchar'
            //         ? (column.defaultValue as string).replace(/[']/g, '')
            //         : column.defaultValue;
            //   }
            // } else if (column.primaryKey && operation !== Operation.UPDATE) {
            throw new Error('fieldNotSent: ' + column.columnName); // TODO
        }
        // Verify the field size
        if (data[column.columnName] &&
            (column.dataType === 'char' || column.dataType === 'varchar') &&
            data[column.columnName].length > column.length) {
            throw new constraint_error_1.ConstraintError('fieldSizeExcedeed field: ' + column.columnName + ' maxSize: ' + String(column.length));
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
                throw new constraint_error_1.ConstraintError('valueDoesNotExistsOnParent value: ' + data[column.columnName] + ' table: ' + tableMetadata.tableName);
            }
        }
        // Verify Unique Key
        if (column.uniqueKey) {
            const uniqueKeyVerificationParams = [data[column.columnName]];
            if (primaryKey)
                uniqueKeyVerificationParams.push(primaryKey);
            const exists = await this.db.queryRow({
                sql: `SELECT COUNT(*) AS amount
                FROM ${this.tableName}
               WHERE ${column.columnName} = ?
                ${primaryKey ? ` AND id <> ?` : ''}
                AND ${this.deletedAtColumn} IS NULL`,
                values: uniqueKeyVerificationParams,
            });
            if (exists && exists.amount > 0) {
                throw new constraint_error_1.ConstraintError('valueAlreadyExistsOnParent value: ' + data[column.columnName] + ' column: column.humanName');
            }
        }
        return true;
    }
}
exports.BasicCrud = BasicCrud;
