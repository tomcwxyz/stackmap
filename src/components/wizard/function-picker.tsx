'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STANDARD_FUNCTIONS } from '@/lib/functions';
import { getSectorFunctions } from '@/lib/sector-functions';
import { useArchitecture } from '@/hooks/useArchitecture';
import type { StandardFunctionDefinition } from '@/lib/functions';

/** Subtle colour hints per function type — keeps them visually distinct */
const FUNCTION_TINTS: Record<string, { bg: string; border: string; activeBg: string; activeBorder: string }> = {
  finance:          { bg: 'bg-emerald-50/60',  border: 'border-emerald-200',  activeBg: 'bg-emerald-50',  activeBorder: 'border-emerald-500' },
  governance:       { bg: 'bg-blue-50/60',     border: 'border-blue-200',     activeBg: 'bg-blue-50',     activeBorder: 'border-blue-500' },
  people:           { bg: 'bg-violet-50/60',   border: 'border-violet-200',   activeBg: 'bg-violet-50',   activeBorder: 'border-violet-500' },
  fundraising:      { bg: 'bg-amber-50/60',    border: 'border-amber-200',    activeBg: 'bg-amber-50',    activeBorder: 'border-amber-500' },
  communications:   { bg: 'bg-rose-50/60',     border: 'border-rose-200',     activeBg: 'bg-rose-50',     activeBorder: 'border-rose-500' },
  service_delivery: { bg: 'bg-sky-50/60',      border: 'border-sky-200',      activeBg: 'bg-sky-50',      activeBorder: 'border-sky-500' },
  operations:       { bg: 'bg-stone-50/60',    border: 'border-stone-200',    activeBg: 'bg-stone-100',   activeBorder: 'border-stone-500' },
  data_reporting:   { bg: 'bg-teal-50/60',     border: 'border-teal-200',     activeBg: 'bg-teal-50',     activeBorder: 'border-teal-500' },
};

const DEFAULT_TINT = { bg: 'bg-surface-50', border: 'border-surface-300', activeBg: 'bg-primary-50', activeBorder: 'border-primary-500' };

export function FunctionPicker() {
  const router = useRouter();
  const { architecture, addFunction, removeFunction } = useArchitecture();

  // Track which standard functions are selected by their type key
  // Pre-populate from architecture if functions already exist (re-visit scenario)
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => {
    const existing = architecture?.functions ?? [];
    return new Set(existing.filter((f) => f.type !== 'custom').map((f) => f.type));
  });
  // Track custom functions added by the user — hydrate from architecture on re-visit
  const [customFunctions, setCustomFunctions] = useState<
    { name: string; id?: string; description?: string }[]
  >(() => {
    const existing = architecture?.functions ?? [];
    return existing
      .filter((f) => f.type === 'custom')
      .map((f) => ({ name: f.name, id: f.id, description: f.description }));
  });
  // Custom function input state
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customName, setCustomName] = useState('');

  // Functions that only make sense for this kind of organisation
  const orgType = architecture?.organisation.type ?? 'charity';
  const sectorFunctions = useMemo(() => getSectorFunctions(orgType), [orgType]);
  const selectedCustomNames = new Set(customFunctions.map((cf) => cf.name.toLowerCase()));

  const hasSelection = selectedTypes.size > 0 || customFunctions.length > 0;

  const toggleFunction = useCallback((def: StandardFunctionDefinition) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(def.type)) {
        next.delete(def.type);
      } else {
        next.add(def.type);
      }
      return next;
    });
  }, []);

  const handleAddCustom = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setCustomFunctions((prev) => [...prev, { name: trimmed }]);
    setCustomName('');
    setShowCustomInput(false);
  }, [customName]);

  const handleRemoveCustom = useCallback((index: number) => {
    setCustomFunctions((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const toggleSectorFunction = useCallback((name: string, description: string) => {
    setCustomFunctions((prev) => {
      const exists = prev.some((cf) => cf.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return prev.filter((cf) => cf.name.toLowerCase() !== name.toLowerCase());
      }
      return [...prev, { name, description }];
    });
  }, []);

  const handleContinue = useCallback(() => {
    // Clear existing functions to avoid duplicates on re-visit
    const existingFunctions = architecture?.functions ?? [];
    for (const fn of existingFunctions) {
      removeFunction(fn.id);
    }

    // Add selected standard functions to architecture
    for (const def of STANDARD_FUNCTIONS) {
      if (selectedTypes.has(def.type)) {
        addFunction({
          name: def.name,
          type: def.type,
          description: def.description,
          isActive: true,
        });
      }
    }

    // Add custom functions
    for (const cf of customFunctions) {
      addFunction({
        name: cf.name,
        type: 'custom',
        description: cf.description ?? '',
        isActive: true,
      });
    }

    router.push('/wizard/functions/systems');
  }, [selectedTypes, customFunctions, addFunction, removeFunction, architecture, router]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3 max-w-xl">
        <h1 className="text-display-md font-display text-primary-900">
          What does your organisation do?
        </h1>
        <p className="text-body-lg text-primary-700">
          Tick everything that applies. Most organisations have five or six of these.
          Don&rsquo;t worry &mdash; you can come back and change this later.
        </p>
      </div>

      <fieldset>
        <legend className="sr-only">Standard organisational functions</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {STANDARD_FUNCTIONS.map((def) => {
            const isChecked = selectedTypes.has(def.type);
            const tint = FUNCTION_TINTS[def.type] || DEFAULT_TINT;
            return (
              <label
                key={def.type}
                className={`
                  flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer
                  transition-all duration-150
                  ${isChecked
                    ? `${tint.activeBorder} ${tint.activeBg}`
                    : `${tint.border} ${tint.bg} hover:border-primary-300`
                  }
                `}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleFunction(def)}
                  className="
                    mt-0.5 h-5 w-5 rounded border-surface-300 text-primary-600
                    focus:ring-primary-500 focus:ring-2 focus:ring-offset-0
                    cursor-pointer
                  "
                  aria-describedby={`desc-${def.type}`}
                />
                <div className="flex-1 min-w-0">
                  <span className="block text-base font-semibold text-primary-900">{def.name}</span>
                  <span id={`desc-${def.type}`} className="block text-sm text-primary-600 mt-0.5 leading-snug">
                    {def.description}
                  </span>
                  <span className="block text-xs text-primary-400 mt-1.5">
                    e.g. {def.typicalSystems.slice(0, 3).join(', ')}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Functions specific to this kind of organisation */}
      {sectorFunctions.length > 0 && (
        <fieldset data-testid="sector-functions">
          <legend className="text-sm font-semibold text-primary-800 uppercase tracking-wide mb-2">
            Also common for organisations like yours
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {sectorFunctions.map((fn) => {
              const isChecked = selectedCustomNames.has(fn.name.toLowerCase());
              return (
                <label
                  key={fn.name}
                  className={`
                    flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer
                    transition-all duration-150
                    ${isChecked
                      ? 'border-accent-500 bg-accent-50'
                      : 'border-surface-300 bg-surface-50 hover:border-primary-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSectorFunction(fn.name, fn.description)}
                    className="mt-0.5 h-5 w-5 rounded border-surface-300 text-primary-600 focus:ring-primary-500 focus:ring-2 focus:ring-offset-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-base font-semibold text-primary-900">{fn.name}</span>
                    <span className="block text-sm text-primary-600 mt-0.5 leading-snug">
                      {fn.description}
                    </span>
                    <span className="block text-xs text-primary-400 mt-1.5">
                      e.g. {fn.suggestedSystems.slice(0, 3).map((s) => s.name).join(', ')}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* Custom functions */}
      {customFunctions.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            Your custom functions
          </h2>
          <ul className="space-y-2" role="list">
            {customFunctions.map((cf, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-lg border-2 border-accent-300 bg-accent-50 p-3"
              >
                <span className="font-medium text-primary-900">{cf.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCustom(index)}
                  className="text-sm text-primary-600 hover:text-red-600 transition-colors p-1"
                  aria-label={`Remove ${cf.name}`}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Add custom function */}
      {showCustomInput ? (
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label htmlFor="custom-function-name" className="block text-sm font-medium text-primary-800 mb-1">
              What would you like to call it?
            </label>
            <input
              id="custom-function-name"
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCustom();
                if (e.key === 'Escape') {
                  setShowCustomInput(false);
                  setCustomName('');
                }
              }}
              placeholder="e.g. Research, Advocacy, Policy"
              className="
                w-full rounded-lg border-2 border-surface-300 px-3 py-2
                text-primary-900 placeholder:text-surface-400
                focus:border-primary-500 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0
                transition-colors
              "
              autoFocus
            />
          </div>
          <button
            type="button"
            onClick={handleAddCustom}
            disabled={!customName.trim()}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => {
              setShowCustomInput(false);
              setCustomName('');
            }}
            className="btn-secondary"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustomInput(true)}
          className="
            inline-flex items-center gap-2 text-sm font-semibold text-accent-600
            hover:text-accent-700 transition-colors rounded-lg border-2 border-dashed
            border-accent-300 hover:border-accent-400 px-4 py-3
            hover:bg-accent-50
          "
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Something missing? Add your own
        </button>
      )}

      {/* Selection count */}
      {hasSelection && (
        <p className="text-sm text-primary-500" aria-live="polite">
          {selectedTypes.size + customFunctions.length} function{selectedTypes.size + customFunctions.length === 1 ? '' : 's'} selected
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href="/wizard"
          className="btn-secondary inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back
        </Link>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!hasSelection}
          className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-disabled={!hasSelection}
        >
          Continue
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </div>
  );
}
