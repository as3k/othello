'use client';

import { CellState } from '@/lib/game/types';

interface CellProps {
  value: CellState;
  isValidMove: boolean;
  isLastMove: boolean;
  onClick: () => void;
  gameOver: boolean;
  showHints: boolean;
  animName: string;
  animDuration: number;
  animIterations: number;
  animDelay: number;
}

export default function Cell({
  value,
  isValidMove,
  isLastMove,
  onClick,
  gameOver,
  showHints,
  animName,
  animDuration,
  animIterations,
  animDelay,
}: CellProps) {
  const showHint = isValidMove && !gameOver;
  const isFlipping = animName !== '';

  return (
    <button
      onClick={onClick}
      disabled={!isValidMove || gameOver}
      className={`
        relative flex items-center justify-center
        bg-cell-bg select-none
        transition-colors duration-150
        ${
          isValidMove && !gameOver && showHints
            ? 'cursor-pointer hover:bg-cell-hover active:bg-cell-hover'
            : isValidMove && !gameOver
            ? 'cursor-pointer'
            : 'cursor-default'
        }
      `}
      style={{ touchAction: 'manipulation' }}
      aria-label={
        value === 0
          ? showHint
            ? 'Valid move'
            : 'Empty'
          : value === 1
          ? 'Black'
          : 'White'
      }
    >
      {/* Disk */}
      {value !== 0 && (
        <div
          className={`
            w-[82%] h-[82%] rounded-full
            ${value === 1
              ? 'bg-gray-900 border border-white/10 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]'
              : 'bg-white border border-gray-300/50 shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)]'
            }
            ${isLastMove ? 'ring-2 ring-yellow-400 ring-offset-1 ring-offset-cell-bg' : ''}
          `}
          style={
            isFlipping
              ? {
                  animationName: animName,
                  animationDuration: `${animDuration}s`,
                  animationIterationCount: animIterations,
                  animationTimingFunction: 'ease-in-out',
                  animationFillMode: 'both',
                  animationDelay: `${animDelay}ms`,
                }
              : undefined
          }
        />
      )}

      {/* Valid-move hint dot */}
      {showHint && showHints && value === 0 && (
        <div className="w-[28%] h-[28%] rounded-full bg-text-light/40" />
      )}
    </button>
  );
}
