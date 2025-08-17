"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.migration = void 0;
const MigrationHandler_1 = require("./MigrationHandler");
const migration = async () => {
    try {
        await MigrationHandler_1.MigrationHandler.verify();
        process.exit(0);
    }
    catch (err) {
        console.log('MIGRATION ERROR: ', err.message);
    }
};
exports.migration = migration;
setTimeout(async () => {
    await (0, exports.migration)();
}, 500);
