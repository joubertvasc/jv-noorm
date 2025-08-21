"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseURL = void 0;
const dbType_1 = require("../../enum/dbType");
const db_url_error_1 = require("../errors/db-url-error");
const env_not_defined_error_1 = require("../errors/env-not-defined-error");
class ParseURL {
    static findSearchParam(search, keyToFind) {
        if (!search || !keyToFind)
            return null;
        const params = search.slice(1).split('&');
        if (!params || params.length === 0)
            return null;
        for (const param of params) {
            const parts = param.split('=');
            if (parts.length !== 2)
                return null;
            if (parts[0] === keyToFind) {
                return parts[1];
            }
        }
        return null;
    }
    static parseDBUrl(url) {
        if (!url)
            return null;
        const parsedUrl = new URL(url);
        if (!parsedUrl || !parsedUrl.protocol)
            return null;
        const dbType = parsedUrl?.protocol?.replace(':', '') === 'mysql' || parsedUrl?.protocol?.replace(':', '') === 'mariadb'
            ? dbType_1.DBType.MariaDB
            : parsedUrl?.protocol?.replace(':', '') === 'postgresql'
                ? dbType_1.DBType.PostgreSQL
                : undefined;
        if (dbType === undefined)
            throw new db_url_error_1.DBURLError();
        const _env = {
            DB_TYPE: dbType,
            DB_HOST: decodeURIComponent(parsedUrl.hostname) || this.findSearchParam(parsedUrl.search, 'host') || 'localhost',
            DB_PORT: parseInt(parsedUrl.port || this.findSearchParam(parsedUrl.search, 'port') || '0') || 3306,
            DB_DATABASE: decodeURIComponent(parsedUrl.pathname.slice(1)) || this.findSearchParam(parsedUrl.search, 'database') || '',
            DB_USER: decodeURIComponent(parsedUrl.username) ||
                this.findSearchParam(parsedUrl.search, 'user') ||
                this.findSearchParam(parsedUrl.search, 'username') ||
                '',
            DB_PASSWORD: decodeURIComponent(parsedUrl.password) ||
                this.findSearchParam(parsedUrl.search, 'pass') ||
                this.findSearchParam(parsedUrl.search, 'password') ||
                '',
            DB_SCHEMA: this.findSearchParam(parsedUrl.search, 'schema') || undefined,
            DB_MAX_POOL: 10,
            DB_MIN_POOL: 1,
            DB_VERBOSE: false,
            SCRIPTS_FOLDER: `${process.env.PWD}/scripts`,
            MODELS_FOLDER: `${process.env.PWD}/models`,
        };
        if (_env.DB_DATABASE === '')
            throw new env_not_defined_error_1.EnvNotDefinedError(`DB_DATABASE-NOT-DEFINED`);
        if (_env.DB_USER === '')
            throw new env_not_defined_error_1.EnvNotDefinedError(`DB_USER-NOT-DEFINED`);
        if (_env.DB_PASSWORD === '')
            throw new env_not_defined_error_1.EnvNotDefinedError(`DB_PASSWORD-NOT-DEFINED`);
        if (dbType === dbType_1.DBType.PostgreSQL && _env.DB_SCHEMA === '')
            throw new env_not_defined_error_1.EnvNotDefinedError(`DB_SCHEMA-NOT-DEFINED`);
        return _env;
    }
}
exports.ParseURL = ParseURL;
