import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public"))); // مجلد الواجهة

let rooms = {}; // { roomCode: { players: [], dangers: {}, ready: {} } }

io.on("connection", (socket) => {
  console.log("🔌 لاعب متصل:", socket.id);

  socket.on("createRoom", () => {
    const roomCode = Math.random().toString(36).substring(2, 7);
    rooms[roomCode] = { players: [socket.id], dangers: {}, ready: {} };
    socket.join(roomCode);
    socket.emit("roomCreated", { roomCode, playerNumber: 1 });
    console.log("🆕 تم إنشاء غرفة:", roomCode);
  });

  socket.on("joinRoom", (roomCode) => {
    const room = rooms[roomCode];
    if (!room) {
      socket.emit("errorMsg", "❌ الغرفة غير موجودة!");
      return;
    }
    if (room.players.length >= 2) {
      socket.emit("errorMsg", "⚠️ الغرفة ممتلئة!");
      return;
    }

    room.players.push(socket.id);
    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, playerNumber: 2 });
    io.to(roomCode).emit("bothJoined");
    console.log("👥 لاعب دخل الغرفة:", roomCode);
  });

  socket.on("chooseDanger", ({ roomCode, player, index }) => {
    const room = rooms[roomCode];
    if (!room.dangers[player]) room.dangers[player] = [];
    room.dangers[player].push(index);
    socket.to(roomCode).emit("updateDanger", { player, index });
  });

  socket.on("playerReady", ({ roomCode, player }) => {
    const room = rooms[roomCode];
    room.ready[player] = true;
    io.to(roomCode).emit("updateReady", room.ready);
    if (room.ready[1] && room.ready[2]) {
      io.to(roomCode).emit("startGame", room.dangers);
    }
  });

  socket.on("cellClicked", ({ roomCode, player, index, isDanger }) => {
    socket.to(roomCode).emit("updateCell", { player, index, isDanger });
  });

  socket.on("disconnect", () => {
    for (const [code, room] of Object.entries(rooms)) {
      if (room.players.includes(socket.id)) {
        delete rooms[code];
        io.to(code).emit("errorMsg", "🚪 اللاعب الآخر غادر الغرفة!");
        console.log("❌ تم حذف الغرفة:", code);
      }
    }
  });
});

server.listen(3000, () => console.log("✅ السيرفر شغال على المنفذ 3000"));
