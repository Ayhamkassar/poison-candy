import express from "express";
import http from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

// ---------------- غرف Socket.IO ----------------
const rooms = {};       // تخزين اللاعبين: { roomId: [socketId, socketId] }
const roomState = {};   // حالة كل غرفة: { currentPlayer, lives, dangers }

io.on("connection", (socket) => {
    console.log("🔌 لاعب متصل");

    socket.on("joinRoom", (roomId) => {
        if (!rooms[roomId]) rooms[roomId] = [];
        if (rooms[roomId].length >= 2) {
            socket.emit("roomFull");
            return;
        }

        rooms[roomId].push(socket.id);
        socket.join(roomId);

        const playerNumber = rooms[roomId].length;
        socket.emit("playerNumber", playerNumber);

        if (!roomState[roomId]) {
            roomState[roomId] = {
                currentPlayer: 1,
                lives: {1:3, 2:3},
                dangers: {1: [], 2: []},
                ready: {1:false,2:false},
                setupDone: {1:false,2:false}
            };
        }

        io.to(roomId).emit("roomStatus", rooms[roomId].length);
        console.log(`🎮 اللاعب ${playerNumber} دخل الغرفة ${roomId}`);

        // ---------------- Ready ----------------
        socket.on("playerReady", (data) => {
            roomState[data.roomId].ready[data.player] = true;
            socket.to(data.roomId).emit("updateReady", data.player);

            const ready = roomState[data.roomId].ready;
            if (ready[1] && ready[2]) {
                io.to(data.roomId).emit("startPlayer1Setup");
            }
        });

        // ---------------- اختيار مربعات الخطر ----------------
        socket.on("chooseDanger", (data) => {
            roomState[data.roomId].dangers[data.player].push(data.index);
            socket.to(data.roomId).emit("updateDanger", data);
        });

        socket.on("playerFinishedSelection", (data) => {
            roomState[data.roomId].setupDone[data.player] = true;
            if (data.player === 1) {
                io.to(data.roomId).emit("startPlayer2Setup");
            }
            if (data.player === 2) {
                io.to(data.roomId).emit("startGame", roomState[data.roomId].dangers);
            }
        });

        // ---------------- اللعب ----------------
        socket.on("cellClicked", (data) => {
            const state = roomState[data.roomId];
            if (state.currentPlayer !== data.player) return; // مش دوره
            if(state.gameOver) return; // اللعبة انتهت مسبقاً
        
            const isDanger = state.dangers[data.player].includes(data.index);
        
            // خصم حياة إذا خطر
            if (isDanger) {
                state.lives[data.player]--;
                if(state.lives[data.player] <= 0){
                    state.gameOver = true;
                    io.to(data.roomId).emit("gameOver", {loser: data.player});
                }
            }
        
            // تبادل الدور
            if(!state.gameOver){
                state.currentPlayer = state.currentPlayer === 1 ? 2 : 1;
                io.to(data.roomId).emit("updateTurn", state.currentPlayer);
            }
        
            io.to(data.roomId).emit("updateCell", data);
        });
        

        // ---------------- disconnect ----------------
        socket.on("disconnect", () => {
            console.log("❌ لاعب خرج");
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                if (rooms[roomId].length === 0) delete rooms[roomId];
            }
            if(roomState[roomId]) delete roomState[roomId];
        });

    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 السيرفر شغال على المنفذ ${PORT}`));
