/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import MariaDB from './mariadb/MariaDB';
import { DBType } from '../enum/dbType';
import { env } from '../env';
import { InvalidDBTypeError } from '../shared/errors/invalid-db-type-error';
import { BaseDB } from './BaseDB';
import { PostgreSQL } from './postgresql/PostgreSQL';

export function createNoORMConnection(): BaseDB {
  switch (env.DB_TYPE) {
    case DBType.MariaDB:
      return new MariaDB();
    case DBType.PostgreSQL:
      return new PostgreSQL();
    default:
      throw new InvalidDBTypeError();
  }
}
