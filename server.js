const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let players = [null, null]; // حالة اللاعبين
let readyStatus = [false, false]; // حالة Ready لكل لاعب

io.on("connection", socket => {
    // إعطاء رقم اللاعب
    let playerNum = players[0] === null ? 1 : 2;
    players[playerNum - 1] = "متصل";
    socket.emit("playerNumber", playerNum);
    io.emit("updateLobby", players);

    // استقبال Ready من اللاعب
    socket.on("playerReady", num => {
        readyStatus[num - 1] = true;
        if (readyStatus.every(r => r)) {
            io.emit("startGame");
        }
    });

    // اختيار مربعات الخطر
    socket.on("chooseDanger", data => {
        io.emit("updateDanger", data);
    });

    // النقر على الخلية أثناء اللعب
    socket.on("cellClicked", data => {
        io.emit("updateCell", data);
    });

    socket.on("disconnect", () => {
        players[playerNum - 1] = null;
        readyStatus[playerNum - 1] = false;
        io.emit("updateLobby", players);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
