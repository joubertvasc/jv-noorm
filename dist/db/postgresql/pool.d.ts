/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { Pool, PoolConfig } from 'pg';
export declare function initPool(config: PoolConfig): Pool;
export declare function getPool(): Pool;
export declare function closePool(): Promise<void>;
