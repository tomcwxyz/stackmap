'use client';

import { useMemo, useState } from 'react';
import type { Architecture, System } from '@/lib/types';
import { formatCurrency, annualiseCost } from '@/lib/cost-analysis';

interface MobileSystemListProps {
  architecture: Architecture;
  systems: System[];
  onInspect: (id: string) => void;
}

/** A readable, searchable alternative to a full-width graph on a phone. */
export function MobileSystemList({ architecture, systems, onInspect }: MobileSystemListProps) {
  const [query, setQuery] = useState('');
  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('en-GB');
    if (!needle) return systems;
    return systems.filter((system) => [
      system.name, system.vendor ?? '',
      ...architecture.functions
        .filter((fn) => system.functionIds.includes(fn.id))
        .map((fn) => fn.name),
    ].join(' ').toLocaleLowerCase('en-GB').includes(needle));
  }, [architecture.functions, query, systems]);

  return (
    <section aria-label="Browse systems" className="space-y-3">
      <div className="bg-white border border-surface-300 rounded-xl p-4 space-y-3">
        <label htmlFor="mobile-map-search" className="block text-sm font-semibold text-primary-900">
          Find a system
        </label>
        <input
          id="mobile-map-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, supplier or area"
          className="w-full rounded-lg border border-surface-300 bg-white px-3 py-3 text-base text-primary-950"
        />
        <p className="text-sm text-primary-600" role="status">
          {visible.length} of {systems.length} systems
          {query.trim() ? ' match your search' : ' — select one to explore its connections'}
        </p>
      </div>
      {visible.length === 0 ? (
        <div className="border border-surface-300 bg-white rounded-xl p-4 text-sm text-primary-700">
          No systems match. Try another name or change the organisational area.
        </div>
      ) : (
        <ul className="space-y-2" role="list">
          {visible.map((system) => {
            const namedArea = architecture.functions
              .find((fn) => system.functionIds.includes(fn.id))?.name;
            return (
              <li key={system.id}>
                <button
                  type="button"
                  aria-label={'Inspect ' + system.name}
                  onClick={() => onInspect(system.id)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-surface-300 bg-white px-4 py-3 text-left hover:border-primary-600 focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-base font-semibold text-primary-950">
                      {system.name}
                    </span>
                    <span className="block text-xs text-primary-600 mt-1 break-words">
                      {namedArea ?? 'No organisational area'}
                      {system.isShadow && ' · Informal tool'}
                      {system.status !== 'active' && ' · ' + system.status}
                    </span>
                    {system.cost && (
                      <span className="block text-xs text-primary-600 mt-1">
                        {formatCurrency(annualiseCost(system))}/year
                        {system.cost.source === 'estimate' ? ' estimated' : ''}
                      </span>
                    )}
                  </span>
                  <span aria-hidden="true" className="text-primary-700 text-xl flex-shrink-0">
                    ›
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
