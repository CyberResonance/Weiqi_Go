import React from 'react';
import { EMPTY } from '../game/go-logic';
import Stone from './Stone';

export default function Board({ game, onPlay, lastMoveId }) {
    const { size, board } = game;

    const getStarPoints = (sz) => {
        if (sz === 9) return [[2, 2], [6, 2], [4, 4], [2, 6], [6, 6]];
        if (sz === 13) return [[3, 3], [9, 3], [6, 6], [3, 9], [9, 9]];
        if (sz === 19) return [
            [3, 3], [9, 3], [15, 3],
            [3, 9], [9, 9], [15, 9],
            [3, 15], [9, 15], [15, 15]
        ];
        return [];
    };
    const starPoints = getStarPoints(size);
    const isStarPoint = (x, y) => starPoints.some(p => p[0] === x && p[1] === y);


    return (
        <div
            className="wood-texture"
            style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${size}, 1fr)`,
                gridTemplateRows: `repeat(${size}, 1fr)`,
                gap: 0,
                width: 'min(90vw, 600px)',
                height: 'min(90vw, 600px)',
                padding: '20px', // padding for board edge
            }}
        >
            {board.map((row, y) =>
                row.map((cell, x) => {
                    const isLastMove = lastMoveId && lastMoveId.x === x && lastMoveId.y === y;
                    return (
                        <div
                            key={`${x}-${y}`}
                            onClick={() => onPlay(x, y)}
                            className="board-cell"
                        >
                            {/* Horizontal Line logic */}
                            <div
                                className="line-h"
                                style={{
                                    left: x === 0 ? '50%' : '0',
                                    right: x === size - 1 ? '50%' : '0',
                                    width: 'auto'
                                }}
                            />

                            {/* Vertical Line logic */}
                            <div
                                className="line-v"
                                style={{
                                    top: y === 0 ? '50%' : '0',
                                    bottom: y === size - 1 ? '50%' : '0',
                                    height: 'auto'
                                }}
                            />

                            {/* Star Point */}
                            {isStarPoint(x, y) && (
                                <div className="star-point" />
                            )}

                            {/* Stone */}
                            {cell !== EMPTY && (
                                <Stone color={cell} lastMove={isLastMove} />
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}
