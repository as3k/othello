// ─── Core Types ───────────────────────────────────────────
// Pure, serializable. Ready for localStorage, WS, replay.

/** 0 = empty, 1 = black (first), 2 = white */
export type CellState = 0 | 1 | 2;

/** 8x8 grid. Board[row][col]. Row 0 = top. */
export type Board = CellState[][];

export type Player = 1 | 2;

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  player: Player;
  position: Position;
  flipped: Position[];
  boardAfter: Board;
}

export type GameStatus =
  | 'playing'
  | 'black-wins'
  | 'white-wins'
  | 'draw';

export interface GameState {
  board: Board;
  currentPlayer: Player;
  status: GameStatus;
  moveHistory: Move[];
  lastMove: Move | null;
  blackScore: number;
  whiteScore: number;
  validMoves: Position[];
}

export const BOARD_SIZE = 8;

export const DIRECTIONS: [number, number][] = [
  [-1, -1], [-1, 0], [-1, 1],
  [0, -1],           [0, 1],
  [1, -1],  [1, 0],  [1, 1],
];
