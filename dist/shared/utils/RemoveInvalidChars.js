"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RemoveInvalidChars = RemoveInvalidChars;
function RemoveInvalidChars(search) {
    return search ? search.trim().replace(/['"%*?&']/g, '') : '';
}
