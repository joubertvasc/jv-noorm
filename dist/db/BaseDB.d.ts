/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { AsyncLocalStorage } from 'node:async_hooks';
import EventEmitter from 'events';
import { IDBDeleteResult } from '../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../db/interfaces/IDBUpdateResult';
import { ConnectionPool } from './ConnectionPool';
import { ICrudEvent } from './interfaces/ICrudEvent';
import { IDeleteOptions } from './interfaces/IDeleteOptions';
import { ILoggedUser } from './interfaces/ILoggedUser';
import { ITableConstraintsResultSet } from './interfaces/ITableConstraintsResultSet';
import { ISchemaMetaDataResultSet } from './interfaces/ISchemaMetaDataResultSet';
export declare abstract class BaseDB extends EventEmitter {
    private softDelete;
    private metadata;
    protected asyncLocalStorage: AsyncLocalStorage<any> | undefined;
    constructor(asyncLocalStorage?: AsyncLocalStorage<any>);
    isSoftDelete(): boolean;
    setSoftDelete(useSoftDelete: boolean): void;
    getMetadata(): ISchemaMetaDataResultSet[];
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
    protected abstract getDBMetadata(transaction?: ConnectionPool): Promise<ISchemaMetaDataResultSet[]>;
    updateMetadata(): Promise<void>;
    delete(args: {
        command: string;
        values?: any;
        options?: IDeleteOptions;
        transaction?: ConnectionPool;
    }): Promise<IDBDeleteResult>;
    getTableMetadata(tableName: string): ISchemaMetaDataResultSet | null;
    findCreatedAtColumn(table: string): string | null;
    findUpdatedAtColumn(table: string): string | null;
    findDeletedAtColumn(table: string): string | null;
    getTableReferencedConstraints(referencedTableName: string): ITableConstraintsResultSet[];
    protected emitCrudEvent(operation: string, args: ICrudEvent): void;
    protected getLoggedUser(): ILoggedUser;
    log(header: string, log: string): void;
}
