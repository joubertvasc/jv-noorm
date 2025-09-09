/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ILoggedUser } from './ILoggedUser';

export interface ICrudEvent {
  command: string;
  table?: string;
  columns?: string[];
  values: any;
  inTransaction: boolean;
  result: any;
  user: ILoggedUser;
}
