"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
require("dotenv/config");
const env_not_defined_error_1 = require("./shared/errors/env-not-defined-error");
const invalid_value_error_1 = require("./shared/errors/invalid-value-error");
const dbType_1 = require("./enum/dbType");
const ParseURL_1 = require("./shared/utils/ParseURL");
const databaseURL = ParseURL_1.ParseURL.parseDBUrl(getEnv('DATABASE_URL', null));
const env = {
    DB_TYPE: getEnv('DB_TYPE', databaseURL?.DB_TYPE || dbType_1.DBType.MariaDB),
    DB_HOST: getEnv('DB_HOST', databaseURL?.DB_HOST || 'localhost'),
    DB_PORT: getNumberEnv('DB_PORT', databaseURL?.DB_PORT || getEnv('DB_TYPE', databaseURL?.DB_TYPE || dbType_1.DBType.MariaDB) === dbType_1.DBType.MariaDB ? 3306 : 5432),
    DB_DATABASE: getEnv('DB_DATABASE', databaseURL?.DB_DATABASE || undefined),
    DB_SCHEMA: getEnv('DB_SCHEMA', databaseURL?.DB_SCHEMA || null),
    DB_USER: getEnv('DB_USER', databaseURL?.DB_USER || undefined),
    DB_PASSWORD: getEnv('DB_PASSWORD', databaseURL?.DB_PASSWORD || undefined),
    DB_MAX_POOL: getNumberEnv('DB_MAX_POOL', 10),
    DB_MIN_POOL: getNumberEnv('DB_MIN_POOL', 1),
    DB_VERBOSE: getBooleanEnv('DB_VERBOSE', false),
    SCRIPTS_FOLDER: getEnv('SCRIPT_FOLDER', `${process.env.PWD}/scripts`),
    MODELS_FOLDER: getEnv('MODELS_FOLDER', `${process.env.PWD}/models`),
};
exports.env = env;
function getEnv(key, defaultValue) {
    if (!process.env[key]) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }
        throw new env_not_defined_error_1.EnvNotDefinedError(`${key}-NOT-DEFINED`);
    }
    return process.env[key];
}
function getNumberEnv(key, defaultValue) {
    const value = getEnv(key, defaultValue);
    if (isNaN(Number(value))) {
        throw new invalid_value_error_1.InvalidValueError(`${key}-INVALID-NUMBER`);
    }
    return Number(value);
}
function getBooleanEnv(key, defaultValue) {
    const value = getEnv(key, defaultValue);
    if (value === null ||
        value === undefined ||
        (value !== true &&
            value !== false &&
            value.toUpperCase() !== 'TRUE' &&
            value.toUpperCase() !== 'FALSE' &&
            value.toUpperCase() !== 'T' &&
            value.toUpperCase() !== 'F' &&
            value.toUpperCase() !== 'S' &&
            value.toUpperCase() !== 'N' &&
            value !== '1' &&
            value !== 1 &&
            value !== '0' &&
            value !== 0)) {
        throw new invalid_value_error_1.InvalidValueError(`${key}-INVALID-BOOLEAN`);
    }
    return (value === true ||
        value === '1' ||
        value === 1 ||
        value.toUpperCase() === 'TRUE' ||
        value.toUpperCase() === 'T' ||
        value.toUpperCase() === 'S');
}
