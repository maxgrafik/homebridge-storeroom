/**
 * platform.js
 * homebridge-storeroom
 *
 * @copyright 2025 Hendrik Meinl
 */

"use strict";

const { Server } = require("./utils/server");

class Platform {

    constructor(log, config, api) {

        this.log = log;
        this.config = config;
        this.api = api;

        if (!this.api || !this.config) {
            return;
        }

        this.api.on("didFinishLaunching", () => {
            this.Server = new Server(this);
        });
    }

    configureAccessory() {}
}

exports.Platform = Platform;
