'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { STANDARD_FUNCTIONS } from '@/lib/functions';
import { useArchitecture } from '@/hooks/useArchitecture';
import type { StandardFunction } from '@/lib/types';

/**
 * Auto-assign heuristic: map system types to the standard function they most
 * likely belong to.  This is a starting point — users can override.
 */
const SYSTEM_TYPE_TO_FUNCTION: Record<string, StandardFunction> = {
  finance: 'finance',
  hr: 'people',
  crm: 'fundraising',
  email: 'communications',
  case_management: 'service_delivery',
  document_management: 'operations',
  database: 'data_reporting',
  spreadsheet: 'data_reporting',
  website: 'communications',
  messaging: 'operations',
};

export function FunctionTagger() {
  const router = useRouter();
  const { architecture, addFunction, removeFunction, updateSystem } = useArchitecture();

  const systems = architecture?.systems ?? [];

  // Track which standard function types are selected — hydrate from architecture on re-visit
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => {
    const existing = architecture?.functions ?? [];
    return new Set(existing.filter((f) => f.type !== 'custom').map((f) => f.type));
  });

  // Track manual overrides of system→function assignments
  // Key: `${systemId}-${functionType}`, value: true if assigned
  // Hydrate from architecture: rebuild assignments from system.functionIds
  const [assignments, setAssignments] = useState<Record<string, boolean>>(() => {
    const existingFunctions = architecture?.functions ?? [];
    const fnTypeById: Record<string, string> = {};
    for (const fn of existingFunctions) {
      fnTypeById[fn.id] = fn.type;
    }
    const result: Record<string, boolean> = {};
    for (const sys of architecture?.systems ?? []) {
      for (const fnId of sys.functionIds) {
        const fnType = fnTypeById[fnId];
        if (fnType) {
          result[`${sys.id}-${fnType}`] = true;
        }
      }
    }
    return result;
  });

  // Compute auto-assignments based on system types
  const autoAssignments = useMemo(() => {
    const auto: Record<string, boolean> = {};
    for (const sys of systems) {
      const fnType = SYSTEM_TYPE_TO_FUNCTION[sys.type];
      if (fnType) {
        auto[`${sys.id}-${fnType}`] = true;
      }
    }
    return auto;
  }, [systems]);

  // Merged assignments (auto + manual overrides)
  const effectiveAssignments = useMemo(() => {
    const merged: Record<string, boolean> = { ...autoAssignments };
    for (const [key, value] of Object.entries(assignments)) {
      merged[key] = value;
    }
    return merged;
  }, [autoAssignments, assignments]);

  const toggleFunction = useCallback((type: string) => {
    setSelectedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  const toggleAssignment = useCallback((systemId: string, functionType: string) => {
    const key = `${systemId}-${functionType}`;
    setAssignments((prev) => ({
      ...prev,
      [key]: !effectiveAssignments[key],
    }));
  }, [effectiveAssignments]);

  // Get systems assigned to a specific function type
  const getSystemsForFunction = useCallback(
    (functionType: string) => {
      return systems.filter((sys) => effectiveAssignments[`${sys.id}-${functionType}`]);
    },
    [systems, effectiveAssignments],
  );

  const hasSelection = selectedTypes.size > 0;

  const handleContinue = useCallback(() => {
    // Diff selectedTypes against existing functions: keep stable IDs for
    // already-selected standard types, add only newly selected ones, and
    // remove only the ones the user has just deselected. Custom functions
    // are never touched here — they're managed elsewhere.
    const existingFunctions = architecture?.functions ?? [];
    const existingByType = new Map<string, string>();
    for (const fn of existingFunctions) {
      if (fn.type !== 'custom') {
        existingByType.set(fn.type, fn.id);
      }
    }

    const functionIdsByType: Record<string, string> = {};

    // Remove deselected standard functions only.
    for (const fn of existingFunctions) {
      if (fn.type !== 'custom' && !selectedTypes.has(fn.type)) {
        removeFunction(fn.id);
      }
    }

    // Add or reuse for each selected standard type.
    for (const def of STANDARD_FUNCTIONS) {
      if (!selectedTypes.has(def.type)) continue;
      const existingId = existingByType.get(def.type);
      if (existingId) {
        functionIdsByType[def.type] = existingId;
      } else {
        functionIdsByType[def.type] = addFunction({
          name: def.name,
          type: def.type,
          description: def.description,
          isActive: true,
        });
      }
    }

    // Update each system's functionIds based on assignments.
    for (const sys of systems) {
      const fnIds: string[] = [];
      for (const [type, id] of Object.entries(functionIdsByType)) {
        if (effectiveAssignments[`${sys.id}-${type}`]) {
          fnIds.push(id);
        }
      }
      if (fnIds.length > 0) {
        updateSystem(sys.id, { functionIds: fnIds });
      }
    }

    router.push('/wizard/services/data');
  }, [
    selectedTypes,
    systems,
    effectiveAssignments,
    addFunction,
    removeFunction,
    updateSystem,
    architecture,
    router,
  ]);

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
          Which areas do these systems support?
        </h1>
        <p className="text-body-lg text-primary-700">
          Select the organisational functions that apply. We&rsquo;ve auto-tagged systems
          where we can &mdash; you can adjust the assignments below.
        </p>
      </div>

      {/* Function checkboxes */}
      <fieldset>
        <legend className="sr-only">Standard organisational functions</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {STANDARD_FUNCTIONS.map((def) => {
            const isChecked = selectedTypes.has(def.type);
            const assignedSystems = getSystemsForFunction(def.type);
            return (
              <div key={def.type} className="space-y-2">
                <label
                  className={`
                    flex items-start gap-3 rounded-lg border-2 p-4 cursor-pointer
                    transition-all duration-150
                    ${isChecked
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-surface-300 bg-surface-50 hover:border-primary-300'
                    }
                  `}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleFunction(def.type)}
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
                  </div>
                </label>

                {/* Show assigned systems when function is selected */}
                {isChecked && systems.length > 0 && (
                  <div className="ml-8 space-y-1">
                    <p className="text-xs font-medium text-primary-700 uppercase tracking-wide">
                      Systems tagged
                    </p>
                    {systems.map((sys) => {
                      const key = `${sys.id}-${def.type}`;
                      const isAssigned = effectiveAssignments[key] ?? false;
                      return (
                        <label
                          key={sys.id}
                          className="flex items-center gap-2 text-sm text-primary-800 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isAssigned}
                            onChange={() => toggleAssignment(sys.id, def.type)}
                            className="
                              h-4 w-4 rounded border-surface-300 text-primary-600
                              focus:ring-primary-500 focus:ring-2 focus:ring-offset-0
                            "
                          />
                          {sys.name}
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      {/* Selection count */}
      {hasSelection && (
        <p className="text-sm text-primary-500" aria-live="polite">
          {selectedTypes.size} function{selectedTypes.size === 1 ? '' : 's'} selected
        </p>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href="/wizard/services/systems"
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
