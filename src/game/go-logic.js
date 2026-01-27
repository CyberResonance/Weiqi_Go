export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

export class GoGame {
    constructor(size = 9) {
        this.size = size;
        this.board = Array(size).fill(null).map(() => Array(size).fill(EMPTY));
        this.history = []; // For Ko rule and undo
        this.turn = BLACK;
        this.capturedStones = { [BLACK]: 0, [WHITE]: 0 };
        this.lastBoardState = null; // For simple Ko check
        this.gameOver = false;
    }

    clone() {
        const newGame = new GoGame(this.size);
        newGame.board = this.copyBoard(this.board);
        newGame.turn = this.turn;
        newGame.capturedStones = { ...this.capturedStones };
        newGame.history = this.history.map(b => this.copyBoard(b));
        newGame.lastBoardState = this.lastBoardState ? this.copyBoard(this.lastBoardState) : null;
        newGame.gameOver = this.gameOver;
        return newGame;
    }

    // Deep copy board
    copyBoard(board) {
        return board.map(row => [...row]);
    }

    placeStone(x, y) {
        if (this.gameOver) return false;
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
        if (this.board[y][x] !== EMPTY) return false;

        // Speculative move
        const newBoard = this.copyBoard(this.board);
        newBoard[y][x] = this.turn;

        // Check captures
        const opponent = this.turn === BLACK ? WHITE : BLACK;
        const captured = this.getCaptures(newBoard, x, y, opponent);

        // Remove captured stones
        captured.forEach(({ cx, cy }) => {
            newBoard[cy][cx] = EMPTY;
        });

        // Check for suicide (not allowed unless it captures)
        if (captured.length === 0 && this.countLiberties(newBoard, x, y) === 0) {
            return false; // Suicide move
        }

        // Check for Ko (cannot repeat formatted board state immediately)
        // Simple Ko: Don't recreate the board from 1 turn ago
        // A full positional superko check would be better but simple Ko covers most cases for teaching.
        // Ideally we hash the board.
        if (this.lastBoardState && this.boardsEqual(newBoard, this.lastBoardState)) {
            return false; // Ko rule
        }

        // Apply move
        this.lastBoardState = this.copyBoard(this.board); // Save *previous* state for next Ko check? 
        // Wait, Ko is: current state cannot match global history.
        // Simple Ko is: current state cannot match state immediately before opponent's move.

        this.history.push(this.copyBoard(this.board));
        this.board = newBoard;
        this.capturedStones[this.turn] += captured.length;
        this.turn = opponent;
        return true;
    }

    pass() {
        if (this.gameOver) return;
        this.turn = this.turn === BLACK ? WHITE : BLACK;
        // Two passes end game? Or simple toggle.
        // We'll let the UI handle game end conditions.
    }

    getCaptures(board, lastX, lastY, capturedColor) {
        // Check all neighbors of the placed stone for opponent groups that lost all liberties
        const captures = [];
        const visited = new Set();
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

        // We check the 4 neighbors of the *placed stone* to see if we killed an opponent group
        directions.forEach(([dx, dy]) => {
            const nx = lastX + dx;
            const ny = lastY + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                if (board[ny][nx] === capturedColor && !visited.has(`${nx},${ny}`)) {
                    const group = this.getGroup(board, nx, ny, capturedColor);
                    if (this.countGroupLiberties(board, group) === 0) {
                        group.forEach(stone => {
                            captures.push(stone);
                            visited.add(`${stone.cx},${stone.cy}`);
                        });
                    }
                }
            }
        });

        return captures;
    }

    getGroup(board, x, y, color) {
        const group = [];
        const stack = [[x, y]];
        const visited = new Set();
        visited.add(`${x},${y}`);

        while (stack.length > 0) {
            const [cx, cy] = stack.pop();
            group.push({ cx, cy });

            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    if (board[ny][nx] === color && !visited.has(`${nx},${ny}`)) {
                        visited.add(`${nx},${ny}`);
                        stack.push([nx, ny]);
                    }
                }
            });
        }
        return group;
    }

    countGroupLiberties(board, group) {
        const liberties = new Set();
        group.forEach(({ cx, cy }) => {
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = cx + dx;
                const ny = cy + dy;
                if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                    if (board[ny][nx] === EMPTY) {
                        liberties.add(`${nx},${ny}`);
                    }
                }
            });
        });
        return liberties.size;
    }

    countLiberties(board, x, y) {
        const color = board[y][x];
        const group = this.getGroup(board, x, y, color);
        return this.countGroupLiberties(board, group);
    }

    // Check if a move is valid without modifing the board (mostly)
    isValidMove(x, y, color) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return false;
        if (this.board[y][x] !== EMPTY) return false;

        // We need to check captures and suicide
        // This is expensive to do perfectly without simulation, but we can do a localized check
        // Create a temporary board slice? No, deep copy is safest for correctness.
        // For MCTS we might need a lighter version, but for now:
        const testGame = this.clone();
        // Force turn to color
        testGame.turn = color;
        // We bypass the turn check in placeStone if we just set it, 
        // but placeStone relies on internal state. 
        // Let's just use placeStone logic manually or trust clone.
        return testGame.placeStone(x, y);
    }

    getValidMoves() {
        const moves = [];
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (this.board[y][x] === EMPTY) {
                    // Optimization: fast fail?
                    // Just try placing
                    const testGame = this.clone();
                    if (testGame.placeStone(x, y)) {
                        moves.push({ x, y });
                    }
                }
            }
        }
        return moves;
    }

    // Check if a point is a simple eye for the color
    isEye(x, y, color) {
        if (this.board[y][x] !== EMPTY) return false;

        // Check cardinal neighbors (must all be own color or edge)
        const cardDirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        for (let [dx, dy] of cardDirs) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && nx < this.size && ny >= 0 && ny < this.size) {
                if (this.board[ny][nx] !== color) return false;
            }
        }

        // Check diagonal neighbors (to distinguish false eyes)
        // If >1 diagonals are enemy (or >0 at edge), it's often false, but for simple heuristics, 
        // just surrounding is enough to call it an "eye-like" shape to avoid filling.
        return true;
    }

    getLibertiesAt(x, y) {
        if (this.board[y][x] === EMPTY) return 0;
        return this.countLiberties(this.board, x, y);
    }

    boardsEqual(b1, b2) {
        for (let y = 0; y < this.size; y++) {
            for (let x = 0; x < this.size; x++) {
                if (b1[y][x] !== b2[y][x]) return false;
            }
        }
        return true;
    }
}
