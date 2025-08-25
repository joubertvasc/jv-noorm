"use strict";
/**
 * Copyright (c) 2025, Joubert Vasconcelos
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Operation = void 0;
var Operation;
(function (Operation) {
    Operation[Operation["CREATE"] = 0] = "CREATE";
    Operation[Operation["UPDATE"] = 1] = "UPDATE";
    Operation[Operation["DELETE"] = 2] = "DELETE";
})(Operation || (exports.Operation = Operation = {}));
