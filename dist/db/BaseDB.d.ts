/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { ITableMetaDataResultSet } from './interfaces/ITableMetaDataResultSet';
import { IDBInsertResult } from '../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../db/interfaces/IDBDeleteResult';
import { IDeleteOptions } from './interfaces/IDeleteOptions';
import { ITableConstraintsResultSet } from './interfaces/ITableConstraintsResultSet';
import { ConnectionPool } from './ConnectionPool';
export declare abstract class BaseDB {
    private softDelete;
    private metadata;
    isSoftDelete(): boolean;
    setSoftDelete(useSoftDelete: boolean): void;
    getMetadata(): ITableMetaDataResultSet[];
    connect(): Promise<any>;
    protected abstract internalConnect(): Promise<any>;
    abstract close(): Promise<any>;
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
    abstract queryRow(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any | null>;
    abstract queryRows(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any[] | null>;
    abstract insert(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<IDBInsertResult>;
    abstract update(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<IDBUpdateResult>;
    protected abstract internalDelete(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<IDBDeleteResult>;
    abstract exec(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any>;
    abstract startTransaction(): Promise<ConnectionPool>;
    beginTransaction(): Promise<ConnectionPool>;
    abstract commit(transaction: ConnectionPool): Promise<void>;
    abstract rollback(transaction: ConnectionPool): Promise<void>;
    protected abstract getDBMetadata(transaction?: ConnectionPool): Promise<ITableMetaDataResultSet[]>;
    updateMetadata(): Promise<void>;
    delete(args: {
        command: string;
        values?: any;
        options?: IDeleteOptions;
        transaction?: ConnectionPool;
    }): Promise<IDBDeleteResult>;
    getTableMetadata(tableName: string): ITableMetaDataResultSet | null;
    findCreatedAtColumn(table: string): string | null;
    findUpdatedAtColumn(table: string): string | null;
    findDeletedAtColumn(table: string): string | null;
    getTableReferencedConstraints(referencedTableName: string): ITableConstraintsResultSet[];
    log(header: string, log: string): void;
}
