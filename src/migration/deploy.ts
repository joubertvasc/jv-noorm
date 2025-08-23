/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { MigrationHandler } from './MigrationHandler';

export const deploy = async () => {
  try {
    await MigrationHandler.verify();
    process.exit(0);
  } catch (err: any) {
    console.log('MIGRATION ERROR: ', err.message);
  }
};
