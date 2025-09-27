/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { BaseDB } from '../BaseDB';
import { ConnectionPool } from '../ConnectionPool';
import { ISchemaMetaDataResultSet } from '../interfaces/ISchemaMetaDataResultSet';
export default class MariaDB extends BaseDB {
    private pool;
    retries: number;
    internalConnect(): Promise<Pool | null>;
    private setupPoolEvents;
    private isPoolClosed;
    private ensureConnection;
    close(): Promise<void>;
    protected query(args: {
        sql: string;
        values: any;
        verboseHeader: string;
        transaction?: ConnectionPool;
    }): Promise<RowDataPacket[] | null>;
    protected execCommand(args: {
        command: string;
        values: any;
        verboseHeader: string;
        transaction?: ConnectionPool;
    }): Promise<ResultSetHeader>;
    queryRow(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<RowDataPacket | null>;
    queryRows(args: {
        sql: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<RowDataPacket[] | null>;
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
        transaction?: ConnectionPool;
    }): Promise<IDBDeleteResult>;
    exec(args: {
        command: string;
        values?: any;
        transaction?: ConnectionPool;
    }): Promise<ResultSetHeader>;
    startTransaction(): Promise<ConnectionPool>;
    commit(transaction: ConnectionPool): Promise<void>;
    rollback(transaction: ConnectionPool): Promise<void>;
    protected getDBMetadata(transaction?: ConnectionPool): Promise<ISchemaMetaDataResultSet[]>;
}
