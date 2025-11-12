let setupPhase = true;
let currentPlayer = 1; // اللاعب الذي يختار الآن
let dangerCount = 0; // عدد مربعات الخطر المختارة حاليًا
let playerDangerSelections = { 1: [], 2: [] };

// توليد شبكة فارغة للاختيار
function createGridForSetup(player) {
    const grid = player === 1 ? grid1 : grid2;
    grid.innerHTML = "";
    dangerCount = 0;

    for (let i = 0; i < 9; i++) {
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        cell.dataset.player = player;

        // نضيف حدث النقر
        cell.addEventListener("click", handleSetupClick);
        grid.appendChild(cell);
    }

    alert(`اللاعب ${player}، اختر 3 مربعات خطر لشبكتك (لن يراها الخصم).`);
}

// عند النقر أثناء مرحلة الإعداد
function handleSetupClick(e) {
    const cell = e.target;
    const player = currentPlayer;

    if (cell.classList.contains("danger-setup")) return;

    cell.classList.add("danger-setup"); // للاعب نفسه فقط
    playerDangerSelections[player].push(parseInt(cell.dataset.index));
    dangerCount++;

    if (dangerCount === 3) {
        // إذا أنهى اللاعب اختيار 3 مربعات
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

// بدء اللعبة بعد الاختيار
function startGame() {
    // الآن نملأ الشبكات بالشكل النهائي
    createGrid(1, playerDangerSelections[1]);
    createGrid(2, playerDangerSelections[2]);
}

// إنشاء شبكة نهائية بعد الاختيار (للعب)
function createGrid(player, dangers) {
    const grid = player === 1 ? grid1 : grid2;
    grid.innerHTML = "";

    dangers.forEach(idx => console.log("خطر اللاعب", player, ":", idx)); // للتصحيح

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

// عند النقر أثناء اللعب
function handlePlayClick(e) {
    const cell = e.target;
    const player = parseInt(cell.dataset.player);

    if (player !== currentPlayer) {
        alert(`دور اللاعب ${currentPlayer} الآن!`);
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
    } else {
        cell.textContent = "🍬";
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
}
