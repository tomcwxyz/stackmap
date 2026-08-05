'use client';

import {
  buildRiskImportanceMatrix,
  QUADRANTS,
  type QuadrantKey,
} from '@/lib/analysis/risk-importance';
import type { System } from '@/lib/types';

const QUADRANT_CLASSES: Record<QuadrantKey, string> = {
  act_first: 'border-red-300 bg-red-50',
  protect: 'border-green-300 bg-green-50',
  reduce: 'border-amber-300 bg-amber-50',
  watch: 'border-surface-300 bg-surface-50',
};

const HEADING_CLASSES: Record<QuadrantKey, string> = {
  act_first: 'text-red-900',
  protect: 'text-green-900',
  reduce: 'text-amber-900',
  watch: 'text-primary-800',
};

export interface RiskImportanceGridProps {
  systems: System[];
}

/**
 * The four-quadrant view of how much each system matters against how risky it is.
 *
 * Laid out as labelled groups rather than a scatter plot: it reads the same to a
 * screen reader as it does on screen, and it survives being printed.
 */
export function RiskImportanceGrid({ systems }: RiskImportanceGridProps) {
  const { byQuadrant, plotted, unplotted } = buildRiskImportanceMatrix(systems);

  if (plotted.length === 0) {
    return (
      <p className="text-sm text-primary-600">
        This needs both an importance score and a risk score. Score some systems on the
        Importance step, and assess their risk, to see them here.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="risk-importance-grid">
      <div className="grid gap-3 sm:grid-cols-2">
        {QUADRANTS.map((quadrant) => {
          const entries = byQuadrant[quadrant.key];
          return (
            <section
              key={quadrant.key}
              aria-labelledby={`quadrant-${quadrant.key}`}
              className={`border-2 rounded-lg p-3 break-inside-avoid ${QUADRANT_CLASSES[quadrant.key]}`}
            >
              <h3
                id={`quadrant-${quadrant.key}`}
                className={`font-display font-semibold ${HEADING_CLASSES[quadrant.key]}`}
              >
                {quadrant.label}
                <span className="ml-2 text-sm font-normal">({entries.length})</span>
              </h3>
              <p className="text-xs text-primary-700 mt-0.5 mb-2">{quadrant.description}</p>

              {entries.length === 0 ? (
                <p className="text-sm text-primary-500 italic">Nothing here.</p>
              ) : (
                <ul className="space-y-1" role="list">
                  {entries.map(({ system, importance, riskTotal }) => (
                    <li key={system.id} className="text-sm text-primary-900 flex flex-wrap gap-x-2">
                      <span className="font-medium">{system.name}</span>
                      {system.isShadow && (
                        <span className="text-xs bg-white/70 text-primary-700 rounded px-1.5 py-0.5">
                          Shadow
                        </span>
                      )}
                      <span className="text-xs text-primary-600">
                        importance {importance}/10 · risk {riskTotal}/25
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      {unplotted.length > 0 && (
        <p className="text-xs text-primary-600">
          {unplotted.length} {unplotted.length === 1 ? 'system is' : 'systems are'} missing an
          importance or risk score and {unplotted.length === 1 ? 'is' : 'are'} not shown.
        </p>
      )}
    </div>
  );
}
