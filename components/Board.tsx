'use client';

import { useMemo } from 'react';
import { Board as BoardType, Position, Player } from '@/lib/game/types';
import Cell from './Cell';

interface BoardProps {
  board: BoardType;
  validMoves: Position[];
  lastMove: Position | null;
  gameOver: boolean;
  onCellClick: (pos: Position) => void;
  showHints: boolean;
  currentPlayer: Player | null;
  flippingCells: string[] | null;
}

const AXES = ['flip-x', 'flip-y', 'flip-d'] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function Board({
  board,
  validMoves,
  lastMove,
  gameOver,
  onCellClick,
  showHints,
  currentPlayer,
  flippingCells,
}: BoardProps) {
  const validSet = new Set(validMoves.map((p) => `${p.row},${p.col}`));

  // Cache random chaos params per flipping cell (stable across re-renders)
  const chaosMap = useMemo(() => {
    if (!flippingCells) return null;
    const map = new Map<
      string,
      { name: string; duration: number; iterations: number }
    >();
    flippingCells.forEach((key) => {
      const axis = AXES[randInt(0, 2)];
      const flips = randInt(1, 2);
      map.set(key, {
        name: axis,
        duration: flips * 0.25,
        iterations: flips / 2,
      });
    });
    return map;
  }, [flippingCells]);

  const ringClass =
    !gameOver && currentPlayer === 1
      ? 'ring-gray-900'
      : !gameOver && currentPlayer === 2
      ? 'ring-white'
      : 'ring-transparent';

  return (
    <div className="w-[92vmin] h-[92vmin]" style={{ touchAction: 'none' }}>
      <div
        className={`w-full h-full rounded-lg border-2 shadow-lg p-[2%] ring-4 ring-offset-0 transition-all duration-500 ${ringClass} ${
          !gameOver && currentPlayer === 2
            ? 'border-white/60'
            : !gameOver && currentPlayer === 1
            ? 'border-gray-900/60'
            : 'border-board-border'
        }`}
      >
        <div className="grid grid-cols-8 grid-rows-8 gap-px bg-board-border h-full">
          {board.map((row, r) =>
            row.map((cell, c) => {
              const key = `${r},${c}`;

              let animName = '';
              let animDuration = 0;
              let animIterations = 0;
              let animDelay = 0;

              if (chaosMap) {
                const params = chaosMap.get(key);
                if (params) {
                  animName = params.name;
                  animDuration = params.duration;
                  animIterations = params.iterations;
                  animDelay = flippingCells ? flippingCells.indexOf(key) * 60 : 0;
                }
              }

              return (
                <Cell
                  key={key}
                  value={cell}
                  isValidMove={validSet.has(key)}
                  isLastMove={
                    lastMove !== null &&
                    lastMove.row === r &&
                    lastMove.col === c
                  }
                  onClick={() => onCellClick({ row: r, col: c })}
                  gameOver={gameOver}
                  showHints={showHints}
                  animName={animName}
                  animDuration={animDuration}
                  animIterations={animIterations}
                  animDelay={animDelay}
                />
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
