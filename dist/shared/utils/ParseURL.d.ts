/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { IEnv } from '../../interfaces/IEnv';
export declare class ParseURL {
    static findSearchParam(search: string, keyToFind: string): string | null;
    static parseDBUrl(url: string): IEnv | null;
}
