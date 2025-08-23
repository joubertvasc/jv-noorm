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
exports.MigrationHandler = void 0;
const fs_1 = __importDefault(require("fs"));
const env_1 = require("../env");
const connection_1 = require("../db/connection");
const dbType_1 = require("../enum/dbType");
const db_error_1 = require("../shared/errors/db-error");
const invalid_db_type_error_1 = require("../shared/errors/invalid-db-type-error");
class MigrationHandler {
    static async verify() {
        if (!fs_1.default.existsSync(env_1.env.SCRIPTS_FOLDER)) {
            console.log('No Script to run.');
            process.exit(0);
        }
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
        const db = (0, connection_1.createNoORMConnection)();
        await db.connect();
        try {
            await this.executeUpdate(db);
        }
        finally {
            await db.close();
        }
    }
    static async getScripts(db) {
        const result = [];
        for (let i = 0; i < 2; i++) {
            try {
                const scripts = await db.queryRows({ sql: 'SELECT executedScript FROM migrations' });
                if (scripts) {
                    scripts.forEach(script => {
                        result.push(script.executedScript);
                    });
                }
                break;
            }
            catch (err) {
                if (err.message.includes("doesn't exist")) {
                    await db.exec({
                        command: `CREATE TABLE migrations(id BIGINT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                              executedScript VARCHAR(250) NOT NULL,
                                              createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                                              updatedAt DATETIME,
                                              deletedAt JSON)
                      Engine=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
                    });
                }
                else {
                    throw new db_error_1.DBError(err.message);
                }
            }
        }
        return result;
    }
    static async executeUpdate(db) {
        if (env_1.env.DB_VERBOSE)
            console.log('verifyMigration');
        // Carrega do banco os scripts já executados
        const scripts = await this.getScripts(db);
        // Lê os scripts do diretório
        const folder = env_1.env.SCRIPTS_FOLDER;
        const files = fs_1.default
            .readdirSync(folder)
            .filter(file => file.indexOf('.') !== 0 && file.slice(-4) === '.sql')
            .sort((a, b) => {
            return fs_1.default.statSync(`${folder}/${a}`).ctime.getTime() - fs_1.default.statSync(`${folder}/${b}`).ctime.getTime();
        });
        for (const file of files) {
            const scriptExecuted = !!scripts.find(script => script === file);
            // Se o script não foi localizado, então vamos executá-lo
            if (!scriptExecuted) {
                if (env_1.env.DB_VERBOSE)
                    console.log('executingScript', file);
                try {
                    if (env_1.env.DB_TYPE === dbType_1.DBType.MariaDB) {
                        require('child_process')
                            .execSync(`mysql -u${env_1.env.DB_USER} -p${env_1.env.DB_PASSWORD} -h${env_1.env.DB_HOST} -D${env_1.env.DB_DATABASE} < ${folder}/${file}`)
                            .toString()
                            .replace('\n', '');
                    }
                    else if (env_1.env.DB_TYPE === dbType_1.DBType.PostgreSQL) {
                        require('child_process').execSync(`export PGPASSWORD="${env_1.env.DB_PASSWORD}"`).toString().replace('\n', '');
                        require('child_process')
                            .execSync(`psql -h ${env_1.env.DB_HOST} -d ${env_1.env.DB_DATABASE} -U ${env_1.env.DB_USER} -p ${env_1.env.DB_PORT} -w -f '${folder}/${file}'`)
                            .toString()
                            .replace('\n', '');
                    }
                    else {
                        throw new invalid_db_type_error_1.InvalidDBTypeError();
                    }
                    if (env_1.env.DB_VERBOSE)
                        console.log('scriptExecuted', file);
                    await db.insert({ command: 'INSERT INTO migrations (executedScript) value (?)', values: [file] });
                }
                catch (err) {
                    if (env_1.env.DB_VERBOSE) {
                        console.log('scriptFailed', file);
                        console.log('commandExitStatus', err.status);
                        console.log('commandErrorMessage', err.message);
                        throw new db_error_1.DBError('impossibleToUpdateDB');
                    }
                }
            }
        }
    }
}
exports.MigrationHandler = MigrationHandler;
