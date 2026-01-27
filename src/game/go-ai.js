import { EMPTY, BLACK, WHITE } from './go-logic';

// --- MCTS Node ---
class MCTSNode {
    constructor(game, parent = null, move = null) {
        this.game = game; // State at this node
        this.parent = parent;
        this.move = move; // Move that led to this state
        this.children = [];
        this.wins = 0;
        this.visits = 0;
        this.untriedMoves = null; // Will populate on first access
        this.playerColor = game.turn; // Who is to move from this state
    }

    getUntriedMoves() {
        if (this.untriedMoves === null) {
            this.untriedMoves = this.game.getValidMoves();
        }
        return this.untriedMoves;
    }

    isFullyExpanded() {
        return this.getUntriedMoves().length === 0;
    }

    bestChild(explorationConstant = 1.41) {
        let best = null;
        let maxUCB = -Infinity;

        for (const child of this.children) {
            const ucb = (child.wins / child.visits) +
                explorationConstant * Math.sqrt(Math.log(this.visits) / child.visits);
            if (ucb > maxUCB) {
                maxUCB = ucb;
                best = child;
            }
        }
        return best;
    }
}

// --- AI Implementation ---

export function getAIMove(game, difficulty = 'medium') {
    // Common for all levels: valid moves caching
    const validMoves = game.getValidMoves();
    if (validMoves.length === 0) return null; // Pass

    const myColor = game.turn;
    const oppColor = myColor === BLACK ? WHITE : BLACK;

    console.log(`AI Thinking... Level: ${difficulty}, Moves: ${validMoves.length}`);

    // --- LEVEL 1: EASY (Smart Greedy) ---
    // Strategies: Capture, Defend Atari, Play 3rd/4th line. Random otherwise.
    if (difficulty === 'easy') {
        let bestMove = null;
        let maxScore = -Infinity;

        // Shuffle valid moves to add variety
        const shuffledMoves = validMoves.sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            // HEURISTIC EVALUATION
            let score = Math.random() * 10; // randomness

            // Simulate
            const simGame = game.clone();
            const valid = simGame.placeStone(move.x, move.y);
            if (!valid) continue; // Should be valid from getValidMoves, but safe check

            // 1. Capture Bonus
            const captures = simGame.capturedStones[myColor] - game.capturedStones[myColor];
            if (captures > 0) score += 100 * captures;

            // 2. Defense Bonus (Save self from Atari)
            // Look at neighbors of the placed stone. If they are my color, did we increase their liberties?
            // Simplification: Check immediate liberties of placed stone group.
            const liberties = simGame.getLibertiesAt(move.x, move.y);
            if (liberties === 1) score -= 50; // Self-atari is bad
            if (liberties > 2) score += 10;   // Good shape

            // 3. Opening Logic (Distance from center/edge)
            const sz = game.size;
            const distToEdge = Math.min(move.x, sz - 1 - move.x, move.y, sz - 1 - move.y);
            if (distToEdge === 2 || distToEdge === 3) score += 15; // 3rd/4th line

            // 4. Simple Eye Avoidance
            // Don't fill your own eye
            if (game.isEye(move.x, move.y, myColor)) score -= 200;

            if (score > maxScore) {
                maxScore = score;
                bestMove = move;
            }
        }
        return bestMove || validMoves[0];
    }

    // --- LEVEL 2: MEDIUM (Strong Heuristic) ---
    // Upgraded Logic: Pattern matching, solid connections, cutting, better shape
    if (difficulty === 'medium') {
        let bestMove = null;
        let maxScore = -Infinity;
        const shuffledMoves = validMoves.sort(() => Math.random() - 0.5);

        for (const move of shuffledMoves) {
            let score = Math.random() * 5;
            const simGame = game.clone();
            simGame.placeStone(move.x, move.y);

            const captures = simGame.capturedStones[myColor] - game.capturedStones[myColor];
            const groupLibs = simGame.getLibertiesAt(move.x, move.y);

            // 1. Capture is huge
            if (captures > 0) score += 500 * captures;

            // 2. Avoid Self-Atari (unless simple ko threat or snapback - hard to check)
            if (groupLibs === 1) score -= 800;
            if (groupLibs === 2) score -= 50; // Risky
            if (groupLibs >= 3) score += 20;  // Stable

            // 3. Star points (Hoshi) and corners
            if (isStarPoint(game.size, move.x, move.y)) score += 50;

            // 4. Protect Eyes
            if (game.isEye(move.x, move.y, myColor)) score -= 2000; // NEVER fill real eye

            // 5. Connect / Cut (Simple adjacency check)
            // If move acts as a connector (has >1 neighbor of own color that were previously not connected), bonus.
            // This is expensive to check perfectly. Heuristic: Neighbors count.
            let myNeighbors = 0;
            let oppNeighbors = 0;
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = move.x + dx, ny = move.y + dy;
                if (nx >= 0 && nx < game.size && ny >= 0 && ny < game.size) {
                    const cell = game.board[ny][nx];
                    if (cell === myColor) myNeighbors++;
                    if (cell === oppColor) oppNeighbors++;
                }
            });

            if (myNeighbors >= 2) score += 30; // Solid connection
            if (oppNeighbors >= 2) score += 30; // Cutting potential / Contact play

            // 6. Reduce opponent liberties (pressure)
            // Check neighbors' liberties. If we reduced an opponent group to 1 liberty (Atari), that is HUGE.
            let putOppInAtari = false;
            [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dx, dy]) => {
                const nx = move.x + dx, ny = move.y + dy;
                if (nx >= 0 && nx < game.size && ny >= 0 && ny < game.size && game.board[ny][nx] === oppColor) {
                    // In simGame, this opponent group now has fewer liberties?
                    const oppGroupLibs = simGame.getLibertiesAt(nx, ny);
                    if (oppGroupLibs === 1) putOppInAtari = true;
                }
            });
            if (putOppInAtari) score += 400;


            if (score > maxScore) {
                maxScore = score;
                bestMove = move;
            }
        }
        return bestMove || validMoves[0];
    }

    // --- LEVEL 3: HARD (MCTS / Monte Carlo Tree Search) ---
    // Real simulations.
    if (difficulty === 'hard') {
        // Configuration
        const TIME_LIMIT = 900; // ms
        const startTime = Date.now();
        const root = new MCTSNode(game);

        let iterations = 0;

        while (Date.now() - startTime < TIME_LIMIT) {
            iterations++;
            let node = root;

            // 1. Selection
            while (!node.getUntriedMoves().length && node.children.length > 0) {
                node = node.bestChild();
            }

            // 2. Expansion
            if (node.getUntriedMoves().length > 0) {
                const moves = node.getUntriedMoves();
                const move = moves.splice(Math.floor(Math.random() * moves.length), 1)[0];

                const nextState = node.game.clone();
                nextState.placeStone(move.x, move.y); // Assume valid as it came from validMoves

                const childNode = new MCTSNode(nextState, node, move);
                node.children.push(childNode);
                node = childNode;
            }

            // 3. Simulation (Rollout) - The heavy part
            // We assume random play for rollout.
            // Optimization: Use a lightweight method to find a random move
            let rolloutGame = node.game.clone();
            const ROLLOUT_DEPTH = 30; // Moves to look ahead
            let depth = 0;

            // Optimization: Pre-calculate empty spots for the rollout game once? 
            // No, board changes. But we can just iterate board.
            // Better: just pick random coordinates until valid or max attempts.
            // On a full board, picking random is fast. On full-ish board, it's slow.
            // Let's use a list of empty candidates if we can maintain it, but too complex.
            // Fallback: Simplistic "Try 10 random spots, if fail, scan".

            while (depth < ROLLOUT_DEPTH) {
                if (rolloutGame.gameOver) break;

                let moveFound = false;
                // Try random spots first (fastest on empty board)
                for (let i = 0; i < 5; i++) {
                    const rx = Math.floor(Math.random() * game.size);
                    const ry = Math.floor(Math.random() * game.size);
                    if (rolloutGame.board[ry][rx] === EMPTY) {
                        if (rolloutGame.placeStone(rx, ry)) {
                            moveFound = true;
                            break;
                        }
                    }
                }

                if (!moveFound) {
                    // If random failed, find ALL empty and shuffle (slower fallback)
                    // We construct a localized list
                    const empties = [];
                    for (let y = 0; y < game.size; y++) {
                        for (let x = 0; x < game.size; x++) {
                            if (rolloutGame.board[y][x] === EMPTY) empties.push({ x, y });
                        }
                    }

                    if (empties.length === 0) break; // Board full / Pass

                    // Shuffle logic
                    for (let i = empties.length - 1; i > 0; i--) {
                        const j = Math.floor(Math.random() * (i + 1));
                        [empties[i], empties[j]] = [empties[j], empties[i]];
                    }

                    for (const cand of empties) {
                        if (rolloutGame.placeStone(cand.x, cand.y)) {
                            moveFound = true;
                            break;
                        }
                    }
                }

                if (!moveFound) {
                    // Pass
                    rolloutGame.pass();
                    // If 2 passes, game over.
                    // We can break, but simplest is just break loop.
                    break;
                }
                depth++;
            }

            // 4. Backpropagation
            // Evaluate who won the rollout.
            // Approximate scoring: Territory count
            const score = calculateSimpleScore(rolloutGame);
            const didWin = (node.playerColor === BLACK && score > 0) || (node.playerColor === WHITE && score < 0);
            // Actually, we need to know if the *root player* won? No, MCTS updates node by node.
            // Standard: Update visits. If result favorable for the node's previous player, add win.

            // Score > 0 means Black won.
            let winner = score > 0 ? BLACK : WHITE;

            let tempNode = node;
            while (tempNode !== null) {
                tempNode.visits++;
                // If the player who just moved (parent of tempNode) resulted in a win for themselves?
                // The node stores the state *after* the move.
                // So if tempNode represents a state where it is White's turn, it means Black just moved.
                // If Black won, this node (result of Black's move) is GOOD for Black.

                // Simplest MCTS: 
                // Node stores "Who just moved" -> node.move came from parent.game.turn
                // If winner == parent.game.turn, then win++.
                if (tempNode.parent && winner === tempNode.parent.game.turn) {
                    tempNode.wins++;
                }
                tempNode = tempNode.parent;
            }
        }

        console.log(`MCTS Iterations: ${iterations}`);

        // Select best move (most visited)
        const best = root.children.reduce((max, c) => c.visits > max.visits ? c : max, root.children[0]);
        return best ? best.move : validMoves[0];
    }

    return validMoves[0];
}

// Helpers

function isStarPoint(size, x, y) {
    const stars = {
        9: [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]],
        13: [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]],
        19: [[3, 3], [9, 3], [15, 3], [3, 9], [9, 9], [15, 9], [3, 15], [9, 15], [15, 15]]
    };
    return (stars[size] || []).some(p => p[0] === x && p[1] === y);
}

function calculateSimpleScore(game) {
    // Very rough heuristic for rollout termination
    // Caputured stones + stones on board + surrounded territory is too hard to calc perfectly fast.
    // Just Stones + Captures.
    // Territory is hard. We can assume area scoring ~ stones on board.
    let blackScore = game.capturedStones[BLACK]; // Prisoners
    let whiteScore = game.capturedStones[WHITE];

    // Add stones on board
    for (let y = 0; y < game.size; y++) {
        for (let x = 0; x < game.size; x++) {
            if (game.board[y][x] === BLACK) blackScore++;
            if (game.board[y][x] === WHITE) whiteScore++;
        }
    }

    // Komi (usually 6.5 or 7.5 for White)
    // Let's say 6.5
    return blackScore - (whiteScore + 6.5);
}
