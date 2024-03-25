"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = void 0;
const server_1 = require("./server");
const socket_io_1 = require("socket.io");
const io = new socket_io_1.Server(server_1.server);
exports.io = io;
function randomColor() {
    return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
}
const players = {};
const squares = {};
io.on('connection', (socket) => {
    players[socket.id] = { x: 0, y: 0, color: randomColor(), id: socket.id };
    socket.emit('init', { players, squares, color: players[socket.id].color });
    socket.on('mouse', (data) => {
        players[socket.id].x = data[0];
        players[socket.id].y = data[1];
    });
    socket.on('click', (data) => {
        data.pos[0] = Math.floor(data.pos[0] / 100) * 100;
        data.pos[1] = Math.floor(data.pos[1] / 100) * 100;
        squares[data.pos.join("|")] = players[socket.id].color;
    });
    socket.on('clear', (data) => {
        data.pos[0] = Math.floor(data.pos[0] / 100) * 100;
        data.pos[1] = Math.floor(data.pos[1] / 100) * 100;
        delete squares[data.pos.join("|")];
    });
    socket.on('disconnect', () => {
        delete players[socket.id];
    });
    socket.on('audio', (data) => {
        socket.broadcast.emit('audio', data);
    });
});
function update() {
    io.emit('update', { players, squares });
}
setInterval(update, 1000 / 20);
