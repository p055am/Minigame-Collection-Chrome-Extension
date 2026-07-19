const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

document.getElementById("start-game").onclick = () => {
    startGame();
};

document.getElementById("reset-game").onclick = () => {
    resetGame();
};

const gridSize = 20;
const tileCount = canvas.width / gridSize;

const GameState = {
    READY: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

let state = GameState.READY;

let snake = [
    { x: 4, y: 8 },
    { x: 3, y: 8 },
    { x: 2, y: 8 }
];

let food = {
    x: 10,
    y: 8
};

let dx = 1;
let dy = 0;

let score = 0;
let highScore = 0;

resetGame();

chrome.storage.local.get(
    ["snake_highScore"],
    (result) => {
        highScore = result.snake_highScore || 0;

        document.getElementById("high-score").textContent = highScore;
    }
);


document.addEventListener("keydown", e => {

    if (e.key === "ArrowUp" && dy === 0) {
        dx = 0;
        dy = -1;

    }

    if (e.key === "ArrowDown" && dy === 0) {
        dx = 0;
        dy = 1;
    }

    if (e.key === "ArrowLeft" && dx === 0) {
        dx = -1;
        dy = 0;
    }

    if (e.key === "ArrowRight" && dx === 0) {
        dx = 1;
        dy = 0;
    }
});

function update() {

    const head = {
        x: snake[0].x + dx,
        y: snake[0].y + dy
    };

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {

        score++;
        document.getElementById("score").textContent = score;

        if (score > highScore) {
            highScore = score;

            document.getElementById("high-score").textContent = highScore;

            chrome.storage.local.set({
                snake_highScore: highScore
            });
        }

        spawnFood();

    } else {
        snake.pop();
    }

    // If we draw after a collision it will include clipping or part of the snake OOB
    if (!checkCollisions()) {
        draw();
    };


}

function spawnFood(x = Math.floor(Math.random() * tileCount), y = Math.floor(Math.random() * tileCount)) {
    food.x = x;
    food.y = y;
}

/**
 * Checks if any collisions have occured.
 * If a collision has occurred, sets gameState to Game Over.
 * @returns true if a collision has occured. False otherwise.
 */
function checkCollisions() {

    const head = snake[0];

    if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= tileCount ||
        head.y >= tileCount
    ) {
        state = GameState.GAME_OVER;
        return true;
    }

    for (let i = 1; i < snake.length; i++) {

        if (
            head.x === snake[i].x &&
            head.y === snake[i].y
        ) {
            state = GameState.GAME_OVER;
            return true;
        }
    }
    return false;
}

function draw() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "red";
    ctx.fillRect(
        food.x * gridSize,
        food.y * gridSize,
        gridSize,
        gridSize
    );

    ctx.fillStyle = "green";

    snake.forEach(segment => {

        ctx.fillRect(
            segment.x * gridSize,
            segment.y * gridSize,
            gridSize,
            gridSize
        );
    });
}

function startGame() {
    if (state == GameState.READY) {
        state = GameState.PLAYING;
        document.getElementById("start-game").disabled = true;
    }
}

function resetGame() {

    snake = [
        { x: 4, y: 8 },
        { x: 3, y: 8 },
        { x: 2, y: 8 }
    ];

    dx = 1;
    dy = 0;

    score = 0;

    document.getElementById("score").textContent = score;

    spawnFood(10, 8);

    state = GameState.READY;
    document.getElementById("start-game").disabled = false;

    draw();
}

setInterval(() => {

    if (state === GameState.PLAYING) {
        update();
    }

}, 100);