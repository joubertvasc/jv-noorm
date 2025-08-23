"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.deploy = void 0;
const MigrationHandler_1 = require("./MigrationHandler");
const deploy = async () => {
    try {
        await MigrationHandler_1.MigrationHandler.verify();
        process.exit(0);
    }
    catch (err) {
        console.log('MIGRATION ERROR: ', err.message);
    }
};
exports.deploy = deploy;
