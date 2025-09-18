/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { AsyncLocalStorage } from 'node:async_hooks';

import { DBType } from '../enum/dbType';
import { env } from '../env';
import { InvalidDBTypeError } from '../shared/errors/invalid-db-type-error';
import { BaseDB } from './BaseDB';
import MariaDB from './mariadb/MariaDB';
import { PostgreSQL } from './postgresql/PostgreSQL';

export function createNoORMConnection(asyncLocalStorage?: AsyncLocalStorage<any>): BaseDB {
  switch (env.DB_TYPE) {
    case DBType.MariaDB:
      return new MariaDB(asyncLocalStorage);
    case DBType.PostgreSQL:
      return new PostgreSQL(asyncLocalStorage);
    default:
      throw new InvalidDBTypeError();
  }
}
