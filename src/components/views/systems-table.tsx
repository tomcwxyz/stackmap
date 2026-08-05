'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { SystemEditForm } from './system-edit-form';
import { annualiseCost, formatCurrency } from '@/lib/cost-analysis';
import { getImportanceTier } from '@/lib/importance';
import { riskLevel, totalScore } from '@/lib/techfreedom/risk';
import type { Architecture, System } from '@/lib/types';

type SortKey = 'name' | 'type' | 'function' | 'owner' | 'status' | 'importance' | 'cost';
type SortDirection = 'asc' | 'desc';

const STATUS_LABELS: Record<System['status'], string> = {
  active: 'Active',
  planned: 'Planned',
  retiring: 'Retiring',
  legacy: 'Legacy',
};

const STATUS_CLASSES: Record<System['status'], string> = {
  active: 'text-green-800 bg-green-100',
  planned: 'text-blue-800 bg-blue-100',
  retiring: 'text-amber-800 bg-amber-100',
  legacy: 'text-stone-700 bg-stone-200',
};

const RISK_CLASSES: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  moderate: 'text-amber-700 bg-amber-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
};

const COLUMNS: { key: SortKey; label: string }[] = [
  { key: 'name', label: 'System' },
  { key: 'type', label: 'Type' },
  { key: 'function', label: 'Function' },
  { key: 'owner', label: 'Owner' },
  { key: 'status', label: 'Status' },
  { key: 'importance', label: 'Importance' },
  { key: 'cost', label: 'Annual cost' },
];

function formatType(type: string): string {
  return type
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function functionNames(system: System, arch: Architecture): string {
  return system.functionIds
    .map((id) => arch.functions.find((f) => f.id === id)?.name)
    .filter(Boolean)
    .join(', ');
}

function ownerName(system: System, arch: Architecture): string {
  if (!system.ownerId) return '';
  return arch.owners.find((o) => o.id === system.ownerId)?.name ?? '';
}

function compare(a: System, b: System, key: SortKey, arch: Architecture): number {
  switch (key) {
    case 'type':
      return a.type.localeCompare(b.type);
    case 'function':
      return functionNames(a, arch).localeCompare(functionNames(b, arch));
    case 'owner':
      return ownerName(a, arch).localeCompare(ownerName(b, arch));
    case 'status':
      return a.status.localeCompare(b.status);
    case 'importance':
      return (a.importance ?? 0) - (b.importance ?? 0);
    case 'cost':
      return annualiseCost(a) - annualiseCost(b);
    default:
      return a.name.localeCompare(b.name);
  }
}

/**
 * Every system in one place, editable.
 *
 * The wizard captures a system once, on the step that created it; this is where
 * it can be corrected, retired or deleted afterwards without walking back
 * through the whole flow.
 */
export function SystemsTable() {
  const { architecture, isLoading, updateSystem, removeSystem } = useArchitecture();

  const [query, setQuery] = useState('');
  const [functionFilter, setFunctionFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const techFreedomEnabled = architecture?.metadata?.techFreedomEnabled === true;

  const visible = useMemo(() => {
    if (!architecture) return [];
    const needle = query.trim().toLowerCase();

    const filtered = architecture.systems.filter((system) => {
      if (functionFilter !== 'all' && !system.functionIds.includes(functionFilter)) {
        return false;
      }
      if (statusFilter !== 'all' && system.status !== statusFilter) return false;
      if (!needle) return true;

      return [system.name, system.vendor ?? '', system.notes ?? '']
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    const sorted = [...filtered].sort((a, b) => compare(a, b, sortKey, architecture));
    return sortDirection === 'asc' ? sorted : sorted.reverse();
  }, [architecture, query, functionFilter, statusFilter, sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  }

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  if (!architecture || architecture.systems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary-900 font-display mb-4">
          No systems yet
        </h1>
        <p className="text-primary-600 mb-8">
          Once you have mapped some systems in the wizard, they will all be listed here
          for you to edit.
        </p>
        <Link href="/wizard" className="btn-primary px-6 py-2.5 rounded-lg inline-flex">
          Start mapping
        </Link>
      </div>
    );
  }

  const { systems, functions } = architecture;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary-900 font-display">Your systems</h1>
        <p className="text-sm text-primary-600 mt-1">
          {systems.length} {systems.length === 1 ? 'system' : 'systems'} in{' '}
          {architecture.organisation.name || 'your map'}. Edit anything here without going
          back through the wizard.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <label htmlFor="systems-search" className="text-sm font-medium text-primary-900">
            Search
          </label>
          <input
            id="systems-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, supplier or notes"
            className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-base text-primary-950 placeholder:text-primary-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="systems-function-filter" className="text-sm font-medium text-primary-900">
            Filter by function
          </label>
          <select
            id="systems-function-filter"
            value={functionFilter}
            onChange={(e) => setFunctionFilter(e.target.value)}
            className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-base text-primary-950 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="all">All functions</option>
            {functions.map((fn) => (
              <option key={fn.id} value={fn.id}>
                {fn.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="systems-status-filter" className="text-sm font-medium text-primary-900">
            Filter by status
          </label>
          <select
            id="systems-status-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-base text-primary-950 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="text-sm text-primary-600" role="status">
        Showing {visible.length} of {systems.length}
      </p>

      {/* Table */}
      <div className="overflow-x-auto border border-surface-200 rounded-lg bg-white">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Systems in your map, with type, function, owner, status, importance and cost
          </caption>
          <thead>
            <tr className="border-b border-surface-200 bg-surface-50 text-left">
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className="px-3 py-2 text-xs font-medium text-primary-600 uppercase tracking-wider"
                  aria-sort={
                    sortKey === col.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                >
                  <button
                    type="button"
                    onClick={() => handleSort(col.key)}
                    className="inline-flex items-center gap-1 uppercase hover:text-primary-900 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:outline-none rounded"
                  >
                    {col.label}
                    {sortKey === col.key && (
                      <span aria-hidden="true">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                </th>
              ))}
              {techFreedomEnabled && (
                <th scope="col" className="px-3 py-2 text-xs font-medium text-primary-600 uppercase tracking-wider">
                  Risk
                </th>
              )}
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={COLUMNS.length + (techFreedomEnabled ? 2 : 1)}
                  className="px-3 py-6 text-center text-primary-500"
                >
                  No systems match those filters.
                </td>
              </tr>
            )}

            {visible.map((system) => {
              const tier = getImportanceTier(system.importance);
              const annual = annualiseCost(system);
              const score = system.techFreedomScore;
              const level = score ? riskLevel(totalScore(score)) : null;
              const isEditing = editingId === system.id;
              const isConfirming = confirmingId === system.id;

              return (
                <tr key={system.id} className="border-b border-surface-100 align-top">
                  <td className="px-3 py-2">
                    <span className="font-medium text-primary-900">{system.name}</span>
                    {system.isShadow && (
                      <span className="ml-2 text-xs bg-surface-200 text-surface-600 rounded px-1.5 py-0.5">
                        Shadow
                      </span>
                    )}
                    {system.vendor && (
                      <span className="block text-xs text-primary-500">{system.vendor}</span>
                    )}

                    {isEditing && (
                      <div className="mt-3">
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
                      </div>
                    )}

                    {isConfirming && (
                      <div className="mt-3 rounded-lg border-2 border-red-200 bg-red-50 p-3 space-y-2">
                        <p className="text-sm font-medium text-red-900">
                          Delete {system.name}? This cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              removeSystem(system.id);
                              setConfirmingId(null);
                              if (editingId === system.id) setEditingId(null);
                            }}
                            className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-lg transition-colors"
                          >
                            Yes, delete it
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingId(null)}
                            className="btn-secondary text-sm"
                          >
                            Keep it
                          </button>
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-primary-700">{formatType(system.type)}</td>
                  <td className="px-3 py-2 text-primary-700">
                    {functionNames(system, architecture) || '—'}
                  </td>
                  <td className="px-3 py-2 text-primary-700">
                    {ownerName(system, architecture) || (
                      <span className="text-amber-700">No owner</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-medium rounded px-1.5 py-0.5 ${STATUS_CLASSES[system.status]}`}
                    >
                      {STATUS_LABELS[system.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-primary-700">
                    {tier ? `${system.importance}/10 ${tier.label}` : '—'}
                  </td>
                  <td className="px-3 py-2 text-primary-700">
                    {system.cost ? (system.cost.model === 'free' ? 'Free' : formatCurrency(annual)) : '—'}
                  </td>
                  {techFreedomEnabled && (
                    <td className="px-3 py-2">
                      {level && score ? (
                        <span className={`text-xs font-medium rounded px-1.5 py-0.5 ${RISK_CLASSES[level]}`}>
                          {totalScore(score)}/25
                        </span>
                      ) : (
                        <span className="text-primary-400">—</span>
                      )}
                    </td>
                  )}
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(isEditing ? null : system.id);
                        setConfirmingId(null);
                      }}
                      aria-expanded={isEditing}
                      className="text-sm text-primary-700 hover:text-primary-900 underline underline-offset-2"
                    >
                      {isEditing ? 'Close' : 'Edit'}
                      <span className="sr-only"> {system.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmingId(isConfirming ? null : system.id);
                        setEditingId(null);
                      }}
                      className="ml-3 text-sm text-primary-500 hover:text-red-700 underline underline-offset-2"
                    >
                      Delete
                      <span className="sr-only"> {system.name}</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
