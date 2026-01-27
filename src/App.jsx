import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import RulesModal from './components/RulesModal';
import { GoGame, BLACK, WHITE, EMPTY } from './game/go-logic';
import { getAIMove } from './game/go-ai';
import { RotateCw, Trophy, User, Cpu, Settings, BookOpen } from 'lucide-react';

function App() {
  const [size, setSize] = useState(9);
  const [difficulty, setDifficulty] = useState('medium');
  const [game, setGame] = useState(new GoGame(9));
  const [lastMove, setLastMove] = useState(null);
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [playerColor] = useState(BLACK);
  const [showRules, setShowRules] = useState(false);

  // Auto-show rules on first load
  useEffect(() => {
    // Optional: setShowRules(true);
  }, []);

  const startNewGame = (newSize = size, newDiff = difficulty) => {
    setSize(newSize);
    setDifficulty(newDiff);
    setGame(new GoGame(newSize));
    setLastMove(null);
    setIsAiThinking(false);
  };

  useEffect(() => {
    if (game.gameOver) return;
    if (game.turn !== playerColor && !isAiThinking) {
      setIsAiThinking(true);
      setTimeout(() => {
        const aiMove = getAIMove(game, difficulty);
        if (aiMove) {
          const nextGame = game.clone();
          if (nextGame.placeStone(aiMove.x, aiMove.y)) {
            setGame(nextGame);
            setLastMove({ x: aiMove.x, y: aiMove.y });
          } else {
            nextGame.pass();
            setGame(nextGame);
          }
        } else {
          const nextGame = game.clone();
          nextGame.pass();
          setGame(nextGame);
        }
        setIsAiThinking(false);
      }, 600);
    }
  }, [game, difficulty, playerColor, isAiThinking]);

  const handlePointClick = (x, y) => {
    if (game.gameOver || isAiThinking || game.turn !== playerColor) return;
    if (game.board[y][x] !== EMPTY) return;

    const nextGame = game.clone();
    if (nextGame.placeStone(x, y)) {
      setGame(nextGame);
      setLastMove({ x, y });
    }
  };

  const handlePass = () => {
    if (game.gameOver || isAiThinking) return;
    const nextGame = game.clone();
    nextGame.pass();
    setGame(nextGame);
  };

  const blackCaptures = game.capturedStones[BLACK];
  const whiteCaptures = game.capturedStones[WHITE];

  return (
    <div className="app-container">
      <header>
        <h1>Learn Weiqi (Go)</h1>
        <p className="subtitle">Master the Art of Strategy</p>
      </header>

      <div className="game-layout">
        {/* Controls Panel */}
        <div className="controls-panel">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#facc15', fontSize: '1.2rem' }}>
                <Settings size={20} /> Settings
              </div>
              <button
                onClick={() => setShowRules(true)}
                className="btn-option"
                style={{ flex: 'none', width: 'auto', padding: '4px 8px' }}
                title="How to Play"
              >
                <BookOpen size={16} />
              </button>
            </div>

            <div>
              <label className="label">Board Size</label>
              <div className="btn-group">
                {[9, 13, 19].map(s => (
                  <button
                    key={s}
                    onClick={() => startNewGame(s, difficulty)}
                    className={`btn-option ${size === s ? 'active' : ''}`}
                  >
                    {s}x{s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => startNewGame(size, e.target.value)}
                className="select-input"
              >
                <option value="easy">Learner (Easy)</option>
                <option value="medium">Strategist (Medium)</option>
                <option value="hard">Master (Hard)</option>
              </select>
            </div>

            <button
              onClick={() => startNewGame(size, difficulty)}
              className="btn-primary"
            >
              <RotateCw size={18} /> New Game
            </button>
          </div>

          <div className="score-board">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#facc15', fontSize: '1.2rem', marginBottom: '0.5rem' }}>
              <Trophy size={20} /> Score
            </div>
            <div className="score-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'black', border: '1px solid #475569' }}></div>
                <strong>Black</strong>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{blackCaptures}</span>
            </div>
            <div className="score-row">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'white' }}></div>
                <span style={{ color: 'black', background: 'white', padding: '0 4px', borderRadius: 2, fontSize: '0.75rem', fontWeight: 'bold' }}>White</span>
              </div>
              <span style={{ fontFamily: 'monospace', fontSize: '1.2rem' }}>{whiteCaptures}</span>
            </div>
          </div>

          <div style={{ marginTop: 'auto' }}>
            <button onClick={handlePass} className="btn-secondary">
              Pass Turn
            </button>
          </div>
        </div>

        {/* Board Area */}
        <div className="board-area">
          <div style={{ position: 'relative' }}>
            <Board game={game} onPlay={handlePointClick} lastMoveId={lastMove} />

            <div className={`turn-indicator ${game.turn === BLACK ? 'black-turn' : ''}`}>
              {game.turn === BLACK ? <User size={16} /> : <Cpu size={16} />}
              <span>
                {game.turn === BLACK ? "Your Turn" : (isAiThinking ? "Thinking..." : "AI Turn")}
              </span>
            </div>
          </div>
        </div>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

export default App;
