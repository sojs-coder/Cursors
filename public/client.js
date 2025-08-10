var socket = io();

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const camera = [0, 0];
var players = [];
var squares = [];
const currPos = [0, 0];
var zoom = 1;

var focused = true;
var movingLeft = false;
var movingRight = false;
var movingUp = false;
var movingDown = false;
var movingSpeed = 5;
var movingTwoDirections = false;
var mouseDown = false;
var rMouseDown = false;
var popupOpen = false
const leftMoveTrigger = canvas.width / 5;
const rightMoveTrigger = canvas.width - leftMoveTrigger;
const upMoveTrigger = canvas.height / 5;
const downMoveTrigger = canvas.height - upMoveTrigger;
var lastPos = null;
var x = 0, y = 0;
var color = "black";

function calculatePositions(squares) {
    var map = {};

    squares.forEach(square => {
        if (map[square.color] == undefined) {
            map[square.color] = 0;
        }
        map[square.color]++;
    });
    var list = Object.values(map);
    var labels = Object.keys(map);

    var fList = [];
    labels.forEach((l, i) => {
        fList.push({ number: list[i], color: l })
    })
    fList = fList.sort((a, b) => {
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

function getLine(x0, y0, x1, y1) {
    var dx = Math.abs(x1 - x0);
    var dy = Math.abs(y1 - y0);
    var sx = (x0 < x1) ? 1 : -1;
    var sy = (y0 < y1) ? 1 : -1;
    var err = dx - dy;
    var points = [];
    while (true) {
        points.push([x0, y0]);
        if ((x0 === x1) && (y0 === y1)) break;
        var e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return points;
}

function paint(worldX, worldY, event) {
    const brushSize = Math.max(1, Math.floor(1 / zoom));
    for (let i = -Math.floor(brushSize / 2); i < Math.ceil(brushSize / 2); i++) {
        for (let j = -Math.floor(brushSize / 2); j < Math.ceil(brushSize / 2); j++) {
            const realizedPos = [Math.floor((worldX + i * 100) / 100) * 100, Math.floor((worldY + j * 100) / 100) * 100];
            socket.emit(event, { pos: realizedPos });
        }
    }
}

canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (popupOpen) {
        closePopup();
    }
    if (!focused) {
        focused = true;
        canvas.style.cursor = "none";
        return;
    }
    const worldX = (e.clientX + camera[0]) / zoom;
    const worldY = (e.clientY + camera[1]) / zoom;
    lastPos = [worldX, worldY];
    if (e.which === 1 || e.button === 0) {
        mouseDown = true;
        paint(worldX, worldY, 'click');
    }
    if (e.which === 3 || e.button === 2) {
        rMouseDown = true;
        paint(worldX, worldY, 'clear');
    }
    return false;
});
canvas.addEventListener('mouseup', (e) => {
    mouseDown = false;
    rMouseDown = false;
    lastPos = null;
});
canvas.addEventListener('mousemove', (e) => {
    if (!focused) {
        return;
    }
    const bounding = canvas.getBoundingClientRect();
    x = e.clientX - bounding.left;
    y = e.clientY - bounding.top;

    const worldX = (x + camera[0]) / zoom;
    const worldY = (y + camera[1]) / zoom;

    if (mouseDown || rMouseDown) {
        if (lastPos) {
            const points = getLine(Math.floor(lastPos[0] / 100), Math.floor(lastPos[1] / 100), Math.floor(worldX / 100), Math.floor(worldY / 100));
            for (const point of points) {
                paint(point[0] * 100, point[1] * 100, mouseDown ? 'click' : 'clear');
            }
        }
        lastPos = [worldX, worldY];
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
});
document.addEventListener('keydown', (e) => {
    console.log(e);
    if (e.key == 'Escape' && focused) {
        focused = false;
        canvas.style.cursor = "auto";
        return;
    }
});

function drawGrid() {
    if (zoom < 1) return;
    var width = canvas.width;
    var height = canvas.height;

    var offSetX = -camera[0];
    var offSetY = -camera[1];

    var spaceBetween = 100 * zoom;
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
    ctx.font = 20 * zoom + 'px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (var x = offSetX % spaceBetween; x < width; x += spaceBetween) {
        for (var y = offSetY % spaceBetween; y < height; y += spaceBetween) {
            ctx.fillText(`${((x + camera[0]) / (100 * zoom)).toFixed(0)} | ${((y + camera[1]) / (100 * zoom)).toFixed(0)}`, x + 50 * zoom, y + 50 * zoom);
        }
    }
}
function update() {
    socket.emit('mouse', currPos);
}
function draw() {
    var speed = movingSpeed;
    if (movingTwoDirections) {
        speed = movingSpeed / Math.sqrt(2);
    }
    var changed = false;
    if (movingLeft || movingRight || movingUp || movingDown) {
        if (movingLeft) {
            camera[0] -= speed;
        }
        if (movingRight) {
            camera[0] += speed;
        }
        if (movingUp) {
            camera[1] -= speed;
        }
        if (movingDown) {
            camera[1] += speed;
        }
        changed = true;
    }

    const worldX = (x + camera[0]) / zoom;
    const worldY = (y + camera[1]) / zoom;

    if (currPos[0] != worldX || currPos[1] != worldY) {
        changed = true;
        currPos[0] = worldX;
        currPos[1] = worldY;
    }


    if (changed) {
        update();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawGrid();
    squares.forEach((square) => {
        ctx.fillStyle = square.color;
        ctx.fillRect(Math.floor(square.x / 100) * 100 * zoom - camera[0], Math.floor(square.y / 100) * 100 * zoom - camera[1], 100 * zoom, 100 * zoom);
    });
    players.forEach((player) => {
        if (player.id == socket.id) return;
        ctx.fillStyle = player.color;
        // circle
        ctx.strokeStyle = 'white';
        ctx.beginPath();
        ctx.arc(player.x * zoom - camera[0] - 5 * zoom, player.y * zoom - camera[1] - 5 * zoom, 10 * zoom, 0, 2 * Math.PI);
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
    const brushSize = Math.max(1, Math.floor(1 / zoom));
    ctx.arc(x, y, (100 * zoom * brushSize) / 2, 0, 2 * Math.PI);
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
    scores.forEach((square, i) => {
        var { color, number } = square;
        ctx.font = '20px Arial';
        ctx.fillStyle = color;
        ctx.strokeStyle = "black";
        ctx.textAlign = "left";
        ctx.baseLine = "middle"
        var percent = (number / squares.length) * 100
        var text = `${number}`
        var tWidth = ctx.measureText(number).width;
        ctx.fillRect(canvas.width - 10 - maxWidth - 30 - Math.max(percent, 10), -10 + (i + 1) * 23, Math.max(percent, 10), 20);
        ctx.strokeRect(canvas.width - 10 - maxWidth - 30 - Math.max(percent, 10), -10 + (i + 1) * 23, Math.max(percent, 10), 20);

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

const instructionsPopup = document.getElementById('instructions-popup');
const closeInstructions = document.getElementById('close-instructions');

if (!localStorage.getItem('visited')) {
    instructionsPopup.style.display = 'block';
    focused = false;
    popupOpen = true;
}
else {
    instructionsPopup.style.display = 'none';
    focused = true;
    popupOpen = false;
}

closeInstructions.addEventListener('click', closePopup);
function closePopup() {
    instructionsPopup.style.display = 'none';
    localStorage.setItem('visited', true);
}
const evCache = [];
let prevDiff = -1;
let lastPointer = null;

canvas.addEventListener('pointerdown', (e) => {
    evCache.push(e);
    if (evCache.length === 1) {
        lastPointer = { x: e.clientX, y: e.clientY };
    }
});

canvas.addEventListener('pointermove', (e) => {
    for (let i = 0; i < evCache.length; i++) {
        if (e.pointerId == evCache[i].pointerId) {
            evCache[i] = e;
            break;
        }
    }

    if (evCache.length === 1 && lastPointer) {
        lastPointer = { x: e.clientX, y: e.clientY };
    }

    if (evCache.length === 2) {
        const curDiff = Math.hypot(evCache[0].clientX - evCache[1].clientX, evCache[0].clientY - evCache[1].clientY);

        var oldZoom = zoom;
        if (prevDiff > 0) {
            if (curDiff > prevDiff) {
                zoom *= 1.05;
            }
            if (curDiff < prevDiff) {
                zoom *= 0.95;
            }
        }
        zoom = Math.max(0.01, Math.min(5, zoom));
        var mouseX = (evCache[0].clientX + evCache[1].clientX) / 2;
        var mouseY = (evCache[0].clientY + evCache[1].clientY) / 2;
        var worldX = (mouseX + camera[0]) / oldZoom;
        var worldY = (mouseY + camera[1]) / oldZoom;
        camera[0] = worldX * zoom - mouseX;
        camera[1] = worldY * zoom - mouseY;


        prevDiff = curDiff;
    }
});

canvas.addEventListener('pointerup', (e) => {
    for (let i = 0; i < evCache.length; i++) {
        if (evCache[i].pointerId == e.pointerId) {
            evCache.splice(i, 1);
            break;
        }
    }

    if (evCache.length < 2) {
        prevDiff = -1;
    }
    if (evCache.length < 1) {
        lastPointer = null;
    }
});

canvas.addEventListener('wheel', (e) => {
    if (e.ctrlKey) {
        e.preventDefault();
        var oldZoom = zoom;
        if (e.deltaY > 0) {
            zoom *= 0.95;
        } else {
            zoom *= 1.05;
        }
        zoom = Math.max(0.01, Math.min(5, zoom));
        var mouseX = x;
        var mouseY = y;
        var worldX = (mouseX + camera[0]) / oldZoom;
        var worldY = (mouseY + camera[1]) / oldZoom;
        camera[0] = worldX * zoom - mouseX;
        camera[1] = worldY * zoom - mouseY;
    }
});


draw();