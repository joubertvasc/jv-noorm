/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import fs from 'fs';

import { createNoORMConnection } from '../db/connection';
import { DBType } from '../enum/dbType';
import { env } from '../env';
import { InvalidDBTypeError } from '../shared/errors/invalid-db-type-error';

export const generate = async (): Promise<void> => {
  let help = false;
  let override = false;
  let tableName = undefined;

  for (const arg of process.argv) {
    if (arg === '-h' || arg === '--help' || arg === '-?') {
      help = true;
      break;
    }

    if (arg.startsWith('--table=') || arg.startsWith('-t=')) {
      tableName = arg.substring(arg.indexOf('=') + 1);
    }

    if (arg === '--override' || arg === '-o') {
      override = true;
    }
  }

  if (help) {
    console.log('Usage:');
    console.log('yarn generate <options>');
    console.log('');
    console.log('or');
    console.log('');
    console.log('node generate <options>');
    console.log('');
    console.log('Options:');
    console.log('-h or --help: shows this informations');
    console.log('-o or --override: (optional) override previous generated interfaces');
    console.log('-t=<table_name> or --table=<table_name>: (optional) generate just one interface.');
    console.log('');
    console.log('Ex:');
    console.log('');
    console.log('yarn generate');
    console.log('yarn generate --override');
    console.log('yarn generate --table=users');
    console.log('yarn generate --override --table=users');
    console.log('');
    console.log('or');
    console.log('');
    console.log('yarn generate -o');
    console.log('yarn generate -t=users');
    console.log('yarn generate -o -t=users');
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
    console.log('No Database Client found: ', err.message);
    process.exit(1);
  }

  const db = createNoORMConnection();
  await db.connect();
  try {
    try {
      const folder = env.MODELS_FOLDER;

      if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
        fs.chmodSync(folder, '777');
      }

      let count = 0;
      for (const table of db.getMetadata()) {
        const interfaceName = `${changeCase(table.tableName, true)}DTO`;
        const filename = `${folder}/${interfaceName}.ts`;

        if (!override && fs.existsSync(filename)) continue;
        if (tableName && table.tableName !== tableName) continue;

        let interfaceFile = `export interface ${interfaceName} {\n`;
        const columns: string[] = [];
        for (const column of table.columns) {
          if (!columns.includes(column.columnName)) {
            interfaceFile += `  ${column.columnName}${column.isNullable ? '?' : ''}: ${findCorrectType(column.dataType)},\n`;
            columns.push(column.columnName);
          }
        }

        interfaceFile += '}';

        if (fs.existsSync(filename)) fs.unlinkSync(filename);
        fs.writeFileSync(filename, interfaceFile);

        count++;
      }

      console.log(count + ` file${count !== 1 ? 's' : ''} generated.`);
    } catch (error: any) {
      console.log('GENERATE ERROR: ', error.message);
    }
  } finally {
    await db.close();
  }
};

function changeCase(name: string, pascalCase: boolean = false): string {
  let changedCase = '';
  let underline = false;

  for (let i = 0; i < name.length; i++) {
    if (changedCase === '' && pascalCase === true) {
      changedCase += name.substring(i, i + 1).toUpperCase();
    } else if (underline) {
      changedCase += name.substring(i, i + 1).toUpperCase();
      underline = false;
    } else if (name.substring(i, i + 1) === '_') {
      underline = true;
    } else {
      changedCase += name.substring(i, i + 1);
    }
  }

  return changedCase;
}

function findCorrectType(dataType: string): string {
  if (
    dataType === 'uuid' ||
    dataType === 'json' ||
    dataType === 'character' ||
    dataType.endsWith('char') ||
    dataType.endsWith('text') ||
    dataType.endsWith('blob')
  ) {
    return 'string';
  } else if (
    dataType === 'decimal' ||
    dataType === 'dec' ||
    dataType === 'float' ||
    dataType === 'double' ||
    dataType === 'int' ||
    dataType === 'integer' ||
    dataType === 'bigint' ||
    dataType === 'smallint' ||
    dataType === 'mediumint' ||
    dataType === 'tinyint' ||
    dataType === 'bit' ||
    dataType === 'int4' ||
    dataType === 'int8' ||
    dataType === 'serial' ||
    dataType === 'smallserial' ||
    dataType === 'bigserial' ||
    dataType === 'real' ||
    dataType === 'float4' ||
    dataType === 'float8' ||
    dataType === 'money'
  ) {
    return 'number';
  } else if (dataType === 'boolean' || dataType === 'bool') {
    return 'boolean';
  } else if (
    dataType === 'date' ||
    dataType === 'datetime' ||
    dataType === 'time' ||
    dataType === 'year' ||
    dataType === 'timestamp' ||
    dataType === 'interval'
  ) {
    return 'Date';
  }

  return 'any';
}
