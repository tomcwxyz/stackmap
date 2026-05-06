'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { SystemType } from '@/lib/types';
import type { TechFreedomScore, KnownTool } from '@/lib/techfreedom/types';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';
import { totalScore, riskLevel } from '@/lib/techfreedom/risk';
import { estimateToolCost, DEFAULT_STAFF } from '@/lib/cost-estimates';

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

interface SystemCost {
  amount: number;
  period: CostPeriod;
  model: CostModel;
}

interface SystemEntry {
  id: string;
  name: string;
  type: SystemType;
  vendor: string;
  hosting: string;
  techFreedomScore?: TechFreedomScore;
  matchedTool?: KnownTool;
  cost?: SystemCost;
  // Preserve-on-write so cross-step links survive back-and-forth navigation.
  serviceIds: string[];
  functionIds: string[];
  status: 'active' | 'planned' | 'retiring' | 'legacy';
}

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

function emptyForm(): SystemFormData {
  return {
    name: '',
    type: 'other',
    vendor: '',
    hosting: 'unknown',
    costAmount: '',
    costPeriod: 'annual',
    costModel: 'subscription',
  };
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  moderate: 'text-amber-700 bg-amber-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
};

export function ServiceSystems() {
  const router = useRouter();
  const { architecture, addSystem, updateSystem, removeSystem } = useArchitecture();

  const services = architecture?.services ?? [];
  const techFreedomEnabled = architecture?.metadata?.techFreedomEnabled === true;
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [formData, setFormData] = useState<SystemFormData>(emptyForm);
  // Architecture is the source of truth. See function-systems.tsx for the
  // rationale; same pattern keyed by serviceId here.
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
        functionIds: sys.functionIds ?? [],
        status: sys.status,
      });
    }
    return m;
  });
  const [byService, setByService] = useState<Record<string, string[]>>(() => {
    const m: Record<string, string[]> = {};
    for (const sys of architecture?.systems ?? []) {
      for (const svcId of sys.serviceIds) {
        (m[svcId] ??= []).push(sys.id);
      }
    }
    return m;
  });
  const [currentMatch, setCurrentMatch] = useState<KnownTool | null>(null);
  const [costBreakdown, setCostBreakdown] = useState<string | null>(null);

  const activeService = services[activeServiceIndex];

  const updateField = useCallback(
    <K extends keyof SystemFormData>(field: K, value: SystemFormData[K]) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const orgSize = architecture?.organisation.size ?? 'small';

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
    if (!formData.name.trim() || !activeService) return;

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
      };
    }

    // Cross-service merge: same name → existing system gains a serviceId.
    const existing = Array.from(entries.values()).find(
      (e) => e.name.toLowerCase() === name.toLowerCase(),
    );

    if (existing) {
      if (!existing.serviceIds.includes(activeService.id)) {
        const nextServiceIds = [...existing.serviceIds, activeService.id];
        updateSystem(existing.id, { serviceIds: nextServiceIds });
        setEntries((prev) => {
          const next = new Map(prev);
          next.set(existing.id, { ...existing, serviceIds: nextServiceIds });
          return next;
        });
        setByService((prev) => ({
          ...prev,
          [activeService.id]: [...(prev[activeService.id] ?? []), existing.id],
        }));
      }
    } else {
      const id = addSystem({
        name,
        type,
        vendor: vendor || undefined,
        hosting,
        status: 'active',
        functionIds: [],
        serviceIds: [activeService.id],
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
          serviceIds: [activeService.id],
          functionIds: [],
          status: 'active',
        });
        return next;
      });
      setByService((prev) => ({
        ...prev,
        [activeService.id]: [...(prev[activeService.id] ?? []), id],
      }));
    }

    setFormData(emptyForm());
    setCurrentMatch(null);
    setCostBreakdown(null);
  }, [formData, activeService, techFreedomEnabled, currentMatch, addSystem, updateSystem, entries]);

  const handleRemoveSystem = useCallback(
    (serviceId: string, index: number) => {
      const id = byService[serviceId]?.[index];
      if (!id) return;
      const entry = entries.get(id);

      setByService((prev) => ({
        ...prev,
        [serviceId]: (prev[serviceId] ?? []).filter((_, i) => i !== index),
      }));

      const remainingServiceIds = (entry?.serviceIds ?? []).filter((s) => s !== serviceId);

      if (remainingServiceIds.length === 0) {
        removeSystem(id);
        setEntries((prev) => {
          const next = new Map(prev);
          next.delete(id);
          return next;
        });
      } else {
        updateSystem(id, { serviceIds: remainingServiceIds });
        if (entry) {
          setEntries((prev) => {
            const next = new Map(prev);
            next.set(id, { ...entry, serviceIds: remainingServiceIds });
            return next;
          });
        }
      }
    },
    [byService, entries, removeSystem, updateSystem],
  );

  const handleContinue = useCallback(() => {
    // Architecture is up-to-date via incremental writes; just navigate.
    router.push('/wizard/services/importance');
  }, [router]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="text-center space-y-4 py-12">
        <p className="text-lg text-primary-700">
          No services added yet. Please go back and add at least one service.
        </p>
        <Link href="/wizard/services" className="btn-primary inline-block">
          Go back
        </Link>
      </div>
    );
  }

  const currentSystems: SystemEntry[] = activeService
    ? (byService[activeService.id] ?? [])
        .map((id) => entries.get(id))
        .filter((e): e is SystemEntry => Boolean(e))
    : [];

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
          What software do you use?
        </h1>
        <p className="text-lg text-primary-700">
          For each service, tell us what tools and systems your organisation uses to deliver it.
          It&rsquo;s fine to skip services or come back later.
        </p>
      </div>

      {/* Service tabs */}
      <div role="tablist" aria-label="Organisation services" className="flex flex-wrap gap-2">
        {services.map((svc, index) => {
          const isActive = index === activeServiceIndex;
          const svcSystems = byService[svc.id] ?? [];
          return (
            <button
              key={svc.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${svc.id}`}
              id={`tab-${svc.id}`}
              onClick={() => {
                setActiveServiceIndex(index);
                setFormData(emptyForm());
              }}
              className={`
                px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150
                ${isActive
                  ? 'bg-primary-600 text-white shadow-sm'
                  : 'bg-surface-100 text-primary-700 hover:bg-surface-200 border border-surface-300'
                }
              `}
            >
              {svc.name}
              {svcSystems.length > 0 && (
                <span
                  className={`ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs
                    ${isActive ? 'bg-white/20 text-white' : 'bg-primary-100 text-primary-700'}
                  `}
                >
                  {svcSystems.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active service panel */}
      {activeService && (
        <div
          role="tabpanel"
          id={`panel-${activeService.id}`}
          aria-labelledby={`tab-${activeService.id}`}
          className="space-y-6"
        >
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-4">
            <h2 className="font-display font-semibold text-primary-900 text-lg break-words">
              {activeService.name}
            </h2>
            {activeService.description && (
              <p className="text-sm text-primary-600 mt-1">{activeService.description}</p>
            )}
          </div>

          {/* Existing systems for this service */}
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
                  return (
                    <li
                      key={idx}
                      className="flex items-center justify-between bg-white border border-surface-200 rounded-lg p-3"
                    >
                      <div className="break-words min-w-0 flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-primary-900 break-words">{sys.name}</span>
                        <span className="text-sm text-primary-500">
                          {SYSTEM_TYPES.find((t) => t.value === sys.type)?.label}
                        </span>
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
                      <button
                        type="button"
                        onClick={() => handleRemoveSystem(activeService.id, idx)}
                        aria-label={`Remove ${sys.name}`}
                        className="text-primary-400 hover:text-red-600 transition-colors p-1"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </li>
                  );
                })}
              </ul>
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

            <details className="group">
              <summary className="cursor-pointer text-sm font-medium text-primary-700 hover:text-primary-900 transition-colors select-none">
                Add cost information (optional)
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-sm text-primary-600">
                  Estimated yearly cost (optional). We&rsquo;ve suggested a cost based on your
                  organisation size. Edit if you know your actual cost.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Input
                    id="system-cost-amount"
                    label="Amount (&pound;)"
                    type="number"
                    min={0}
                    step="any"
                    value={formData.costAmount}
                    onChange={(e) => updateField('costAmount', e.target.value)}
                    placeholder="e.g. 360"
                  />

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
                {costBreakdown && formData.costAmount && (
                  <p className="text-xs text-primary-500">
                    {costBreakdown}
                  </p>
                )}
              </div>
            </details>

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
          href="/wizard/services"
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
