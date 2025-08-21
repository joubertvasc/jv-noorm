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
