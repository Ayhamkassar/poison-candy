// ------------------- متغيرات اللعبة -------------------
let setupPhase = false;
let currentPlayer = 1;
let dangerCount = 0;
let playerDangerSelections = { 1: [], 2: [] };
let lives = { 1: 3, 2: 3 };
let readyToBegin = { 1: false, 2: false };

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
    console.log("🎮 أنت اللاعب رقم:", num);
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: متصل`;
});

socket.on("roomFull", () => {
    alert("❌ الغرفة ممتلئة! لا يمكن دخول المزيد من اللاعبين.");
});

// ------------------- تحديث عدد اللاعبين -------------------
socket.on("roomStatus", (count) => {
    if (count >= 1) document.getElementById("player1Status").textContent = "اللاعب 1: متصل";
    if (count >= 2) document.getElementById("player2Status").textContent = "اللاعب 2: متصل";
});

// ------------------- Ready -------------------
readyBtn1.addEventListener("click", () => handleReady(1));
readyBtn2.addEventListener("click", () => handleReady(2));

function handleReady(num) {
    // ممنوع اللاعب يضغط زر اللاعب الآخر
    if (playerNumber !== num) return;

    readyToBegin[num] = true;
    const statusElem = document.getElementById(`player${num}Status`);
    statusElem.textContent = `اللاعب ${num}: جاهز`;

    if (num === 1) readyBtn1.disabled = true;
    if (num === 2) readyBtn2.disabled = true;

    socket.emit("playerReady", { roomId: "room1", player: num });
}

// استقبال جاهزية اللاعبين من الطرف الآخر
socket.on("updateReady", (num) => {
    const statusElem = document.getElementById(`player${num}Status`);
    statusElem.textContent = `اللاعب ${num}: جاهز`;
    if (num === 1) readyBtn1.disabled = true;
    if (num === 2) readyBtn2.disabled = true;
    readyToBegin[num] = true;

    // لما يصيروا الاتنين جاهزين نبدأ المرحلة
    if (readyToBegin[1] && readyToBegin[2]) {
        setupPhase = true;
        alert("كلا اللاعبين جاهزان! الآن اختر 3 مربعات خطرة.");
        if (playerNumber === 1) createGridForSetup(1);
        if (playerNumber === 2) createGridForSetup(2);
    }
});

// ------------------- اختيار مربعات الخطر -------------------
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

    if (playerNumber === player) alert(`اللاعب ${player}، اختر 3 مربعات خطرة.`);
}

function handleSetupClick(e) {
    const cell = e.target;
    if (cell.classList.contains("danger-setup")) return;

    cell.classList.add("danger-setup");
    playerDangerSelections[playerNumber].push(parseInt(cell.dataset.index));
    dangerCount++;

    socket.emit("chooseDanger", { roomId: "room1", player: playerNumber, index: parseInt(cell.dataset.index) });

    if (dangerCount === 3) {
        if (playerNumber === 1) begin1.disabled = false;
        if (playerNumber === 2) begin2.disabled = false;
        alert("اخترت 3 مربعات! اضغط Begin للمتابعة.");
    }
}

// ------------------- أزرار Begin -------------------
begin1.addEventListener("click", () => { readyToBegin[1] = "begin"; socket.emit("playerBegin", { roomId: "room1", player: 1 }); });
begin2.addEventListener("click", () => { readyToBegin[2] = "begin"; socket.emit("playerBegin", { roomId: "room1", player: 2 }); });

socket.on("updateBegin", (num) => {
    readyToBegin[num] = "begin";
    if (readyToBegin[1] === "begin" && readyToBegin[2] === "begin") {
        setupPhase = false;
        currentPlayer = 1;
        startGame();
    }
});

// ------------------- بدء اللعبة -------------------
function startGame() {
    createGrid(1, playerDangerSelections[1]);
    createGrid(2, playerDangerSelections[2]);
}

// ------------------- إنشاء الشبكة -------------------
function createGrid(player, dangers) {
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

// ------------------- اللعب -------------------
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
    const heartsContainer = document.getElementById(`hearts${player}`);
    heartsContainer.innerHTML = "❤️".repeat(lives[player]);
}

// ------------------- كشف جميع المربعات -------------------
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
