/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import 'dotenv/config';
import { EnvNotDefinedError } from './shared/errors/env-not-defined-error';
import { InvalidValueError } from './shared/errors/invalid-value-error';
import { IEnv } from './interfaces/IEnv';
import { DBType } from './enum/dbType';
import { ParseURL } from './shared/utils/ParseURL';

const databaseURL = ParseURL.parseDBUrl(getEnv('DATABASE_URL', null));

const env: IEnv = {
  DB_TYPE: getEnv('DB_TYPE', databaseURL?.DB_TYPE || DBType.MariaDB),
  DB_HOST: getEnv('DB_HOST', databaseURL?.DB_HOST || 'localhost'),
  DB_PORT: getNumberEnv(
    'DB_PORT',
    databaseURL?.DB_PORT ||
      (getEnv('DB_TYPE', databaseURL?.DB_TYPE || DBType.MariaDB) === DBType.MariaDB ? 3306 : 5432),
  ),
  DB_DATABASE: getEnv('DB_DATABASE', databaseURL?.DB_DATABASE || undefined),
  DB_SCHEMA: getEnv('DB_SCHEMA', databaseURL?.DB_SCHEMA || null),
  DB_USER: getEnv('DB_USER', databaseURL?.DB_USER || undefined),
  DB_PASSWORD: getEnv('DB_PASSWORD', databaseURL?.DB_PASSWORD || undefined),
  DB_MAX_POOL: getNumberEnv('DB_MAX_POOL', 10),
  DB_MIN_POOL: getNumberEnv('DB_MIN_POOL', 1),
  DB_VERBOSE: getBooleanEnv('DB_VERBOSE', false),
  SCRIPTS_FOLDER: getEnv('SCRIPT_FOLDER', `${process.env.PWD}/scripts`),
  MODELS_FOLDER: getEnv('MODELS_FOLDER', `${process.env.PWD}/models`),
};

function getEnv(key: string, defaultValue: any) {
  if (!process.env[key]) {
    if (defaultValue !== undefined) {
      return defaultValue;
    }

    throw new EnvNotDefinedError(`${key}-NOT-DEFINED`);
  }

  return process.env[key];
}

function getNumberEnv(key: string, defaultValue: number | null) {
  const value = getEnv(key, defaultValue);

  if (isNaN(Number(value))) {
    throw new InvalidValueError(`${key}-INVALID-NUMBER`);
  }

  return Number(value);
}

function getBooleanEnv(key: string, defaultValue: boolean | null) {
  const value = getEnv(key, defaultValue);

  if (typeof value === 'boolean') return value;

  if (
    value === null ||
    value === undefined ||
    (value !== true &&
      value !== false &&
      value.toUpperCase() !== 'TRUE' &&
      value.toUpperCase() !== 'FALSE' &&
      value.toUpperCase() !== 'T' &&
      value.toUpperCase() !== 'F' &&
      value.toUpperCase() !== 'S' &&
      value.toUpperCase() !== 'N' &&
      value !== '1' &&
      value !== 1 &&
      value !== '0' &&
      value !== 0)
  ) {
    throw new InvalidValueError(`${key}-INVALID-BOOLEAN`);
  }

  return (
    value === true ||
    value === '1' ||
    value === 1 ||
    value.toUpperCase() === 'TRUE' ||
    value.toUpperCase() === 'T' ||
    value.toUpperCase() === 'S'
  );
}

export { env };
