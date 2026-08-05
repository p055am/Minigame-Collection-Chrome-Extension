const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

document.getElementById("reset-game").onclick = () => {
    resetGame();
};

document.getElementById("undo-button").onclick = () => {
    if (undo()) {
        finishAnimation()
        saveGame();
        draw();
    }

};

document.getElementById("menu-button").addEventListener("click", () => {
    chrome.storage.local.set({
        active_window: "menu"
    });
    window.location.href = "../menu/menu.html";
});

// Settings for the game
const rows = 4;
const columns = 4;
const maxUndos = 64;

const tileHeight = canvas.height / rows;
const tileWidth = canvas.width / columns;

const movementAnimationMs = 50;
const spawnAnimationMs = 100;
const impactAnimationMs = 30;
const mergeAnimationMs = 40;


class Tile {
    constructor(value, x, y, animating) {
        this.value = value;
        this.x = x;
        this.y = y;
        this.animating = animating;
    }
}

class MovementAnimation {
    constructor(value, startX, startY, endX, endY, merging) {
        this.value = value;

        this.startX = startX;
        this.startY = startY;

        this.endX = endX;
        this.endY = endY;

        this.merging = merging;
    }
}

class MergeAnimation {
    constructor(value, x, y) {
        this.value = value;
        this.x = x;
        this.y = y;
    }
}

class SpawnAnimation {
    constructor(value, x, y) {
        this.value = value;
        this.x = x;
        this.y = y;
    }
}


// Grid is initialised with 0s, gameOver is initially false
let grid = [[new Tile(0, 0, 0, false)]];
let pastGrids = [];
let animationController = {
    movementAnimations: [],
    mergeAnimations: [],
    spawnAnimations: [],
    animationStartTime: performance.now(),
    animationTimer: 0,
    animating: false,
}

let gameOver = false;
resetGame();


chrome.storage.local.get(
    ["game2048_grid"],
    (result) => {

        if (result.game2048_grid) {
            grid = result.game2048_grid;
            finishAnimation(); // Prevents a pop-in on some tiles
            draw();
        }
        else {
            resetGame();
        }

    }
);

function deepCopyGrid(copiedGrid = grid) {
    return grid.map(row => [...row]);
}


/**
 * Processes moving a line to the left, merging any equal and adjacent tiles.
 * The line will be padded with 0s to ensure the result is the same length as the input.
 * @param {number[]} line The line to be moved
 * @param {boolean} reverse If true, processes moving the line to the right. Default false.
 * @returns whether the grid changed
 */


function processLine(lineNumber, horizontal, reverse) {
    let line = [];
    if (horizontal) {
        // Extract a row
        line = grid[lineNumber];
    } else {
        // Extract a column
        for (let y = 0; y < rows; y++) {
            line.push(grid[y][lineNumber]);
        }
    }

    // Changing format to make tiles easier to track
    let trackingLine = []
    let nextId = 0;
    for (let i = 0; i < line.length; i++) {
        const currentTile = line[i];
        trackingLine.push({ value: currentTile.value, ids: [nextId] });
        nextId++;
    }

    // Remove 0s
    let filteredLine = trackingLine.filter(tile => tile.value != 0);

    // To process from right to left / bottom to top, reverse list at start and end.
    if (reverse) {
        filteredLine.reverse();
    }

    let newLine = [];

    // Merge values if they are the same as the next in line
    for (let i = 0; i < filteredLine.length; i++) {

        if (i < filteredLine.length - 1 && filteredLine[i].value === filteredLine[i + 1].value) {
            // Merged values store both of the ids that created them.
            newLine.push({ value: filteredLine[i].value * 2, ids: [filteredLine[i].ids[0], filteredLine[i + 1].ids[0]] });
            i++; // Skip the merged tile
        } else {
            newLine.push({ value: filteredLine[i].value, ids: filteredLine[i].ids });
        }
    }

    // Re-add 0s until length equals the old line length.
    while (newLine.length < line.length) {
        newLine.push({ value: 0, ids: [] });
    }

    if (reverse) {
        newLine.reverse();
    }


    // Update grid state. Any changes between old and new lines will create animations
    let lineChanged = false;
    for (let newIndex = 0; newIndex < newLine.length; newIndex++) {
        const currentTile = newLine[newIndex];
        let animate = false;
        if (currentTile.ids.length == 1) {
            // A non-merged, non empty tile. Check if the position has changed.
            const oldIndex = trackingLine.findIndex(tile => tile.ids[0] === currentTile.ids[0]);

            if (oldIndex != newIndex) {
                // The tile has moved, so make an animation object
                lineChanged = true;
                animate = true;
                if (horizontal) {
                    animationController.movementAnimations.push(new MovementAnimation(
                        currentTile.value, oldIndex, lineNumber, newIndex, lineNumber, false));
                } else {
                    animationController.movementAnimations.push(new MovementAnimation(
                        currentTile.value, lineNumber, oldIndex, lineNumber, newIndex, false));
                }
            }
        } else if (currentTile.ids.length == 2) {
            // A merged tile. Make animation objects.
            lineChanged = true;
            animate = true;
            const oldIndex1 = trackingLine.findIndex(tile => tile.ids[0] === currentTile.ids[0]);
            const oldIndex2 = trackingLine.findIndex(tile => tile.ids[0] === currentTile.ids[1]);

            // The oldIndex and newIndex might be the same for one of the tiles but it shouldn't matter
            // since the tiles are merging anyway so there won't be an impact animation.
            if (horizontal) {
                animationController.movementAnimations.push(new MovementAnimation(
                    currentTile.value / 2, oldIndex1, lineNumber, newIndex, lineNumber, true));
                animationController.movementAnimations.push(new MovementAnimation(
                    currentTile.value / 2, oldIndex2, lineNumber, newIndex, lineNumber, true));
                animationController.mergeAnimations.push(new MergeAnimation(
                    currentTile.value, newIndex, lineNumber));
            } else {
                animationController.movementAnimations.push(new MovementAnimation(
                    currentTile.value / 2, lineNumber, oldIndex1, lineNumber, newIndex, true));
                animationController.movementAnimations.push(new MovementAnimation(
                    currentTile.value / 2, lineNumber, oldIndex2, lineNumber, newIndex, true));
                animationController.mergeAnimations.push(new MergeAnimation(
                    currentTile.value, lineNumber, newIndex));
            }
        }

        // Update the grid
        if (horizontal) {
            grid[lineNumber][newIndex] = new Tile(currentTile.value, newIndex, lineNumber, animate);
        } else {
            grid[newIndex][lineNumber] = new Tile(currentTile.value, lineNumber, newIndex, animate);
        }
    }

    return lineChanged;
}

function undo() {
    if (pastGrids.length == 0) {
        return false;
    }

    grid = pastGrids.pop();
    return true;
}

function savePastGrid(newGrid) {
    if (pastGrids.length >= maxUndos) {
        pastGrids.shift();
    }
    pastGrids.push(newGrid);
}

function moveGrid(horizontal, reverse) {
    const gridCopy = deepCopyGrid(grid);
    let gridChanged = false;
    let iterationDimension = horizontal ? rows : columns;
    for (let i = 0; i < iterationDimension; i++) {

        if (processLine(i, horizontal, reverse)) {
            gridChanged = true;
        }
    }

    if (gridChanged) {
        savePastGrid(gridCopy);
    }
    return gridChanged;
}


function moveUp() {
    finishAnimation();
    if (moveGrid(false, false)) {
        successfulMovement();
    }
}

function moveDown() {
    finishAnimation();
    if (moveGrid(false, true)) {
        successfulMovement();
    }
}

function moveLeft() {
    finishAnimation();
    if (moveGrid(true, false)) {
        successfulMovement();
    }
}

function moveRight() {
    finishAnimation();
    if (moveGrid(true, true)) {
        successfulMovement();
    }
}

function successfulMovement() {
    spawnTile();
    saveGame();
    beginAnimation();
}

function spawnTile() {
    let emptyTiles = getEmptyTiles();
    if (emptyTiles.length == 0) {
        gameOver = true;
    } else {
        // Selects a random new Tile from the list of all empty tiles
        let newTileCoordinates = emptyTiles[Math.floor(Math.random() * emptyTiles.length)];
        let newX = newTileCoordinates[0];
        let newY = newTileCoordinates[1];
        // 1/10 for a 4, 9/10 for a 2.
        let newValue = 2;
        if (Math.random() > 0.9) {
            newValue = 4;
        }
        grid[newY][newX] = new Tile(newValue, newX, newY, true);
        animationController.spawnAnimations.push(new SpawnAnimation(newValue, newX, newY));
    }
}

function getEmptyTiles() {
    let emptyTiles = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            if (grid[y][x].value == 0) {
                emptyTiles.push([x, y]);
            }
        }
    }
    return emptyTiles;
}

function saveGame() {
    chrome.storage.local.set({
        game2048_grid: grid
    });
}

document.addEventListener("keydown", e => {

    if (e.key === "ArrowUp") {
        moveUp();
    }

    if (e.key === "ArrowDown") {
        moveDown();
    }

    if (e.key === "ArrowLeft") {
        moveLeft();
    }

    if (e.key === "ArrowRight") {
        moveRight();
    }
});

function draw() { 

    function drawBackground() {
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    /**
     * Wrapper function for drawTile using coordinates on the grid rather than canvas,
     * and automatically getting the tile colour scheme.
     * I.e. top left tile is (0,0), right of that is (1,0)) bottom right on a 4x4 board is (3,3)
     * This can be used for animations using fractions. 
     * E.g. Halfway through a move from (0,1) to (0,0) would be (0,0.5)
     */
    function drawTileAtGridCoordinates(value, tileX, tileY, scale = 1) {
        const colourScheme = getTileColourScheme(value);

        drawTile(colourScheme, value, tileX * tileWidth, tileY * tileWidth, scale);
    }


    function drawTile(colourScheme, text, topLeftX, topLeftY, scale = 1) {
        // Draws the tile background

        const centreX = topLeftX + tileWidth / 2;
        const centreY = topLeftY + tileHeight / 2;

        ctx.save();

        ctx.translate(centreX, centreY);
        ctx.scale(scale * 0.9, scale * 0.9); // 1.0 scale doesn't look very good with animations

        ctx.fillStyle = colourScheme.tileColour;
        ctx.fillRect(-tileWidth / 2, - tileHeight / 2, tileWidth, tileHeight);

        // Draws a border around the tile
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(-tileWidth / 2, - tileHeight / 2, tileWidth, tileHeight);

        // Draws the text
        ctx.fillStyle = colourScheme.textColour;
        ctx.textAlign = "center"; // Horizontally center
        ctx.textBaseline = 'middle'; // Vertically center
        const fontSize = getFontSize(text);
        ctx.font = `${fontSize}px Arial`;
        ctx.fillText(text, 0, 0);

        ctx.restore();
    }

    function getFontSize(text) {

        // Maximum. Math.min is to handle anything weird with non-square tiles
        let fontSize = Math.min(tileHeight, tileWidth) * 0.4;

        while (fontSize > 10) {

            ctx.font = `${fontSize}px Arial`;

            const width = ctx.measureText(text).width;

            if (width <= tileWidth * 0.8) {
                return fontSize;
            }

            fontSize--;
        }

        return 10; // Minimum
    }

    function drawSpawningTiles() {
        if (!animationController.animating) {
            return;
        }

        // Progress will go from 0 to 1 during the spawn animation
        const progress = Math.min(animationController.animationTimer / spawnAnimationMs, 1);

        // Function that goes to ~ 1.1 at 0.56 progress, then back down to 1 at 1 progress.
        const scale = 1 + 2.7 * Math.pow(progress - 1, 3) + 1.7 * Math.pow(progress - 1, 2);

        for (const animation of animationController.spawnAnimations) {
            drawTileAtGridCoordinates(animation.value, animation.x, animation.y, scale);
        }
    }

    function drawMovingTiles() {
        if (!animationController.animating) {
            return;
        }
        

        // Progress will go from 0 to 1 during the spawn animation
        const progress = Math.min(animationController.animationTimer / movementAnimationMs, 1);
        
        for (const animation of animationController.movementAnimations) {

            if (animationController.animationTimer > movementAnimationMs && animation.merging) {
                // The merge animation should have started playing.
                continue;
            }

            const x = animation.startX + progress * (animation.endX - animation.startX);
            const y = animation.startY + progress * (animation.endY - animation.startY);
            drawTileAtGridCoordinates(animation.value, x, y);
        }
    }

    function drawMergingTiles() {
        if (!animationController.animating || animationController.animationTimer < movementAnimationMs) {
            return;
        }
        

        // Progress will go from 0 to 1 during the spawn animation
        const progress = Math.min((animationController.animationTimer - movementAnimationMs) / mergeAnimationMs, 1);

        // Scaler will go from 1 to 1.2 back to 1.
        const scale = 1 + 0.2 * Math.sin(progress * Math.PI);
        
        for (const animation of animationController.mergeAnimations) {
            drawTileAtGridCoordinates(animation.value, animation.x, animation.y, scale);
        }
    }

    function drawStaticTiles() {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                let tile = grid[y][x]
                if (tile.value == 0 || tile.animating) {
                    continue;
                }
                drawTileAtGridCoordinates(tile.value, x, y);
            }
        }
    }

    drawBackground();
    if (animationController.animating) {
        drawMovingTiles();
        drawSpawningTiles();
        drawMergingTiles();
    }
    drawStaticTiles();
    
}

/**
 * Returns the colour scheme for a tile based on its number
 * @param {number} number The tile number
 * @returns The colour scheme in the format { tileColour, textColour }
 */
function getTileColourScheme(value) {
    let tileColour = "black";
    let textColour = "white";
    if (value <= 2) {
        tileColour = "#f0ede9";
        textColour = "#756452";
    } else if (value <= 4) {
        tileColour = "#ebd7b5";
        textColour = "#756452";
    } else if (value <= 8) {
        tileColour = "#f2af74";
        textColour = "white";
    } else if (value <= 16) {
        tileColour = "#f5915b";
        textColour = "white";
    } else if (value <= 32) {
        tileColour = "#f57656";
        textColour = "white";
    } else if (value <= 64) {
        tileColour = "#f55936";
        textColour = "white";
    } else if (value <= 256) {
        tileColour = "#f2ce54";
        textColour = "white";
    } else if (value <= 1024) {
        tileColour = "#ffbb00";
        textColour = "white";
    }

    return { tileColour, textColour };
}


function resetGame() {
    gameOver = false;
    grid = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: columns }, (_, x) =>
            new Tile(0, x, y, false)
        )
    );
    spawnTile();
    spawnTile();
    beginAnimation();
}

function finishAnimation() {
    // Removes the 'animating' tag from each tile
    for (let x = 0; x < columns; x++) {
        for (let y = 0; y < rows; y++) {
            grid[y][x].animating = false;
        }
    }
    // Clears all the animations from the animation controller
    animationController.animating = false;
    animationController.animationTimer = 0;
    animationController.mergeAnimations = [];
    animationController.movementAnimations = [];
    animationController.spawnAnimations = [];
}

function beginAnimation() {
    animationController.animating = true
    animationController.animationStartTime = performance.now();
    requestAnimationFrame(animationLoop);
}

function animationLoop(currentTime) {
    animationController.animationTimer = currentTime - animationController.animationStartTime;
    // If the animation timer is more than the longest animation, mark as finished.
    if (animationController.animationTimer > (Math.max(spawnAnimationMs,
        movementAnimationMs + mergeAnimationMs, movementAnimationMs + impactAnimationMs))) {
        finishAnimation();
    }
    draw();

    if (animationController.animating) {
        requestAnimationFrame(animationLoop);
    }
}

function printGrid() {
    console.table(
        grid.map(row => row.map(tile => tile.value))
    );
}