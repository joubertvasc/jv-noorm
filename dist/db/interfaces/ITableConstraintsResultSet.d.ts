/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
export interface ITableConstraintsResultSet {
    deleteRule: string;
    columnName: string;
    constraintName: string;
    tableName: string;
    referencedTable: string;
    referencedColumn: string;
}
