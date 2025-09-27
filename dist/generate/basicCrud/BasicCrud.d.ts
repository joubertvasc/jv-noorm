/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BaseDB } from '../../db/BaseDB';
import { ConnectionPool } from '../../db/ConnectionPool';
import { IColumnMetaDataResultSet } from '../../db/interfaces/IColumnMetaDataResultSet';
import { IDeleteOptions } from '../../db/interfaces/IDeleteOptions';
import { ISchemaMetaDataResultSet } from '../../db/interfaces/ISchemaMetaDataResultSet';
import { Operation } from '../../enum/operations';
import { IDropDown } from '../interfaces/IDropDown';
import { IListResult } from '../interfaces/IListResult';
import { IMetadata } from '../interfaces/IMetadata';
export interface IPrimaryKeyQuery {
    cmd: string;
    values: any[];
}
export declare class BasicCrud {
    tableName: string | undefined;
    schemaMetadata: ISchemaMetaDataResultSet | undefined;
    db: BaseDB | undefined;
    createdAtColumn: string | null;
    updatedAtColumn: string | null;
    deletedAtColumn: string | null;
    isMariaDB: boolean;
    isPostgreSQL: boolean;
    keyField: string | undefined;
    listField: string | undefined;
    private metadata;
    constructor(params: {
        tableName: string;
        db: BaseDB;
        keyField?: string;
        listField?: string;
        softDelete?: boolean;
    });
    setMetadata(metadata: IMetadata[]): void;
    getMetadata(): IMetadata[] | undefined;
    messageForDBNotConnectedError(): string;
    messageForDBMetadataNotLoadedError(): string;
    messageForBadPrimaryKeyFormatError(): string;
    messageForTableDoesNotExistsError(tableName: string): string;
    messageForInvalidMetadataError(key: string, tableName: string): string;
    messageForConstraintError(tableName: string): string;
    messageForInvalidDropdownConfigError(missingField: string): string;
    messageForMissingFieldError(columnName: string): string;
    messageForFieldSizeExcedeedError(columnName: string, maxSize: number): string;
    messageForValueDoesNotExistsOnParentError(value: string, tableName: string): string;
    messageForValueAlreadyExistsOnParentError(value: string, columnName: string): string;
    private findTableHumanName;
    private findColumnHumanName;
    create(params: {
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<any>;
    update(params: {
        key: any;
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<any>;
    delete(params: {
        key: any;
        transaction?: ConnectionPool;
        options?: IDeleteOptions;
    }): Promise<boolean>;
    private handleHardDelete;
    private hanbleDeleteRestrictions;
    private deleteRecursively;
    get(params: {
        key: any;
        transaction?: ConnectionPool;
    }): Promise<any>;
    list(params?: {
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
    }): Promise<IListResult>;
    dropdownList(params: {
        filters?: Record<string, any>;
        orderBy?: string;
        orderDirection?: string;
        offset?: number;
        limit?: number;
        softDeleted?: boolean;
        transaction?: ConnectionPool;
    }): Promise<IDropDown[]>;
    hookBeforeSave(params: {
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<any>;
    hookAfterSave(params: {
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<Record<string, any>>;
    hookBeforeCreate(params: {
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<Record<string, any>>;
    hookAfterCreate(params: {
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<Record<string, any>>;
    hookBeforeUpdate(params: {
        key: any;
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<Record<string, any>>;
    hookAfterUpdate(params: {
        key: any;
        data: Record<string, any>;
        transaction?: ConnectionPool;
    }): Promise<Record<string, any>>;
    hookBeforeDelete(params: {
        key: any;
        transaction?: ConnectionPool;
    }): Promise<boolean>;
    hookAfterDelete(params: {
        key: any;
        transaction?: ConnectionPool;
    }): Promise<boolean>;
    verifyRow(key: any, softDeleted?: boolean): Promise<boolean>;
    mountTableWherePrimaryKey(key: any, softDeleted?: boolean): IPrimaryKeyQuery;
    getTablePrimaryKey(): string | string[];
    verifyDataFields(data: object, operation: Operation, primaryKey?: number): Promise<boolean>;
    verifyField(column: IColumnMetaDataResultSet, tableMetadata: ISchemaMetaDataResultSet, data: Record<string, any>, operation: Operation, primaryKey?: number): Promise<boolean>;
}
