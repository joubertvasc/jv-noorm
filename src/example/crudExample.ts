/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createNoORMConnection } from '../db/connection';
import { DBType } from '../enum/dbType';
import { env } from '../env';
import { BasicCrud } from '../generate/basicCrud/BasicCrud';

interface IBrand {
  id: number;
  brand_name: string;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: string;
}

interface IModel {
  id: number;
  brand_id: number;
  model_name: string;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: string;
}

// Example of extending the BasicCrud class
class BrandsCrudModule extends BasicCrud {
  async findByName(name: string): Promise<IBrand | null> {
    if (!this.db) throw new Error('Database connection is not defined');

    return this.db?.queryRow({
      sql: `SELECT * 
              FROM ${this.tableName} 
             WHERE brand_name = ?`,
      values: [name],
    }) as unknown as IBrand | null;
  }
}

// Example of extending the BasicCrud class
class ModelsCrudModule extends BasicCrud {
  async findByName(name: string): Promise<IModel | null> {
    if (!this.db) throw new Error('Database connection is not defined');

    return this.db?.queryRow({
      sql: `SELECT * 
              FROM ${this.tableName} 
             WHERE model_name = ?`,
      values: [name],
    }) as unknown as IModel | null;
  }
}

(async () => {
  // Create connection
  const db = createNoORMConnection();
  // Connect to database
  await db.connect();

  // Let's create a table for this example
  await db.exec({
    command:
      env.DB_TYPE === DBType.MariaDB
        ? `CREATE TABLE IF NOT EXISTS tmp_brands(id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                                 brand_name VARCHAR(100) NOT NULL,
                                                 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                                                 updated_at DATETIME,
                                                 deleted_at JSON)
           Engine=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
        : `CREATE TABLE IF NOT EXISTS tmp_brands(id SERIAL NOT NULL PRIMARY KEY,
                                                 brand_name VARCHAR(100) NOT NULL,
                                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at TIMESTAMP,
                                                 deleted_at JSON)`,
  });

  await db.exec({
    command:
      env.DB_TYPE === DBType.MariaDB
        ? `CREATE TABLE IF NOT EXISTS tmp_models(id INT NOT NULL PRIMARY KEY AUTO_INCREMENT,
                                                 brand_id INT NOT NULL,
                                                 model_name VARCHAR(100) NOT NULL,
                                                 created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP(),
                                                 updated_at DATETIME,
                                                 deleted_at JSON,
                                                 FOREIGN KEY (brand_id) REFERENCES tmp_brands (id) ON DELETE CASCADE)
           Engine=InnoDB CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
        : `CREATE TABLE IF NOT EXISTS tmp_models(id SERIAL NOT NULL PRIMARY KEY,
                                                 brand_id INT NOT NULL,
                                                 model_name VARCHAR(100) NOT NULL,
                                                 created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                                                 updated_at TIMESTAMP,
                                                 deleted_at JSON,
                                                 FOREIGN KEY (brand_id) REFERENCES tmp_brands (id) ON DELETE CASCADE)`,
  });

  // Now we can make some CRUD operations
  try {
    await db.updateMetadata(); // update metadata cache because we created new tables

    const brands = new BrandsCrudModule({ tableName: 'tmp_brands', db });
    const models = new ModelsCrudModule({ tableName: 'tmp_models', db });

    // To insert new records, use the create method.
    await brands.create({ data: { brand_name: 'Ford' } });
    await brands.create({ data: { brand_name: 'GM' } });
    await brands.create({ data: { brand_name: 'Fiat' } });
    await brands.create({ data: { brand_name: 'Ferrari' } });
    await brands.create({ data: { brand_name: 'Audi' } });
    await brands.create({ data: { brand_name: 'Porsche' } });

    // Using transactions
    const transaction = await db.beginTransaction();
    try {
      const fordBrand = await brands.findByName('Ford');

      if (!fordBrand) throw new Error('Ford not found');
      await models.create({
        data: {
          brand_id: fordBrand.id,
          model_name: 'Maverick',
        },
        transaction,
      });

      await models.create({
        data: {
          brand_id: fordBrand.id,
          model_name: 'Mustang',
        },
        transaction,
      });

      await db.commit(transaction);
    } catch (error: any) {
      await db.rollback(transaction);

      console.log('Transaction error:', error.message);
      throw new Error(error);
    }

    // Find a record by some criteria
    let maverickModel = await models.findByName('Maverick');

    if (!maverickModel) {
      console.log('Maverick model not found');
    } else {
      console.log('Maverick model:', maverickModel);
    }

    // Let's update a record
    if (maverickModel) {
      maverickModel = await models.update({
        key: maverickModel.id,
        data: {
          model_name: 'Maverick GT',
        },
      });

      console.log('Updated Maverick model:', maverickModel);
    }

    // OOOOkkkkk, let's see some recursively delete operations.
    // First, let's insert some more models for Fiat
    const fiatBrand = await brands.findByName('Fiat');

    if (!fiatBrand) throw new Error('Fiat brand not found');
    await models.create({ data: { brand_id: fiatBrand.id, model_name: 'Toro' } });
    await models.create({ data: { brand_id: fiatBrand.id, model_name: 'Palio' } });
    await models.create({ data: { brand_id: fiatBrand.id, model_name: 'Punto' } });

    // First, lets delete the Fiat using soft delete
    await brands.delete({
      key: fiatBrand.id,
      options: {
        softDelete: true,
      },
    });

    // If everything went well, all Fiat models should be soft deleted too (the list will have deleted_at values)
    const fiatModels = await models.list({
      filters: {
        brand_id: fiatBrand.id,
      },
      softDeleted: true,
      orderBy: `model_name`,
      orderDirection: 'ASC',
    });
    console.log('Fiat models after Fiat soft delete:', fiatModels);

    // Now, let's delete fiat permanently
    await brands.delete({
      key: fiatBrand.id,
      options: {
        softDelete: false,
      },
    });

    // If everything went well, the list is empty now
    const fiatModels2 = await models.list({
      filters: {
        brand_id: fiatBrand.id,
      },
      softDeleted: true,
    });
    console.log('Fiat models after Fiat soft delete:', fiatModels2);
  } finally {
    // Drop the table after the example
    await db.exec({ command: 'DROP TABLE IF EXISTS tmp_models' });
    await db.exec({ command: 'DROP TABLE IF EXISTS tmp_brands' });

    // Close connection
    await db.close();
  }
})();
