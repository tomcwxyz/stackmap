'use client';

import { useCallback, useState } from 'react';
import { useArchitecture, type MapSection } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

interface SectionSpec {
  section: MapSection;
  label: string;
  /** What else goes with it, where clearing one thing takes another. */
  alsoClears?: string;
  count: (arch: Architecture) => number;
}

const SECTIONS: SectionSpec[] = [
  {
    section: 'systems',
    label: 'Systems',
    alsoClears: 'and the connections and sharing that referred to them',
    count: (a) => a.systems.length,
  },
  { section: 'functions', label: 'Functions', count: (a) => a.functions.length },
  { section: 'services', label: 'Services', count: (a) => a.services.length },
  {
    section: 'dataCategories',
    label: 'Data categories',
    count: (a) => a.dataCategories.length,
  },
  { section: 'integrations', label: 'Connections', count: (a) => a.integrations.length },
  { section: 'owners', label: 'Owners', count: (a) => a.owners.length },
  {
    section: 'sharing',
    label: 'Who sees your data',
    alsoClears: 'both the organisations and what goes to them',
    count: (a) => a.externalParties.length + a.dataFlows.length,
  },
];

/**
 * Empty one part of the map without starting again on all of it.
 *
 * Redoing the integrations should not cost the systems, and an example is much
 * easier to make your own if the parts that are not yours can go a section at
 * a time. Clearing everything is still there for anyone who wants it.
 */
export function ClearSections() {
  const { architecture, clearSection } = useArchitecture();
  const [confirming, setConfirming] = useState<MapSection | null>(null);
  const [cleared, setCleared] = useState<string | null>(null);

  const handleClear = useCallback(
    (spec: SectionSpec) => {
      clearSection(spec.section);
      setConfirming(null);
      setCleared(spec.label);
    },
    [clearSection],
  );

  if (!architecture) return null;

  const available = SECTIONS.filter((spec) => spec.count(architecture) > 0);
  if (available.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
          Or clear one part at a time
        </h3>
        <p className="text-sm text-primary-600">
          Useful for starting again on one step, or for keeping the parts of an example that
          are close enough and replacing the rest.
        </p>
      </div>

      {cleared && (
        <p className="text-sm text-primary-800" role="status">
          {cleared} cleared.
        </p>
      )}

      <ul className="flex flex-wrap gap-2" role="list">
        {available.map((spec) => (
          <li key={spec.section}>
            <button
              type="button"
              onClick={() => {
                setConfirming(spec.section);
                setCleared(null);
              }}
              className="btn-secondary text-sm px-3 py-1.5"
            >
              {spec.label} ({spec.count(architecture)})
            </button>
          </li>
        ))}
      </ul>

      {confirming && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-2">
          {(() => {
            const spec = SECTIONS.find((s) => s.section === confirming)!;
            return (
              <>
                <p className="text-sm font-medium text-red-900">
                  Clear {spec.label.toLowerCase()} ({spec.count(architecture)})
                  {spec.alsoClears ? `, ${spec.alsoClears}` : ''}? This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleClear(spec)}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
                  >
                    Yes, clear {spec.label.toLowerCase()}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(null)}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
