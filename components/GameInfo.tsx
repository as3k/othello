'use client';

import { Player, GameStatus } from '@/lib/game/types';

interface GameInfoProps {
  currentPlayer: Player;
  blackScore: number;
  whiteScore: number;
  status: GameStatus;
  moveCount: number;
  onRestart: () => void;
}

export default function GameInfo({
  currentPlayer,
  blackScore,
  whiteScore,
  status,
  moveCount,
  onRestart,
}: GameInfoProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-4">
      {/* Score — Black */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-gray-900 shadow-sm shrink-0" />
        <span className="text-lg font-semibold tabular-nums">{blackScore}</span>
      </div>

      {/* Score — White */}
      <div className="flex items-center gap-2">
        <div className="w-5 h-5 rounded-full bg-white border border-gray-300 shadow-sm shrink-0" />
        <span className="text-lg font-semibold tabular-nums">{whiteScore}</span>
      </div>

      {/* Status / Turn indicator */}
      <div className="sm:ml-auto flex items-center gap-3">
        {status === 'playing' ? (
          <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
            <span>Turn:</span>
            <div
              className={`w-4 h-4 rounded-full shadow-sm ${
                currentPlayer === 1 ? 'bg-gray-900' : 'bg-white border border-gray-300'
              }`}
            />
            <span>{currentPlayer === 1 ? 'Black' : 'White'}</span>
          </div>
        ) : (
          <span className="text-sm font-bold text-emerald-700">
            {status === 'black-wins'
              ? 'Black wins!'
              : status === 'white-wins'
              ? 'White wins!'
              : 'Draw!'}
          </span>
        )}

        <span className="text-xs text-gray-400">({moveCount} moves)</span>

        <button
          onClick={onRestart}
          className="px-3 py-1.5 text-sm rounded-lg bg-emerald-600 text-white 
                     hover:bg-emerald-700 active:bg-emerald-800 transition-colors
                     font-medium"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
