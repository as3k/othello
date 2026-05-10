'use client';

import { useReducer, useEffect, useState, useCallback, useRef } from 'react';
import { tx } from '@instantdb/react';
import { Position } from '@/lib/game/types';
import { gameReducer, createInitialState } from '@/lib/game/game-state';
import { emptyStats, statsFromGameEnd, STATS_ID } from '@/lib/game/stats';
import { db } from '@/lib/game/online';
import GameScreen from '@/components/GameScreen';

export default function OthelloPage() {
  const [state, dispatch] = useReducer(gameReducer, null, createInitialState);
  const [showHints, setShowHints] = useState(true);

  // ── Coin-flip avalanche animation ──
  const [flippingCells, setFlippingCells] = useState<string[] | null>(null);
  const isAnimating = flippingCells !== null && flippingCells.length > 0;
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recordedStatsRef = useRef<string | null>(null);

  useEffect(() => {
    // Clear animation on game over or restart
    if (!state.lastMove || state.status !== 'playing') {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      setFlippingCells(null);
      return;
    }

    const flippedKeys = state.lastMove.flipped.map(
      (p: Position) => `${p.row},${p.col}`
    );

    setFlippingCells(flippedKeys);

    // Clear animation after all flips complete + buffer (max 2 flips = 500ms + stagger)
    const staggerTotal = flippedKeys.length * 60;
    const duration = staggerTotal + 700;
    animTimerRef.current = setTimeout(() => setFlippingCells(null), duration);

    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [state.lastMove, state.status]);

  // Record local completed games in global stats
  useEffect(() => {
    if (state.status === 'playing') return;

    const recordKey = `${state.status}-${state.moveHistory.length}-${state.blackScore}-${state.whiteScore}`;
    if (recordedStatsRef.current === recordKey) return;
    recordedStatsRef.current = recordKey;

    async function recordLocalStats() {
      try {
        const res = await (db as any).queryOnce({ stats: {} });
        const doc = res?.data?.stats?.find((s: any) => s.id === STATS_ID);
        const current = doc
          ? {
              totalGames: doc.totalGames ?? 0,
              blackWins: doc.blackWins ?? 0,
              whiteWins: doc.whiteWins ?? 0,
              draws: doc.draws ?? 0,
            }
          : emptyStats();
        const inc = statsFromGameEnd(state);
        await (db as any).transact(
          tx.stats[STATS_ID].merge({
            totalGames: current.totalGames + (inc.totalGames ?? 0),
            blackWins: current.blackWins + (inc.blackWins ?? 0),
            whiteWins: current.whiteWins + (inc.whiteWins ?? 0),
            draws: current.draws + (inc.draws ?? 0),
          })
        );
      } catch (e) {
        console.error('[local stats] failed:', e);
      }
    }

    recordLocalStats();
  }, [state]);

  // Auto-pass when current player has no valid moves
  useEffect(() => {
    if (
      state.status === 'playing' &&
      state.validMoves.length === 0 &&
      !isAnimating
    ) {
      const id = setTimeout(() => dispatch({ type: 'PASS' }), 600);
      return () => clearTimeout(id);
    }
  }, [state.currentPlayer, state.validMoves.length, state.status, isAnimating]);

  const handleCellClick = useCallback(
    (pos: Position) => {
      if (isAnimating) return;
      dispatch({ type: 'PLACE_DISK', position: pos });
    },
    [isAnimating]
  );

  const handleRestart = () => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    setFlippingCells(null);
    recordedStatsRef.current = null;
    dispatch({ type: 'RESTART' });
  };

  const gameOver = state.status !== 'playing';

  return (
    <GameScreen
      mode="local"
      state={state}
      isMyTurn={true}
      isAnimating={isAnimating}
      flippingCells={flippingCells}
      showHints={showHints}
      setShowHints={setShowHints}
      validMoves={isAnimating ? [] : state.validMoves}
      currentPlayer={gameOver ? null : state.currentPlayer}
      gameOver={gameOver}
      onCellClick={handleCellClick}
      onRestart={handleRestart}
      onLeave={() => (window.location.href = '/')}
    />
  );
}
