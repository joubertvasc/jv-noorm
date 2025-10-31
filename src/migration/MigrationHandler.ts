/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';

import { BaseDB } from '../db/BaseDB';
import { createNoORMConnection } from '../db/connection';
import { DBType } from '../enum/dbType';
import { env } from '../env';
import { DBError } from '../shared/errors/db-error';
import { InvalidDBTypeError } from '../shared/errors/invalid-db-type-error';

export class MigrationHandler {
  static async verify(): Promise<void> {
    if (!fs.existsSync(env.SCRIPTS_FOLDER)) {
      console.log('No Script to run.');
      process.exit(0);
    }

    try {
      switch (env.DB_TYPE) {
        case DBType.MariaDB:
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('child_process').execSync(`mariadb --version`).toString().replace('\n', '');
          break;
        case DBType.PostgreSQL:
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          require('child_process').execSync(`psql --version`).toString().replace('\n', '');
          break;
        default:
          throw new InvalidDBTypeError();
      }
    } catch (err: any) {
      console.log('No MariaDB client found:', err.message);
      process.exit(1);
    }

    const db = createNoORMConnection();
    await db.connect();

    try {
      await this.executeUpdate(db);
    } finally {
      await db.close();
    }
  }

  static async getScripts(db: BaseDB): Promise<string[]> {
    const result: string[] = [];

    for (let i = 0; i < 2; i++) {
      try {
        const scripts = await db.queryRows({ sql: 'SELECT executedScript FROM migrations' });

        if (scripts) {
          scripts.forEach(script => {
            result.push(script.executedScript);
          });
        }

        break;
      } catch (err: any) {
        if (err.message.includes("doesn't exist")) {
          await db.exec({
            command: `CREATE TABLE migrations(id BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                              executedScript VARCHAR(250) NOT NULL,
                                              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                                              updatedAt DATETIME,
                                              deletedAt JSON)
                      Engine=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
          });
        } else {
          throw new DBError(err.message);
        }
      }
    }

    return result;
  }

  static async executeUpdate(db: BaseDB): Promise<void> {
    if (env.DB_VERBOSE) console.log('verifyMigration');

    // Carrega do banco os scripts já executados
    const scripts = await this.getScripts(db);

    // Lê os scripts do diretório
    const folder = env.SCRIPTS_FOLDER;

    const files = fs
      .readdirSync(folder)
      .filter(file => file.indexOf('.') !== 0 && file.slice(-4) === '.sql')
      .sort((a, b) => {
        return fs.statSync(`${folder}/${a}`).ctime.getTime() - fs.statSync(`${folder}/${b}`).ctime.getTime();
      });

    for (const file of files) {
      const scriptExecuted = !!scripts.find(script => script === file);

      // Se o script não foi localizado, então vamos executá-lo
      if (!scriptExecuted) {
        if (env.DB_VERBOSE) console.log('executingScript', file);

        try {
          if (env.DB_TYPE === DBType.MariaDB) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('child_process')
              .execSync(
                `mariadb -u${env.DB_USER} -p${env.DB_PASSWORD} -h${env.DB_HOST} -D${env.DB_DATABASE} < ${folder}/${file}`,
              )
              .toString()
              .replace('\n', '');
          } else if (env.DB_TYPE === DBType.PostgreSQL) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('child_process').execSync(`export PGPASSWORD="${env.DB_PASSWORD}"`).toString().replace('\n', '');
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            require('child_process')
              .execSync(
                `psql -h ${env.DB_HOST} -d ${env.DB_DATABASE} -U ${env.DB_USER} -p ${env.DB_PORT} -w -f '${folder}/${file}'`,
              )
              .toString()
              .replace('\n', '');
          } else {
            throw new InvalidDBTypeError();
          }

          if (env.DB_VERBOSE) console.log('scriptExecuted', file);

          await db.insert({ command: 'INSERT INTO migrations (executedScript) VALUES (?)', values: [file] });
        } catch (err: any) {
          if (env.DB_VERBOSE) {
            console.log('scriptFailed', file);
            console.log('commandExitStatus', err.status);
            console.log('commandErrorMessage', err.message);
            throw new DBError('impossibleToUpdateDB');
          }
        }
      }
    }
  }
}
