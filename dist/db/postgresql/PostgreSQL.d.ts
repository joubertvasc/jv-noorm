/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { PoolClient } from 'pg';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { ITableMetaDataResultSet } from '../../db/interfaces/ITableMetaDataResultSet';
import { BaseDB } from '../../db/BaseDB';
import { ConnectionPool } from '../ConnectionPool';
export declare class PostgreSQL extends BaseDB {
    private pgConnection;
    constructor();
    protected internalConnect(): Promise<any>;
    close(): Promise<void>;
    protected query(args: {
        sql: string;
        values?: any;
        verboseHeader: string;
        transaction?: ConnectionPool;
    }): Promise<any>;
    protected execCommand(args: {
        command: string;
        values: any;
        verboseHeader: string;
        transaction?: ConnectionPool;
    }): Promise<any>;
    queryRow(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any | null>;
    queryRows(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any[] | null>;
    insert(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<IDBInsertResult>;
    update(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<IDBUpdateResult>;
    protected internalDelete(args: {
        command: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<IDBDeleteResult>;
    exec(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<any>;
    startTransaction(): Promise<ConnectionPool>;
    commit(transaction: ConnectionPool): Promise<void>;
    rollback(transaction: ConnectionPool): Promise<void>;
    protected getDBMetadata(transaction?: ConnectionPool): Promise<ITableMetaDataResultSet[]>;
}
