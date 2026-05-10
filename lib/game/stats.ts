'use client';

import type { GameState } from './types';

// ── Global stats ──

export const STATS_ID = '11111111-1111-4111-8111-111111111111';

export interface GlobalStats {
  totalGames: number;
  blackWins: number;
  whiteWins: number;
  draws: number;
}

export function emptyStats(): GlobalStats {
  return { totalGames: 0, blackWins: 0, whiteWins: 0, draws: 0 };
}

export function statsFromGameEnd(state: GameState): Partial<GlobalStats> {
  const inc: Partial<GlobalStats> = { totalGames: 1 };
  if (state.status === 'black-wins') inc.blackWins = 1;
  else if (state.status === 'white-wins') inc.whiteWins = 1;
  else if (state.status === 'draw') inc.draws = 1;
  return inc;
}
