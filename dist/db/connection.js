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
exports.createNoORMConnection = createNoORMConnection;
const MariaDB_1 = __importDefault(require("./mariadb/MariaDB"));
const dbType_1 = require("../enum/dbType");
const env_1 = require("../env");
const invalid_db_type_error_1 = require("../shared/errors/invalid-db-type-error");
const PostgreSQL_1 = require("./postgresql/PostgreSQL");
function createNoORMConnection(asyncLocalStorage) {
    switch (env_1.env.DB_TYPE) {
        case dbType_1.DBType.MariaDB:
            return new MariaDB_1.default(asyncLocalStorage);
        case dbType_1.DBType.PostgreSQL:
            return new PostgreSQL_1.PostgreSQL(asyncLocalStorage);
        default:
            throw new invalid_db_type_error_1.InvalidDBTypeError();
    }
}
