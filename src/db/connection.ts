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
