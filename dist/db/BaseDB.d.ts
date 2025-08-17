import { Connection } from 'mysql2/promise';
import { ITableMetaDataResultSet } from './interfaces/ITableMetaDataResultSet';
import { IDBInsertResult } from '../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../db/interfaces/IDBDeleteResult';
import { IDeleteOptions } from './interfaces/IDeleteOptions';
export declare abstract class BaseDB {
    private softDelete;
    private metadata;
    isSoftDelete(): boolean;
    setSoftDelete(useSoftDelete: boolean): void;
    getMetadata(): ITableMetaDataResultSet[];
    connect(): Promise<any>;
    abstract internalConnect(): Promise<any>;
    abstract close(): Promise<any>;
    protected abstract query(args: {
        sql: string;
        values: any;
        verboseHeader: string;
        transaction?: Connection;
    }): Promise<any>;
    protected abstract execCommand(args: {
        command: string;
        values: any;
        verboseHeader: string;
        transaction?: Connection;
    }): Promise<any>;
    abstract queryRow(args: {
        sql: string;
        values?: any;
        transaction?: Connection;
    }): Promise<any | null>;
    abstract queryRows(args: {
        sql: string;
        values?: any;
        transaction?: Connection;
    }): Promise<any[] | null>;
    abstract insert(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBInsertResult>;
    abstract update(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBUpdateResult>;
    protected abstract internalDelete(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<IDBDeleteResult>;
    abstract exec(args: {
        command: string;
        values?: any;
        transaction?: Connection;
    }): Promise<any>;
    abstract startTransaction(): Promise<Connection>;
    beginTransaction(): Promise<Connection>;
    abstract commit(transaction: Connection): Promise<void>;
    abstract rollback(transaction: Connection): Promise<void>;
    protected abstract getDBMetadata(transaction?: Connection): Promise<ITableMetaDataResultSet[]>;
    delete(args: {
        command: string;
        values?: any;
        options?: IDeleteOptions;
        transaction?: Connection;
    }): Promise<IDBDeleteResult>;
}
