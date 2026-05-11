'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/game/online';

interface UseBuzzerArgs {
  gameId: string | null;
  playerId: string;
  enabled: boolean;
}

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 880;
    gain.gain.value = 0.15;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {}
}

export function useBuzzer({ gameId, playerId, enabled }: UseBuzzerArgs) {
  const [buzzing, setBuzzing] = useState(false);
  const cooldownRef = useRef(0);
  const roomRef = useRef<any>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sendBuzz = useCallback(() => {
    if (!enabled || !gameId) return;
    const now = Date.now();
    if (now - cooldownRef.current < 1200) return;
    cooldownRef.current = now;
    roomRef.current?.publishTopic('buzz', { from: playerId });
  }, [enabled, gameId, playerId]);

  useEffect(() => {
    if (!gameId || !enabled) return;
    const room = (db as any).joinRoom('buzzer', gameId);
    roomRef.current = room;

    const unsub = room.subscribeTopic('buzz', (msg: { from: string }) => {
      if (msg.from === playerId) return;
      setBuzzing(true);
      playBeep();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setBuzzing(false), 800);
    });

    return () => {
      unsub?.();
      room.leaveRoom?.();
      roomRef.current = null;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameId, enabled, playerId]);

  return { sendBuzz, buzzing };
}
