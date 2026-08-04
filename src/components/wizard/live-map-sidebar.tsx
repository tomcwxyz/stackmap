'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useArchitecture } from '@/hooks/useArchitecture';
import { MiniMap } from './mini-map';
import { MapStats } from './map-stats';
import { ContextualTip } from './contextual-tip';
import { BullseyeDiagram } from './bullseye-diagram';

// ─── Helpers ───

function buildSummaryText(architecture: {
  functions: unknown[];
  systems: unknown[];
  integrations: unknown[];
  owners: unknown[];
}): string {
  const parts: string[] = [];
  const { functions, systems, integrations, owners } = architecture;

  if (functions.length > 0) parts.push(`${functions.length} function${functions.length === 1 ? '' : 's'}`);
  if (systems.length > 0) parts.push(`${systems.length} system${systems.length === 1 ? '' : 's'}`);
  if (integrations.length > 0) parts.push(`${integrations.length} integration${integrations.length === 1 ? '' : 's'}`);
  if (owners.length > 0) parts.push(`${owners.length} owner${owners.length === 1 ? '' : 's'}`);

  return parts.length > 0 ? parts.join(', ') : 'View map';
}

// ─── Component ───

export function LiveMapSidebar() {
  const { architecture } = useArchitecture();
  const pathname = usePathname();
  const isImportanceStep = pathname.includes('/importance');
  const [open, setOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [pulse, setPulse] = useState(false);

  // Compute entity count for pulse animation
  const entityCount = architecture
    ? architecture.functions.length +
      architecture.systems.length +
      architecture.integrations.length +
      architecture.owners.length
    : 0;

  // Pulse the tab when the map grows. Started during render rather than in an
  // effect — this is state adjusting to a changed value, not a side effect, and
  // an effect here would render once before the pulse appeared.
  const [previousCount, setPreviousCount] = useState(entityCount);
  if (entityCount !== previousCount) {
    setPreviousCount(entityCount);
    if (previousCount !== 0) setPulse(true);
  }

  // Stop pulsing once the animation has had time to play
  useEffect(() => {
    if (!pulse) return;
    const timer = setTimeout(() => setPulse(false), 600);
    return () => clearTimeout(timer);
  }, [pulse]);

  // Focus close button when panel opens
  useEffect(() => {
    if (open && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    },
    [],
  );

  if (!architecture) return null;

  const summaryText = buildSummaryText(architecture);

  return (
    <>
      {/* ── Tab button (always visible when panel is closed) ── */}
      {!open && (
        <>
          {/* Desktop: fixed tab on right edge */}
          <button
            type="button"
            aria-label={`Open map preview: ${summaryText}`}
            onClick={() => setOpen(true)}
            className={`
              hidden sm:flex fixed right-0 top-1/2 -translate-y-1/2 z-40
              flex-col items-center gap-2 bg-primary-600 text-white
              pl-3 pr-2 py-4 rounded-l-xl shadow-lg
              hover:bg-primary-700 hover:pr-3
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600
              transition-all duration-150
              ${pulse ? 'motion-safe:animate-pulse' : ''}
            `}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs font-medium writing-mode-vertical [writing-mode:vertical-rl] rotate-180 whitespace-nowrap">
              Your map
            </span>
            {entityCount > 0 && (
              <span className="bg-white/20 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {entityCount}
              </span>
            )}
          </button>

          {/* Mobile: floating pill at bottom */}
          <button
            type="button"
            aria-label={`Open map preview: ${summaryText}`}
            onClick={() => setOpen(true)}
            className={`
              sm:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40
              rounded-full bg-primary-600 text-white px-5 py-2.5
              text-sm font-medium shadow-lg
              hover:bg-primary-700
              focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600
              ${pulse ? 'motion-safe:animate-pulse' : ''}
            `}
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              {summaryText}
            </span>
          </button>
        </>
      )}

      {/* ── Expanding overlay panel ── */}
      {open && (
        <div className="fixed inset-0 z-50" onKeyDown={handleKeyDown}>
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 motion-safe:transition-opacity"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />

          {/* Panel — slides in from right on desktop, up from bottom on mobile */}
          <aside
            role="complementary"
            aria-label="Architecture map preview"
            className="
              absolute bg-surface-50 shadow-2xl overflow-y-auto
              motion-safe:transition-transform motion-safe:duration-200
              sm:right-0 sm:top-0 sm:bottom-0 sm:w-[480px] sm:max-w-[90vw] sm:rounded-l-2xl
              max-sm:bottom-0 max-sm:left-0 max-sm:right-0 max-sm:max-h-[85vh] max-sm:rounded-t-2xl
            "
          >
            {/* Header */}
            <div className="sticky top-0 bg-surface-50 border-b border-surface-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="font-display font-semibold text-primary-900 text-lg">Your map</h2>
                <p className="text-sm text-primary-500">{summaryText}</p>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close map preview"
                onClick={() => setOpen(false)}
                className="rounded-lg p-2 text-primary-500 hover:bg-surface-100 hover:text-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {isImportanceStep && architecture ? (
                <BullseyeDiagram systems={architecture.systems} functions={architecture.functions} />
              ) : (
                <>
                  {/* Mini map — gets proper space now */}
                  <div className="bg-white rounded-xl border border-surface-200 p-4">
                    <MiniMap />
                  </div>

                  {/* Stats */}
                  <MapStats />

                  {/* Contextual tip */}
                  <div className="bg-primary-50 rounded-lg px-4 py-3 border border-primary-100">
                    <ContextualTip />
                  </div>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
