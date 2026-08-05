'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { System, SystemType, StandardFunction } from '@/lib/types';
import type { TechFreedomScore, KnownTool } from '@/lib/techfreedom/types';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';
import { totalScore, riskLevel } from '@/lib/techfreedom/risk';
import { estimateToolCost, DEFAULT_STAFF } from '@/lib/cost-estimates';
import { getSuggestedSystems } from '@/lib/function-templates';
import type { FunctionSystemSuggestion } from '@/lib/function-templates';
import { getSectorSuggestions } from '@/lib/sector-functions';

const SYSTEM_TYPES: { value: SystemType; label: string }[] = [
  { value: 'crm', label: 'CRM' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'case_management', label: 'Case Management' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'document_management', label: 'Document Management' },
  { value: 'database', label: 'Database' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
];

const HOSTING_OPTIONS = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'on_premise', label: 'On-premise' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'unknown', label: "Don't know" },
] as const;

type CostPeriod = 'monthly' | 'annual';
type CostModel = 'subscription' | 'perpetual' | 'free' | 'unknown';

interface SystemFormData {
  name: string;
  type: SystemType;
  vendor: string;
  hosting: 'cloud' | 'on_premise' | 'hybrid' | 'unknown';
  costAmount: string;
  costPeriod: CostPeriod;
  costModel: CostModel;
}

/** The shape stored on a system, so the two cannot drift apart. */
type SystemCost = NonNullable<System['cost']>;

interface SystemEntry {
  id: string;
  name: string;
  type: SystemType;
  vendor: string;
  hosting: string;
  techFreedomScore?: TechFreedomScore;
  matchedTool?: KnownTool;
  cost?: SystemCost;
  // Preserve-on-write: any field we don't edit here must round-trip intact
  // when we call updateSystem so cross-step links (importance, serviceIds,
  // owner, etc.) survive back-and-forth navigation.
  serviceIds: string[];
  status: 'active' | 'planned' | 'retiring' | 'legacy';
  functionIds: string[];
}

const FUNCTION_TO_SYSTEM_TYPE: Record<StandardFunction | 'custom', SystemType> = {
  finance: 'finance',
  people: 'hr',
  fundraising: 'crm',
  communications: 'email',
  service_delivery: 'case_management',
  operations: 'document_management',
  data_reporting: 'database',
  governance: 'other',
  custom: 'other',
};

const COST_PERIOD_OPTIONS: { value: CostPeriod; label: string }[] = [
  { value: 'annual', label: 'Per year' },
  { value: 'monthly', label: 'Per month' },
];

const COST_MODEL_OPTIONS: { value: CostModel; label: string }[] = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'perpetual', label: 'Perpetual licence' },
  { value: 'free', label: 'Free' },
  { value: 'unknown', label: "Don't know" },
];

function emptyFormForFunction(functionType: StandardFunction | 'custom'): SystemFormData {
  return {
    name: '',
    type: FUNCTION_TO_SYSTEM_TYPE[functionType] ?? 'other',
    vendor: '',
    hosting: 'unknown',
    costAmount: '',
    costPeriod: 'annual',
    costModel: 'subscription',
  };
}

function guessSystemTypeFromCategory(category: string): SystemType {
  const map: Record<string, SystemType> = {
    'Productivity': 'document_management',
    'Communication': 'messaging',
    'CRM': 'crm',
    'Finance': 'finance',
    'Marketing': 'email',
    'Events': 'other',
    'Design': 'other',
    'CMS': 'website',
    'Storage': 'document_management',
    'Project Management': 'database',
    'Social Media': 'other',
    'Messaging': 'messaging',
    'Email': 'email',
  };
  return map[category] ?? 'other';
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  moderate: 'text-amber-700 bg-amber-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
};

export function FunctionSystems() {
  const router = useRouter();
  const { architecture, addSystem, updateSystem, removeSystem } = useArchitecture();

  const functions = architecture?.functions ?? [];
  const techFreedomEnabled = architecture?.metadata?.techFreedomEnabled === true;
  const [activeFunctionIndex, setActiveFunctionIndex] = useState(0);
  const [formData, setFormData] = useState<SystemFormData>(() =>
    functions.length > 0 ? emptyFormForFunction(functions[0].type) : emptyFormForFunction('custom'),
  );
  // Architecture is the source of truth for system data. Local state holds
  // an optimistic mirror keyed by stable system id so the UI reacts instantly
  // even though the mocked test architecture isn't reactive. Every mutation
  // also calls the architecture context, so navigation no longer needs a
  // destroy-recreate Continue handler.
  const [entries, setEntries] = useState<Map<string, SystemEntry>>(() => {
    const m = new Map<string, SystemEntry>();
    for (const sys of architecture?.systems ?? []) {
      m.set(sys.id, {
        id: sys.id,
        name: sys.name,
        type: sys.type,
        vendor: sys.vendor ?? '',
        hosting: sys.hosting,
        techFreedomScore: sys.techFreedomScore,
        cost: sys.cost,
        serviceIds: sys.serviceIds ?? [],
        status: sys.status,
        functionIds: sys.functionIds ?? [],
      });
    }
    return m;
  });
  const [byFunction, setByFunction] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const sys of architecture?.systems ?? []) {
      for (const fnId of sys.functionIds) {
        (m[fnId] ??= []).push(sys.id);
      }
    }
    return m;
  });
  const [currentMatch, setCurrentMatch] = useState<KnownTool | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<string | null>(null);

  const activeFunction = functions[activeFunctionIndex];

  const orgType = architecture?.organisation.type ?? 'charity';
  const orgSize = architecture?.organisation.size ?? 'small';

  // Get suggestions for the active function, filtered by org type and size
  const suggestions = useMemo(() => {
    if (!activeFunction) return [];

    // Sector functions are stored as custom ones, so their suggestions are
    // looked up by name rather than by function type
    if (activeFunction.type === 'custom') {
      return getSectorSuggestions(activeFunction.name, orgType);
    }

    return getSuggestedSystems(
      activeFunction.type as StandardFunction,
      orgType,
      orgSize,
    );
  }, [activeFunction, orgType, orgSize]);

  // Derive the visible list from local state — entries are kept in sync with
  // architecture as the user mutates them.
  const currentSystems: SystemEntry[] = activeFunction
    ? (byFunction[activeFunction.id] ?? [])
        .map((id) => entries.get(id))
        .filter((e): e is SystemEntry => Boolean(e))
    : [];
  const addedNames = new Set(currentSystems.map((s) => s.name.toLowerCase()));
  const filteredSuggestions = suggestions.filter(
    (sug) => !addedNames.has(sug.name.toLowerCase()),
  );

  const handleAddSuggested = useCallback(
    (sug: FunctionSystemSuggestion) => {
      if (!activeFunction) return;

      const match = findMatchingTool(sug.name, KNOWN_TOOLS);

      const name = match?.name ?? sug.name;
      const type: SystemType = match
        ? guessSystemTypeFromCategory(match.category)
        : FUNCTION_TO_SYSTEM_TYPE[activeFunction.type] ?? 'other';
      const vendor = match?.provider ?? '';
      const hosting: 'cloud' | 'on_premise' | 'hybrid' | 'unknown' = match ? 'cloud' : 'unknown';

      const techFreedomScore = techFreedomEnabled && match ? match.score : undefined;
      const matchedTool = techFreedomEnabled && match ? match : undefined;

      let cost: SystemCost | undefined;
      const staffCount = architecture?.organisation.staffCount ?? DEFAULT_STAFF[orgSize];
      if (match) {
        const estimate = estimateToolCost(match.pricing, match.estimatedAnnualCost, staffCount);
        cost = {
          amount: estimate.annualTotal,
          period: 'annual',
          model: estimate.annualTotal === 0 ? 'free' : 'subscription',
          source: 'estimate',
        };
      }

      // If a system with the same name already exists across any tab, merge
      // by adding this function id rather than creating a duplicate.
      const existing = Array.from(entries.values()).find(
        (e) => e.name.toLowerCase() === name.toLowerCase(),
      );

      if (existing) {
        if (existing.functionIds.includes(activeFunction.id)) return;
        const nextFunctionIds = [...existing.functionIds, activeFunction.id];
        updateSystem(existing.id, { functionIds: nextFunctionIds });
        setEntries((prev) => {
          const next = new Map(prev);
          next.set(existing.id, { ...existing, functionIds: nextFunctionIds });
          return next;
        });
        setByFunction((prev) => ({
          ...prev,
          [activeFunction.id]: [...(prev[activeFunction.id] ?? []), existing.id],
        }));
        return;
      }

      const id = addSystem({
        name,
        type,
        vendor: vendor || undefined,
        hosting,
        status: 'active',
        functionIds: [activeFunction.id],
        serviceIds: [],
        ...(techFreedomScore ? { techFreedomScore } : {}),
        ...(cost ? { cost } : {}),
      });

      setEntries((prev) => {
        const next = new Map(prev);
        next.set(id, {
          id,
          name,
          type,
          vendor,
          hosting,
          techFreedomScore,
          matchedTool,
          cost,
          serviceIds: [],
          status: 'active',
          functionIds: [activeFunction.id],
        });
        return next;
      });
      setByFunction((prev) => ({
        ...prev,
        [activeFunction.id]: [...(prev[activeFunction.id] ?? []), id],
      }));
    },
    [activeFunction, techFreedomEnabled, orgSize, architecture, addSystem, updateSystem, entries],
  );

  const updateField = useCallback(
    <K extends keyof SystemFormData>(field: K, value: SystemFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleNameBlur = useCallback(() => {
    const match = findMatchingTool(formData.name, KNOWN_TOOLS);
    if (techFreedomEnabled) {
      setCurrentMatch(match);
    }
    // Pre-fill cost from known tool regardless of TechFreedom setting
    if (match) {
      const staffCount = architecture?.organisation.staffCount ?? DEFAULT_STAFF[orgSize];
      const estimate = estimateToolCost(match.pricing, match.estimatedAnnualCost, staffCount);
      setFormData((prev) => ({
        ...prev,
        costAmount: String(estimate.annualTotal),
        costPeriod: 'annual' as CostPeriod,
        costModel: estimate.annualTotal === 0 ? 'free' as CostModel : 'subscription' as CostModel,
      }));
      setCostBreakdown(estimate.breakdown);
    } else {
      setCostBreakdown(null);
    }
  }, [techFreedomEnabled, formData.name, orgSize, architecture]);

  const handleAddSystem = useCallback(() => {
    if (!formData.name.trim() || !activeFunction) return;

    const name = formData.name.trim();
    const type = formData.type;
    const vendor = formData.vendor.trim();
    const hosting = formData.hosting;

    const techFreedomScore = techFreedomEnabled && currentMatch ? currentMatch.score : undefined;
    const matchedTool = techFreedomEnabled && currentMatch ? currentMatch : undefined;

    let cost: SystemCost | undefined;
    const costAmount = parseFloat(formData.costAmount);
    if (!isNaN(costAmount) && costAmount >= 0) {
      cost = {
        amount: costAmount,
        period: formData.costPeriod,
        model: formData.costModel,
        source: 'user',
      };
    }

    const id = addSystem({
      name,
      type,
      vendor: vendor || undefined,
      hosting,
      status: 'active',
      functionIds: [activeFunction.id],
      serviceIds: [],
      ...(techFreedomScore ? { techFreedomScore } : {}),
      ...(cost ? { cost } : {}),
    });

    setEntries((prev) => {
      const next = new Map(prev);
      next.set(id, {
        id,
        name,
        type,
        vendor,
        hosting,
        techFreedomScore,
        matchedTool,
        cost,
        serviceIds: [],
        status: 'active',
        functionIds: [activeFunction.id],
      });
      return next;
    });
    setByFunction((prev) => ({
      ...prev,
      [activeFunction.id]: [...(prev[activeFunction.id] ?? []), id],
    }));

    setFormData(emptyFormForFunction(activeFunction.type));
    setCurrentMatch(null);
    setCostBreakdown(null);
  }, [formData, activeFunction, techFreedomEnabled, currentMatch, addSystem]);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleRemoveSystem = useCallback(
    (functionId: string, index: number) => {
      const id = byFunction[functionId]?.[index];
      if (!id) return;
      const entry = entries.get(id);

      // Drop this function id from the system's membership.
      setByFunction((prev) => ({
        ...prev,
        [functionId]: (prev[functionId] ?? []).filter((_, i) => i !== index),
      }));

      const remainingFunctionIds = (entry?.functionIds ?? []).filter((f) => f !== functionId);

      if (remainingFunctionIds.length === 0) {
        // No tabs left — remove the system entirely.
        removeSystem(id);
        setEntries((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      } else {
        // Still linked elsewhere — just unlink, don't destroy.
        updateSystem(id, { functionIds: remainingFunctionIds });
        if (entry) {
          setEntries((prev) => {
            const next = new Map(prev);
            next.set(id, { ...entry, functionIds: remainingFunctionIds });
            return next;
          });
        }
      }
      if (editingIndex === index) setEditingIndex(null);
    },
    [byFunction, entries, removeSystem, updateSystem, editingIndex],
  );

  const handleUpdateSystemCost = useCallback(
    (functionId: string, index: number, amount: string, period: string, model: string) => {
      const id = byFunction[functionId]?.[index];
      if (!id) return;
      const entry = entries.get(id);
      if (!entry) return;

      const parsed = parseFloat(amount);
      let nextCost: SystemCost | undefined;
      if (!isNaN(parsed) && parsed >= 0) {
        nextCost = {
          amount: parsed,
          period: period as 'monthly' | 'annual',
          model: parsed === 0 ? ('free' as const) : (model as 'subscription' | 'perpetual' | 'free' | 'unknown'),
          source: 'user',
        };
      }

      updateSystem(id, { cost: nextCost });
      setEntries((prev) => {
        const next = new Map(prev);
        next.set(id, { ...entry, cost: nextCost });
        return next;
      });
    },
    [byFunction, entries, updateSystem],
  );

  const handleContinue = useCallback(() => {
    // Architecture is already up-to-date via incremental writes — just navigate.
    router.push('/wizard/functions/importance');
  }, [router]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  if (functions.length === 0) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-lg text-primary-700">
          No functions selected yet. Please go back and choose at least one function.
        </p>
        <Link href="/wizard/functions" className="btn-primary inline-block">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
          What software do you use?
        </h1>
        <p className="text-lg text-primary-700">
          For each area, tell us what tools and systems your organisation uses. It&rsquo;s fine to
          skip areas or come back later.
        </p>
      </div>

      {/* Function tabs */}
      <div role="tablist" aria-label="Organisation functions" className="flex flex-wrap gap-2">
        {functions.map((fn, index) => {
          const isActive = index === activeFunctionIndex;
          const fnSystems = byFunction[fn.id] ?? [];
          return (
            <button
              key={fn.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${fn.id}`}
              id={`tab-${fn.id}`}
              onClick={() => {
                setActiveFunctionIndex(index);
                setFormData(emptyFormForFunction(fn.type));
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-100 text-primary-700 hover:bg-surface-200 border border-surface-300'
                }
              `}
            >
              {fn.name}
              {fnSystems.length > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
                    ${isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}
                  `}
                >
                  {fnSystems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active function panel */}
      {activeFunction && (
        <div
          role="tabpanel"
          id={`panel-${activeFunction.id}`}
          aria-labelledby={`tab-${activeFunction.id}`}
          className="space-y-6"
        >
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
            <h2 className="font-display font-semibold text-primary-900 text-lg break-words">
              {activeFunction.name}
            </h2>
            {activeFunction.description && (
              <p className="text-sm text-primary-600 mt-1">{activeFunction.description}</p>
            )}
          </div>

          {/* Suggested systems — prominent when no systems added yet */}
          {currentSystems.length === 0 && filteredSuggestions.length > 0 && (
            <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
              <p className="text-sm font-medium text-primary-800 mb-2">
                Common tools for {activeFunction.name}:
              </p>
              <p className="text-xs text-primary-500 mb-3">
                Click to add, or add your own below
              </p>
              <div className="flex flex-wrap gap-2">
                {filteredSuggestions.map((sug) => (
                  <button
                    key={sug.name}
                    type="button"
                    onClick={() => handleAddSuggested(sug)}
                    className="text-sm text-primary-700 bg-white border border-surface-300 rounded-full px-3 py-1.5 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                  >
                    + {sug.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Existing systems for this function */}
          {currentSystems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
                Added systems
              </h3>
              <ul className="space-y-2" role="list">
                {currentSystems.map((sys, idx) => {
                  const score = sys.techFreedomScore;
                  const total = score ? totalScore(score) : null;
                  const level = total !== null ? riskLevel(total) : null;
                  const isEditing = editingIndex === idx;
                  return (
                  <li
                    key={idx}
                    className="bg-white border border-surface-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="break-words min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-primary-900 break-words">{sys.name}</span>
                        <span className="text-sm text-primary-500" aria-label="system type">
                          {'\u00B7'} {SYSTEM_TYPES.find((t) => t.value === sys.type)?.label}
                        </span>
                        {sys.cost && sys.cost.amount > 0 && (
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="text-sm text-primary-600 hover:text-primary-800 underline underline-offset-2 transition-colors"
                            aria-label={`Edit cost for ${sys.name}`}
                          >
                            {'\u00A3'}{sys.cost.amount.toLocaleString('en-GB')}/{sys.cost.period === 'annual' ? 'yr' : 'mo'}
                          </button>
                        )}
                        {sys.cost && sys.cost.model === 'free' && (
                          <span className="text-sm text-green-600">Free</span>
                        )}
                        {!sys.cost && (
                          <button
                            type="button"
                            onClick={() => setEditingIndex(isEditing ? null : idx)}
                            className="text-xs text-accent-600 hover:text-accent-700 underline underline-offset-2 transition-colors"
                            aria-label={`Add cost for ${sys.name}`}
                          >
                            Add cost
                          </button>
                        )}
                        {sys.vendor && (
                          <span className="text-sm text-primary-500">({sys.vendor})</span>
                        )}
                        {level !== null && total !== null && (
                          <span
                            className={`text-xs font-medium px-1.5 py-0.5 rounded ${RISK_COLORS[level]}`}
                            data-testid="risk-indicator"
                          >
                            Risk: {total}/25 {level.charAt(0).toUpperCase() + level.slice(1)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(isEditing ? null : idx)}
                          aria-label={`Edit ${sys.name}`}
                          className="text-primary-400 hover:text-primary-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveSystem(activeFunction.id, idx)}
                          aria-label={`Remove ${sys.name}`}
                          className="text-primary-400 hover:text-red-600 transition-colors p-1"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    {/* Inline cost editor */}
                    {isEditing && (
                      <div className="mt-3 pt-3 border-t border-surface-200">
                        <p className="text-xs font-medium text-primary-700 mb-2">Edit cost for {sys.name}</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label htmlFor={`cost-amount-${idx}`} className="text-xs text-primary-500 block mb-1">Amount (£)</label>
                            <input
                              id={`cost-amount-${idx}`}
                              type="number"
                              min="0"
                              step="1"
                              defaultValue={sys.cost?.amount ?? ''}
                              onBlur={(e) => handleUpdateSystemCost(
                                activeFunction.id, idx, e.target.value,
                                sys.cost?.period ?? 'annual',
                                sys.cost?.model ?? 'subscription',
                              )}
                              className="w-full rounded border border-surface-300 px-2 py-1.5 text-sm text-primary-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                              placeholder="0"
                            />
                          </div>
                          <div>
                            <label htmlFor={`cost-period-${idx}`} className="text-xs text-primary-500 block mb-1">Period</label>
                            <select
                              id={`cost-period-${idx}`}
                              defaultValue={sys.cost?.period ?? 'annual'}
                              onChange={(e) => handleUpdateSystemCost(
                                activeFunction.id, idx,
                                String(sys.cost?.amount ?? 0),
                                e.target.value,
                                sys.cost?.model ?? 'subscription',
                              )}
                              className="w-full rounded border border-surface-300 px-2 py-1.5 text-sm text-primary-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="annual">Per year</option>
                              <option value="monthly">Per month</option>
                            </select>
                          </div>
                          <div>
                            <label htmlFor={`cost-model-${idx}`} className="text-xs text-primary-500 block mb-1">Model</label>
                            <select
                              id={`cost-model-${idx}`}
                              defaultValue={sys.cost?.model ?? 'subscription'}
                              onChange={(e) => handleUpdateSystemCost(
                                activeFunction.id, idx,
                                String(sys.cost?.amount ?? 0),
                                sys.cost?.period ?? 'annual',
                                e.target.value,
                              )}
                              className="w-full rounded border border-surface-300 px-2 py-1.5 text-sm text-primary-900 focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="subscription">Subscription</option>
                              <option value="perpetual">One-off</option>
                              <option value="free">Free</option>
                              <option value="unknown">Don&apos;t know</option>
                            </select>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingIndex(null)}
                          className="text-xs text-primary-600 hover:text-primary-800 mt-2 underline underline-offset-2"
                        >
                          Done
                        </button>
                      </div>
                    )}
                  </li>
                  );
                })}
              </ul>

              {/* More suggestions — smaller row when systems already added */}
              {filteredSuggestions.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span className="text-xs font-medium text-primary-500">More suggestions:</span>
                  {filteredSuggestions.map((sug) => (
                    <button
                      key={sug.name}
                      type="button"
                      onClick={() => handleAddSuggested(sug)}
                      className="text-xs text-primary-600 bg-surface-50 border border-surface-200 rounded-full px-2.5 py-1 hover:border-primary-400 hover:bg-primary-50 transition-colors"
                    >
                      + {sug.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Add system form */}
          <div className="bg-white border border-surface-200 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="font-medium text-primary-900">Add a system</h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id="system-name"
                label="System name"
                required
                value={formData.name}
                onChange={(e) => updateField('name', e.target.value)}
                onBlur={handleNameBlur}
                placeholder="e.g. Xero, Salesforce, Excel"
              />

              <Select
                id="system-type"
                label="System type"
                value={formData.type}
                onChange={(e) => updateField('type', e.target.value as SystemType)}
              >
                {SYSTEM_TYPES.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </Select>

              <Input
                id="system-vendor"
                label="Vendor"
                helperText="Optional"
                value={formData.vendor}
                onChange={(e) => updateField('vendor', e.target.value)}
                placeholder="e.g. Microsoft, Google"
              />

              <Select
                id="system-hosting"
                label="Hosting"
                value={formData.hosting}
                onChange={(e) =>
                  updateField('hosting', e.target.value as SystemFormData['hosting'])
                }
              >
                {HOSTING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* Cost (optional) */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-primary-700">Cost (optional)</h4>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label htmlFor="system-cost-amount" className="block text-sm font-medium text-primary-800 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500 text-sm pointer-events-none">
                      {'\u00A3'}
                    </span>
                    <input
                      id="system-cost-amount"
                      type="number"
                      min={0}
                      step="any"
                      value={formData.costAmount}
                      onChange={(e) => updateField('costAmount', e.target.value)}
                      placeholder="e.g. 360"
                      className="w-full rounded-md border border-surface-300 bg-white pl-7 pr-3 py-2 text-sm text-primary-900 placeholder:text-primary-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <Select
                  id="system-cost-period"
                  label="Period"
                  value={formData.costPeriod}
                  onChange={(e) =>
                    updateField('costPeriod', e.target.value as CostPeriod)
                  }
                >
                  {COST_PERIOD_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>

                <Select
                  id="system-cost-model"
                  label="Pricing model"
                  value={formData.costModel}
                  onChange={(e) =>
                    updateField('costModel', e.target.value as CostModel)
                  }
                >
                  {COST_MODEL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/*
                Space is reserved whether or not there is a breakdown to show.
                This line appears when the name field loses focus, and if that
                grew the form it pushed the Add system button out from under
                the pointer between mousedown and mouseup — so clicking Add
                straight after typing a recognised tool name did nothing.
              */}
              <p className="text-xs text-primary-500 min-h-[1rem]">
                {costBreakdown && formData.costAmount ? costBreakdown : ' '}
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddSystem}
              disabled={!formData.name.trim()}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add system
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href="/wizard/functions"
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
          className="btn-primary inline-flex items-center gap-2"
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
