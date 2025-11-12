const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, {
    cors: { origin: "*" } // السماح لأي متصفح بالاتصال
});

const PORT = process.env.PORT || 3000;

// تقديم ملفات الواجهة
app.use(express.static("public"));

// تخزين بيانات الغرف
let rooms = {};

io.on("connection", socket => {
    console.log("لاعب متصل:", socket.id);

    socket.on("joinRoom", roomId => {
        socket.join(roomId);
        if(!rooms[roomId]) rooms[roomId] = {};
        io.to(roomId).emit("playerJoined", { socketId: socket.id });
    });

    socket.on("chooseDanger", data => {
        io.to(data.roomId).emit("updateDanger", data);
    });

    socket.on("cellClicked", data => {
        io.to(data.roomId).emit("updateCell", data);
    });
});

http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
