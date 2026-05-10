import { init, tx } from '@instantdb/admin';
import type { GameState, Player, Position } from '@/lib/game/types';
import {
  countDisks,
  getGameStatus,
  getValidMoves,
  isValidMove,
  placeDisk,
} from '@/lib/game/board';

export const runtime = 'nodejs';

const appId = process.env.NEXT_PUBLIC_INSTANT_APP_ID;
const adminToken = process.env.INSTANT_ADMIN_TOKEN;

if (!appId || !adminToken) {
  throw new Error('InstantDB env vars missing');
}

const admin = init({ appId, adminToken });

type GameDoc = {
  id: string;
  state: GameState;
  player1: string;
  player2?: string;
  blackPlayer?: string;
  whitePlayer?: string;
  status: 'waiting' | GameState['status'] | 'abandoned';
};

type MoveBody = {
  gameId?: string;
  playerId?: string;
  type?: 'move' | 'pass';
  position?: Position;
};

function jsonError(message: string, status = 400) {
  return Response.json({ ok: false, error: message }, { status });
}

function playerForDoc(game: GameDoc, playerId: string): Player | null {
  if ((game.blackPlayer ?? game.player1) === playerId) return 1;
  if ((game.whitePlayer ?? game.player2) === playerId) return 2;
  return null;
}

export async function POST(request: Request) {
  let body: MoveBody;
  try {
    body = await request.json();
  } catch {
    return jsonError('Invalid JSON');
  }

  const { gameId, playerId, type, position } = body;
  if (!gameId || !playerId || !type) return jsonError('Missing fields');

  const res = await admin.query({
    games: { $: { where: { id: gameId } } },
  } as any);
  const game = res?.games?.[0] as GameDoc | undefined;
  if (!game) return jsonError('Game not found', 404);
  if (game.status !== 'playing' || game.state.status !== 'playing') {
    return jsonError('Game is not playing', 409);
  }

  const player = playerForDoc(game, playerId);
  if (!player) return jsonError('Player is not in this game', 403);
  if (game.state.currentPlayer !== player) return jsonError('Not your turn', 409);

  let newState: GameState;

  if (type === 'pass') {
    if (game.state.validMoves.length > 0) return jsonError('Cannot pass with valid moves', 409);
    newState = JSON.parse(JSON.stringify(game.state));
    const opp: Player = player === 1 ? 2 : 1;
    const { status, nextPlayer } = getGameStatus(newState.board, opp);
    newState.currentPlayer = nextPlayer;
    newState.status = status;
    newState.validMoves = status === 'playing' ? getValidMoves(newState.board, nextPlayer) : [];
  } else {
    if (!position) return jsonError('Missing position');
    if (!isValidMove(game.state.board, player, position.row, position.col)) {
      return jsonError('Invalid move', 409);
    }

    const { newBoard, flipped } = placeDisk(
      game.state.board,
      player,
      position.row,
      position.col
    );
    const opp: Player = player === 1 ? 2 : 1;
    const { status, nextPlayer } = getGameStatus(newBoard, opp);
    const [blackScore, whiteScore] = countDisks(newBoard);

    newState = JSON.parse(JSON.stringify(game.state));
    newState.board = newBoard;
    newState.currentPlayer = nextPlayer;
    newState.status = status;
    newState.validMoves = status === 'playing' ? getValidMoves(newBoard, nextPlayer) : [];
    newState.blackScore = blackScore;
    newState.whiteScore = whiteScore;
    newState.lastMove = { player, position, flipped, boardAfter: newBoard };
    newState.moveHistory = [
      ...newState.moveHistory,
      { player, position, flipped, boardAfter: newBoard },
    ];
  }

  await admin.transact(
    tx.games[game.id].merge({ state: newState, status: newState.status })
  );

  return Response.json({ ok: true, state: newState });
}
