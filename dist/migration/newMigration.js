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
exports.createMigration = void 0;
const fs_1 = __importDefault(require("fs"));
const date_fns_1 = require("date-fns");
const RemoveInvalidChars_1 = require("../shared/utils/RemoveInvalidChars");
const RemoveAccents_1 = require("../shared/utils/RemoveAccents");
const env_1 = require("../env");
const createMigration = async () => {
    if (!process.argv || process.argv.length < 3) {
        console.log('Type a short description to the script.\nUse: yarn migration <description>');
    }
    else if (process.argv[2].length < 10 || process.argv[2].length > 50) {
        console.log('The description must have from 10 to 50 characters.');
    }
    else {
        const folder = env_1.env.SCRIPTS_FOLDER;
        if (!fs_1.default.existsSync(folder)) {
            fs_1.default.mkdirSync(folder, { recursive: true });
            fs_1.default.chmodSync(folder, '777');
        }
        const shortName = process.argv[2];
        const scriptName = (0, date_fns_1.format)(new Date(), 'yyyyMMddHHmmss');
        const file = `${scriptName}_${(0, RemoveAccents_1.removeAccents)((0, RemoveInvalidChars_1.RemoveInvalidChars)(shortName))
            .replace(/['"&^ˆ!@#$%*()<>\[\]\\/,.+=\n\t]/g, '')
            .replace(/[ ]/g, '_')}.sql`;
        fs_1.default.writeFileSync(`${folder}/${file}`, `-- Description: ${shortName}\n--      Script: ${file} \n--   File name: ${scriptName}\n--  Created at: ${(0, date_fns_1.format)(new Date(), 'dd/MM/yyyy HH:mm')}\n--      Author: ${require('os').userInfo().username}\n\n`);
        try {
            require('child_process')
                .execSync(`code --reuse-window --goto ${folder}/${file}:7:1`)
                .toString()
                .replace('\n', '');
        }
        catch (err) {
            console.log(`Não foi possível abrir o arquivo ${folder}/${file}.`);
        }
        process.exit(0);
    }
};
exports.createMigration = createMigration;
