import { server } from './server';
import { Server } from 'socket.io';
import { createCanvas, loadImage } from 'canvas';
import imageSize from 'image-size'

const io = new Server(server);

function randomColor() {
  return `rgb(${Math.random() * 255}, ${Math.random() * 255}, ${Math.random() * 255})`;
}
const players = {};
const squares = {};

import fs from 'fs';
import { convertImageToSquares } from './imageConverter';

(async () => {
  const buffer = fs.readFileSync('image.png');
  const { width, height } = imageSize(buffer);
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const img = await loadImage(buffer);
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, width, height);
  convertImageToSquares(imageData.data, width, height, 8, 25, 2).forEach(square => {
    squares[`${square.x}|${square.y}`] = `rgb(${square.color.r}, ${square.color.g}, ${square.color.b})`;
  });
})();

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
    console.log(data.pos.join("|"));
    delete squares[data.pos.join("|")]
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

export { io };