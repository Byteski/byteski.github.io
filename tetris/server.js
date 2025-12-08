const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

function makeGuestName() {
  return "Guest" + Math.floor(1000 + Math.random() * 9000);
}

// Keep track of connected players
// Map<socket.id, {id, name, score, alive, lastUpdate}>
const players = new Map();

io.on("connection", (socket) => {
  // Get username from client or assign guest
  const rawName = socket.handshake.auth?.username;
  let username = typeof rawName === "string" ? rawName.trim() : "";
  if (!username) {
    username = makeGuestName();
  }

  const player = {
    id: socket.id,
    name: username,
    score: 0,
    alive: true,
    lastUpdate: Date.now()
  };
  players.set(socket.id, player);

  console.log(`Player connected: ${username} (${socket.id})`);

  // Send initial info to this client
  socket.emit("welcome", {
    id: socket.id,
    name: username,
    players: Array.from(players.values())
  });

  // Notify everyone of updated player list
  io.emit("playersUpdate", Array.from(players.values()));

  // Receive periodic state updates from clients
  socket.on("stateUpdate", (state) => {
    const p = players.get(socket.id);
    if (!p) return;

    if (typeof state.score === "number") p.score = state.score;
    if (typeof state.alive === "boolean") p.alive = state.alive;
    p.lastUpdate = Date.now();

    // You could store `state.board` here if you want
    // p.board = state.board;

    io.emit("playersUpdate", Array.from(players.values()));
  });

  socket.on("disconnect", () => {
    const p = players.get(socket.id);
    if (p) {
      console.log(`Player disconnected: ${p.name} (${socket.id})`);
      players.delete(socket.id);
      io.emit("playersUpdate", Array.from(players.values()));
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Server listening on port", PORT);
});
