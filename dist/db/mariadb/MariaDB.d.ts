/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { RowDataPacket, ResultSetHeader, Pool, Connection } from 'mysql2/promise';
import { ITableMetaDataResultSet } from '../interfaces/ITableMetaDataResultSet';
import { BaseDB } from '../BaseDB';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
export default class MariaDB extends BaseDB {
    private pool;
    retries: number;
    internalConnect(): Promise<Pool | null>;
    close(): Promise<void>;
    protected query(args: {
        sql: string;
        values: any;
        verboseHeader: string;
        transaction?: Connection;
    }): Promise<RowDataPacket[] | null>;
    protected execCommand(args: {
        command: string;
        values: any;
        verboseHeader: string;
        transaction?: Connection;
    }): Promise<ResultSetHeader>;
    queryRow(args: {
        sql: string;
        values?: any;
        transaction?: Connection;
    }): Promise<RowDataPacket | null>;
    queryRows(args: {
        sql: string;
        values?: any;
        transaction?: Connection;
    }): Promise<RowDataPacket[] | null>;
    insert(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBInsertResult>;
    update(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBUpdateResult>;
    protected internalDelete(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBDeleteResult>;
    exec(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<ResultSetHeader>;
    startTransaction(): Promise<Connection>;
    commit(transaction: Connection): Promise<void>;
    rollback(transaction: Connection): Promise<void>;
    protected getDBMetadata(transaction?: Connection): Promise<ITableMetaDataResultSet[]>;
}
