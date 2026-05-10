'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { db } from '@/lib/game/online';

type VoiceStatus = 'off' | 'requested' | 'connecting' | 'connected' | 'failed';

type SignalMessage = {
  from: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

interface UseVoiceChatArgs {
  gameId: string | null;
  playerId: string;
  opponentId: string | null;
  enabled: boolean;
}

function getIceServers(): RTCIceServer[] {
  const servers: RTCIceServer[] = [];
  const stun = process.env.NEXT_PUBLIC_WEBRTC_STUN_URL || 'stun:stun.l.google.com:19302';
  servers.push({ urls: stun });

  const turn = process.env.NEXT_PUBLIC_WEBRTC_TURN_URL;
  const username = process.env.NEXT_PUBLIC_WEBRTC_TURN_USERNAME;
  const credential = process.env.NEXT_PUBLIC_WEBRTC_TURN_CREDENTIAL;
  if (turn && username && credential) {
    servers.push({ urls: turn, username, credential });
  }

  return servers;
}

function attachAnalyser(stream: MediaStream, onLevel: (level: number) => void) {
  const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextCtor) return () => undefined;

  const ctx = new AudioContextCtor();
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  const source = ctx.createMediaStreamSource(stream);
  source.connect(analyser);
  const data = new Uint8Array(analyser.frequencyBinCount);
  let raf = 0;
  let stopped = false;

  const tick = () => {
    if (stopped) return;
    analyser.getByteFrequencyData(data);
    const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
    onLevel(Math.min(1, avg / 90));
    raf = requestAnimationFrame(tick);
  };
  tick();

  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
    source.disconnect();
    ctx.close().catch(() => undefined);
  };
}

export function useVoiceChat({ gameId, playerId, opponentId, enabled }: UseVoiceChatArgs) {
  const [status, setStatus] = useState<VoiceStatus>('off');
  const [incoming, setIncoming] = useState(false);
  const [muted, setMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localLevel, setLocalLevel] = useState(0);
  const [remoteLevel, setRemoteLevel] = useState(0);

  const roomRef = useRef<any>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const remoteOfferRef = useRef<RTCSessionDescriptionInit | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const cleanupLocalAnalyserRef = useRef<(() => void) | null>(null);
  const cleanupRemoteAnalyserRef = useRef<(() => void) | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);

  const canUseVoice = Boolean(gameId && playerId && opponentId && enabled);
  const isInitiator = Boolean(playerId && opponentId && playerId < opponentId);

  const publish = useCallback((topic: string, payload: Omit<SignalMessage, 'from'> = {}) => {
    roomRef.current?.publishTopic(topic, { ...payload, from: playerId });
  }, [playerId]);

  const cleanup = useCallback((notify = true) => {
    if (notify && status !== 'off') publish('voice-hangup');
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    localStreamRef.current = null;
    remoteStreamRef.current?.getTracks().forEach((track) => track.stop());
    remoteStreamRef.current = null;
    cleanupLocalAnalyserRef.current?.();
    cleanupRemoteAnalyserRef.current?.();
    cleanupLocalAnalyserRef.current = null;
    cleanupRemoteAnalyserRef.current = null;
    remoteOfferRef.current = null;
    pendingIceRef.current = [];
    setLocalLevel(0);
    setRemoteLevel(0);
    setMuted(false);
    setIncoming(false);
    setStatus('off');
  }, [publish, status]);

  const ensureAudioElement = () => {
    if (remoteAudioRef.current) return remoteAudioRef.current;
    const audio = new Audio();
    audio.autoplay = true;
    audio.setAttribute('playsinline', 'true');
    remoteAudioRef.current = audio;
    return audio;
  };

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current;
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    localStreamRef.current = stream;
    cleanupLocalAnalyserRef.current = attachAnalyser(stream, setLocalLevel);
    return stream;
  }, []);

  const ensurePeerConnection = useCallback(async () => {
    if (pcRef.current) return pcRef.current;
    const pc = new RTCPeerConnection({ iceServers: getIceServers() });
    pcRef.current = pc;

    const stream = await ensureLocalStream();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));

    pc.onicecandidate = (event) => {
      if (event.candidate) publish('voice-ice', { candidate: event.candidate.toJSON() });
    };

    pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      remoteStreamRef.current = stream;
      const audio = ensureAudioElement();
      audio.srcObject = stream;
      audio.play().catch(() => undefined);
      cleanupRemoteAnalyserRef.current?.();
      cleanupRemoteAnalyserRef.current = attachAnalyser(stream, setRemoteLevel);
      setStatus('connected');
      setIncoming(false);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') setStatus('connected');
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        setStatus('failed');
      }
    };

    return pc;
  }, [ensureLocalStream, publish]);

  const flushPendingIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const pending = pendingIceRef.current.splice(0);
    for (const candidate of pending) {
      await pc.addIceCandidate(candidate).catch(() => undefined);
    }
  }, []);

  const makeOffer = useCallback(async () => {
    const pc = await ensurePeerConnection();
    setStatus('connecting');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    publish('voice-offer', { sdp: offer });
  }, [ensurePeerConnection, publish]);

  const acceptOffer = useCallback(async () => {
    const offer = remoteOfferRef.current;
    if (!offer) return;
    const pc = await ensurePeerConnection();
    setStatus('connecting');
    await pc.setRemoteDescription(offer);
    await flushPendingIce();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    publish('voice-answer', { sdp: answer });
    setIncoming(false);
  }, [ensurePeerConnection, flushPendingIce, publish]);

  const start = useCallback(async () => {
    if (!canUseVoice) return;
    setError(null);
    try {
      setStatus('requested');
      await ensureLocalStream();
      publish('voice-ready');
      if (remoteOfferRef.current) {
        await acceptOffer();
      } else if (isInitiator) {
        await makeOffer();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone unavailable');
      setStatus('failed');
    }
  }, [acceptOffer, canUseVoice, ensureLocalStream, isInitiator, makeOffer, publish]);

  const toggleMute = useCallback(() => {
    const next = !muted;
    localStreamRef.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  useEffect(() => {
    if (!gameId || !playerId) return;
    const room = (db as any).joinRoom('voice', gameId);
    roomRef.current = room;

    const unsubReady = room.subscribeTopic('voice-ready', (msg: SignalMessage) => {
      if (msg.from === playerId) return;
      setIncoming(true);
      if (isInitiator && localStreamRef.current && !pcRef.current) makeOffer().catch(() => setStatus('failed'));
    });

    const unsubOffer = room.subscribeTopic('voice-offer', (msg: SignalMessage) => {
      if (msg.from === playerId || !msg.sdp) return;
      remoteOfferRef.current = msg.sdp;
      setIncoming(true);
      if (localStreamRef.current) acceptOffer().catch(() => setStatus('failed'));
    });

    const unsubAnswer = room.subscribeTopic('voice-answer', async (msg: SignalMessage) => {
      if (msg.from === playerId || !msg.sdp) return;
      const pc = pcRef.current;
      if (!pc) return;
      await pc.setRemoteDescription(msg.sdp).catch(() => undefined);
      await flushPendingIce();
    });

    const unsubIce = room.subscribeTopic('voice-ice', async (msg: SignalMessage) => {
      if (msg.from === playerId || !msg.candidate) return;
      const pc = pcRef.current;
      if (!pc?.remoteDescription) {
        pendingIceRef.current.push(msg.candidate);
        return;
      }
      await pc.addIceCandidate(msg.candidate).catch(() => undefined);
    });

    const unsubHangup = room.subscribeTopic('voice-hangup', (msg: SignalMessage) => {
      if (msg.from === playerId) return;
      cleanup(false);
    });

    return () => {
      unsubReady?.();
      unsubOffer?.();
      unsubAnswer?.();
      unsubIce?.();
      unsubHangup?.();
      room.leaveRoom?.();
      roomRef.current = null;
    };
  }, [acceptOffer, cleanup, flushPendingIce, gameId, isInitiator, makeOffer, playerId]);

  useEffect(() => {
    if (!gameId) cleanup(false);
  }, [cleanup, gameId]);

  return {
    available: canUseVoice,
    status,
    incoming,
    muted,
    error,
    localLevel,
    remoteLevel,
    start,
    accept: start,
    toggleMute,
    hangUp: () => cleanup(true),
  };
}
