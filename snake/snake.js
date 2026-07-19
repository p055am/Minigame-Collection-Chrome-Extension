const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

document.getElementById("start-game").onclick = () => {
    startGame();
};

document.getElementById("reset-game").onclick = () => {
    resetGame();
};

document.getElementById("menu-button").addEventListener("click", () => {
    window.location.href = "../menu/menu.html";
});

const gridSize = 20;
const tileCount = canvas.width / gridSize;

const GameState = {
    READY: 0,
    PLAYING: 1,
    GAME_OVER: 2
};

const Direction = {
    NONE: 0,
    UP: 1,
    RIGHT: 2,
    DOWN: 3,
    LEFT: 4
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


let currentDirection = Direction.RIGHT;
let currentInput = Direction.NONE;
let bufferInput = Direction.NONE;

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

    if (e.key === "ArrowUp") {
        handleInput(Direction.UP);
    }

    if (e.key === "ArrowDown") {
        handleInput(Direction.DOWN);
    }

    if (e.key === "ArrowLeft") {
        handleInput(Direction.LEFT);
    }

    if (e.key === "ArrowRight") {
        handleInput(Direction.RIGHT);
    }
});

/**
 * Determines whether the snake can move from direction 'from' to direction 'to'.
 * The snake can only move from vertical to horizontal or horizontal to vertical.
 * If either from or to are Direction.None, returns false.
 * @param {Direction} from The starting direction
 * @param {Direction} to The direction attempting to be moved to
 * @returns Whether the snake can change direction
 */
function canTurn(from, to) {
    if (from == Direction.NONE || to == Direction.NONE) {
        return false;
    }

    if (from == Direction.UP || from == Direction.DOWN) {
        // Moving vertically, can only change to horizontal
        return to == Direction.LEFT || to == Direction.RIGHT;
    } else {
        // Moving horizontally, can only change to vertical
        return to == Direction.UP || to == Direction.DOWN;
    }
}

/**
 * Handles a directional input (up, down, left right) by storing it to currentInput or bufferInput.
 * The buffer will be filled if currentInput is already full (i.e. an input has already been made this move)
 * Inputs can only be made if they change direction. E.g. if moving right, only up or down inputs will work.
 * Buffered inputs occur after the current input, so can only be made if they change direction again.
 * @param {Direction} input The input being handled
 */
function handleInput(input) {
    if (input == Direction.NONE) {
        return;
    }

    if (currentInput == Direction.NONE) {
        // No input recieved this turn.
        if (canTurn(currentDirection, input)) {
            currentInput = input;
        }
    } else if (bufferInput != Direction.NONE) {
        // The buffer should be under the same 'must change directions' rule as the current input,
        // but since the current input will change the direction, it will be checked against that.
        if (canTurn(currentInput, input)) {
            bufferInput = input;
        }
    }
    // If here, buffer is full
}


function processInput() {
    if (currentInput == Direction.NONE) {
        return;
    }

    currentDirection = currentInput;
    if (bufferInput != Direction.NONE) {
        currentInput = bufferInput;
        bufferInput = Direction.NONE;
    } else {
        currentInput = Direction.NONE;
    }
}

/**
 * Gets the dx and dy for the given direction.
 * @param {Direction} direction The direction whose velocity is being found. Defaults to currentDirection
 * @returns The velocity of the direction, in format [dx, dy]
 */
function getVelocity(direction = currentDirection) {
    let dx = 0;
    let dy = 0;
    if (direction == Direction.UP) {
        dy = -1;
    } else if (direction == Direction.DOWN) {
        dy = 1
    } else if (direction == Direction.LEFT) {
        dx = -1
    } else if (direction == Direction.RIGHT) {
        dx = 1
    }
    return [dx, dy];
}

function update() {

    // This will update currentDirection based on any inputs or buffered inputs.
    processInput();

    const velocity = getVelocity(currentDirection);
    const dx = velocity[0];
    const dy = velocity[1];

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