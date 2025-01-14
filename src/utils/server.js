/**
 * server.js
 * homebridge-storeroom
 *
 * @copyright 2025 Hendrik Meinl
 */

"use strict";

const express = require("express");
const path = require("node:path");
const fsPromises = require("node:fs/promises");
const crypto = require("node:crypto");

class Server {

    constructor(platform) {

        this.store = {};
        this.tokens = {};

        this.platform = platform;

        this.log = this.platform.log;
        this.config = this.platform.config;
        // this.api = this.platform.api;

        this.app = express();

        this.app.use(express.json());
        this.app.use("/store", this.verifyAccess.bind(this));

        this.app.get("/store", (req, res) => {
            this.getStore(req, res);
        });

        this.app.post("/store", async (req, res) => {
            this.setStore(req, res);
        });

        this.app.delete("/store", async (req, res) => {
            this.deleteStore(req, res);
        });

        this.run();
    }

    async run() {

        await this.loadStore();

        const port = this.config.serverPort || 8080;
        this.app.listen(port, () => {
            this.log.info("Ready");
        });
    }

    async verifyAccess(req, res, next) {

        if (this.config.serverSecret) {

            // clean up expired tokens
            const timestamp = Date.now();
            for (const key of Object.keys(this.tokens)) {
                if (this.tokens[key] < timestamp) {
                    delete this.tokens[key];
                }
            }

            // check for "Authorization" header
            const authHeader = req.get("Authorization");
            if (!authHeader) {
                return this.denyAccess(res);
            }

            // check auth scheme
            const regex = new RegExp("^OTP\\s+nonce=\"(?<nonce>[a-z0-9]+)\"\\s*,\\s*hash=\"(?<hash>[a-z0-9]+)\"$");
            const match = regex.exec(authHeader);
            if (!match) {
                return this.denyAccess(res);
            }

            // check if provided nonce exists
            const nonce = match.groups.nonce;
            if (!Object.hasOwn(this.tokens, nonce)) {
                return this.denyAccess(res);
            }

            // calculate hash
            const serverHash = crypto.hash("sha256", nonce + ":" + this.config.serverSecret);

            // check if clientHash === serverHash
            const clientHash = match.groups.hash;
            if (clientHash !== serverHash) {
                delete this.tokens[nonce];
                return this.denyAccess(res);
            }

            // client authorized -> delete nonce, because it's one-time-only
            delete this.tokens[nonce];
        }

        // check POST body
        if (req.method === "POST" && req.is("application/json") !== "application/json") {
            return res.sendStatus(400);
        }

        next();
    }

    async denyAccess(res) {

        // create new nonce
        const nonce = crypto.randomBytes(16).toString("hex");

        // add to tokens with a lifetime of 5 minutes
        this.tokens[nonce] = Date.now() + (5 * 60 * 1000);

        // respond with 401 Unauthorized
        res.set("WWW-Authenticate", "OTP nonce=\"" + nonce + "\"");
        return res.sendStatus(401);
    }

    async getStore(req, res) {

        let obj = null;

        const key = req.query["box"];
        if (!key) {
            obj = this.store;
        } else if (Object.hasOwn(this.store, key)) {
            obj = this.store[key];
        }

        try {
            const json = JSON.stringify(obj);
            res.send(json);
        } catch(error) {
            this.platform.log.debug(error.message || error);
            res.sendStatus(500);
        }
    }

    async setStore(req, res) {

        const obj = req.body;

        if (typeof obj !== "object" || Array.isArray(obj) || obj === null) {
            return res.sendStatus(400);
        }

        await this.updateStore(this.store, obj);
        await this.saveStore();
        res.sendStatus(200);
    }

    async deleteStore(req, res) {
        const key = req.query["box"];
        if (Object.hasOwn(this.store, key)) {
            delete this.store[key];
            await this.saveStore();
            res.sendStatus(204);
        } else {
            res.sendStatus(404);
        }
    }

    async loadStore() {

        const storagePath = this.platform.api.user.storagePath();
        const filePath = path.join(storagePath, "storeroom", "db.json");

        try {
            const contents = await fsPromises.readFile(filePath, { encoding: "utf8" });
            this.store = JSON.parse(contents);
        } catch(error) {
            // this.platform.log.debug(error.message || error);
        }
    }

    async saveStore() {

        const storagePath = this.platform.api.user.storagePath();
        const filePath = path.join(storagePath, "storeroom", "db.json");

        try {
            const contents = JSON.stringify(this.store, null, 4);
            await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
            await fsPromises.writeFile(filePath, contents, { encoding: "utf8" });
        } catch(error) {
            this.platform.log.debug(error.message || error);
        }
    }

    async updateStore(obj, src) {
        for (const key of Object.keys(src)) {
            if (typeof src[key] === "object" && !Array.isArray(src[key]) && src[key] !== null) {
                if (!Object.hasOwn(obj, key)) {
                    obj[key] = {};
                }
                await this.updateStore(obj[key], src[key]);
            } else if (Array.isArray(src[key])) {
                obj[key] = src[key].slice();
            } else {
                obj[key] = src[key];
            }
        }
    }
}

exports.Server = Server;
