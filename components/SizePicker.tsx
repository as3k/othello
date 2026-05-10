'use client';

import type { BoardSize } from '@/lib/game/types';

interface SizePickerProps {
  selected: BoardSize;
  onSelect: (size: BoardSize) => void;
}

const SIZES: BoardSize[] = [6, 8, 10];

const LABELS: Record<BoardSize, { desc: string; detail: string }> = {
  6: { desc: '6×6', detail: 'Quick & chaotic' },
  8: { desc: '8×8', detail: 'Classic' },
  10: { desc: '10×10', detail: 'Epic & strategic' },
};

export default function SizePicker({ selected, onSelect }: SizePickerProps) {
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-emerald-100/35">
        Board size
      </p>
      <div className="flex w-full gap-2">
        {SIZES.map((size) => {
          const active = selected === size;
          return (
            <button
              key={size}
              onClick={() => onSelect(size)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-[1.25rem] px-2 py-3 text-center transition active:scale-[0.97] ${
                active
                  ? 'bg-emerald-300/14 text-emerald-50 ring-2 ring-emerald-200/25 shadow-[0_0_24px_rgba(52,211,153,0.12)]'
                  : 'bg-white/[0.07] text-text-light/50 ring-1 ring-white/[0.08] active:bg-white/[0.11]'
              }`}
            >
              <span className="text-lg font-black tracking-tight">{LABELS[size].desc}</span>
              <span className="text-[10px] font-medium tracking-wide opacity-60">{LABELS[size].detail}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
