import { BaseDB } from '../db/BaseDB';
export declare class MigrationHandler {
    static verify(): Promise<void>;
    static getScripts(db: BaseDB): Promise<string[]>;
    static executeUpdate(db: BaseDB): Promise<void>;
}
