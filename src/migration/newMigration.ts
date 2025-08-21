import fs from 'fs';
import { format } from 'date-fns';
import { RemoveInvalidChars } from '../shared/utils/RemoveInvalidChars';
import { removeAccents } from '../shared/utils/RemoveAccents';
import { env } from '../env';

export const createMigration = async () => {
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
    } catch (err) {
      console.log(`Não foi possível abrir o arquivo ${folder}/${file}.`);
    }

    process.exit(0);
  }
};

// setTimeout(async () => {
//   await createMigration();
// }, 500);
