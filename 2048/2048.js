const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const rows = 4;
const columns = 4;

const tileHeight = canvas.height / rows;
const tileWidth = canvas.width / columns;


// Grid is initialised with 0s, gameOver is initially false
let grid = Array(rows).fill().map(() => Array(columns).fill(0));
let gameOver = false;
draw()

/**
 * Moves the tile at the given coordinates in the given direction until
 * it hits the edge, hits another tile, or merges with another tile.
 * @param {number} tileX X coordinate of the tile being moved. Should be an integer
 * @param {number} tileY Y coordinate of the tile being moved. Should be an integer
 * @param {number} directionX The number of tiles right the tile is being moved. Should be -1, 0, or 1
 * @param {number} directionY The number of tiles left the tile is being moved. Should be -1, 0, or 1
 */
function moveTile(tileX, tileY, directionX, directionY) {
    const currentTile = grid[tileY][tileX];
    if (currentTile == 0) {
        // Tile is empty, don't do anything
        return;
    }
    const nextX = tileX + directionX;
    const nextY = tileY + directionY;

    if (nextX < 0 || nextY < 0 || nextX >= columns || nextY >= rows) {
        // We have reached an edge, don't do anything
        return;
    }
    const nextTile = grid[nextY][nextX];
    if (nextTile == 0) {
        // Can move to next tile, empty current tile, and recurse
        grid[nextY][nextX] = currentTile;
        grid[tileY][tileX] = 0;
        moveTile(nextX, nextY, directionX, directionY);
    } else if (nextTile == currentTile) {
        // Can empty current tile and merge with the next
        grid[nextY][nextX] = nextTile + currentTile;
        grid[tileY][tileX] = 0;
        return;
    } else {
        // Next tile is unpassable, do nothing.
        return;
    }
}


function moveUp() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            // Left to right, top to bottom
            moveTile(x, y, 0, -1)
        }
    }
}

function moveDown() {
    for (let y = rows - 1; y >= 0; y--) {
        for (let x = 0; x < columns; x++) {
            // Left to right, bottom to top
            moveTile(x, y, 0, 1)
        }
    }
}

function moveLeft() {
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            // Left to right, top to bottom
            moveTile(x, y, -1, 0)
        }
    }
}

function moveRight() {
    for (let y = 0; y < rows; y++) {
        for (let x = columns - 1; x >= 0; x--) {
            // Right to left, top to bottom
            moveTile(x, y, 1, 0)
        }
    }
}

function createNextTile() {
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
        moveUp();
        createNextTile();
        draw();
    }

    if (e.key === "ArrowDown") {
        moveDown();
        createNextTile();
        draw();
    }

    if (e.key === "ArrowLeft") {
        moveLeft();
        createNextTile();
        draw();
    }

    if (e.key === "ArrowRight") {
        moveRight();
        createNextTile();
        draw();
    }
});

class TileColourScheme {
    constructor(tileColour, textColour) {
        this.tileColour = tileColour;
        this.textColour = textColour;
    }
}

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