'use client';

import { useEffect, useState } from 'react';

/**
 * The full canvas is useful on desktop, but on narrow screens the user's
 * first task is finding a system rather than panning a multi-column graph.
 * Responds to orientation changes without losing selected map state.
 */
export function useCompactMapLayout(): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia('(max-width: 767px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  return compact;
}
