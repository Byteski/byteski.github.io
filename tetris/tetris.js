// =====================
//     CONFIG & DOM
// =====================

const T_COLS = 10;
const T_ROWS = 20;
const T_BLOCK_SIZE = 36; // pixels per block
const T_DROP_INTERVAL_START = 800; // ms

const tCanvas = document.getElementById("tetris-canvas");
const tCtx = tCanvas.getContext("2d");
const tScoreEl = document.getElementById("tetris-score");
const tHighScoreEl = document.getElementById("tetris-highscore");
const tStatusEl = document.getElementById("tetris-status");

const tHoldCanvas = document.getElementById("hold-canvas");
const tNextCanvas = document.getElementById("next-canvas");
const tHoldCtx = tHoldCanvas.getContext("2d");
const tNextCtx = tNextCanvas.getContext("2d");

// Scale main board in block units
tCtx.scale(T_BLOCK_SIZE, T_BLOCK_SIZE);

// High score storage
const HIGH_SCORE_KEY = "tetrisHighScoreV1";
let tHighScore = Number(localStorage.getItem(HIGH_SCORE_KEY)) || 0;
tHighScoreEl.textContent = tHighScore;

// =====================
//       PIECES
// =====================

const T_SHAPES = [
  // I
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0]
  ],
  // J
  [
    [2, 0, 0],
    [2, 2, 2],
    [0, 0, 0]
  ],
  // L
  [
    [0, 0, 3],
    [3, 3, 3],
    [0, 0, 0]
  ],
  // O
  [
    [4, 4],
    [4, 4]
  ],
  // S
  [
    [0, 5, 5],
    [5, 5, 0],
    [0, 0, 0]
  ],
  // T
  [
    [0, 6, 0],
    [6, 6, 6],
    [0, 0, 0]
  ],
  // Z
  [
    [7, 7, 0],
    [0, 7, 7],
    [0, 0, 0]
  ]
];

const T_COLORS = [
  "#000000", // 0 empty
  "#00f0f0", // 1
  "#0000f0", // 2
  "#f0a000", // 3
  "#f0f000", // 4
  "#00f000", // 5
  "#a000f0", // 6
  "#f00000"  // 7
];

// =====================
//      ARENA & STATE
// =====================

function tCreateMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

const tArena = tCreateMatrix(T_COLS, T_ROWS);

const tPlayer = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0
};

// indexes into T_SHAPES
let tCurrentShapeIndex = null;
let tNextShapeIndex = null;
let tHoldShapeIndex = null;

let tHasHeldThisTurn = false;
let tDropCounter = 0;
let tLastTime = 0;
let tDropInterval = T_DROP_INTERVAL_START;
let tRunning = true;

// =====================
//    PIECE MANAGEMENT
// =====================

function tRandomShapeIndex() {
  return (Math.random() * T_SHAPES.length) | 0;
}

function tSpawnCurrentPiece() {
  tPlayer.matrix = T_SHAPES[tCurrentShapeIndex].map((row) => row.slice());
  tPlayer.pos.y = 0;
  tPlayer.pos.x =
    ((tArena[0].length / 2) | 0) - ((tPlayer.matrix[0].length / 2) | 0);

  tHasHeldThisTurn = false;

  if (tCollide(tArena, tPlayer)) {
    tStatusEl.textContent = "Game Over";
    tRunning = false;
    tUpdateHighScore();
  }
}

function tInitPieces() {
  tCurrentShapeIndex = tRandomShapeIndex();
  tNextShapeIndex = tRandomShapeIndex();
  tHoldShapeIndex = null;
  tSpawnCurrentPiece();
  tUpdatePreviews();
}

function tResetPlayer() {
  // current piece becomes "next"
  tCurrentShapeIndex = tNextShapeIndex;
  tNextShapeIndex = tRandomShapeIndex();
  tSpawnCurrentPiece();
  tUpdatePreviews();
}

function tHoldPiece() {
  if (!tRunning) return;
  if (tHasHeldThisTurn) return; // only once per new piece

  if (tHoldShapeIndex === null) {
    // First time: move current to hold, pull in next
    tHoldShapeIndex = tCurrentShapeIndex;
    tCurrentShapeIndex = tNextShapeIndex;
    tNextShapeIndex = tRandomShapeIndex();
  } else {
    // Swap current with hold
    const temp = tCurrentShapeIndex;
    tCurrentShapeIndex = tHoldShapeIndex;
    tHoldShapeIndex = temp;
  }

  tSpawnCurrentPiece();
  tUpdatePreviews();
}

// =====================
//     COLLISION & MERGE
// =====================

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

function tCollideAt(board, matrix, pos) {
  const m = matrix;
  const o = pos;
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

// =====================
//     LINE CLEAR & SCORE
// =====================

function tArenaSweep() {
  let rowCount = 0;
  outer: for (let y = tArena.length - 1; y >= 0; y--) {
    for (let x = 0; x < tArena[y].length; x++) {
      if (tArena[y][x] === 0) {
        continue outer;
      }
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
    tUpdateHighScore();
  }
}

function tUpdateHighScore() {
  if (tPlayer.score > tHighScore) {
    tHighScore = tPlayer.score;
    tHighScoreEl.textContent = tHighScore;
    localStorage.setItem(HIGH_SCORE_KEY, tHighScore);
  }
}

// =====================
//        MOVEMENT
// =====================

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

// =====================
//       DRAWING
// =====================

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

// Ghost piece (landing indicator)
function tDrawGhost() {
  if (!tRunning || !tPlayer.matrix) return;

  const ghostPos = { x: tPlayer.pos.x, y: tPlayer.pos.y };
  while (!tCollideAt(tArena, tPlayer.matrix, ghostPos)) {
    ghostPos.y++;
  }
  ghostPos.y--;

  tCtx.save();
  tCtx.globalAlpha = 0.3;
  tPlayer.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        tDrawBlock(x + ghostPos.x, y + ghostPos.y, value);
      }
    });
  });
  tCtx.restore();
}

// Preview drawing (hold & next)
function tDrawPreview(shapeIndex, ctx) {
  const canvas = ctx.canvas;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (shapeIndex === null || shapeIndex === undefined) return;

  const shape = T_SHAPES[shapeIndex];
  const rows = shape.length;
  const cols = shape[0].length;

  const cellSize = Math.floor(Math.min(canvas.width / 4, canvas.height / 4));
  const offsetX = (4 - cols) / 2;
  const offsetY = (4 - rows) / 2;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const value = shape[y][x];
      if (value !== 0) {
        const px = (x + offsetX) * cellSize;
        const py = (y + offsetY) * cellSize;
        ctx.fillStyle = T_COLORS[value];
        ctx.fillRect(px, py, cellSize, cellSize);
        ctx.strokeStyle = "#111";
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 0.5, py + 0.5, cellSize - 1, cellSize - 1);
      }
    }
  }
}

function tUpdatePreviews() {
  tDrawPreview(tHoldShapeIndex, tHoldCtx);
  tDrawPreview(tNextShapeIndex, tNextCtx);
}

function tDraw() {
  tCtx.fillStyle = "#000";
  tCtx.fillRect(0, 0, tCanvas.width, tCanvas.height);

  tDrawMatrix(tArena, { x: 0, y: 0 });
  if (tRunning && tPlayer.matrix) {
    tDrawGhost();
    tDrawMatrix(tPlayer.matrix, tPlayer.pos);
  }
}

// =====================
//       GAME LOOP
// =====================

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

// =====================
//        INPUT
// =====================

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
    case "ArrowDown":
      tPlayerRotate(-1);
      break;
    case "ArrowDown":
      tPlayerRotate(1);
      break;
    case "Space":
      event.preventDefault();
      tPlayerHardDrop();
      break;
    case "ShiftLeft":
    case "ShiftRight":
    case "KeyC":
      tHoldPiece();
      break;
  }
});

// =====================
//       INIT
// =====================

tInitPieces();
tUpdate();
