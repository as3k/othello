'use client';

import { init } from '@instantdb/react';
import { emptyStats, STATS_ID, type GlobalStats } from '@/lib/game/stats';

const APP_ID = process.env.NEXT_PUBLIC_INSTANT_APP_ID!;
const db = init({ appId: APP_ID });

export default function StatsDisplay() {
  const { data, error } = (db as any).useQuery?.({ stats: {} }) ?? {
    data: undefined,
    error: undefined,
  };

  const stats: GlobalStats | undefined = data?.stats?.find(
    (s: any) => s.id === STATS_ID
  );
  const s = stats ?? emptyStats();

  if (error) return null;
  if (!stats) return null;
  if (s.totalGames === 0) return null;

  return (
    <div className="w-full rounded-[1.25rem] bg-black/16 px-4 py-3 text-center text-xs text-text-light/42 ring-1 ring-white/[0.06] backdrop-blur-sm">
      <div className="mb-2 text-[10px] font-black uppercase tracking-[0.22em] text-text-light/25">
        Global board
      </div>
      <div className="flex items-center justify-center gap-3">
        <span>{s.totalGames} played</span>
        <span className="h-1 w-1 rounded-full bg-text-light/20" />
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-gray-900 ring-1 ring-white/15" />
          {s.blackWins}
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-white ring-1 ring-gray-400" />
          {s.whiteWins}
        </span>
        {(s.draws ?? 0) > 0 && <span>{s.draws} draw{s.draws !== 1 ? 's' : ''}</span>}
      </div>
    </div>
  );
}
