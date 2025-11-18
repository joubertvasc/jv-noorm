"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generate = void 0;
const fs_1 = __importDefault(require("fs"));
const connection_1 = require("../db/connection");
const dbType_1 = require("../enum/dbType");
const env_1 = require("../env");
const invalid_db_type_error_1 = require("../shared/errors/invalid-db-type-error");
const generate = async () => {
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
        switch (env_1.env.DB_TYPE) {
            case dbType_1.DBType.MariaDB:
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('child_process').execSync(`mariadb --version`).toString().replace('\n', '');
                break;
            case dbType_1.DBType.PostgreSQL:
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                require('child_process').execSync(`psql --version`).toString().replace('\n', '');
                break;
            default:
                throw new invalid_db_type_error_1.InvalidDBTypeError();
        }
    }
    catch (err) {
        console.log('No Database Client found: ', err.message);
        process.exit(1);
    }
    const db = (0, connection_1.createNoORMConnection)();
    await db.connect();
    try {
        try {
            const folder = env_1.env.MODELS_FOLDER;
            if (!fs_1.default.existsSync(folder)) {
                fs_1.default.mkdirSync(folder, { recursive: true });
                fs_1.default.chmodSync(folder, '777');
            }
            let count = 0;
            for (const table of db.getMetadata()) {
                const interfaceName = `${changeCase(table.tableName, true)}DTO`;
                const filename = `${folder}/${interfaceName}.ts`;
                if (!override && fs_1.default.existsSync(filename))
                    continue;
                if (tableName && table.tableName !== tableName)
                    continue;
                let interfaceFile = `export interface ${interfaceName} {\n`;
                const columns = [];
                for (const column of table.columns) {
                    if (!columns.includes(column.columnName)) {
                        interfaceFile += `  ${column.columnName}${column.isNullable ? '?' : ''}: ${findCorrectType(column.dataType)};\n`;
                        columns.push(column.columnName);
                    }
                }
                interfaceFile += '}\n';
                if (fs_1.default.existsSync(filename))
                    fs_1.default.unlinkSync(filename);
                fs_1.default.writeFileSync(filename, interfaceFile);
                count++;
            }
            console.log(count + ` file${count !== 1 ? 's' : ''} generated.`);
        }
        catch (error) {
            console.log('GENERATE ERROR: ', error.message);
        }
    }
    finally {
        await db.close();
    }
};
exports.generate = generate;
function changeCase(name, pascalCase = false) {
    let changedCase = '';
    let underline = false;
    for (let i = 0; i < name.length; i++) {
        if (changedCase === '' && pascalCase === true) {
            changedCase += name.substring(i, i + 1).toUpperCase();
        }
        else if (underline) {
            changedCase += name.substring(i, i + 1).toUpperCase();
            underline = false;
        }
        else if (name.substring(i, i + 1) === '_') {
            underline = true;
        }
        else {
            changedCase += name.substring(i, i + 1);
        }
    }
    return changedCase;
}
function findCorrectType(dataType) {
    if (dataType === 'uuid' ||
        dataType === 'json' ||
        dataType === 'character' ||
        dataType.endsWith('char') ||
        dataType.endsWith('text') ||
        dataType.endsWith('blob')) {
        return 'string';
    }
    else if (dataType === 'decimal' ||
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
        dataType === 'money') {
        return 'number';
    }
    else if (dataType === 'boolean' || dataType === 'bool') {
        return 'boolean';
    }
    else if (dataType === 'date' ||
        dataType === 'datetime' ||
        dataType === 'time' ||
        dataType === 'year' ||
        dataType === 'timestamp' ||
        dataType === 'interval') {
        return 'Date';
    }
    return 'any';
}
