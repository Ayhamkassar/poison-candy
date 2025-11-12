// ------------------- المتغيرات -------------------
let setupPhase = true;
let currentPlayer = 1;
let dangerCount = 0;
let playerDangerSelections = { 1: [], 2: [] };
let lives = { 1: 3, 2: 3 };

const grid1 = document.getElementById("grid1");
const grid2 = document.getElementById("grid2");
const lobby = document.getElementById("lobby");
const gameDiv = document.getElementById("game");
const readyBtn = document.getElementById("readyBtn");

const socket = io();
let playerNumber = null;

// ------------------- لواجهة الانتظار -------------------
socket.emit("joinRoom", "room1");

socket.on("playerNumber", num => {
    playerNumber = num;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: متصل`;
});

socket.on("updateLobby", players => {
    players.forEach((status, idx) => {
        const num = idx + 1;
        document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: ${status}`;
    });
    if (players.every(s => s === "متصل")) readyBtn.style.display = "inline-block";
});

readyBtn.addEventListener("click", () => {
    socket.emit("playerReady", playerNumber);
    readyBtn.disabled = true;
    readyBtn.textContent = "انتظار اللاعب الآخر...";
});

socket.on("startGame", () => {
    lobby.style.display = "none";
    gameDiv.style.display = "flex";
    createGridForSetup(currentPlayer);
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

        if (currentPlayer === player) cell.addEventListener("click", handleSetupClick);

        grid.appendChild(cell);
    }

    if (currentPlayer === player) alert(`اللاعب ${player}، اختر 3 مربعات خطر لشبكتك (لن يراها الخصم).`);
}

function handleSetupClick(e) {
    const cell = e.target;
    const player = currentPlayer;
    if (cell.classList.contains("danger-setup")) return;

    cell.classList.add("danger-setup");
    playerDangerSelections[player].push(parseInt(cell.dataset.index));
    dangerCount++;

    socket.emit("chooseDanger", { roomId:"room1", player, index: parseInt(cell.dataset.index) });

    if (dangerCount === 3) {
        if (currentPlayer === 1) {
            currentPlayer = 2;
            createGridForSetup(2);
        } else {
            setupPhase = false;
            currentPlayer = 1;
            alert("تم اختيار جميع المربعات الخطرة! يبدأ اللعب الآن.");
            startGame();
        }
    }
}

// ------------------- اللعب -------------------
function startGame() {
    createGrid(1, playerDangerSelections[1]);
    createGrid(2, playerDangerSelections[2]);
}

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

function handlePlayClick(e) {
    const cell = e.target;
    const player = parseInt(cell.dataset.player);
    if (player !== currentPlayer) { alert(`دور اللاعب ${currentPlayer} الآن!`); return; }
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
    } else { cell.textContent = "🍬"; }

    socket.emit("cellClicked", { roomId:"room1", player, index: parseInt(cell.dataset.index), isDanger });

    currentPlayer = currentPlayer === 1 ? 2 : 1;
}

// ------------------- القلوب -------------------
function renderHearts(player) {
    const heartsContainer = document.getElementById(`hearts${player}`);
    if (!heartsContainer) return;
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

// ------------------- استقبال التحديثات Socket.IO -------------------
socket.on("updateDanger", data => {
    const grid = data.player === 1 ? grid1 : grid2;
    const cell = grid.children[data.index];
    cell.classList.add("danger-setup");
});

socket.on("updateCell", data => {
    const grid = data.player === 1 ? grid1 : grid2;
    const cell = grid.children[data.index];
    cell.classList.add("clicked");
    if(data.isDanger) cell.classList.add("danger");
    else cell.textContent = "🍬";
});
