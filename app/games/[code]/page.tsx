'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function GameCodePage() {
  const params = useParams();
  const router = useRouter();
  const code = typeof params.code === 'string' ? params.code.toUpperCase() : '';

  useEffect(() => {
    if (code) {
      router.replace(`/online?join=${encodeURIComponent(code)}`);
    } else {
      router.replace('/online');
    }
  }, [code, router]);

  return (
    <div className="fixed inset-0 bg-board-bg flex items-center justify-center">
      <div className="flex items-center gap-3 rounded-full bg-white/10 px-5 py-3 text-text-light/55">
        <div className="h-4 w-4 rounded-full border-2 border-text-light/50 animate-spin border-t-transparent" />
        <span className="text-sm">Joining game {code ? code : '…'}</span>
      </div>
    </div>
  );
}
