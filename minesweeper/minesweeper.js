const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

document.getElementById("reset-button").onclick = () => {
    resetGame();
};

document.getElementById("menu-button").addEventListener("click", () => {
    chrome.storage.local.set({
        active_window: "menu"
    });
    window.location.href = "../menu/menu.html";
});

// Settings for the game
const rows = 8;
const columns = 8;
const mineRatio = 0.2;
const totalMines = rows * columns * mineRatio;

const tileHeight = canvas.height / rows;
const tileWidth = canvas.width / columns;

const TileState = {
    HIDDEN: 0,
    REVEALED: 1,
    FLAGGED: 2
};

class Tile {
    /**
     * Creates a Tile object
     * @param {number} surroundingMines  tile's displayed value
     * @param {TileState} state The tile's state (hidden, revealed, flagged)
     * @param {number} x The x coordinate (Top left is 0, 0)
     * @param {number} y The y coordinate (Top left is 0, 0)
     * @param {boolean} isMine Whether the tile is a mine
     */
    constructor(surroundingMines, state, x, y, isMine) {
        this.surroundingMines = surroundingMines;
        this.state = state;
        this.x = x;
        this.y = y;
        this.isMine = isMine;
    }
}

// Grid is initialised with 0s, gameOver is initially false
let grid = [[new Tile(0, TileState.HIDDEN, 0, 0, false)]];

resetGame();

function createGrid() {
    // Initialise the grid with all non-mines
    grid = Array.from({ length: rows }, (_, y) =>
        Array.from({ length: columns }, (_, x) =>
            new Tile(0, TileState.HIDDEN, x, y, false)
        )
    );

    // Populate tiles with mines
    // TODO make this more efficient, maybe add some error checking.
    let mines = 0;
    while (mines < totalMines) {
        let newMineRow = Math.floor(Math.random() * rows);
        let newMineColumn = Math.floor(Math.random() * columns);
        if (!grid[newMineRow][newMineColumn].isMine) {
            grid[newMineRow][newMineColumn].isMine = true;
            mines++;
        }
    }

    // Count Surrounding Mines for each tile
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            grid[y][x].surroundingMines = countSurroundingMines(x, y);
        }
    }
}

function countSurroundingMines(x, y) {
    let surroundingMines = 0;

    let adjacentCoordinates = [
        [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
        [x - 1, y], [x + 1, y],
        [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
    ]

    // Filter out of bounds coordinates
    adjacentCoordinates = adjacentCoordinates.filter(([xCoord, yCoord]) =>
        coordsInBounds(xCoord, yCoord)
    );

    for (const [xCoord, yCoord] of adjacentCoordinates) {
        if (grid[yCoord][xCoord].isMine) {
            surroundingMines++;
        }
    }

    return surroundingMines;
}

function coordsInBounds(x, y) {
    return x >= 0 && x < columns && y >= 0 && y < rows;
}



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
        drawTile(value, tileX * tileWidth, tileY * tileWidth, scale);
    }


    function drawTile(text, topLeftX, topLeftY, scale = 1) {
        // Draws the tile background

        const centreX = topLeftX + tileWidth / 2;
        const centreY = topLeftY + tileHeight / 2;

        ctx.save();

        ctx.translate(centreX, centreY);
        ctx.scale(scale * 0.9, scale * 0.9); // 1.0 scale doesn't look very good with animations

        ctx.fillStyle = "grey";
        ctx.fillRect(-tileWidth / 2, - tileHeight / 2, tileWidth, tileHeight);

        // Draws a border around the tile
        ctx.strokeStyle = "black";
        ctx.lineWidth = 2;
        ctx.strokeRect(-tileWidth / 2, - tileHeight / 2, tileWidth, tileHeight);

        // Draws the text
        ctx.fillStyle = "black"
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

        while (fontSize > 5) {

            ctx.font = `${fontSize}px Arial`;

            const width = ctx.measureText(text).width;

            if (width <= tileWidth * 0.8) {
                return fontSize;
            }

            fontSize--;
        }

        return 5; // Minimum
    }

    function drawTiles() {
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < columns; x++) {
                let tile = grid[y][x]
                let text = "";
                if (tile.state == TileState.FLAGGED) {
                    text = "F";
                } else if (tile.state == TileState.REVEALED) {
                    text = tile.isMine ? "M" : tile.surroundingMines;
                }
                drawTileAtGridCoordinates(text, x, y);
            }
        }
    }

    drawBackground();
    drawTiles();
    
}


function resetGame() {
    createGrid();
    draw();
}

function printGrid() {
    console.table(
        grid.map(row => row.map(tile => tile.isMine ? "M" : tile.surroundingMines))
    );
}