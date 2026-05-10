// ─── Pure Board Logic ─────────────────────────────────────
// No side effects. All functions return new values.

import { Board, CellState, Player, Position, BoardSize, DIRECTIONS } from './types';

/** Clone a board (avoid mutation). */
export function cloneBoard(board: Board): Board {
  return board.map(row => [...row]);
}

/** Create initial Othello board. */
export function createBoard(size: number = 8): Board {
  const b: Board = Array.from({ length: size }, () =>
    Array(size).fill(0) as CellState[]
  );
  const mid = size / 2;
  b[mid - 1][mid - 1] = 2;
  b[mid - 1][mid]     = 1;
  b[mid][mid - 1]     = 1;
  b[mid][mid]         = 2;
  return b;
}

/** Count disks per player. */
export function countDisks(board: Board): [black: number, white: number] {
  let black = 0, white = 0;
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (board[r][c] === 1) black++;
      else if (board[r][c] === 2) white++;
    }
  }
  return [black, white];
}

/**
 * Get disks that would be flipped if `player` placed at (row, col).
 * Returns empty array if move invalid.
 */
export function getFlippedDisks(
  board: Board,
  player: Player,
  row: number,
  col: number
): Position[] {
  if (board[row][col] !== 0) return [];

  const opponent: Player = player === 1 ? 2 : 1;
  const flipped: Position[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    let r = row + dr;
    let c = col + dc;
    const candidates: Position[] = [];

    while (
      r >= 0 && r < board.length &&
      c >= 0 && c < board[0].length &&
      board[r][c] === opponent
    ) {
      candidates.push({ row: r, col: c });
      r += dr;
      c += dc;
    }

    // Must end with own disk to sandwich
    if (
      r >= 0 && r < board.length &&
      c >= 0 && c < board[0].length &&
      board[r][c] === player
    ) {
      flipped.push(...candidates);
    }
  }

  return flipped;
}

/** Check if a specific move is valid. */
export function isValidMove(
  board: Board,
  player: Player,
  row: number,
  col: number
): boolean {
  return getFlippedDisks(board, player, row, col).length > 0;
}

/** Get all valid moves for a player. */
export function getValidMoves(board: Board, player: Player): Position[] {
  const moves: Position[] = [];
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (isValidMove(board, player, r, c)) {
        moves.push({ row: r, col: c });
      }
    }
  }
  return moves;
}

/**
 * Place a disk for `player` at (row, col).
 * Returns new board + flipped positions.
 * Assumes valid move (caller should check).
 */
export function placeDisk(
  board: Board,
  player: Player,
  row: number,
  col: number
): { newBoard: Board; flipped: Position[] } {
  const flipped = getFlippedDisks(board, player, row, col);
  const newBoard = cloneBoard(board);
  newBoard[row][col] = player;
  for (const { row: r, col: c } of flipped) {
    newBoard[r][c] = player;
  }
  return { newBoard, flipped };
}

/** Check if a player has any valid move. */
export function hasAnyValidMove(board: Board, player: Player): boolean {
  for (let r = 0; r < board.length; r++) {
    for (let c = 0; c < board[0].length; c++) {
      if (isValidMove(board, player, r, c)) return true;
    }
  }
  return false;
}

/** Determine game status given current board + whose turn it would be. */
export function getGameStatus(
  board: Board,
  currentPlayer: Player
): { status: 'playing' | 'black-wins' | 'white-wins' | 'draw'; nextPlayer: Player } {
  if (hasAnyValidMove(board, currentPlayer)) {
    // Current player can still move
    return { status: 'playing', nextPlayer: currentPlayer };
  }

  // Current player has no move – check opponent
  const opponent: Player = currentPlayer === 1 ? 2 : 1;
  if (hasAnyValidMove(board, opponent)) {
    // Opponent can move – turn passes
    return { status: 'playing', nextPlayer: opponent };
  }

  // Neither can move – game over
  const [black, white] = countDisks(board);
  if (black > white) return { status: 'black-wins', nextPlayer: currentPlayer };
  if (white > black) return { status: 'white-wins', nextPlayer: currentPlayer };
  return { status: 'draw', nextPlayer: currentPlayer };
}
