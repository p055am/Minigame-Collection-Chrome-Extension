const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [
    { x: 10, y: 10 }
];

let dx = 1;
let dy = 0;

let food = {
    x: 5,
    y: 5
};

let score = 0;

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

        spawnFood();

    } else {
        snake.pop();
    }

    checkCollisions();

    draw();
}

function spawnFood() {

    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
}

function checkCollisions() {

    const head = snake[0];

    if (
        head.x < 0 ||
        head.y < 0 ||
        head.x >= tileCount ||
        head.y >= tileCount
    ) {
        resetGame();
    }

    for (let i = 1; i < snake.length; i++) {

        if (
            head.x === snake[i].x &&
            head.y === snake[i].y
        ) {
            resetGame();
        }
    }
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

function resetGame() {

    snake = [
        { x: 10, y: 10 }
    ];

    dx = 1;
    dy = 0;

    score = 0;

    document.getElementById("score").textContent = score;

    spawnFood();
}

setInterval(update, 100);