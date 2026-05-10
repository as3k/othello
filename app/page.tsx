import Link from 'next/link';
import { GlobeAltIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import StatsDisplay from '@/components/StatsDisplay';

export default function Home() {
  return (
    <main className="fixed inset-0 bg-board-bg flex flex-col items-center justify-center select-none px-6">
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent calc(100%/8 - 1px), #D8E5DE calc(100%/8 - 1px), #D8E5DE calc(100%/8)), ' +
            'repeating-linear-gradient(90deg, transparent, transparent calc(100%/8 - 1px), #D8E5DE calc(100%/8 - 1px), #D8E5DE calc(100%/8))',
          backgroundSize: 'min(92vmin, 92vh) min(92vmin, 92vh)',
          backgroundPosition: 'center center',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,229,222,0.08),transparent_45%)]" />

      <div className="relative flex w-full max-w-sm flex-col items-center gap-7">
        <div className="rounded-[1.4rem] bg-black/18 p-3 shadow-[0_24px_80px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm animate-bob">
          <div className="rounded-xl bg-board-border p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
            <div className="grid grid-cols-2 gap-px bg-board-border">
              <div className="w-11 h-11 bg-cell-bg rounded-md flex items-center justify-center">
                <div className="w-[74%] h-[74%] rounded-full bg-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]" />
              </div>
              <div className="w-11 h-11 bg-cell-bg rounded-md flex items-center justify-center">
                <div className="w-[74%] h-[74%] rounded-full bg-gray-900 shadow-[inset_0_2px_5px_rgba(255,255,255,0.25)]" />
              </div>
              <div className="w-11 h-11 bg-cell-bg rounded-md flex items-center justify-center">
                <div className="w-[74%] h-[74%] rounded-full bg-gray-900 shadow-[inset_0_2px_5px_rgba(255,255,255,0.25)]" />
              </div>
              <div className="w-11 h-11 bg-cell-bg rounded-md flex items-center justify-center">
                <div className="w-[74%] h-[74%] rounded-full bg-white shadow-[inset_0_2px_5px_rgba(0,0,0,0.2)]" />
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="mb-2 text-[10px] font-black uppercase tracking-[0.28em] text-emerald-100/35">
            Reversi on the web
          </p>
          <h1 className="text-5xl sm:text-7xl font-black tracking-[0.10em] text-text-light drop-shadow-[0_8px_34px_rgba(0,0,0,0.55)]">
            OTHELLO
          </h1>
          <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-text-light/56 sm:text-base">
            Outflank, flip, and own the board. Play pass-and-play or challenge someone online.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3">
          <Link
            href="/online"
            className="group flex items-center justify-between rounded-[1.35rem] bg-cell-bg px-5 py-4 text-text-light shadow-[0_14px_40px_rgba(0,0,0,0.28)] ring-1 ring-emerald-200/15 transition active:scale-[0.98] active:brightness-95"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/45">Multiplayer</span>
              <span className="mt-0.5 block text-lg font-black">Play online</span>
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-full bg-black/18 ring-1 ring-white/10">
              <GlobeAltIcon className="h-5 w-5 text-text-light/75" />
            </span>
          </Link>

          <Link
            href="/othello"
            className="group flex items-center justify-between rounded-[1.35rem] bg-white/[0.08] px-5 py-4 text-text-light shadow-[0_10px_30px_rgba(0,0,0,0.16)] ring-1 ring-white/10 transition active:scale-[0.98] active:bg-white/[0.12]"
          >
            <span>
              <span className="block text-[10px] font-black uppercase tracking-[0.22em] text-text-light/32">Same device</span>
              <span className="mt-0.5 block text-base font-bold text-text-light/75">Local play</span>
            </span>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-white/[0.08] ring-1 ring-white/10">
              <UserGroupIcon className="h-5 w-5 text-text-light/55" />
            </span>
          </Link>
        </div>

        <StatsDisplay />
      </div>
    </main>
  );
}
