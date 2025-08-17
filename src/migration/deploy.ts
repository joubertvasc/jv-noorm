import { MigrationHandler } from './MigrationHandler';

export const migration = async () => {
  try {
    await MigrationHandler.verify();
    process.exit(0);
  } catch (err: any) {
    console.log('MIGRATION ERROR: ', err.message);
  }
};

setTimeout(async () => {
  await migration();
}, 500);
