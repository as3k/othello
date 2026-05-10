'use client';

import { useEffect, useReducer, useCallback, useState, useRef } from 'react';
import { init, tx, id } from '@instantdb/react';
import type { GameState, Position, Player } from './types';
import { gameReducer, createInitialState } from './game-state';
import { isValidMove, placeDisk, countDisks, getGameStatus, getValidMoves } from './board';
import { emptyStats, statsFromGameEnd, STATS_ID, type GlobalStats } from './stats';

// ── Init ─────────────────────────────────────────────

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
if (!APP_ID) throw new Error('NEXT_PUBLIC_INSTANT_APP_ID not set');

export const db = init({ appId: APP_ID });

// ── Player identity ──────────────────────────────────

const PID_KEY = 'oth-pid';

function generateId(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(36).padStart(2, '0'))
    .join('')
    .slice(0, 8);
}

export function getPlayerId(): string {
  if (typeof window === 'undefined') return '';
  // sessionStorage is per-tab, so each browser tab gets a unique ID
  // (avoids two players on same device sharing the same ID)
  let pid = sessionStorage.getItem(PID_KEY);
  if (!pid) {
    pid = generateId();
    sessionStorage.setItem(PID_KEY, pid);
  }
  return pid;
}

const CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < 4; i++)
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return code;
}

// ─── Game doc ────────────────────────────────────

export interface GameDoc {
  id: string;
  code: string;
  state: GameState;
  player1: string;
  player2?: string;
  blackPlayer?: string;
  whitePlayer?: string;
  status: 'waiting' | GameState['status'] | 'abandoned';
  statsRecorded?: boolean;
  leftPlayer?: string;
}

export type OnlinePhase =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'playing'
  | 'finished';

// ─── Stats helpers ───────────────────────────────

async function roomCodeExists(code: string): Promise<boolean> {
  const res = await (db as any).queryOnce({
    games: { $: { where: { code } } },
  });
  return Boolean(res?.data?.games?.length);
}

async function generateUniqueRoomCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateRoomCode();
    if (!(await roomCodeExists(code))) return code;
  }
  throw new Error('Could not generate room code');
}

async function fetchStats(): Promise<GlobalStats> {
  try {
    const res = await (db as any).queryOnce({ stats: {} });
    const doc = res?.data?.stats?.find((s: any) => s.id === STATS_ID);
    if (doc)
      return {
        totalGames: doc.totalGames ?? 0,
        blackWins: doc.blackWins ?? 0,
        whiteWins: doc.whiteWins ?? 0,
        draws: doc.draws ?? 0,
      };
  } catch {}
  return emptyStats();
}

async function recordStats(gameState: GameState) {
  const stats = await fetchStats();
  const inc = statsFromGameEnd(gameState);
  await (db as any).transact(
    tx.stats[STATS_ID].merge({
      totalGames: stats.totalGames + (inc.totalGames ?? 0),
      blackWins: stats.blackWins + (inc.blackWins ?? 0),
      whiteWins: stats.whiteWins + (inc.whiteWins ?? 0),
      draws: stats.draws + (inc.draws ?? 0),
    })
  );
}

// ─── Hook ────────────────────────────────────────

export function useOnlineGame() {
  const [phase, setPhase] = useState<OnlinePhase>('idle');
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [opponentId, setOpponentId] = useState<string | null>(null);
  const [gameUUID, setGameUUID] = useState<string | null>(null);
  const [debugMessage, setDebugMessage] = useState<string>('init');
  const [localState, dispatch] = useReducer(gameReducer, null, createInitialState);

  // Subscribe to the game doc by UUID
  const query = gameUUID
    ? ({ games: { $: { where: { id: gameUUID } } } } as any)
    : null;
  const { data, error: queryError } = (db as any).useQuery?.(query) ?? {
    data: undefined,
    error: undefined,
  };
  const gameDoc: GameDoc | undefined = data?.games?.[0];
  const gameDocRef = useRef<GameDoc | undefined>(undefined);
  useEffect(() => {
    gameDocRef.current = gameDoc;
  }, [gameDoc]);

  // Subscribe to stats
  const { data: statsData } = (db as any).useQuery?.({ stats: {} }) ?? {
    data: undefined,
  };
  const globalStats: GlobalStats | undefined = statsData?.stats?.find(
    (s: any) => s.id === STATS_ID
  );

  // Sync remote state
  const recordedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!gameDoc) return;
    if (queryError) {
      setError('Connection error');
      return;
    }

    const pid = getPlayerId();

    const blackPlayer = gameDoc.blackPlayer ?? gameDoc.player1;
    const whitePlayer = gameDoc.whitePlayer ?? gameDoc.player2;

    if (blackPlayer === pid && myPlayer !== 1) setMyPlayer(1);
    if (whitePlayer === pid && myPlayer !== 2) setMyPlayer(2);

    if (gameDoc.player1 && gameDoc.player1 !== pid && gameDoc.player1 !== opponentId)
      setOpponentId(gameDoc.player1);
    if (gameDoc.player2 && gameDoc.player2 !== pid && gameDoc.player2 !== opponentId)
      setOpponentId(gameDoc.player2);

    if (gameDoc.state) dispatch({ type: 'SET_STATE', state: gameDoc.state });

    if (gameDoc.leftPlayer && gameDoc.leftPlayer !== pid) {
      setError('Opponent left the game');
      setPhase('finished');
    }

    if (gameDoc.player1 && gameDoc.player2 && pid !== gameDoc.player1 && pid !== gameDoc.player2) {
      setError('Room is full');
      setPhase('idle');
    }

    if (gameDoc.status === 'playing' && phase === 'waiting') setPhase('playing');
    if (gameDoc.status !== 'waiting' && gameDoc.status !== 'playing') setPhase('finished');

    // Record stats once per game. Let black player write stats to avoid double-counting.
    if (
      gameDoc.status !== 'waiting' &&
      gameDoc.status !== 'playing' &&
      gameDoc.status !== 'abandoned' &&
      gameDoc.state &&
      gameDoc.blackPlayer === pid &&
      !gameDoc.statsRecorded &&
      recordedRef.current !== gameDoc.id
    ) {
      recordedRef.current = gameDoc.id;
      recordStats(gameDoc.state);
      (db as any).transact(tx.games[gameDoc.id].merge({ statsRecorded: true }));
    }
  }, [
    gameDoc,
    gameDoc?.state,
    gameDoc?.status,
    gameDoc?.player1,
    gameDoc?.player2,
    gameDoc?.blackPlayer,
    gameDoc?.whitePlayer,
    gameDoc?.statsRecorded,
    gameDoc?.leftPlayer,
    queryError,
    myPlayer,
    opponentId,
    phase,
  ]);

  // ── Create room ──

  const createRoom = useCallback(async () => {
    setPhase('creating');
    const uuid = id();
    const pid = getPlayerId();

    try {
      const code = await generateUniqueRoomCode();
      console.log('[createRoom] code:', code, 'uuid:', uuid, 'pid:', pid);
      await (db as any).transact(
        tx.games[uuid].update({
          code,
          state: createInitialState(),
          player1: pid,
          status: 'waiting',
        })
      );
      console.log('[createRoom] transact ok');
      setRoomCode(code);
      setGameUUID(uuid);
      setMyPlayer(1);
      setPhase('waiting');
    } catch (e: any) {
      console.error('[createRoom] error:', e);
      setError(e?.message || 'Failed to create room');
      setPhase('idle');
    }
  }, []);

  // ── Join room ──

  const joinRoom = useCallback(async (code: string) => {
    const c = code.toUpperCase();
    console.log('[joinRoom] code:', c);
    setPhase('waiting');

    try {
      // Find the game by room code
      const res = await (db as any).queryOnce({
        games: { $: { where: { code: c } } },
      });
      console.log('[joinRoom] queryOnce result:', res);
      const game = res?.data?.games?.[0] as GameDoc | undefined;

      if (!game) {
        console.log('[joinRoom] game not found');
        setError('Room not found');
        setPhase('idle');
        return;
      }

      console.log('[joinRoom] found game:', game.id, 'status:', game.status);

      if (game.status !== 'waiting') {
        setError('Game already started or finished');
        setPhase('idle');
        return;
      }

      const pid = getPlayerId();
      console.log('[joinRoom] pid:', pid);

      const creatorIsBlack = Math.random() < 0.5;
      const blackPlayer = creatorIsBlack ? game.player1 : pid;
      const whitePlayer = creatorIsBlack ? pid : game.player1;

      // Join the game and randomly assign colors
      await (db as any).transact(
        tx.games[game.id].merge({
          player2: pid,
          blackPlayer,
          whitePlayer,
          status: 'playing',
        })
      );

      // Race guard: confirm this client actually won the join slot.
      const verifyRes = await (db as any).queryOnce({
        games: { $: { where: { id: game.id } } },
      });
      const verified = verifyRes?.data?.games?.[0] as GameDoc | undefined;
      if (!verified || verified.player2 !== pid) {
        setError('Room filled before you joined');
        setPhase('idle');
        return;
      }

      console.log('[joinRoom] transact ok');

      setRoomCode(c);
      setGameUUID(game.id);
      setMyPlayer(blackPlayer === pid ? 1 : 2);
    } catch (e: any) {
      console.error('[joinRoom] error:', e);
      setError(e?.message || 'Failed to join room');
      setRoomCode(null);
      setPhase('idle');
    }
  }, []);

  // ── Make a move ──

  const sendPass = useCallback(() => {
    const current = gameDocRef.current;
    if (!current) {
      setDebugMessage('pass blocked: no gameDoc');
      return;
    }
    if (!myPlayer) {
      setDebugMessage('pass blocked: no myPlayer');
      return;
    }
    if (current.state.currentPlayer !== myPlayer) {
      setDebugMessage(`pass blocked: turn=${current.state.currentPlayer} me=${myPlayer}`);
      return;
    }
    if (current.state.status !== 'playing') {
      setDebugMessage(`pass blocked: status=${current.state.status}`);
      return;
    }

    const newState: GameState = JSON.parse(JSON.stringify(current.state));
    const opp = myPlayer === 1 ? 2 : 1;
    const { status, nextPlayer } = getGameStatus(newState.board, opp);
    newState.currentPlayer = nextPlayer;
    newState.status = status;
    newState.validMoves = status === 'playing' ? getValidMoves(newState.board, nextPlayer) : [];

    // Optimistic local update
    setDebugMessage('pass sent');
    dispatch({ type: 'SET_STATE', state: newState });

    fetch('/api/game/move', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId: current.id,
        playerId: getPlayerId(),
        type: 'pass',
      }),
    })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error || 'Pass failed');
        if (body?.state) dispatch({ type: 'SET_STATE', state: body.state });
      })
      .catch((e) => setDebugMessage(`pass failed: ${e.message}`));
  }, [myPlayer]);

  const sendMove = useCallback(
    (pos: Position) => {
      const current = gameDocRef.current;
      const cell = `${pos.row},${pos.col}`;
      if (!current) {
        setDebugMessage(`tap ${cell} blocked: no gameDoc`);
        return;
      }
      if (!myPlayer) {
        setDebugMessage(`tap ${cell} blocked: no myPlayer`);
        return;
      }
      if (current.state.currentPlayer !== myPlayer) {
        setDebugMessage(`tap ${cell} blocked: turn=${current.state.currentPlayer} me=${myPlayer}`);
        return;
      }
      if (current.state.status !== 'playing') {
        setDebugMessage(`tap ${cell} blocked: status=${current.state.status}`);
        return;
      }
      if (!isValidMove(current.state.board, myPlayer, pos.row, pos.col)) {
        setDebugMessage(`tap ${cell} blocked: invalid move`);
        return;
      }

      const { newBoard, flipped } = placeDisk(
        current.state.board,
        myPlayer,
        pos.row,
        pos.col
      );
      const opp = myPlayer === 1 ? 2 : 1;
      const { status, nextPlayer } = getGameStatus(newBoard, opp);

      const newState: GameState = JSON.parse(JSON.stringify(current.state));
      newState.board = newBoard;
      newState.currentPlayer = nextPlayer;
      newState.status = status;
      newState.validMoves = status === 'playing' ? getValidMoves(newBoard, nextPlayer) : [];
      newState.moveHistory = [
        ...newState.moveHistory,
        { player: myPlayer, position: pos, flipped, boardAfter: newBoard },
      ];
      newState.lastMove = {
        player: myPlayer,
        position: pos,
        flipped,
        boardAfter: newBoard,
      };

      const [black, white] = countDisks(newBoard);
      newState.blackScore = black;
      newState.whiteScore = white;

      // Optimistic local update
      setDebugMessage(`tap ${cell} sent`);
      dispatch({ type: 'SET_STATE', state: newState });

      fetch('/api/game/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: current.id,
          playerId: getPlayerId(),
          type: 'move',
          position: pos,
        }),
      })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body?.error || 'Move failed');
          if (body?.state) dispatch({ type: 'SET_STATE', state: body.state });
        })
        .catch((e) => setDebugMessage(`tap ${cell} failed: ${e.message}`));
    },
    [myPlayer]
  );

  const restart = useCallback(() => {
    const current = gameDocRef.current;
    if (!current) return;

    const p1 = current.player1;
    const p2 = current.player2;
    if (!p1 || !p2) return;

    let blackPlayer: string;
    let whitePlayer: string;

    if (current.status === 'abandoned') {
      const p1Black = Math.random() < 0.5;
      blackPlayer = p1Black ? p1 : p2;
      whitePlayer = p1Black ? p2 : p1;
    } else if (current.state.status === 'black-wins') {
      blackPlayer = current.blackPlayer ?? p1;
      whitePlayer = current.whitePlayer ?? p2;
    } else if (current.state.status === 'white-wins') {
      blackPlayer = current.whitePlayer ?? p2;
      whitePlayer = current.blackPlayer ?? p1;
    } else {
      const p1Black = Math.random() < 0.5;
      blackPlayer = p1Black ? p1 : p2;
      whitePlayer = p1Black ? p2 : p1;
    }

    const newState = createInitialState();
    dispatch({ type: 'SET_STATE', state: newState });
    (db as any).transact(
      tx.games[current.id].merge({
        state: newState,
        blackPlayer,
        whitePlayer,
        status: 'playing',
        statsRecorded: false,
        leftPlayer: null,
      })
    );
  }, []);

  const leave = useCallback(() => {
    const current = gameDocRef.current;
    const pid = getPlayerId();
    if (current && current.status === 'playing') {
      (db as any).transact(
        tx.games[current.id].merge({ leftPlayer: pid, status: 'abandoned' })
      );
    }

    setGameUUID(null);
    setRoomCode(null);
    setMyPlayer(null);
    setOpponentId(null);
    setError(null);
    dispatch({ type: 'RESTART' });
    setPhase('idle');
  }, []);

  return {
    phase,
    roomCode,
    error,
    myPlayer,
    opponentId,
    gameId: gameUUID,
    playerId: typeof window === 'undefined' ? '' : getPlayerId(),
    state: gameDoc?.state ?? localState,
    globalStats: globalStats ?? emptyStats(),
    debug: {
      message: debugMessage,
      gameUUID,
      hasGameDoc: !!gameDoc,
      docStatus: gameDoc?.status ?? 'none',
      player1: gameDoc?.player1 ?? null,
      player2: gameDoc?.player2 ?? null,
      blackPlayer: gameDoc?.blackPlayer ?? null,
      whitePlayer: gameDoc?.whitePlayer ?? null,
      leftPlayer: gameDoc?.leftPlayer ?? null,
      pid: typeof window === 'undefined' ? '' : getPlayerId(),
    },
    createRoom,
    joinRoom,
    sendMove,
    restart,
    leave,
    sendPass,
  };
}
