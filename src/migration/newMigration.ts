/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { format } from 'date-fns';
import fs from 'fs';

import { env } from '../env';
import { removeAccents } from '../shared/utils/RemoveAccents';
import { RemoveInvalidChars } from '../shared/utils/RemoveInvalidChars';

export const createMigration = async (): Promise<void> => {
  if (!process.argv || process.argv.length < 3) {
    console.log('Type a short description to the script.\nUse: yarn migration <description>');
  } else if (process.argv[2].length < 10 || process.argv[2].length > 50) {
    console.log('The description must have from 10 to 50 characters.');
  } else {
    const folder = env.SCRIPTS_FOLDER;

    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
      fs.chmodSync(folder, '777');
    }

    const shortName = process.argv[2];

    const scriptName = format(new Date(), 'yyyyMMddHHmmss');
    const file = `${scriptName}_${removeAccents(RemoveInvalidChars(shortName))
      .replace(/['"&^ˆ!@#$%*()<>\[\]\\/,.+=\n\t]/g, '')
      .replace(/[ ]/g, '_')}.sql`;

    fs.writeFileSync(
      `${folder}/${file}`,
      `-- Description: ${shortName}\n--      Script: ${file} \n--   File name: ${scriptName}\n--  Created at: ${format(
        new Date(),
        'dd/MM/yyyy HH:mm',
      )}\n--      Author: ${require('os').userInfo().username}\n\n`,
    );

    try {
      require('child_process')
        .execSync(`code --reuse-window --goto ${folder}/${file}:7:1`)
        .toString()
        .replace('\n', '');
    } catch (err: any) {
      console.log(`Não foi possível abrir o arquivo ${folder}/${file}:`, err.message);
    }

    process.exit(0);
  }
};
