/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { DBType } from '../enum/dbType';

export interface IEnv {
  DB_TYPE: DBType;
  DATABASE_URL?: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SCHEMA?: string;
  DB_MAX_POOL: number;
  DB_MIN_POOL: number;
  DB_VERBOSE: boolean;
  SCRIPTS_FOLDER: string;
  MODELS_FOLDER: string;
}
