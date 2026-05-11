'use client';

import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowRightOnRectangleIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import type { Position, Move, BoardSize } from '@/lib/game/types';
import { useOnlineGame, db } from '@/lib/game/online';
import { useChat } from '@/lib/chat/useChat';
import { useBuzzer } from '@/lib/chat/useBuzzer';
import GameScreen from '@/components/GameScreen';
import SizePicker from '@/components/SizePicker';
import { emptyStats } from '@/lib/game/stats';

export default function OnlinePage() {
  const {
    phase,
    roomCode,
    error,
    myPlayer,
    playerId,
    gameId,
    opponentId,
    state,
    globalStats,
    createRoom,
    joinRoom,
    sendMove,
    restart,
    leave,
    sendPass,
    debug,
  } = useOnlineGame();

  const [selectedSize, setSelectedSize] = useState<BoardSize>(8);
  const [joinCode, setJoinCode] = useState('');
  const [showHints, setShowHints] = useState(true);
  const [tapMessage, setTapMessage] = useState('none');
  const connStatus: string = (db as any).useConnectionStatus?.() ?? 'connecting';
  const [connTimeout, setConnTimeout] = useState(false);
  const showDebug = process.env.NODE_ENV === 'development';

  const onlineActive = phase === 'playing' || phase === 'finished';
  const chat = useChat({ gameId, playerId, enabled: onlineActive });
  const buzzer = useBuzzer({ gameId, playerId, enabled: onlineActive });

  useEffect(() => {
    if (connStatus === 'connecting' || connStatus === 'opening') {
      const id = setTimeout(() => setConnTimeout(true), 10000);
      return () => clearTimeout(id);
    }
    setConnTimeout(false);
  }, [connStatus]);

  // ── Flip animation ──
  const [flippingCells, setFlippingCells] = useState<string[] | null>(null);
  const prevLastMoveRef = useRef<Move | null>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (
      state.lastMove &&
      state.lastMove !== prevLastMoveRef.current &&
      state.status === 'playing'
    ) {
      prevLastMoveRef.current = state.lastMove;
      const keys = state.lastMove.flipped.map((p) => `${p.row},${p.col}`);
      if (keys.length > 0) {
        setFlippingCells(keys);
        const total = keys.length * 60 + 700;
        clearTimeout(animTimerRef.current);
        animTimerRef.current = setTimeout(() => setFlippingCells(null), total);
      }
    }
    if (state.status !== 'playing') {
      setFlippingCells(null);
    }
    return () => clearTimeout(animTimerRef.current);
  }, [state.lastMove, state.status]);

  const isAnimating = flippingCells !== null && flippingCells.length > 0;
  const isMyTurn = state.currentPlayer === myPlayer;
  const gameOver = state.status !== 'playing' || phase === 'finished';

  // Auto-pass when my turn and no valid moves
  useEffect(() => {
    if (
      phase === 'playing' &&
      state.status === 'playing' &&
      isMyTurn &&
      state.validMoves.length === 0 &&
      !isAnimating
    ) {
      const id = setTimeout(() => sendPass(), 600);
      return () => clearTimeout(id);
    }
  }, [phase, state.status, isMyTurn, state.validMoves.length, isAnimating, sendPass]);

  const handleCellClick = (pos: Position) => {
    const cell = `${pos.row},${pos.col}`;
    if (isAnimating) {
      setTapMessage(`tap ${cell} blocked: animating`);
      return;
    }
    if (phase !== 'playing') {
      setTapMessage(`tap ${cell} blocked: phase=${phase}`);
      return;
    }
    setTapMessage(`tap ${cell} passed page guard`);
    sendMove(pos);
  };

  if (phase === 'idle') {
    const s = globalStats ?? emptyStats();
    return (
      <div className="fixed inset-0 bg-board-bg flex flex-col items-center justify-center select-none px-6">
        <div className="flex w-full max-w-xs flex-col items-center gap-5">
          <div className="text-center">
            <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/35">Matchmaking</p>
            <h1 className="text-4xl font-black tracking-[0.12em] text-text-light drop-shadow-[0_8px_34px_rgba(0,0,0,0.55)]">
              ONLINE
            </h1>
          </div>

          {connTimeout && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 px-4 py-2 rounded-lg w-full">
              Couldn&apos;t connect to game server. Check your internet or{' '}
              <button onClick={() => window.location.reload()} className="underline">
                retry
              </button>
            </p>
          )}
          {!connTimeout && (connStatus === 'connecting' || connStatus === 'init') && (
            <p className="text-amber-400 text-xs text-center">
              Connecting to game server
              <span className="animate-pulse"> ({connStatus})</span>
            </p>
          )}

          {error && (
            <p className="text-red-400 text-sm text-center bg-red-400/10 px-4 py-2 rounded-lg w-full">
              {error}
            </p>
          )}

          <SizePicker selected={selectedSize} onSelect={setSelectedSize} />

          <button
            onClick={() => createRoom(selectedSize)}
            disabled={connStatus === 'connecting' || connStatus === 'init'}
            className="flex w-full items-center justify-between rounded-[1.35rem] bg-cell-bg px-5 py-4 text-left text-text-light shadow-[0_14px_40px_rgba(0,0,0,0.28)] ring-1 ring-emerald-200/15 transition active:scale-[0.98] active:brightness-95 disabled:opacity-35"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/45">Host</span>
              <span className="mt-0.5 block text-lg font-black">
                {connStatus === 'connecting' || connStatus === 'init' ? 'Connecting...' : 'Create room'}
              </span>
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/18 ring-1 ring-white/10">
              <PlusIcon className="h-5 w-5 text-text-light/75" />
            </span>
          </button>

          <div className="w-full rounded-[1.35rem] bg-white/[0.075] p-3 ring-1 ring-white/[0.08]">
            <label className="mb-2 block px-1 text-[10px] font-black uppercase tracking-[0.22em] text-text-light/32">
              Join with code
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={4}
                placeholder="DUCK"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="min-w-0 flex-1 rounded-2xl bg-black/18 px-4 py-3 text-center text-lg font-black uppercase tracking-[0.24em] text-text-light placeholder:text-text-light/18 ring-1 ring-white/[0.08] focus:outline-none focus:ring-emerald-200/25"
              />
              <button
                onClick={() => joinCode.length >= 4 && joinRoom(joinCode)}
                disabled={joinCode.length < 4}
                className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.10] text-text-light ring-1 ring-white/10 active:scale-95 active:bg-white/[0.15] disabled:opacity-30"
                aria-label="Join room"
              >
                <ArrowRightOnRectangleIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-text-light/35 active:bg-white/[0.06]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Back
          </button>

          {s.totalGames > 0 && (
            <p className="text-text-light/25 text-xs text-center pt-2 border-t border-text-light/10 w-full">
              {s.totalGames} game{s.totalGames !== 1 ? 's' : ''} &middot;
              <span className="inline-flex items-center gap-0.5 mx-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-900 inline-block" />
                {s.blackWins}
              </span>
              &middot;
              <span className="inline-flex items-center gap-0.5 mx-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white border border-gray-400 inline-block" />
                {s.whiteWins}
              </span>
              {s.draws > 0 && <> &middot; {s.draws} draw{s.draws !== 1 ? 's' : ''}</>}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'creating' || phase === 'waiting') {
    return (
      <div className="fixed inset-0 bg-board-bg flex flex-col items-center justify-center select-none px-6">
        <div className="flex w-full max-w-xs flex-col items-center gap-5 rounded-[1.75rem] bg-black/16 p-5 text-center ring-1 ring-white/[0.06] backdrop-blur-sm">
          {error && (
            <p className="w-full rounded-2xl bg-red-400/10 px-4 py-3 text-sm text-red-200 ring-1 ring-red-200/10">
              {error}
            </p>
          )}

          {roomCode && (
            <div>
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.24em] text-text-light/35">Share code</p>
              <p className="text-5xl font-black tracking-[0.22em] text-text-light drop-shadow-[0_8px_34px_rgba(0,0,0,0.55)]">
                {roomCode}
              </p>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-full bg-white/[0.08] px-4 py-2 text-text-light/55 ring-1 ring-white/[0.08]">
            <div className="h-3 w-3 rounded-full border-2 border-text-light/50 animate-spin border-t-transparent" />
            <span className="text-sm">
              {roomCode ? 'Waiting for opponent' : 'Creating room'}
            </span>
          </div>

          <button
            onClick={leave}
            className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm text-text-light/35 active:bg-white/[0.06]"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <GameScreen
      mode="online"
      roomCode={roomCode}
      state={state}
      myPlayer={myPlayer}
      isMyTurn={isMyTurn}
      isAnimating={isAnimating}
      flippingCells={flippingCells}
      showHints={showHints}
      setShowHints={setShowHints}
      validMoves={isAnimating ? [] : isMyTurn ? state.validMoves : []}
      currentPlayer={gameOver ? null : state.currentPlayer}
      gameOver={gameOver}
      statusText={error}
      playerId={playerId}
      buzzer={buzzer}
      chat={chat}
      onCellClick={handleCellClick}
      onRestart={restart}
      onLeave={leave}
      debugNode={
        showDebug ? (
          <div className="absolute left-2 top-16 z-50 max-w-[92vw] rounded-lg bg-black/75 px-3 py-2 font-mono text-[10px] leading-tight text-lime-200 shadow-xl ring-1 ring-lime-400/30">
            <div>conn={connStatus} phase={phase} doc={String(debug.hasGameDoc)} docStatus={debug.docStatus}</div>
            <div>me={myPlayer ?? 'null'} turn={state.currentPlayer} myTurn={String(isMyTurn)} valid={state.validMoves.length} moves={state.moveHistory.length}</div>
            <div>room={roomCode ?? 'null'} uuid={debug.gameUUID?.slice(0, 8) ?? 'null'} pid={debug.pid?.slice(-4) ?? 'null'}</div>
            <div>p1={debug.player1?.slice(-4) ?? 'null'} p2={debug.player2?.slice(-4) ?? 'null'}</div>
            <div>black={debug.blackPlayer?.slice(-4) ?? 'null'} white={debug.whitePlayer?.slice(-4) ?? 'null'}</div>
            <div>tap={tapMessage}</div>
            <div>send={debug.message}</div>
          </div>
        ) : null
      }
    />
  );
}
