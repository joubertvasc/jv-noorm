import { Pool, PoolClient } from 'pg';
import { Connection } from 'mysql2/promise';
import { IDBDeleteResult } from '../../db/interfaces/IDBDeleteResult';
import { IDBInsertResult } from '../../db/interfaces/IDBInsertResult';
import { IDBUpdateResult } from '../../db/interfaces/IDBUpdateResult';
import { ITableMetaDataResultSet } from '../../db/interfaces/ITableMetaDataResultSet';
import { BaseDB } from '../../db/BaseDB';
import { env } from '../../env';
import { DBSchemaNotDefinedError } from '../../shared/errors/db-schema-not-defined-error';

export class PostgreSQL extends BaseDB {
  private pgConnection: Pool;

  constructor() {
    super();

    if (!env.DB_SCHEMA) throw new DBSchemaNotDefinedError();

    this.pgConnection = new Pool({
      connectionString: `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_DATABASE}?schema=${env.DB_SCHEMA}`,
      keepAlive: true,
      max: 100,
      min: 30,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxLifetimeSeconds: 60,
    });
  }

  public async internalConnect(): Promise<any> {
    return this.pgConnection;
  }

  public async close(): Promise<any> {
    this.pgConnection.end();
  }

  protected async query(args: {
    sql: string;
    values?: any;
    verboseHeader: string;
    transaction?: Connection | PoolClient;
  }): Promise<any> {
    const client = (args.transaction ? args.transaction : await this.pgConnection.connect()) as PoolClient;
    const result = await client.query(args.sql, args.values);

    return result.rows;
  }

  protected async execCommand(args: {
    command: string;
    values: any;
    verboseHeader: string;
    transaction?: PoolClient;
  }): Promise<any> {
    const client = (args.transaction ? args.transaction : await this.pgConnection.connect()) as PoolClient;
    const result = await client.query(args.command, args.values);

    return result.rows;
  }

  public async queryRow(args: { sql: string; values?: any; transaction?: PoolClient }): Promise<any | null> {
    const result = await this.query({
      sql: args.sql,
      values: args.values,
      verboseHeader: 'QUERYROW',
      transaction: args.transaction,
    });

    return result.length > 0 ? result[0] : [];
  }

  public async queryRows(args: { sql: string; values?: any; transaction?: PoolClient }): Promise<any[] | null> {
    const result = await this.query({
      sql: args.sql,
      values: args.values,
      verboseHeader: 'QUERYROWS',
      transaction: args.transaction,
    });

    return result;
  }

  public async insert(args: { command: string; values?: any; transaction?: PoolClient }): Promise<IDBInsertResult> {
    const result = await this.execCommand({
      command: args.command,
      values: args.values,
      verboseHeader: 'INSERT',
      transaction: args.transaction,
    });

    return {
      id: result && result.length > 0 ? result[0].id : 0,
      rowsInserted: 1, // TODO
    };
  }

  public async update(args: { command: string; values?: any; transaction?: PoolClient }): Promise<IDBUpdateResult> {
    const result = await this.execCommand({
      command: args.command,
      values: args.values,
      verboseHeader: 'UPDATE',
      transaction: args.transaction,
    });

    return {
      rowsUpdated: 1, // TODO
    };
  }

  protected async internalDelete(args: {
    command: string;
    values?: any;
    transaction?: PoolClient;
  }): Promise<IDBDeleteResult> {
    const result = await this.execCommand({
      command: args.command,
      values: args.values,
      verboseHeader: 'DELETE',
      transaction: args.transaction,
    });

    return {
      rowsDeleted: 1, // TODO
    };
  }

  public async exec(args: { command: string; values?: any; transaction?: PoolClient }): Promise<any> {
    await this.execCommand({
      command: args.command,
      values: args.values,
      verboseHeader: 'EXEC',
      transaction: args.transaction,
    });
  }

  public async startTransaction(): Promise<PoolClient> {
    const client: PoolClient = await this.pgConnection.connect();
    this.log('STARTTRANSACTION', '');
    await client.query('BEGIN');

    return client;
  }

  public async commit(transaction: PoolClient): Promise<void> {
    this.log('COMMIT', '');
    await transaction.query('COMMIT');
  }

  public async rollback(transaction: PoolClient): Promise<void> {
    this.log('ROLLBACK', '');
    await transaction.query('ROLLBACK');
  }

  protected async getDBMetadata(transaction?: PoolClient): Promise<ITableMetaDataResultSet[]> {
    const result = await this.queryRows({
      sql: `
        WITH table_info AS (
             SELECT N.nspname AS schema_name, C.relname AS table_name,
                    CASE C.relkind WHEN 'r' THEN 'BASE TABLE'
                                   WHEN 'v' THEN 'VIEW'
                                   WHEN 'm' THEN 'MATERIALIZED VIEW'
                                   WHEN 'f' THEN 'FOREIGN TABLE'
                                   WHEN 'p' THEN 'PARTITIONED TABLE'
                     END AS table_type,
                    C.oid AS table_oid
               FROM pg_class C
               JOIN pg_namespace N ON N.oid = C.relnamespace
              WHERE N.nspname = $1
        )
        SELECT T.table_name AS "tableName", T.table_type AS "tableType", NULL AS "engine", T.schema_name AS "tableSchema",
               COALESCE((SELECT json_agg(
                                  json_build_object(
                                              'columnName', A.attname,
                                              'ordinalPosition', A.attnum,
                                              'defaultValue', pg_get_expr(AD.adbin, AD.adrelid),
                                              'isNullable', NOT A.attnotnull,
                                              'dataType', format_type(A.atttypid, A.atttypmod),
                                              'length', ISC.character_maximum_length,
                                              'precision', ISC.numeric_precision,
                                              'scale', ISC.numeric_scale,
                                              'collation', COLL.collname,
                                              'identity', A.attidentity,   -- 'a'=ALWAYS, 'd'=BY DEFAULT
                                              'generated', A.attgenerated, -- 's' = stored
                                              'autoIncrement', (a.attidentity IN ('a','d')),
                                              'primaryKey', EXISTS (SELECT 1 
                                                                      FROM pg_constraint c
                                                                     WHERE c.conrelid = T.table_oid
                                                                       AND c.contype = 'p'
                                                                       AND A.attnum = ANY(c.conkey)),
                                              'uniqueKey', EXISTS (SELECT 1
                                                                     FROM pg_constraint c
                                                                    WHERE c.conrelid = T.table_oid
                                                                      AND c.contype = 'u'
                                                                      AND A.attnum = ANY(c.conkey)),
                                              'foreignKey', EXISTS (SELECT 1
                                                                      FROM pg_constraint c
                                                                     WHERE c.conrelid = T.table_oid
                                                                       AND c.contype = 'f'
                                                                       AND A.attnum = ANY(c.conkey)),
                                              'constraintName', FK.conname,
                                              'referencedTable', RT.relname,
                                              'referencedColumn', RC.attname,
                                              'updateRule', CASE FK.confupdtype WHEN 'a' THEN 'NO ACTION'
                                                                                WHEN 'r' THEN 'RESTRICT'
                                                                                WHEN 'c' THEN 'CASCADE'
                                                                                WHEN 'n' THEN 'SET NULL'
                                                                                WHEN 'd' THEN 'SET DEFAULT'
                                                             END,
                                              'deleteRule', CASE FK.confdeltype WHEN 'a' THEN 'NO ACTION'
                                                                                WHEN 'r' THEN 'RESTRICT'
                                                                                WHEN 'c' THEN 'CASCADE'
                                                                                WHEN 'n' THEN 'SET NULL'
                                                                                WHEN 'd' THEN 'SET DEFAULT'
                                                             END) ORDER BY A.attnum)
                           FROM pg_attribute A
                           LEFT JOIN pg_attrdef AD ON AD.adrelid = A.attrelid AND 
                                                      AD.adnum = A.attnum
                           LEFT JOIN pg_type T2 ON T2.oid = A.atttypid
                           LEFT JOIN pg_collation COLL ON COLL.oid = A.attcollation
                           LEFT JOIN pg_constraint FK ON FK.conrelid = T.table_oid AND 
                                                         FK.contype = 'f' AND 
                                                         A.attnum = ANY(fk.conkey)
                           LEFT JOIN pg_class RT ON RT.oid = FK.confrelid
                           LEFT JOIN LATERAL unnest(fk.confkey) WITH ORDINALITY ref_col_num(colnum, ord) ON true
                           LEFT JOIN pg_attribute RC ON RC.attrelid = RT.oid AND 
                                                             RC.attnum = ref_col_num.colnum
                           LEFT JOIN information_schema.columns ISC ON ISC.table_schema = T.schema_name AND 
                                                                       ISC.table_name = T.table_name AND 
                                                                       ISC.column_name = A.attname
                          WHERE A.attrelid = T.table_oid
                            AND A.attnum > 0
                            AND NOT A.attisdropped), '[]') AS "columns"
          FROM table_info T
         ORDER BY T.table_name`,
      values: [env.DB_SCHEMA],
      transaction,
    });

    return result as unknown as ITableMetaDataResultSet[];
  }
}
