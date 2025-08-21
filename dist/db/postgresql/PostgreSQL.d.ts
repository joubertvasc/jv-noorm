import { PoolClient } from 'pg';
import { Connection } from 'mysql2/promise';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { ITableMetaDataResultSet } from '../../db/interfaces/ITableMetaDataResultSet';
import { BaseDB } from '../../db/BaseDB';
export declare class PostgreSQL extends BaseDB {
    private pgConnection;
    constructor();
    protected internalConnect(): Promise<any>;
    close(): Promise<any>;
    protected query(args: {
        sql: string;
        values?: any;
        verboseHeader: string;
        transaction?: Connection | PoolClient;
    }): Promise<any>;
    protected execCommand(args: {
        command: string;
        values: any;
        verboseHeader: string;
        transaction?: PoolClient;
    }): Promise<any>;
    queryRow(args: {
        sql: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<any | null>;
    queryRows(args: {
        sql: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<any[] | null>;
    insert(args: {
        command: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<IDBInsertResult>;
    update(args: {
        command: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<IDBUpdateResult>;
    protected internalDelete(args: {
        command: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<IDBDeleteResult>;
    exec(args: {
        command: string;
        values?: any;
        transaction?: PoolClient;
    }): Promise<any>;
    startTransaction(): Promise<PoolClient>;
    commit(transaction: PoolClient): Promise<void>;
    rollback(transaction: PoolClient): Promise<void>;
    protected getDBMetadata(transaction?: PoolClient): Promise<ITableMetaDataResultSet[]>;
}
