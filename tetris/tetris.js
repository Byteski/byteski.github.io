// --- Basic config ---
const T_COLS = 10;
const T_ROWS = 20;
const T_BLOCK_SIZE = 24; // pixels
const T_DROP_INTERVAL_START = 800; // ms

// Canvas and DOM
const tCanvas = document.getElementById("tetris-canvas");
const tCtx = tCanvas.getContext("2d");
const tScoreEl = document.getElementById("tetris-score");
const tStatusEl = document.getElementById("tetris-status");

// Scale for block units
tCtx.scale(T_BLOCK_SIZE, T_BLOCK_SIZE);

// Tetromino shapes
const T_SHAPES = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  // J
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0],
  ],
  // L
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0],
  ],
  // O
  [
    [4, 4],
    [4, 4],
  ],
  // S
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0],
  ],
  // T
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0],
  ],
  // Z
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0],
  ],
];

const T_COLORS = [
  "#000000", // 0 empty
  "#00f0f0", // 1
  "#0000f0", // 2
  "#f0a000", // 3
  "#f0f000", // 4
  "#00f000", // 5
  "#a000f0", // 6
  "#f00000", // 7
];

// --- Board / arena ---
function tCreateMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

const tArena = tCreateMatrix(T_COLS, T_ROWS);

// --- Player state ---
const tPlayer = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
};

let tDropCounter = 0;
let tLastTime = 0;
let tDropInterval = T_DROP_INTERVAL_START;
let tRunning = true;

// --- Core functions ---
function tResetPlayer() {
  const shapeIndex = (Math.random() * T_SHAPES.length) | 0;
  tPlayer.matrix = T_SHAPES[shapeIndex].map((row) => row.slice());
  tPlayer.pos.y = 0;
  tPlayer.pos.x =
    ((tArena[0].length / 2) | 0) - ((tPlayer.matrix[0].length / 2) | 0);

  if (tCollide(tArena, tPlayer)) {
    tStatusEl.textContent = "Game Over";
    tRunning = false;
  }
}

function tCollide(board, player) {
  const m = player.matrix;
  const o = player.pos;
  for (let y = 0; y < m.length; y++) {
    for (let x = 0; x < m[y].length; x++) {
      if (
        m[y][x] !== 0 &&
        (board[y + o.y] && board[y + o.y][x + o.x]) !== 0
      ) {
        return true;
      }
    }
  }
  return false;
}

function tMerge(board, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        board[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

function tArenaSweep() {
  let rowCount = 0;
  outer: for (let y = tArena.length - 1; y >= 0; y--) {
    for (let x = 0; x < tArena[y].length; x++) {
      if (tArena[y][x] === 0) continue outer;
    }

    const row = tArena.splice(y, 1)[0].fill(0);
    tArena.unshift(row);
    y++;
    rowCount++;
  }

  if (rowCount > 0) {
    const base = [0, 40, 100, 300, 1200][rowCount] || 40 * rowCount;
    tPlayer.score += base;
    tScoreEl.textContent = tPlayer.score;
  }
}

function tPlayerDrop() {
  tPlayer.pos.y++;
  if (tCollide(tArena, tPlayer)) {
    tPlayer.pos.y--;
    tMerge(tArena, tPlayer);
    tArenaSweep();
    tResetPlayer();
  }
  tDropCounter = 0;
}

function tPlayerMove(dir) {
  tPlayer.pos.x += dir;
  if (tCollide(tArena, tPlayer)) {
    tPlayer.pos.x -= dir;
  }
}

function tRotate(matrix, dir) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  if (dir > 0) {
    matrix.forEach((row) => row.reverse());
  } else {
    matrix.reverse();
  }
}

function tPlayerRotate(dir) {
  const pos = tPlayer.pos.x;
  let offset = 1;
  tRotate(tPlayer.matrix, dir);

  while (tCollide(tArena, tPlayer)) {
    tPlayer.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > tPlayer.matrix[0].length) {
      tRotate(tPlayer.matrix, -dir);
      tPlayer.pos.x = pos;
      return;
    }
  }
}

function tPlayerHardDrop() {
  while (!tCollide(tArena, tPlayer)) {
    tPlayer.pos.y++;
  }
  tPlayer.pos.y--;
  tMerge(tArena, tPlayer);
  tArenaSweep();
  tResetPlayer();
  tDropCounter = 0;
}

// --- Drawing ---
function tDrawBlock(x, y, value) {
  tCtx.fillStyle = T_COLORS[value];
  tCtx.fillRect(x, y, 1, 1);
  tCtx.strokeStyle = "#111";
  tCtx.lineWidth = 0.05;
  tCtx.strokeRect(x, y, 1, 1);
}

function tDrawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        tDrawBlock(x + offset.x, y + offset.y, value);
      }
    });
  });
}

function tDraw() {
  tCtx.fillStyle = "#000";
  tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);

  tDrawMatrix(tArena, { x: 0, y: 0 });
  if (tRunning) {
    tDrawMatrix(tPlayer.matrix, tPlayer.pos);
  }
}

// --- Game loop ---
function tUpdate(time = 0) {
  const deltaTime = time - tLastTime;
  tLastTime = time;

  if (!tRunning) {
    tDraw();
    return;
  }

  tDropCounter += deltaTime;
  if (tDropCounter > tDropInterval) {
    tPlayerDrop();
  }

  tDraw();
  requestAnimationFrame(tUpdate);
}

// --- Input ---
document.addEventListener("keydown", (event) => {
  if (!tRunning) return;

  switch (event.code) {
    case "ArrowLeft":
      tPlayerMove(-1);
      break;
    case "ArrowRight":
      tPlayerMove(1);
      break;
    case "ArrowDown":
      tPlayerDrop();
      break;
    case "KeyQ":
      tPlayerRotate(-1);
      break;
    case "KeyW":
      tPlayerRotate(1);
      break;
    case "Space":
      event.preventDefault();
      tPlayerHardDrop();
      break;
  }
});

// --- Init ---
tResetPlayer();
tUpdate();
