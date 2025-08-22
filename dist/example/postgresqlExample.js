"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const connection_1 = require("../db/connection");
(async () => {
    // Create the connection based on .env informations
    const db = (0, connection_1.createNoORMConnection)();
    try {
        try {
            // Make the database connection;
            await db.connect();
            // The EXEC function should be used to run commands without results, like CREATE, DROP...
            // For this example we will create two temp tables: tmp_brands and tmp_models
            await db.exec({
                command: `CREATE TABLE IF NOT EXISTS tmp_brands(id SERIAL NOT NULL PRIMARY KEY,
                                                        brand_name VARCHAR(100) NOT NULL,
                                                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                        updated_at TIMESTAMP,
                                                        deleted_at JSON)`,
            });
            await db.exec({
                command: `CREATE TABLE IF NOT EXISTS tmp_models(id SERIAL NOT NULL PRIMARY KEY,
                                                        brand_id INT NOT NULL,
                                                        model_name VARCHAR(100) NOT NULL,
                                                        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                        updated_at TIMESTAMP,
                                                        deleted_at JSON,
                                                        FOREIGN KEY (brand_id) REFERENCES tmp_brands (id) ON DELETE CASCADE)`,
            });
            // Inserting things into tables without transactions
            const brandInserted = await db.insert({
                command: `INSERT INTO tmp_brands(brand_name) VALUES ($1) RETURNING id`,
                values: ['Ford'],
            });
            console.log('Brand inserted:', brandInserted);
            const modelInserted = await db.insert({
                command: `INSERT INTO tmp_models(brand_id, model_name) VALUES ($1, $2) RETURNING id`,
                values: [brandInserted.id, 'Fiesta'],
            });
            console.log('Model inserted:', modelInserted);
            // Using Transactions with proper cleanup
            let transaction;
            try {
                transaction = (await db.startTransaction());
                const otherBrandInserted = await db.insert({
                    command: `INSERT INTO tmp_brands(brand_name) VALUES ($1) RETURNING id`,
                    values: ['Fiat'],
                    transaction,
                });
                await db.insert({
                    command: `INSERT INTO tmp_models(brand_id, model_name) VALUES ($1, $2) RETURNING id`,
                    values: [otherBrandInserted.id, 'Fiat 500'],
                    transaction,
                });
                await db.insert({
                    command: `INSERT INTO tmp_models(brand_id, model_name) VALUES ($1, $2) RETURNING id`,
                    values: [otherBrandInserted.id, 'Panda'],
                    transaction,
                });
                await db.insert({
                    command: `INSERT INTO tmp_models(brand_id, model_name) VALUES ($1, $2) RETURNING id`,
                    values: [otherBrandInserted.id, 'Fastback'],
                    transaction,
                });
                await db.commit(transaction);
                transaction = undefined; // Set to undefined after commit to avoid double release
                console.log('Transaction committed successfully');
            }
            catch (err) {
                if (transaction) {
                    await db.rollback(transaction);
                    transaction = undefined; // Set to undefined after rollback to avoid double release
                }
                throw new Error(err);
            }
            // Let's see if the rows was correctly inserted
            const rowsInserted = await db.queryRows({
                sql: `SELECT B.*, M.*
                FROM tmp_brands B
                JOIN tmp_models M ON M.brand_id = B.id
               ORDER BY B.brand_name, M.model_name`,
            });
            console.log('All inserted data:', rowsInserted);
            // Example of a single row query
            const ford = await db.queryRow({
                sql: `SELECT *
                FROM tmp_brands B
               WHERE B.id = $1`,
                values: [1],
            });
            console.log('Ford brand:', ford);
            // Update example
            const updateResult = await db.update({
                command: `UPDATE tmp_brands SET brand_name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                values: ['Ford Motors', 1],
            });
            console.log('Update result:', updateResult);
            // Soft delete example
            db.setSoftDelete(true);
            await db.delete({
                command: 'DELETE FROM tmp_models WHERE id = $1',
                values: [4],
                options: {
                    softDelete: true,
                    userId: 1,
                    userName: 'John Doe',
                },
            });
            console.log('Soft delete completed');
        }
        catch (err) {
            console.error('Error:', err.message);
            process.exit(1);
        }
    }
    finally {
        // Clean up tables
        try {
            await db.exec({ command: `DROP TABLE IF EXISTS tmp_models` });
            await db.exec({ command: `DROP TABLE IF EXISTS tmp_brands` });
        }
        catch (err) {
            console.error('Error cleaning up tables:', err.message);
        }
        // Close the connection properly
        await db.close();
        console.log('Connection closed');
        process.exit(0);
    }
})();
