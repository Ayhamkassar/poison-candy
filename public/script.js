// ------------------- متغيرات -------------------
let playerNumber = null;
let currentPlayer = 1;
let lives = {1:3,2:3};
let playerDangerSelections = {1: [],2: []};
let selectedDone = {1:false,2:false};

const grid1 = document.getElementById("grid1");
const grid2 = document.getElementById("grid2");
const readyBtn1 = document.getElementById("readyBtn1");
const readyBtn2 = document.getElementById("readyBtn2");

const socket = io();
socket.emit("joinRoom","room1");

// ------------------- الانضمام -------------------
socket.on("playerNumber", num => {
    playerNumber = num;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: متصل`;
});

// ------------------- Ready -------------------
readyBtn1.addEventListener("click", ()=>handleReady(1));
readyBtn2.addEventListener("click", ()=>handleReady(2));

function handleReady(num){
    if(playerNumber !== num) return;
    (num===1?readyBtn1:readyBtn2).disabled = true;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: جاهز`;
    socket.emit("playerReady",{roomId:"room1",player:num});
}

socket.on("updateReady", (num)=>{
    (num===1?readyBtn1:readyBtn2).disabled = true;
    document.getElementById(`player${num}Status`).textContent = `اللاعب ${num}: جاهز`;
});

// ------------------- اختيار مربعات -------------------
socket.on("startPlayer1Setup", ()=> {
    if(playerNumber===1){
        alert("اختر 3 مربعات خطرة");
        createGridForSetup(1);
    } else alert("بانتظار اللاعب الأول لاختيار مربعاته...");
});

socket.on("startPlayer2Setup", ()=> {
    if(playerNumber===2){
        alert("الآن دورك لاختيار 3 مربعات خطرة");
        createGridForSetup(2);
    } else alert("بانتظار اللاعب الثاني لاختيار مربعاته...");
});

function createGridForSetup(player){
    const grid = player===1?grid1:grid2;
    grid.innerHTML = "";
    let count = 0;
    for(let i=0;i<9;i++){
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index = i;
        cell.dataset.player = player;
        if(playerNumber===player) cell.addEventListener("click",e=>{
            if(selectedDone[playerNumber]) return;
            if(cell.classList.contains("danger-setup")) return;
            cell.classList.add("danger-setup");
            playerDangerSelections[playerNumber].push(i);
            count++;
            socket.emit("chooseDanger",{roomId:"room1",player:playerNumber,index:i});
            if(count===3){
                selectedDone[playerNumber]=true;
                socket.emit("playerFinishedSelection",{roomId:"room1",player:playerNumber});
                alert("اخترت 3 مربعات! بانتظار اللاعب الآخر...");
            }
        });
        grid.appendChild(cell);
    }
}

// ------------------- بدء اللعبة -------------------
socket.on("startGame",(dangers)=>{
    createGrid(1,dangers[1]);
    createGrid(2,dangers[2]);
});

// ------------------- اللعب -------------------
function createGrid(player,dangers){
    const grid = player===1?grid1:grid2;
    grid.innerHTML="";
    for(let i=0;i<9;i++){
        const cell = document.createElement("div");
        cell.classList.add("cell");
        cell.dataset.index=i;
        cell.dataset.player=player;
        cell.addEventListener("click", handlePlayClick);
        grid.appendChild(cell);
    }
    renderHearts(1);
    renderHearts(2);
}

function handlePlayClick(e){
    const cell = e.target;
    const player = parseInt(cell.dataset.player);
    if(player!==currentPlayer){ alert(`دور اللاعب ${currentPlayer}`); return; }
    if(cell.classList.contains("clicked")) return;

    const isDanger = playerDangerSelections[player].includes(parseInt(cell.dataset.index));
    cell.classList.add("clicked");
    if(isDanger){
        cell.classList.add("danger");
        lives[player]--;
        renderHearts(player);
        if(lives[player]===0){ alert(`انتهت اللعبة! اللاعب ${player} خسر.`); revealAll(player); return; }
    } else cell.textContent="🍬";

    socket.emit("cellClicked",{roomId:"room1",player,index:parseInt(cell.dataset.index),isDanger});
}

// ------------------- استقبال التحديثات -------------------
socket.on("updateCell",(data)=>{
    const grid = data.player===1?grid1:grid2;
    const cell = grid.children[data.index];
    cell.classList.add("clicked");
    if(data.isDanger) cell.classList.add("danger");
    else cell.textContent="🍬";
});

socket.on("updateTurn",(player)=>{ currentPlayer=player; });

// ------------------- القلوب -------------------
function renderHearts(player){
    document.getElementById(`hearts${player}`).innerHTML="❤️".repeat(lives[player]);
}

function revealAll(player){
    const grid = player===1?grid1:grid2;
    const dangers = playerDangerSelections[player];
    grid.childNodes.forEach((cell,idx)=>{
        if(dangers.includes(idx)) cell.classList.add("danger");
        else if(!cell.textContent) cell.textContent="🍬";
    });
}
