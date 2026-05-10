// ─── Game State Reducer ───────────────────────────────────
// Pure reducer. Easy to extend: add action types for undo,
// load-from-storage, apply-remote-move, restart, etc.

import { Board, Player, GameState, GameStatus, Position, Move } from './types';
import {
  createBoard,
  countDisks,
  getFlippedDisks,
  getValidMoves,
  placeDisk,
  getGameStatus,
} from './board';

// ─── Actions ─────────────────────────────────────────────

export type GameAction =
  | { type: 'PLACE_DISK'; position: Position }
  | { type: 'RESTART' }
  | { type: 'SET_STATE'; state: GameState } // For persistence / replay
  | { type: 'PASS' }; // Player voluntarily passes (manual skip)

// ─── Helpers ─────────────────────────────────────────────

function createInitialState(): GameState {
  const board = createBoard();
  const currentPlayer: Player = 1;
  const validMoves = getValidMoves(board, currentPlayer);
  const [blackScore, whiteScore] = countDisks(board);
  return {
    board,
    currentPlayer,
    status: 'playing',
    moveHistory: [],
    lastMove: null,
    blackScore,
    whiteScore,
    validMoves,
  };
}

function computeScores(board: Board): [black: number, white: number] {
  return countDisks(board);
}

function advanceTurn(board: Board, currentPlayer: Player): {
  nextPlayer: Player;
  status: GameStatus;
  validMoves: Position[];
} {
  const { status, nextPlayer } = getGameStatus(board, currentPlayer);
  const validMoves =
    status === 'playing' ? getValidMoves(board, nextPlayer) : [];
  return { nextPlayer, status, validMoves };
}

// ─── Reducer ─────────────────────────────────────────────

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESTART':
      return createInitialState();

    case 'SET_STATE':
      return action.state;

    case 'PASS': {
      if (state.status !== 'playing') return state;
      const opponent: Player = state.currentPlayer === 1 ? 2 : 1;
      const { nextPlayer, status, validMoves } = advanceTurn(
        state.board,
        opponent
      );
      const [blackScore, whiteScore] = computeScores(state.board);
      return {
        ...state,
        currentPlayer: nextPlayer,
        status,
        validMoves,
        blackScore,
        whiteScore,
      };
    }

    case 'PLACE_DISK': {
      if (state.status !== 'playing') return state;
      const { row, col } = action.position;

      // Validate the move
      const flipped = getFlippedDisks(
        state.board,
        state.currentPlayer,
        row,
        col
      );
      if (flipped.length === 0) return state;

      // Apply the move
      const { newBoard } = placeDisk(state.board, state.currentPlayer, row, col);

      // Determine next turn
      const opponent: Player = state.currentPlayer === 1 ? 2 : 1;
      const { nextPlayer, status, validMoves } = advanceTurn(
        newBoard,
        opponent
      );

      const move: Move = {
        player: state.currentPlayer,
        position: { row, col },
        flipped,
        boardAfter: newBoard,
      };

      const [blackScore, whiteScore] = computeScores(newBoard);

      return {
        board: newBoard,
        currentPlayer: nextPlayer,
        status,
        moveHistory: [...state.moveHistory, move],
        lastMove: move,
        blackScore,
        whiteScore,
        validMoves,
      };
    }

    default:
      return state;
  }
}

export { createInitialState };
