"use strict";
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
    try {
        switch (env_1.env.DB_TYPE) {
            case dbType_1.DBType.MariaDB:
                require('child_process').execSync(`mariadb --version`).toString().replace('\n', '');
                break;
            case dbType_1.DBType.PostgreSQL:
                require('child_process').execSync(`psql --version`).toString().replace('\n', '');
                break;
            default:
                throw new invalid_db_type_error_1.InvalidDBTypeError();
        }
    }
    catch (err) {
        console.log('No MariaDB client found.');
        process.exit(1);
    }
    const db = (0, connection_1.createConnection)();
    await db.connect();
    const folder = env_1.env.MODELS_FOLDER;
    if (!fs_1.default.existsSync(folder)) {
        fs_1.default.mkdirSync(folder, { recursive: true });
        fs_1.default.chmodSync(folder, '777');
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
        if (fs_1.default.existsSync(filename))
            fs_1.default.unlinkSync(filename);
        fs_1.default.writeFileSync(filename, interfaceFile);
        count++;
    }
    console.log(count + ` file${count !== 1 ? 's' : ''} generated.`);
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
setTimeout(async () => {
    console.log('GENERATE');
    await (0, exports.generate)();
}, 500);
