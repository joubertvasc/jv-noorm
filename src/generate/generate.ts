import fs from 'fs';
import { createConnection } from '../db/connection';
import { DBType } from '../enum/dbType';
import { env } from '../env';
import { InvalidDBTypeError } from '../shared/errors/invalid-db-type-error';

export const generate = async () => {
  try {
    switch (env.DB_TYPE) {
      case DBType.MariaDB:
        require('child_process').execSync(`mariadb --version`).toString().replace('\n', '');
        break;
      case DBType.PostgreSQL:
        require('child_process').execSync(`psql --version`).toString().replace('\n', '');
        break;
      default:
        throw new InvalidDBTypeError();
    }
  } catch (err: any) {
    console.log('No MariaDB client found.');
    process.exit(1);
  }

  const db = createConnection();
  await db.connect();

  const folder = env.MODELS_FOLDER;

  if (!fs.existsSync(folder)) {
    fs.mkdirSync(folder, { recursive: true });
    fs.chmodSync(folder, '777');
  }

  let count = 0;
  for (const table of db.getMetadata()) {
    const interfaceName = `I${changeCase(table.tableName, true)}`;

    let interfaceFile = `export interface ${interfaceName} {\n`;
    for (const column of table.columns) {
      // interfaceFile += `  ${changeCase(column.columnName, false)}${column.isNullable ? '?' : ''}: ${findCorrectType(column.dataType)},\n`;
      interfaceFile += `  ${column.columnName}${column.isNullable ? '?' : ''}: ${findCorrectType(column.dataType)},\n`;
    }

    interfaceFile += '}';

    const filename = `${folder}/${interfaceName}.ts`;

    if (fs.existsSync(filename)) fs.unlinkSync(filename);
    fs.writeFileSync(filename, interfaceFile);

    count++;
  }

  console.log(count + ` file${count !== 1 ? 's' : ''} generated.`);
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

// setTimeout(async () => {
//   console.log('GENERATE');
//   await generate();
// }, 500);
