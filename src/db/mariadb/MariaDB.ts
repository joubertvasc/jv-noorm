import { RowDataPacket, ResultSetHeader, Pool, Connection } from 'mysql2/promise';
import { format } from 'date-fns';
import { initPool } from './pool';
import { ITableMetaDataResultSet } from '../interfaces/ITableMetaDataResultSet';
import { env } from '../../env';
import { DBError } from '../../shared/errors/db-error';
import { BaseDB } from '../BaseDB';
import { DBNotConnectedError } from '../../shared/errors/db-not-connected-error';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';

const MAX_RETRIES = 5;
const RETRY_DELAY = 2000; // ms

export default class MariaDB extends BaseDB {
  private pool: Pool | undefined;
  retries = 0;

  public async internalConnect(): Promise<Pool | null> {
    while (this.retries < MAX_RETRIES) {
      try {
        this.pool = initPool({
          user: env.DB_USER,
          password: env.DB_PASSWORD,
          database: env.DB_DATABASE,
          host: env.DB_HOST,
          port: env.DB_PORT,
          connectionLimit: env.DB_MAX_POOL,
        });

        await this.pool.query('SELECT 1');
        if (env.DB_VERBOSE) console.log('✅ DB Connected');

        return this.pool;
      } catch (err: any) {
        this.retries++;
        console.error(`❌ DB pool error (retries ${this.retries}):`, err);

        if (this.retries >= MAX_RETRIES) {
          throw new DBError('Max number of retries. Aborting...');
        }

        console.log(`⏳ Retrying again in ${RETRY_DELAY / 1000}s...`);
        await new Promise(res => setTimeout(res, RETRY_DELAY));
      }
    }

    return null;
  }

  public async close(): Promise<void> {
    this.pool?.end();
  }

  protected async query(args: {
    sql: string;
    values: any;
    verboseHeader: string;
    transaction?: Connection;
  }): Promise<RowDataPacket[] | null> {
    try {
      if (!this.pool) throw new DBNotConnectedError();
      this.log(args.verboseHeader, args.sql);

      const connection = args.transaction ? args.transaction : await this.pool.getConnection();

      if (!connection) throw new DBNotConnectedError();

      const result = await connection.query<RowDataPacket[]>(args.sql, args.values);

      if (!args.transaction) connection.destroy();

      return !result ? null : result[0];
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  protected async execCommand(args: {
    command: string;
    values: any;
    verboseHeader: string;
    transaction?: Connection;
  }): Promise<ResultSetHeader> {
    try {
      if (!this.pool) throw new DBNotConnectedError();

      this.log(args.verboseHeader, args.command);

      const connection = args.transaction ? args.transaction : await this.pool.getConnection();

      if (!connection) throw new DBNotConnectedError();

      const [result] = await connection.execute<ResultSetHeader>(args.command, args.values);

      if (!args.transaction) connection.destroy();

      return result ? result : ({} as ResultSetHeader);
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async queryRow(args: { sql: string; values?: any; transaction?: Connection }): Promise<RowDataPacket | null> {
    try {
      const rows = await this.query({
        sql: args.sql + ` LIMIT 1`,
        values: args.values,
        verboseHeader: 'QUERYROW',
        transaction: args.transaction,
      });

      if (!rows) return null;

      return rows[0];
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async queryRows(args: {
    sql: string;
    values?: any;
    transaction?: Connection;
  }): Promise<RowDataPacket[] | null> {
    try {
      return await this.query({
        sql: args.sql,
        values: args.values,
        verboseHeader: 'QUERYROWS',
        transaction: args.transaction,
      });
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async insert(args: { command: string; values?: any; transaction?: Connection }): Promise<IDBInsertResult> {
    try {
      const insertResult = await this.execCommand({
        command: args.command,
        values: args.values,
        verboseHeader: 'INSERT',
        transaction: args.transaction,
      });

      if (insertResult) {
        return {
          rowsInserted: insertResult.affectedRows,
          id: insertResult.affectedRows === 1 ? insertResult.insertId : null,
        };
      } else {
        return {
          rowsInserted: 0,
          id: null,
        };
      }
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async update(args: { command: string; values?: any; transaction?: Connection }): Promise<IDBUpdateResult> {
    try {
      const updated = await this.execCommand({
        command: args.command,
        values: args.values,
        verboseHeader: 'UPDATE',
        transaction: args.transaction,
      });

      return {
        rowsUpdated: updated.affectedRows,
      };
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  protected async internalDelete(args: {
    command: string;
    values?: any;
    transaction?: Connection;
  }): Promise<IDBDeleteResult> {
    const deleted = await this.execCommand({
      command: args.command,
      values: args.values,
      verboseHeader: 'DELETE',
      transaction: args.transaction,
    });
    return {
      rowsDeleted: deleted.affectedRows,
    };
  }

  public async exec(args: { command: string; values?: any; transaction?: Connection }): Promise<ResultSetHeader> {
    try {
      return await this.execCommand({
        command: args.command,
        values: args.values,
        verboseHeader: 'EXEC',
        transaction: args.transaction,
      });
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async startTransaction(): Promise<Connection> {
    if (!this.pool) throw new DBNotConnectedError();
    this.log('STARTTRANSACTION', '');

    try {
      const connection = await this.pool.getConnection();
      await connection.beginTransaction();

      return connection;
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async commit(transaction: Connection): Promise<void> {
    if (!this.pool) throw new DBNotConnectedError();
    this.log('COMMIT', '');

    try {
      await transaction.commit();
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  public async rollback(transaction: Connection): Promise<void> {
    if (!this.pool) throw new DBNotConnectedError();
    this.log('ROLLBACK', '');

    try {
      await transaction.rollback();
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }

  protected async getDBMetadata(transaction?: Connection): Promise<ITableMetaDataResultSet[]> {
    try {
      const tables = await this.queryRows({
        sql: `
        SELECT T.TABLE_NAME AS tableName, T.TABLE_TYPE AS tableType, T.Engine AS engine, 
               T.TABLE_COLLATION AS tableCollation, 
               COALESCE((SELECT CONCAT ('[', 
                                  GROUP_CONCAT(JSON_OBJECT("columnName", C.COLUMN_NAME,
                                                           "ordinalPosition" , C.ORDINAL_POSITION,
                                                           "defaultValue", C.COLUMN_DEFAULT,
                                                           "isNullable", CASE WHEN C.IS_NULLABLE = 'YES' THEN true ELSE false END,
                                                           "dataType", C.DATA_TYPE,
                                                           "columnType", C.COLUMN_TYPE,
                                                           "length", C.CHARACTER_MAXIMUM_LENGTH,
                                                           "precision", C.NUMERIC_PRECISION,
                                                           "decimals", C.NUMERIC_SCALE,
                                                           "collation", C.COLLATION_NAME,
                                                           "primaryKey", CASE WHEN C.COLUMN_KEY = "PRI" THEN true ELSE false END,
                                                           "uniqueKey", CASE WHEN C.COLUMN_KEY = "UNI" THEN true ELSE false END,
                                                           "foreignKey", CASE WHEN C.COLUMN_KEY = "MUL" THEN true ELSE false END,
                                                           "autoIncrement", CASE WHEN C.EXTRA = "auto_increment" THEN true ELSE false END,
                                                           "constraintName", K.CONSTRAINT_NAME,
                                                           "referencedTable", K.REFERENCED_TABLE_NAME,
                                                           "referencedColumn", K.REFERENCED_COLUMN_NAME,
                                                           "updateRule", R.UPDATE_RULE,
                                                           "deleteRule", R.DELETE_RULE
                                                          ) ORDER BY C.ORDINAL_POSITION), ']')
                           FROM information_schema.COLUMNS C 
                           LEFT OUTER JOIN information_schema.KEY_COLUMN_USAGE K ON K.TABLE_NAME = C.TABLE_NAME AND 
                                                                                    K.COLUMN_NAME = C.COLUMN_NAME
                           LEFT OUTER JOIN information_schema.REFERENTIAL_CONSTRAINTS R ON R.CONSTRAINT_NAME = K.CONSTRAINT_NAME
                          WHERE C.TABLE_NAME = T.TABLE_NAME), '[]') AS columns
          FROM information_schema.TABLES T
         WHERE T.TABLE_SCHEMA = ?
         ORDER BY T.TABLE_NAME`,
        values: [env.DB_DATABASE],
        transaction,
      });

      if (tables) {
        for (const table of tables) {
          table.columns = JSON.parse(table.columns || '[]');
        }
      }

      return (tables as unknown as ITableMetaDataResultSet[]) ?? [];
    } catch (err: any) {
      throw new DBError(err.message);
    }
  }
}
