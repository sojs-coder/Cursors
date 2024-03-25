"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const socket_1 = require("./socket");
socket_1.io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
});
server_1.server.listen(3000, () => {
    console.log('Server listening on port 3000');
});
