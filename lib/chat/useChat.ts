'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/game/online';

export interface ChatMessage {
  from: string;
  text: string;
  ts: number;
}

interface UseChatArgs {
  gameId: string | null;
  playerId: string;
  enabled: boolean;
}

export function useChat({ gameId, playerId, enabled }: UseChatArgs) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [unread, setUnread] = useState(0);
  const roomRef = useRef<any>(null);

  const sendMessage = useCallback(
    (text: string) => {
      if (!enabled || !gameId || !text.trim()) return;
      const msg: ChatMessage = { from: playerId, text: text.trim(), ts: Date.now() };
      setMessages((prev) => [...prev, msg]);
      roomRef.current?.publishTopic('chat-message', msg);
    },
    [enabled, gameId, playerId]
  );

  const markRead = useCallback(() => setUnread(0), []);

  useEffect(() => {
    if (!gameId || !enabled) return;
    const room = (db as any).joinRoom('chat', gameId);
    roomRef.current = room;

    const unsub = room.subscribeTopic('chat-message', (msg: ChatMessage) => {
      if (msg.from === playerId) return;
      setMessages((prev) => {
        if (prev.some((m) => m.ts === msg.ts && m.from === msg.from)) return prev;
        return [...prev, msg];
      });
      setUnread((prev) => prev + 1);
    });

    return () => {
      unsub?.();
      room.leaveRoom?.();
      roomRef.current = null;
    };
  }, [gameId, enabled, playerId]);

  // Clear when game changes
  useEffect(() => {
    setMessages([]);
    setUnread(0);
  }, [gameId]);

  return { messages, unread, sendMessage, markRead };
}
