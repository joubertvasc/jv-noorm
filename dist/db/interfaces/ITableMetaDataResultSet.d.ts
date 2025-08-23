/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { IColumnMetaDataResultSet } from './IColumnMetaDataResultSet';
export interface ITableMetaDataResultSet {
    tableName: string;
    tableType: string;
    engine?: string;
    tableCollation: string;
    columns: IColumnMetaDataResultSet[];
}
