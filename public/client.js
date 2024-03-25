
var socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const camera = [0, 0];
var players = [];
var squares = [];
const currPos = [0, 0];


var movingLeft = false;
var movingRight = false;
var movingUp = false;
var movingDown = false;
var movingSpeed = 5;
var movingTwoDirections = false;
var mouseDown = false;
var rMouseDown = false;
const leftMoveTrigger = canvas.width / 5;
const rightMoveTrigger = canvas.width - leftMoveTrigger;
const upMoveTrigger = canvas.height / 5;
const downMoveTrigger = canvas.height - upMoveTrigger;
var oldSquareMove = [null, null];
var x = 0, y = 0;
var color = "black";
function calculatePositions(squares){
  var map = {};

  squares.forEach(square=>{
    if(map[square.color] == undefined){
      map[square.color] = 0;
    }
    map[square.color]++;
  });
  var list = Object.values(map);
  var labels = Object.keys(map);

  var fList = [];
  labels.forEach((l,i)=>{
    fList.push({number: list[i], color: l})
  })
  fList = fList.sort((a,b)=>{
    return b.number - a.number;
  });
  return fList;
}
socket.on('init', ({ players: newPlayers, squares: newSquares, color: newColor }) => {
    updateRefs({ players: newPlayers, squares: newSquares })
    color = newColor;
})
window.oncontextmenu = function (e) {
    e.preventDefault();
    return false;
}
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    var realizedPos = [Math.floor(currPos[0] / 100) * 100, Math.floor(currPos[1] / 100) * 100];
    if (e.which === 1 || e.button === 0) {
        socket.emit('click', { pos: realizedPos });
        oldSquareMove = realizedPos;
        mouseDown = true;
    }
    if (e.which === 3 || e.button === 2) {
        socket.emit('clear', { pos: realizedPos });
        oldSquareMove = realizedPos;
        rMouseDown = true;
    }
    return false;
});
canvas.addEventListener('mouseup', (e) => {
    mouseDown = false;
    rMouseDown = false;
});
canvas.addEventListener('mousemove', (e) => {
    const bounding = canvas.getBoundingClientRect();
    x = e.clientX - bounding.left;
    y = e.clientY - bounding.top;
    var realizedPos = [Math.floor(currPos[0] / 100) * 100, Math.floor(currPos[1] / 100) * 100];
    if (mouseDown) {
        if (realizedPos[0] !== oldSquareMove[0] || realizedPos[1] !== oldSquareMove[1]) {
            socket.emit('click', { pos: realizedPos });
            oldSquareMove = realizedPos;
        }
    }
    if (rMouseDown) {
        if (realizedPos[0] !== oldSquareMove[0] || realizedPos[1] !== oldSquareMove[1]) {
            socket.emit('clear', { pos: realizedPos });
            oldSquareMove = realizedPos;
        }
    }
    var movingConcurrently = 0;
    movingSpeed = 0;
    if (x < leftMoveTrigger) {
        movingLeft = true;
        var offBy = leftMoveTrigger - x;
        movingSpeed += offBy / leftMoveTrigger * 10;
        movingConcurrently++;
    } else {
        movingLeft = false;
    }
    if (x > rightMoveTrigger) {
        movingRight = true;
        var offBy = x - rightMoveTrigger;
        movingSpeed += offBy / (canvas.width - rightMoveTrigger) * 10;
        movingConcurrently++;

    } else {
        movingRight = false;
    }
    if (y < upMoveTrigger) {
        movingUp = true;
        var offBy = upMoveTrigger - y;
        movingSpeed += offBy / upMoveTrigger * 10;
        movingConcurrently++;

    } else {
        movingUp = false;
    }
    if (y > downMoveTrigger) {
        movingDown = true;
        var offBy = y - downMoveTrigger;
        movingSpeed += offBy / (canvas.height - downMoveTrigger) * 10;
        movingConcurrently++;

    } else {
        movingDown = false;
    }
    if (movingConcurrently > 1) {
        movingTwoDirections = true;
    } else {
        movingTwoDirections = false;
    }
    changed = true;
});
function drawGrid() {
    var width = canvas.width;
    var height = canvas.height;

    var offSetX = -camera[0];
    var offSetY = -camera[1];

    var spaceBetween = 100;
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 1;
    for (var x = offSetX % spaceBetween; x < width; x += spaceBetween) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
        ctx.closePath();

    }
    for (var y = offSetY % spaceBetween; y < height; y += spaceBetween) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        ctx.closePath();
    }
    // draw coodinates
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var x = offSetX % spaceBetween; x < width; x += spaceBetween) {
        for (var y = offSetY % spaceBetween; y < height; y += spaceBetween) {
            ctx.fillText(`${((x + camera[0]) / 100).toFixed(0)} | ${((y + camera[1]) / 100).toFixed(0)}`, x + 50, y + 50);
        }
    }
}
function update() {
    socket.emit('mouse', currPos);
}
function draw() {
    if (currPos[0] == x + camera[0] && currPos[1] == y + camera[1]) {
        changed = false;
    } else {
        currPos[0] = x + camera[0];
        currPos[1] = y + camera[1];
        changed = true;
    }
    var speed = movingSpeed;
    if (movingTwoDirections) {
        speed = movingSpeed / Math.sqrt(2);
    }
    if (movingLeft || movingRight || movingUp || movingDown) {
        if (movingLeft) {
            camera[0] -= speed;
            currPos[0] += speed;
        }
        if (movingRight) {
            camera[0] += speed;
            currPos[0] -= speed;
        }
        if (movingUp) {
            camera[1] -= speed;
            currPos[1] += speed;
        }
        if (movingDown) {
            camera[1] += speed;
            currPos[1] -= speed;
        }
        changed = true;
    }
    if (changed) {
        update();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    squares.forEach((square) => {
        ctx.fillStyle = square.color;
        ctx.fillRect(Math.floor(square.x / 100) * 100 - camera[0], Math.floor(square.y / 100) * 100 - camera[1], 100, 100);
    });
    players.forEach((player) => {
        if (player.id == socket.id) return;
        ctx.fillStyle = player.color;
        // circle
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(player.x - camera[0] - 5, player.y - camera[1] - 5, 10, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        ctx.closePath();
    });
    var self = {
        x: currPos[0],
        y: currPos[1],
        color
    }
    ctx.fillStyle = self.color;
    // circle
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    ctx.arc(self.x - camera[0] - 5, self.y - camera[1] - 5, 10, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = 'black';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    const text = `x: ${Math.floor(currPos[0] / 100)} y: ${Math.floor(currPos[1] / 100)}`;
    ctx.font = '20px Times New Roman';
    ctx.fillText(text, 10, canvas.height - 10);
    const scores = calculatePositions(squares);
    var widths = scores.map(score => ctx.measureText(score.number).width);
    var maxWidth = Math.max(...widths);
    scores.forEach((square, i)=>{
        var { color, number } = square;
        ctx.font = '20px Arial';
        ctx.fillStyle = color;
        ctx.strokeStyle = "black";
        ctx.textAlign = "left";
        ctx.baseLine = "middle"
        var percent = (number / squares.length) * 100
        var text = `${number}`
        var tWidth = ctx.measureText(number).width;
        ctx.fillRect(canvas.width - 10 - maxWidth - 30 - Math.max(percent,10), -10+ (i + 1) * 23, Math.max(percent,10),20);
        ctx.strokeRect(canvas.width - 10 - maxWidth - 30 - Math.max(percent,10), -10+(i + 1) * 23, Math.max(percent,10),20);

        ctx.fillText(text, canvas.width - 10 - tWidth, 10 + (i + 1) * 23);        
        ctx.strokeText(text, canvas.width - 10 - tWidth, 10 + (i + 1) * 23);        

    })
    ctx.fillStyle = "black";
    const numPlayers = players.length;
    ctx.font = '20px Times New Roman';
    ctx.textAlign = 'right';
    ctx.fillText(`Players: ${numPlayers}`, canvas.width - 10, canvas.height - 10);
    const numSquares = squares.length;
    ctx.fillText(`Squares: ${numSquares}`, canvas.width - 10, canvas.height - 30);
    window.requestAnimationFrame(draw);
}
socket.on('update', (data) => {
    updateRefs(data)
});

function updateRefs(data) {
    if (data.players !== undefined) {
        players = Object.values(data.players);
    }
    if (data.squares !== undefined) {
        squares = Object.keys(data.squares).map((key) => {
            return {
                color: data.squares[key], x: key.split('|')[0], y: key.split('|')[1]
            }
        });
    }
}
// get an audio stream and pipe it to announce
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(initVC);
}

function initVC(stream) {
    const mediaRecorder = new MediaRecorder(stream);
    var audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
    });

    mediaRecorder.addEventListener('stop', () => {
        var audioBlob = new Blob(audioChunks);
        audioChunks = [];
        var fileReader = new FileReader();
        fileReader.readAsDataURL(audioBlob);
        fileReader.onloadend = function () {
            var base64data = fileReader.result;
            socket.emit('audio', base64data);
        }

        mediaRecorder.start();
        setTimeout(() => {
            mediaRecorder.stop();
        }, 1000);
    });
    mediaRecorder.start();

    setTimeout(() => {
        mediaRecorder.stop();
    }, 1000);


}

socket.on('audio', (data) => {
    var newData = data.split(";");
    newData[0] = "data:audio/ogg;";
    newData = newData[0] + newData[1];

    var audio = new Audio(newData);
    if (!audio || document.hidden) {
        return;
    }
    audio.play();
});



draw();