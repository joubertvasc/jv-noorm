/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ITableMetaDataResultSet } from '../../db/interfaces/ITableMetaDataResultSet';
import { IColumnMetaDataResultSet } from '../../db/interfaces/IColumnMetaDataResultSet';
import { BaseDB } from '../../db/BaseDB';
import { Connection } from 'mysql2/promise';
import { PoolClient } from 'pg';
import { IDeleteOptions } from '../../db/interfaces/IDeleteOptions';
import { Operation } from '../../enum/operations';
import { IDropDown } from '../interfaces/IDropDown';
export interface IPrimaryKeyQuery {
    cmd: string;
    values: any[];
}
export declare class BasicCrud {
    tableName: string | undefined;
    metadata: ITableMetaDataResultSet | undefined;
    db: BaseDB | undefined;
    createdAtColumn: string | null;
    updatedAtColumn: string | null;
    deletedAtColumn: string | null;
    isMariaDB: boolean;
    isPostgreSQL: boolean;
    keyField: string | undefined;
    listField: string | undefined;
    constructor(params: {
        tableName: string;
        db: BaseDB;
        keyField?: string;
        listField?: string;
    });
    create(params: {
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    update(params: {
        key: any;
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    delete(params: {
        key: any;
        transaction?: Connection | PoolClient;
        options?: IDeleteOptions;
    }): Promise<boolean>;
    private handleHardDelete;
    private hanbleDeleteRestrictions;
    private deleteRecursively;
    get(params: {
        key: any;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    list(params?: {
        key?: any;
        filters?: Record<string, any>;
        orderBy?: string;
        orderDirection?: string;
        offset?: number;
        limit?: number;
        softDeleted?: boolean;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    dropdownList(params: {
        filters?: Record<string, any>;
        orderBy?: string;
        orderDirection?: string;
        offset?: number;
        limit?: number;
        softDeleted?: boolean;
        transaction?: Connection | PoolClient;
    }): Promise<IDropDown[]>;
    hookBeforeSave(params: {
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    hookAfterSave(params: {
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<Record<string, any>>;
    hookBeforeCreate(params: {
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<Record<string, any>>;
    hookAfterCreate(params: {
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<Record<string, any>>;
    hookBeforeUpdate(params: {
        key: any;
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<Record<string, any>>;
    hookAfterUpdate(params: {
        key: any;
        data: Record<string, any>;
        transaction?: Connection | PoolClient;
    }): Promise<Record<string, any>>;
    hookBeforeDelete(params: {
        key: any;
        transaction?: Connection | PoolClient;
    }): Promise<boolean>;
    hookAfterDelete(params: {
        key: any;
        transaction?: Connection | PoolClient;
    }): Promise<boolean>;
    verifyRow(key: any, softDeleted?: boolean): Promise<boolean>;
    mountTableWherePrimaryKey(key: any, softDeleted?: boolean): IPrimaryKeyQuery;
    getTablePrimaryKey(): string | string[];
    verifyDataFields(data: object, operation: Operation, primaryKey?: number): Promise<boolean>;
    verifyField(column: IColumnMetaDataResultSet, tableMetadata: ITableMetaDataResultSet, data: Record<string, any>, operation: Operation, primaryKey?: number): Promise<boolean>;
}
