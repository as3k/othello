'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftStartOnRectangleIcon,
  ArrowTopRightOnSquareIcon,
  Bars2Icon,
  ChevronRightIcon,
  ClockIcon,
  InformationCircleIcon,
  MicrophoneIcon,
  PhoneXMarkIcon,
  SpeakerXMarkIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import type { GameState, Move, Player, Position } from '@/lib/game/types';
import { countDisks } from '@/lib/game/board';
import Board from './Board';

interface VoiceControls {
  available: boolean;
  status: 'off' | 'requested' | 'connecting' | 'connected' | 'failed';
  incoming: boolean;
  muted: boolean;
  error: string | null;
  localLevel: number;
  remoteLevel: number;
  start: () => void;
  accept: () => void;
  toggleMute: () => void;
  hangUp: () => void;
}

interface GameScreenProps {
  mode: 'local' | 'online';
  roomCode?: string | null;
  state: GameState;
  myPlayer?: Player | null;
  isMyTurn: boolean;
  isAnimating: boolean;
  flippingCells: string[] | null;
  showHints: boolean;
  setShowHints: (fn: (value: boolean) => boolean) => void;
  validMoves: Position[];
  currentPlayer: Player | null;
  gameOver: boolean;
  statusText?: string | null;
  voice?: VoiceControls;
  debugNode?: React.ReactNode;
  onCellClick: (pos: Position) => void;
  onRestart: () => void;
  onLeave: () => void;
}

export default function GameScreen({
  mode,
  roomCode,
  state,
  myPlayer,
  isMyTurn,
  isAnimating,
  flippingCells,
  showHints,
  setShowHints,
  validMoves,
  currentPlayer,
  gameOver,
  statusText,
  voice,
  debugNode,
  onCellClick,
  onRestart,
  onLeave,
}: GameScreenProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [confirmLeaveOpen, setConfirmLeaveOpen] = useState(false);
  const [previewMoveIndex, setPreviewMoveIndex] = useState<number | null>(null);

  const previewMove =
    previewMoveIndex !== null ? state.moveHistory[previewMoveIndex] : null;
  const displayState = useMemo(() => {
    if (!previewMove) return state;
    const [blackScore, whiteScore] = countDisks(previewMove.boardAfter);
    return {
      ...state,
      board: previewMove.boardAfter,
      blackScore,
      whiteScore,
      lastMove: previewMove,
      validMoves: [],
    };
  }, [previewMove, state]);
  const isPreviewing = previewMoveIndex !== null && !!previewMove;

  const scoreDiff = displayState.blackScore - displayState.whiteScore;
  const scoreLeader =
    scoreDiff > 0
      ? `Black +${scoreDiff}`
      : scoreDiff < 0
      ? `White +${Math.abs(scoreDiff)}`
      : 'Even';

  const colorLabel =
    mode === 'online'
      ? `You are ${myPlayer === 1 ? 'Black' : 'White'}`
      : `${displayState.currentPlayer === 1 ? 'Black' : 'White'} to move`;

  const turnLabel = isPreviewing
    ? `Move ${(previewMoveIndex ?? 0) + 1}`
    : isAnimating
    ? 'Flipping'
    : mode === 'online'
    ? isMyTurn
      ? 'Your turn'
      : 'Waiting'
    : 'Your turn';

  const voiceActive = voice && voice.status !== 'off';

  const recentMoves = state.moveHistory
    .map((move, index) => ({ move, index }))
    .slice(-2)
    .reverse();

  const formatMove = (move: Move, index: number) => {
    const col = String.fromCharCode(65 + move.position.col);
    const row = move.position.row + 1;
    return `${index + 1}. ${move.player === 1 ? 'Black' : 'White'} ${col}${row}`;
  };

  return (
    <div className="fixed inset-0 bg-board-bg flex items-center justify-center select-none">
      {/* Top room/menu bar */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 bg-black/20 backdrop-blur-sm"
        style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 0.5rem)', paddingBottom: '0.5rem' }}
      >
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold tracking-[0.18em] text-text-light/65">
          {mode === 'online' ? roomCode ?? 'ONLINE' : 'LOCAL'}
        </div>
        <button
          onClick={() => setSettingsOpen(true)}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.09] text-text-light/65 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-white/10 active:scale-95 active:bg-white/15"
          aria-label="Open menu"
        >
          <Bars2Icon className="h-5 w-5" />
        </button>
      </div>

      <Board
        board={displayState.board}
        validMoves={isPreviewing ? [] : validMoves}
        lastMove={displayState.lastMove?.position ?? null}
        gameOver={gameOver || isPreviewing}
        onCellClick={isPreviewing ? () => undefined : onCellClick}
        showHints={showHints}
        currentPlayer={isPreviewing ? null : currentPlayer}
        flippingCells={flippingCells}
      />

      {voiceActive && (
        <div
          className="absolute left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full bg-black/35 px-3 py-2 text-text-light/70 backdrop-blur-sm ring-1 ring-white/10"
          style={{ top: 'calc(50% + 46vmin + 2.7rem)' }}
        >
          {[voice.localLevel, voice.remoteLevel].map((level, side) => (
            <div key={side} className="flex items-end gap-0.5">
              {[0.35, 0.65, 1, 0.55].map((scale, i) => (
                <span
                  key={i}
                  className={`w-1 rounded-full ${side === 0 ? 'bg-emerald-200/70' : 'bg-sky-200/70'}`}
                  style={{ height: `${5 + Math.max(0.08, level) * scale * 18}px` }}
                />
              ))}
            </div>
          ))}
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-light/40">
            {voice.status === 'connected' ? (voice.muted ? 'Muted' : 'Voice') : voice.incoming ? 'Join?' : 'Voice…'}
          </span>
        </div>
      )}

      {!gameOver && (
        <div
          className="absolute left-1/2 z-20 -translate-x-1/2 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium tracking-wide text-text-light/65 backdrop-blur-sm ring-1 ring-white/10"
          style={{ top: 'calc(50% + 46vmin + 0.75rem)' }}
        >
          <span className="inline-flex items-center gap-1.5">
            {colorLabel}
            <span
              className={`inline-block h-2.5 w-2.5 rounded-full ${
                (mode === 'online' ? myPlayer : displayState.currentPlayer) === 1
                  ? 'bg-gray-900 ring-1 ring-white/20'
                  : 'bg-white ring-1 ring-gray-400'
              }`}
            />
            <span className="text-text-light/25">·</span>
            {turnLabel}
          </span>
        </div>
      )}

      {/* Bottom player strip */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between gap-3 px-4 bg-black/24 backdrop-blur-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 0.75rem)', paddingTop: '0.75rem' }}
      >
        <div className="flex min-w-16 items-center gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <span className="h-3.5 w-3.5 rounded-full bg-gray-900 ring-1 ring-white/15" />
          <span className="text-sm font-black tabular-nums text-text-light">{displayState.blackScore}</span>
        </div>

        <div className="flex flex-col items-center leading-tight">
          {isPreviewing ? (
            <>
              <span className="text-xs font-bold text-amber-100">
                Move {(previewMoveIndex ?? 0) + 1} preview
              </span>
              <button
                onClick={() => setPreviewMoveIndex(null)}
                className="mt-1 rounded-full bg-white/12 px-3 py-1 text-[11px] font-bold text-text-light active:bg-white/20"
              >
                Back to live
              </button>
            </>
          ) : gameOver ? (
            <>
              <span className="text-xs font-bold text-text-light">
                {statusText ??
                  (state.status === 'black-wins'
                    ? 'Black wins'
                    : state.status === 'white-wins'
                    ? 'White wins'
                    : 'Draw')}
              </span>
              <button
                onClick={onRestart}
                className="mt-1 rounded-full bg-emerald-500/80 px-3 py-1 text-[11px] font-bold text-text-light active:bg-emerald-600"
              >
                Play again
              </button>
            </>
          ) : isMyTurn && state.validMoves.length === 0 ? (
            <span className="text-xs font-medium text-amber-300 animate-pulse">Passing...</span>
          ) : (
            <>
              <span className="text-[11px] text-text-light/45">{displayState.moveHistory.length} moves</span>
              <span className="text-[11px] font-medium text-text-light/55">{scoreLeader}</span>
            </>
          )}
        </div>

        <div className="flex min-w-16 items-center justify-end gap-2 rounded-full bg-white/10 px-3 py-1.5">
          <span className="text-sm font-black tabular-nums text-text-light">{displayState.whiteScore}</span>
          <span className="h-3.5 w-3.5 rounded-full bg-white ring-1 ring-gray-400" />
        </div>
      </div>

      <button
        className={`absolute inset-0 z-30 bg-black/45 transition-[opacity,backdrop-filter] duration-300 ease-out ${
          settingsOpen
            ? 'pointer-events-auto opacity-100 backdrop-blur-md'
            : 'pointer-events-none opacity-0 backdrop-blur-0'
        }`}
        aria-label="Close settings"
        onClick={() => setSettingsOpen(false)}
      />

      <div
        className={`absolute bottom-0 left-0 right-0 z-40 rounded-t-[2rem] bg-[linear-gradient(180deg,rgba(19,52,41,0.98),rgba(7,27,21,0.98))] px-4 pb-6 pt-3 text-text-light shadow-[0_-24px_80px_rgba(0,0,0,0.45)] ring-1 ring-white/10 backdrop-blur-2xl transition-transform duration-300 ease-out ${
          settingsOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.25rem)' }}
      >
        <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-white/18" />
        <div className="mx-auto flex max-h-[75dvh] max-w-sm flex-col gap-4 overflow-y-auto overscroll-contain pb-1">
          <div className="flex items-start justify-between px-1">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/45">
                {mode === 'online' ? 'Online match' : 'Pass and play'}
              </p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Menu</h2>
              <p className="mt-1 text-xs text-text-light/42">
                {mode === 'online'
                  ? `Room ${roomCode ?? '—'} · ${myPlayer === 1 ? 'Black' : 'White'}`
                  : `${displayState.moveHistory.length} moves · ${scoreLeader}`}
              </p>
            </div>
            <button
              onClick={() => setSettingsOpen(false)}
              className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-text-light/55 ring-1 ring-white/10 active:scale-95 active:bg-white/14"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-hidden rounded-[1.35rem] bg-white/[0.075] ring-1 ring-white/[0.08]">
            <button
              onClick={() => setShowHints((v) => !v)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left active:bg-white/[0.06]"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-300/10 ring-1 ring-emerald-200/10">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-200/80" />
                </span>
                <span>
                  <span className="block text-sm font-bold">Move hints</span>
                  <span className="text-xs text-text-light/40">Show legal move dots</span>
                </span>
              </span>
              <span
                className={`relative h-7 w-12 rounded-full transition-colors ${
                  showHints ? 'bg-emerald-400/70' : 'bg-white/14'
                }`}
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-lg transition-transform ${
                    showHints ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
            </button>

            {voice && (
              <>
                <div className="mx-4 h-px bg-white/[0.07]" />
                <div className="px-4 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-full bg-sky-300/10 ring-1 ring-sky-200/10">
                        <MicrophoneIcon className="h-5 w-5 text-sky-100/65" />
                      </span>
                      <span>
                        <span className="block text-sm font-bold">Voice chat</span>
                        <span className="text-xs text-text-light/40">
                          {voice.error
                            ? voice.error
                            : voice.status === 'connected'
                            ? 'Connected'
                            : voice.incoming
                            ? 'Someone wants to talk'
                            : voice.available
                            ? 'Talk while you play'
                            : 'Available online'}
                        </span>
                      </span>
                    </span>
                    {voice.status === 'connected' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={voice.toggleMute}
                          className={`grid h-9 w-9 place-items-center rounded-full ring-1 active:scale-95 ${
                            voice.muted
                              ? 'bg-amber-300/20 text-amber-100 ring-amber-200/15'
                              : 'bg-white/[0.08] text-text-light/65 ring-white/10'
                          }`}
                          aria-label={voice.muted ? 'Unmute' : 'Mute'}
                        >
                          {voice.muted ? <SpeakerXMarkIcon className="h-5 w-5" /> : <MicrophoneIcon className="h-5 w-5" />}
                        </button>
                        <button
                          onClick={voice.hangUp}
                          className="grid h-9 w-9 place-items-center rounded-full bg-red-500/20 text-red-100 ring-1 ring-red-200/15 active:scale-95"
                          aria-label="Hang up"
                        >
                          <PhoneXMarkIcon className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={voice.incoming ? voice.accept : voice.start}
                        disabled={!voice.available || voice.status === 'connecting' || voice.status === 'requested'}
                        className="rounded-full bg-sky-300/14 px-3 py-1.5 text-[11px] font-black text-sky-100 ring-1 ring-sky-200/10 active:bg-sky-300/20 disabled:opacity-40"
                      >
                        {voice.incoming ? 'Join' : voice.status === 'connecting' || voice.status === 'requested' ? 'Starting' : 'Start'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}

            <div className="mx-4 h-px bg-white/[0.07]" />

            <button
              onClick={() => setAboutOpen(true)}
              className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left active:bg-white/[0.06]"
            >
              <span className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/8 ring-1 ring-white/10">
                  <InformationCircleIcon className="h-5 w-5 text-text-light/55" />
                </span>
                <span>
                  <span className="block text-sm font-bold">About this game</span>
                  <span className="text-xs text-text-light/40">Open source and disclaimer</span>
                </span>
              </span>
              <ChevronRightIcon className="h-5 w-5 text-text-light/25" />
            </button>
          </div>

          {state.moveHistory.length > 0 && (
            <div className="overflow-hidden rounded-[1.35rem] bg-white/[0.075] ring-1 ring-white/[0.08]">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-amber-300/10 ring-1 ring-amber-200/10">
                    <ClockIcon className="h-5 w-5 text-amber-100/65" />
                  </span>
                  <span>
                    <span className="block text-sm font-bold">Recent moves</span>
                    <span className="text-xs text-text-light/40">Tap one to preview the board</span>
                  </span>
                </span>
                {isPreviewing && (
                  <button
                    onClick={() => setPreviewMoveIndex(null)}
                    className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-black text-text-light/65 active:bg-white/15"
                  >
                    Live
                  </button>
                )}
              </div>
              <div className="mx-4 h-px bg-white/[0.07]" />
              <div className="py-1">
                {recentMoves.map(({ move, index }) => {
                  const active = previewMoveIndex === index;
                  return (
                    <button
                      key={`${index}-${move.position.row}-${move.position.col}`}
                      onClick={() => {
                        setPreviewMoveIndex(index);
                        setSettingsOpen(false);
                      }}
                      className={`flex w-full items-center justify-between px-4 py-2.5 text-left active:bg-white/[0.06] ${
                        active ? 'bg-amber-300/10 text-amber-50' : 'text-text-light/72'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            move.player === 1 ? 'bg-gray-900 ring-1 ring-white/15' : 'bg-white ring-1 ring-gray-400'
                          }`}
                        />
                        <span className="text-sm font-semibold">{formatMove(move, index)}</span>
                      </span>
                      <span className="text-xs text-text-light/35">+{move.flipped.length}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button
            onClick={() => setConfirmLeaveOpen(true)}
            className="flex items-center justify-between rounded-[1.35rem] bg-red-500/[0.10] px-4 py-4 text-left text-red-100 ring-1 ring-red-300/10 active:bg-red-500/[0.16]"
          >
            <span className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-red-400/10 ring-1 ring-red-200/10">
                <ArrowLeftStartOnRectangleIcon className="h-5 w-5 text-red-100/70" />
              </span>
              <span>
                <span className="block text-sm font-bold">{mode === 'online' ? 'Leave game' : 'Exit game'}</span>
                <span className="text-xs text-red-100/45">
                  {mode === 'online' ? 'Notify opponent and leave' : 'Return to home'}
                </span>
              </span>
            </span>
            <ChevronRightIcon className="h-5 w-5 text-red-100/30" />
          </button>
        </div>
      </div>

      {confirmLeaveOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-md">
          <div className="w-full max-w-xs rounded-[1.75rem] bg-[linear-gradient(180deg,#133429,#071b15)] p-5 text-text-light shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <div className="mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-red-400/10 ring-1 ring-red-200/10">
              <ArrowLeftStartOnRectangleIcon className="h-6 w-6 text-red-100/75" />
            </div>
            <h2 className="text-xl font-black tracking-tight">{mode === 'online' ? 'Leave game?' : 'Exit game?'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-text-light/58">
              {mode === 'online'
                ? 'This will end your session and tell the other player you left.'
                : 'Your local game progress will be lost.'}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                onClick={() => setConfirmLeaveOpen(false)}
                className="rounded-2xl bg-white/[0.09] py-3 text-sm font-black text-text-light/80 ring-1 ring-white/10 active:bg-white/[0.14]"
              >
                Stay
              </button>
              <button
                onClick={onLeave}
                className="rounded-2xl bg-red-500/25 py-3 text-sm font-black text-red-50 ring-1 ring-red-200/15 active:bg-red-500/35"
              >
                {mode === 'online' ? 'Leave' : 'Exit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {aboutOpen && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/65 px-5 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-[1.75rem] bg-[linear-gradient(180deg,#133429,#071b15)] p-5 text-text-light shadow-[0_24px_90px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200/45">Open source</p>
                <h2 className="mt-1 text-2xl font-black tracking-tight">Othello</h2>
              </div>
              <button
                onClick={() => setAboutOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full bg-white/[0.08] text-text-light/55 ring-1 ring-white/10 active:bg-white/14"
                aria-label="Close about"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-[1.25rem] bg-black/18 p-4 text-sm leading-relaxed text-text-light/68 ring-1 ring-white/[0.06]">
              <p>
                This game is offered free and open source. We are not affiliated with, endorsed by, or associated with any original creator, publisher, trademark owner, or rights holder of Othello/Reversi.
              </p>
              <p className="mt-3">
                We do not claim ownership over any third-party names, marks, rules, or related intellectual property. This project is a fan-made implementation for play and learning.
              </p>
            </div>

            <a
              href="https://github.com/as3k/othello"
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex items-center justify-between rounded-[1.25rem] bg-emerald-300/10 px-4 py-3 text-sm font-bold text-emerald-100 ring-1 ring-emerald-200/10 active:bg-emerald-300/15"
            >
              <span className="min-w-0">
                <span className="block text-[10px] uppercase tracking-wider text-emerald-100/45">Repository</span>
                <span className="block truncate">github.com/as3k/othello</span>
              </span>
              <ArrowTopRightOnSquareIcon className="h-5 w-5 shrink-0 text-emerald-100/40" />
            </a>
          </div>
        </div>
      )}

      {debugNode}
    </div>
  );
}
