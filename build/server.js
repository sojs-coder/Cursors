"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.server = void 0;
const http_1 = require("http");
const app_1 = require("./app");
const server = (0, http_1.createServer)(app_1.app);
exports.server = server;
