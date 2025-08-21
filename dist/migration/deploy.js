"use strict";
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
// setTimeout(async () => {
//   await deploy();
// }, 500);
