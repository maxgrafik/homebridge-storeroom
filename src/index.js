/**
 * index.js
 * homebridge-storeroom
 *
 * @copyright 2025 Hendrik Meinl
 */

"use strict";

const { Platform } = require("./platform");

module.exports = function(homebridge) {
    homebridge.registerPlatform("Storeroom", Platform);
};
