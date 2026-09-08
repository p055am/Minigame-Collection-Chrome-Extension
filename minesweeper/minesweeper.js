const canvas = document.getElementById("game");
const statusMessage = document.getElementById("status-message");
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

canvas.addEventListener("mousedown", handleMouseDown);
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

const TileState = {
    HIDDEN: 0,
    REVEALED: 1,
    FLAGGED: 2,
    QUESTION: 3
};

const GameState = {
    PLAYING: 0,
    VICTORY: 1,
    DEFEAT: 2
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

class Game {
    /**
     * Creates a game object
     * @param {number} rows The rows in the grid
     * @param {number} columns The columns in the grid
     * @param {number} mineRatio The proportion of tiles that are mines. Should be between 0 and 1
     */
    constructor(rows, columns, mineRatio) {
        this.rows = rows;
        this.columns = columns;
        this.mineRatio = mineRatio;
        
        this.totalMines = Math.ceil(rows * columns * mineRatio);
        this.tileHeight = canvas.height / rows;
        this.tileWidth = canvas.height / columns;

        // Initialise stuff for javascript typing. This will be reset by resetGame
        this.grid = [[new Tile(0, TileState.HIDDEN, 0, 0, false)]];
        this.minesRemaining = this.totalMines;
        this.nonMinesRemaining = rows * columns - this.totalMines;
        this.gameState = GameState.PLAYING;
    }
}


let game = new Game(8, 8, 0.2);

resetGame();

chrome.storage.local.get(
    ["minesweeper_game"],
    (result) => {

        if (result.minesweeper_game) {
            game = result.minesweeper_game;
            draw();
        }
        else {
            resetGame();
        }

    }
);

function saveGame() {
    chrome.storage.local.set({
        minesweeper_game: game
    });
}

function createGrid() {
    // Initialise the grid with all non-mines
    game.grid = Array.from({ length: game.rows }, (_, y) =>
        Array.from({ length: game.columns }, (_, x) =>
            new Tile(0, TileState.HIDDEN, x, y, false)
        )
    );

    // Populate tiles with mines
    // TODO make this more efficient, maybe add some error checking.
    let mines = 0;
    while (mines < game.totalMines) {
        let newMineRow = Math.floor(Math.random() * game.rows);
        let newMineColumn = Math.floor(Math.random() * game.columns);
        if (!game.grid[newMineRow][newMineColumn].isMine) {
            game.grid[newMineRow][newMineColumn].isMine = true;
            mines++;
        }
    }

    // Count Surrounding Mines for each tile
    for (let y = 0; y < game.rows; y++) {
        for (let x = 0; x < game.columns; x++) {
            game.grid[y][x].surroundingMines = countSurroundingMines(x, y);
        }
    }
}

function countSurroundingMines(x, y) {
    let surroundingMines = 0;

    const surroundingTileCoordinates = getSurroundingTileCoords(x, y);

    for (const [xCoord, yCoord] of surroundingTileCoordinates) {
        if (game.grid[yCoord][xCoord].isMine) {
            surroundingMines++;
        }
    }

    return surroundingMines;
}

/**
 * Gets the coordinates of all in-bounds tiles surrounding the given tile
 * @param {number} x The center tile's x coordinate
 * @param {number} y The center tile's y coordinate
 * @returns {[[number, number]]} An array containing [x, y] coordinates of
 *                               all valid surrounding tiles
 */
function getSurroundingTileCoords(x, y) {
    let adjacentCoordinates = [
        [x - 1, y - 1], [x, y - 1], [x + 1, y - 1],
        [x - 1, y], [x + 1, y],
        [x - 1, y + 1], [x, y + 1], [x + 1, y + 1],
    ]

    // Filter out of bounds coordinates
    return adjacentCoordinates.filter(([xCoord, yCoord]) =>
        coordsInBounds(xCoord, yCoord)
    );
}

function coordsInBounds(x, y) {
    return x >= 0 && x < game.columns && y >= 0 && y < game.rows;
}


function handleMouseDown(event) {
    if (game.gameState != GameState.PLAYING) {
        return;
    }

    const [tileX, tileY] = getTileCoordinates(event);
    if (!coordsInBounds(tileX, tileY)) {
        return;
    }

    const tile = game.grid[tileY][tileX];

    if (event.button === 0) {
        // Left Click
        if (tile.state == TileState.HIDDEN || tile.state == TileState.QUESTION) {
            revealTile(tile);
        } else if (tile.state == TileState.REVEALED) {
            chordTile(tile);
        }
    }

    if (event.button === 2) {
        // Right Click
        if (tile.state == TileState.HIDDEN) {
            tile.state = TileState.FLAGGED;
            game.minesRemaining--;
        } else if (tile.state == TileState.FLAGGED) {
            tile.state = TileState.QUESTION;
            game.minesRemaining++;
        } else if (tile.state == TileState.QUESTION) {
            tile.state = TileState.HIDDEN;
        }
    }

    saveGame();
    draw();
}

/**
 * Reveals a tile, recursing to surrounding tiles if the tile is a zero.
 * Will not do anything to Flagged or already revealed tiles.
 * @param {Tile} tile The tile being revealed
 */
function revealTile(tile) {
    if (tile.state == TileState.FLAGGED || tile.state == TileState.REVEALED) {
        return;
    }

    tile.state = TileState.REVEALED;

    if (tile.isMine) {
        game.gameState = GameState.DEFEAT;
        return;
    } else {
        game.nonMinesRemaining--;
    }

    // Automatically reveal all mines surrounding a zero
    if (tile.surroundingMines == 0) {
        const surroundingTileCoords = getSurroundingTileCoords(tile.x, tile.y);

        for (const [x, y] of surroundingTileCoords) {
            const adjTile = game.grid[y][x];
            // Flagging gets overwritten by guarranteed safety
            if (adjTile.state == TileState.FLAGGED) {
                adjTile.state = TileState.HIDDEN;
            }
            // This can be called multiple times on the same tile, but after the first
            // time being called it will immediately exit so no infinite recursion
            revealTile(adjTile);
        }
    }

    if (game.nonMinesRemaining == 0) {
        game.gameState = GameState.VICTORY;
        // TODO flag all of the mines
    }
}

/**
 * If the given tile is revealed and surrounding by the same number
 * of flags as mines around it, attempt to reveal all surrounding tiles.
 * @param {Tile} tile The tile being chorded
 */
function chordTile(tile) {
    // Chording can only be done on revealed tiles
    if (tile.state != TileState.REVEALED) {
        return;
    }

    const surroundingTileCoords = getSurroundingTileCoords(tile.x, tile.y);

    let surroundingFlags = 0;
    for (const [x, y] of surroundingTileCoords) {
        if (game.grid[y][x].state == TileState.FLAGGED) {
            surroundingFlags++;
        }
    }

    if (surroundingFlags == tile.surroundingMines) {
        for (const [x, y] of surroundingTileCoords) {
            // The flags will just get ignored
            revealTile(game.grid[y][x]);
        }
    }
}

/**
 * Gets which tile the mouse is over during a mouse event
 * @param {MouseEvent} event A mouse event
 * @returns {[number, number]} The x and y coordinates of the clicked tile
 */
function getTileCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const tileX = Math.floor(mouseX / game.tileWidth);
    const tileY = Math.floor(mouseY / game.tileHeight);

    return [tileX, tileY];
}



function draw() {
    const tileWidth = game.tileWidth;
    const tileHeight = game.tileHeight;

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
        for (let y = 0; y < game.rows; y++) {
            for (let x = 0; x < game.columns; x++) {
                let tile = game.grid[y][x]
                let text = "";
                if (tile.state == TileState.FLAGGED) {
                    text = "F";
                } else if (tile.state == TileState.QUESTION) {
                    text = "?";
                } else if (tile.state == TileState.REVEALED) {
                    text = tile.isMine ? "M" : tile.surroundingMines;
                }
                drawTileAtGridCoordinates(text, x, y);
            }
        }
    }

    if (game.gameState == GameState.PLAYING) {
        statusMessage.textContent = `Mines Remaining: ${game.minesRemaining}`;
    } else if (game.gameState == GameState.DEFEAT) {
        statusMessage.textContent = `Failure...`;
    } else if (game.gameState == GameState.VICTORY) {
        statusMessage.textContent = `Victory!`;
    }


    drawBackground();
    drawTiles();
}


function resetGame() {
    createGrid();
    game.gameState = GameState.PLAYING;
    game.minesRemaining = game.totalMines;
    game.nonMinesRemaining = game.rows * game.columns - game.totalMines;
    draw();
}

function printGrid() {
    console.table(
        game.grid.map(row => row.map(tile => tile.isMine ? "M" : tile.surroundingMines))
    );
}