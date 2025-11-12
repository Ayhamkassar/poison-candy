// ------------------- متغيرات اللعبة -------------------
let setupPhase = false;
let currentPlayer = 1;
let dangerCount = 0;
let playerDangerSelections = { 1: [], 2: [] };
let lives = { 1: 3, 2: 3 };
let readyToBegin = { 1: false, 2: false };
let selectedDone = { 1: false, 2: false };

// عناصر DOM
const grid1 = document.getElementById("grid1");
const grid2 = document.getElementById("grid2");
const begin1 = document.getElementById("begin1");
const begin2 = document.getElementById("begin2");
const readyBtn1 = document.getElementById("readyBtn1");
const readyBtn2 = document.getElementById("readyBtn2");

// Socket.IO
const socket = io();
let playerNumber = null;

// ------------------- الانضمام للغرفة -------------------
socket.emit("joinRoom", "room1");

socket.on("playerNumber", (num) => {
    playerNumber = num;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: متصل`;
});

socket.on("roomFull", () => alert("❌ الغرفة ممتلئة!"));

socket.on("roomStatus", (count) => {
    if (count >= 1) document.getElementById("player1Status").textContent = "اللاعب 1: متصل";
    if (count >= 2) document.getElementById("player2Status").textContent = "اللاعب 2: متصل";
});

// ------------------- Ready -------------------
readyBtn1.addEventListener("click", () => handleReady(1));
readyBtn2.addEventListener("click", () => handleReady(2));

function handleReady(num) {
    if (playerNumber !== num) return;

    readyToBegin[num] = true;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: جاهز`;
    (num === 1 ? readyBtn1 : readyBtn2).disabled = true;

    socket.emit("playerReady", { roomId: "room1", player: num });
}

socket.on("updateReady", (num) => {
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: جاهز`;
    (num === 1 ? readyBtn1 : readyBtn2).disabled = true;
    readyToBegin[num] = true;

    if (readyToBegin[1] && readyToBegin[2]) {
        setupPhase = true;
        if (playerNumber === 1) {
            alert("اللاعب 1 ابدأ باختيار 3 مربعات خطرة");
            createGridForSetup(1);
        } else {
            alert("بانتظار اللاعب الأول ليختار مربعاته...");
        }
    }
});

// ------------------- إعداد المربعات -------------------
function createGridForSetup(player) {
    const grid = player === 1 ? grid1 : grid2;
    grid.innerHTML = "";
    dangerCount = 0;

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        cell.dataset.player = player;
        if (playerNumber === player) cell.addEventListener("click", handleSetupClick);
        grid.appendChild(cell);
    }
}

function handleSetupClick(e) {
    const cell = e.target;
    if (selectedDone[playerNumber]) return;
    if (cell.classList.contains("danger-setup")) return;

    cell.classList.add("danger-setup");
    playerDangerSelections[playerNumber].push(parseInt(cell.dataset.index));
    dangerCount++;

    socket.emit("chooseDanger", { roomId: "room1", player: playerNumber, index: parseInt(cell.dataset.index) });

    if (dangerCount === 3) {
        selectedDone[playerNumber] = true;
        socket.emit("playerFinishedSelection", { roomId: "room1", player: playerNumber });
        alert("اخترت 3 مربعات! بانتظار اللاعب الآخر...");
    }
}

// ------------------- استقبال إشارة بدء اللاعب الثاني -------------------
socket.on("startPlayer2Setup", () => {
    if (playerNumber === 2) {
        alert("الآن دورك لاختيار 3 مربعات خطرة");
        createGridForSetup(2);
    }
});

// ------------------- بداية اللعبة -------------------
socket.on("startGame", () => {
    setupPhase = false;
    currentPlayer = 1;
    startGame();
});

// ------------------- اللعب -------------------
function startGame() {
    createGrid(1);
    createGrid(2);
}

function createGrid(player) {
    const grid = player === 1 ? grid1 : grid2;
    grid.innerHTML = "";
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        cell.dataset.player = player;
        cell.addEventListener("click", handlePlayClick);
        grid.appendChild(cell);
    }
    renderHearts(player);
}

function handlePlayClick(e) {
    const cell = e.target;
    const player = parseInt(cell.dataset.player);
    if (player !== currentPlayer) {
        alert(`دور اللاعب ${currentPlayer}`);
        return;
    }
    if (cell.classList.contains("clicked")) return;

    cell.classList.add("clicked");
    const isDanger = playerDangerSelections[player].includes(parseInt(cell.dataset.index));
    if (isDanger) {
        cell.classList.add("danger");
        lives[player]--;
        renderHearts(player);
        if (lives[player] === 0) {
            alert(`انتهت اللعبة! اللاعب ${player} خسر.`);
            revealAll(player);
            return;
        }
    } else cell.textContent = "🍬";

    socket.emit("cellClicked", { roomId: "room1", player, index: parseInt(cell.dataset.index), isDanger });
    currentPlayer = currentPlayer === 1 ? 2 : 1;
}

// ------------------- القلوب -------------------
function renderHearts(player) {
    document.getElementById(`hearts${player}`).innerHTML = "❤️".repeat(lives[player]);
}

// ------------------- كشف المربعات -------------------
function revealAll(player) {
    const grid = player === 1 ? grid1 : grid2;
    const dangers = playerDangerSelections[player];
    grid.childNodes.forEach((cell, idx) => {
        if (dangers.includes(idx)) cell.classList.add("danger");
        else if (!cell.textContent) cell.textContent = "🍬";
    });
}

// ------------------- استقبال التحديثات -------------------
socket.on("updateDanger", (data) => {
    const grid = data.player === 1 ? grid1 : grid2;
    const cell = grid.children[data.index];
    cell.classList.add("danger-setup");
});

socket.on("updateCell", (data) => {
    const grid = data.player === 1 ? grid1 : grid2;
    const cell = grid.children[data.index];
    cell.classList.add("clicked");
    if (data.isDanger) cell.classList.add("danger");
    else cell.textContent = "🍬";
});
