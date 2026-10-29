'use client';

import { useState } from 'react';
import type { Architecture, System } from '@/lib/types';
import { SystemEditForm } from './system-edit-form';
import { systemReviewState } from '@/lib/analysis/evidence-freshness';
import { annualiseCost, formatCurrency } from '@/lib/cost-analysis';

interface Props {
  architecture: Architecture;
  systems: System[];
  techFreedomEnabled: boolean;
  updateSystem: (id: string, updates: Partial<Omit<System, 'id'>>) => void;
  removeSystem: (id: string) => void;
}

export function MobileSystemCards({
  architecture, systems, techFreedomEnabled, updateSystem, removeSystem,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!systems.length) return (
    <p className="rounded-xl border border-surface-300 bg-white p-4 text-sm text-primary-700">
      No systems match those filters.
    </p>
  );

  return (
    <div className="space-y-3" aria-label="Systems in your map" data-testid="mobile-system-cards">
      {systems.map((system) => {
        const owner = architecture.owners.find((o) => o.id === system.ownerId)?.name;
        const review = systemReviewState(system);
        return (
          <article key={system.id} className="min-w-0 rounded-xl border border-surface-300 bg-white p-4 space-y-3">
            <div className="space-y-1">
              <h2 className="font-display text-lg font-semibold text-primary-950 break-words">{system.name}</h2>
              <p className="text-sm text-primary-700">
                {system.status === 'active' ? 'Active' : system.status === 'legacy' ? 'Legacy' :
                  system.status === 'planned' ? 'Planned' : 'Retiring'}
                {system.isShadow ? ' · Informal tool' : ''}
                {' · '}{owner ?? 'No owner'}
              </p>
              <p className="text-sm text-primary-600">
                {system.cost ? formatCurrency(annualiseCost(system)) + '/year' : 'Cost not recorded'}
                {' · '}{review === 'recent' ? 'Recently checked' :
                  review === 'due' ? 'Check due' : 'Not yet checked'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" aria-expanded={editingId === system.id}
                className="btn-secondary px-4 py-2 text-sm"
                onClick={() => {
                  setEditingId(editingId === system.id ? null : system.id);
                  setConfirmingId(null);
                }}>
                {editingId === system.id ? 'Close' : 'Edit'} {system.name}
              </button>
              <button type="button" className="text-sm text-red-700 underline underline-offset-2 px-2 py-2"
                onClick={() => {
                  setConfirmingId(confirmingId === system.id ? null : system.id);
                  setEditingId(null);
                }}>
                Delete {system.name}
              </button>
            </div>
            {editingId === system.id && (
              <SystemEditForm
                system={system}
                owners={architecture.owners}
                functions={architecture.functions}
                techFreedomEnabled={techFreedomEnabled}
                onSave={(updates) => {
                  updateSystem(system.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            )}
            {confirmingId === system.id && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                <p className="text-sm text-red-900">Delete {system.name}? This cannot be undone.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="bg-red-700 text-white rounded-lg px-3 py-2 text-sm"
                    onClick={() => {
                      removeSystem(system.id);
                      setConfirmingId(null);
                    }}>Yes, delete it</button>
                  <button type="button" className="btn-secondary px-3 py-2 text-sm"
                    onClick={() => setConfirmingId(null)}>Keep it</button>
                </div>
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
