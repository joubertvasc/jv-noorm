import { IColumnMetaDataResultSet } from './IColumnMetaDataResultSet';
export interface ITableMetaDataResultSet {
    tableName: string;
    tableType: string;
    engine?: string;
    tableCollation: string;
    columns: IColumnMetaDataResultSet[];
}
