/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface IColumnMetaDataResultSet {
  columnName: string;
  ordinalPosition: number;
  defaultValue?: number | string | boolean | Date;
  isNullable: boolean;
  dataType: string;
  columnType: string;
  length?: number;
  precision?: number;
  decimals?: number;
  collation?: string;
  primaryKey: boolean;
  uniqueKey: boolean;
  foreignKey: boolean;
  autoIncrement: boolean;
  constraintName?: string;
  referencedTable?: string;
  referencedColumn?: string;
  updateRule?: string;
  deleteRule?: string;
}
