/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { PoolConnection } from 'mysql2/promise';
import { PoolClient } from 'pg';

export type ConnectionPool = PoolConnection | PoolClient;
