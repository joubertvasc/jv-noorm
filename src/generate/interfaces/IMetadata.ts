export interface IMetadata {
  id: number;
  isPublic: boolean;
  tableName: string;
  humanName: string;
  description: string;
  columns: ColumnMetadata[];
}

export type ColumnMetadata = {
  id: number;
  isPublic: boolean;
  tableId: number;
  columnName: string;
  humanName: string;
  description: string;
};
