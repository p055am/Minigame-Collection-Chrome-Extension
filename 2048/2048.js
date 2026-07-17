const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const rows = 4;
const columns = 4;

const tileHeight = canvas.height / rows;
const tileWidth = canvas.width / columns;

class TileColourScheme {
    constructor(tileColour, textColour) {
        this.tileColour = tileColour;
        this.textColour = textColour;
    }
}


// Grid is initialised with 0s, gameOver is initially false
let grid = Array(rows).fill().map(() => Array(columns).fill(0));
let gameOver = false;


/**
 * Processes moving a line to the left, merging any equal and adjacent tiles.
 * The line will be padded with 0s to ensure the result is the same length as the input.
 * @param {number[]} line The line to be moved
 * @param {boolean} reverse If true, processes moving the line to the right. Default false.
 * @returns The processed line
 */
function processLine(line, reverse = false) {
    // Remove 0s
    let newLine = line.filter(value => value != 0);

    // To process from right to left, reverse list at start and end.
    if (reverse) {
        newLine.reverse();
    }

    let result = [];

    // Merge values if they are the same as the next in line
    for (let i = 0; i < newLine.length; i++) {

        if (i < newLine.length - 1 && newLine[i] === newLine[i + 1]) {
            result.push(newLine[i] * 2);
            i++; // Skip the merged tile
        } else {
            result.push(newLine[i]);
        }
    }

    // Re-add 0s until length equals the old line length.
    while (result.length < line.length) {
        result.push(0);
    }

    if (reverse) {
        result.reverse();
    }

    return result;
}


function moveUp() {
    let gridChanged = false;
    for (let x = 0; x < columns; x++) {

        // Extract each column and process it.
        let oldColumn = [];
        for (let y = 0; y < rows; y++) {
            oldColumn.push(grid[y][x]);
        }

        const newColumn = processLine(oldColumn, false);

        if (!oldColumn.every((val, index) => val === newColumn[index])) {
            gridChanged = true;
        }

        for (let y = 0; y < rows; y++) {
            grid[y][x] = newColumn[y];
        }
    }
    return gridChanged;
}

function moveDown() {
    let gridChanged = false;
    for (let x = 0; x < columns; x++) {

        // Extract each column and process it.
        let oldColumn = [];
        for (let y = 0; y < rows; y++) {
            oldColumn.push(grid[y][x]);
        }

        const newColumn = processLine(oldColumn, true);

        if (!oldColumn.every((val, index) => val === newColumn[index])) {
            gridChanged = true;
        }

        for (let y = 0; y < rows; y++) {
            grid[y][x] = newColumn[y];
        }
    }
    return gridChanged;
}

function moveLeft() {
    let gridChanged = false;
    for (let y = 0; y < rows; y++) {
        const oldLine = [...grid[y]]
        const newLine = processLine(oldLine, false);

        if (!oldLine.every((val, index) => val === newLine[index])) {
            gridChanged = true;
        }

        grid[y] = newLine;
    }
    return gridChanged;
}

function moveRight() {
    let gridChanged = false;
    for (let y = 0; y < rows; y++) {
        const oldLine = [...grid[y]]
        const newLine = processLine(oldLine, true);

        if (!oldLine.every((val, index) => val === newLine[index])) {
            gridChanged = true;
        }

        grid[y] = newLine;
    }
    return gridChanged;
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
        let newTile = 2;
        if (Math.random() > 0.9) {
            newTile = 4;
        }
        grid[newY][newX] = newTile;
    }
}

function getEmptyTiles() {
    let emptyTiles = [];
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            if (grid[y][x] == 0) {
                emptyTiles.push([x, y]);
            }
        }
    }
    return emptyTiles;
}

document.addEventListener("keydown", e => {

    if (e.key === "ArrowUp") {
        if (moveUp()) {
            spawnTile()
        };
        draw();
    }

    if (e.key === "ArrowDown") {
        if (moveDown()) {
            spawnTile();
        };
        draw();
    }

    if (e.key === "ArrowLeft") {
        if (moveLeft()) {
            spawnTile();
        };
        draw();
    }

    if (e.key === "ArrowRight") {
        if (moveRight()) {
            spawnTile();
        };
        draw();
    }
});

function draw() {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);


    function draw_tile(colourScheme, text, x, y) {
        // Draws the tile background
        ctx.fillStyle = colourScheme.tileColour;
        ctx.fillRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight);

        // Draws a border around the tile
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(x * tileWidth, y * tileHeight, tileWidth, tileHeight)

        // Draws the text
        ctx.fillStyle = colourScheme.textColour;
        ctx.textAlign = "center"; // Horizontally center
        ctx.textBaseline = 'middle'; // Vertically center
        ctx.font = "30px Arial"; // TODO make the font size adjust to the tile size (Needed for larger numbers)
        ctx.fillText(text, ((x + 0.5) * tileWidth), ((y + 0.5) * tileHeight)); // + 0.5 puts the text in the tile center
    }

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            let tile = grid[y][x]
            if (tile == 0) {
                continue;
            }
            let colourScheme = getTileColourScheme(tile);

            draw_tile(colourScheme, tile, x, y);
        }
    }
}

/**
 * Returns the colour scheme for a tile based on its number
 * @param {number} number The tile number
 * @returns A TileColourScheme object.
 */
function getTileColourScheme(tile) {
    if (tile <= 2) {
        return new TileColourScheme("#f0ede9", "#756452");
    } else if (tile <= 4) {
        return new TileColourScheme("#ebd7b5", "#756452");
    } else if (tile <= 8) {
        return new TileColourScheme("#f2af74", "white");
    } else if (tile <= 16) {
        return new TileColourScheme("#f5915b", "white");
    } else if (tile <= 32) {
        return new TileColourScheme("#f57656", "white");
    } else if (tile <= 64) {
        return new TileColourScheme("#f55936", "white");
    } else if (tile <= 256) {
        return new TileColourScheme("#f2ce54", "white");
    } else if (tile <= 1024) {
        return new TileColourScheme("#ffbb00", "white");
    } else {
        return new TileColourScheme("black", "white");
    }
}

spawnTile();
spawnTile();
draw()
