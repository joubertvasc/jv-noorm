/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { BaseDB } from '../db/BaseDB';
export declare class MigrationHandler {
    static verify(): Promise<void>;
    static getScripts(db: BaseDB): Promise<string[]>;
    static executeUpdate(db: BaseDB): Promise<void>;
}
