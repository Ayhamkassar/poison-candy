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

// ---------------- إعداد المسار الثابت ----------------
app.use(express.static(path.join(__dirname, "public"))); 
// خزن ملفاتك (index.html, style.css, script.js, bg.jpg) بمجلد public

// ---------------- غرف Socket.IO ----------------
const rooms = {}; // لتخزين اللاعبين داخل كل غرفة

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

        const playerNumber = rooms[roomId].length; // 1 أو 2
        socket.emit("playerNumber", playerNumber);

        // إرسال حالة الغرفة لكل اللاعبين
        io.to(roomId).emit("roomStatus", rooms[roomId].length);

        console.log(`🎮 اللاعب ${playerNumber} دخل الغرفة ${roomId}`);

        // جاهزية
        socket.on("playerReady", (data) => {
            socket.to(data.roomId).emit("updateReady", data.player);
        });

        // بدأ اللعبة
        socket.on("playerBegin", (data) => {
            io.to(data.roomId).emit("updateBegin", data.player);
        });
        // اختيار المربعات الخطرة
socket.on("chooseDanger", (data) => {
    socket.to(data.roomId).emit("updateDanger", data);
});

// لما اللاعب يخلص اختياره
socket.on("playerFinishedSelection", (data) => {
    // إذا خلص الأول → نبلغ الثاني يبدأ اختياره
    if (data.player === 1) {
        io.to(data.roomId).emit("startPlayer2Setup");
    }
    // إذا خلص الثاني → نبدأ اللعبة
    if (data.player === 2) {
        io.to(data.roomId).emit("startGame");
    }
});


        // اختيار المربعات الخطرة
        socket.on("chooseDanger", (data) => {
            socket.to(data.roomId).emit("updateDanger", data);
        });

        // النقر أثناء اللعب
        socket.on("cellClicked", (data) => {
            socket.to(data.roomId).emit("updateCell", data);
        });

        // عند الخروج
        socket.on("disconnect", () => {
            console.log("❌ لاعب خرج");
            if (rooms[roomId]) {
                rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
                if (rooms[roomId].length === 0) delete rooms[roomId];
            }
        });
    });
});

// ---------------- تشغيل السيرفر ----------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 السيرفر شغال على المنفذ ${PORT}`);
});
