'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

const INTEGRATION_TYPES = [
  { value: 'api', label: 'API / automated' },
  { value: 'file_transfer', label: 'File transfer' },
  { value: 'manual', label: 'Manual copy' },
  { value: 'webhook', label: 'Webhook' },
  { value: 'database_link', label: 'Database link' },
  { value: 'unknown', label: "Don't know" },
] as const;

const DIRECTION_OPTIONS = [
  { value: 'one_way', label: 'One-way' },
  { value: 'two_way', label: 'Two-way' },
] as const;

const FREQUENCY_OPTIONS = [
  { value: 'real_time', label: 'Real-time' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'on_demand', label: 'On demand' },
  { value: 'unknown', label: 'Unknown' },
] as const;

const RELIABILITY_OPTIONS = [
  { value: 'reliable', label: 'Reliable \u2014 it just works' },
  { value: 'fragile', label: 'Fragile \u2014 it breaks or needs chasing' },
  { value: 'unknown', label: "Don't know" },
] as const;

interface IntegrationDraft {
  sourceSystemId: string;
  targetSystemId: string;
  type: 'api' | 'file_transfer' | 'manual' | 'webhook' | 'database_link' | 'unknown';
  direction: 'one_way' | 'two_way';
  frequency: 'real_time' | 'scheduled' | 'on_demand' | 'unknown';
  reliability: 'reliable' | 'fragile' | 'unknown';
  description: string;
}

/** An added connection, carrying the id it was given in the architecture. */
interface IntegrationEntry extends IntegrationDraft {
  id: string;
}

const EMPTY_DRAFT: IntegrationDraft = {
  sourceSystemId: '',
  targetSystemId: '',
  type: 'unknown',
  direction: 'one_way',
  frequency: 'unknown',
  reliability: 'unknown',
  description: '',
};

export function IntegrationMatrix() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith('/wizard/services') ? '/wizard/services' : '/wizard/functions';
  const { architecture, addIntegration, removeIntegration } = useArchitecture();

  const [draft, setDraft] = useState<IntegrationDraft>(EMPTY_DRAFT);
  // Local mirror of the architecture's integrations, keyed by the id each was
  // given when it was added. Connections are written straight through, so
  // leaving this step by any route keeps what has been entered.
  const [added, setAdded] = useState<IntegrationEntry[]>(() => {
    return (architecture?.integrations ?? []).map((intg) => ({
      id: intg.id,
      sourceSystemId: intg.sourceSystemId,
      targetSystemId: intg.targetSystemId,
      type: intg.type,
      direction: intg.direction,
      frequency: intg.frequency,
      reliability: intg.reliability ?? 'unknown',
      description: intg.description ?? '',
    }));
  });

  const systems = useMemo(() => architecture?.systems ?? [], [architecture]);

  const updateField = useCallback(
    <K extends keyof IntegrationDraft>(field: K, value: IntegrationDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleAdd = useCallback(() => {
    if (!draft.sourceSystemId || !draft.targetSystemId) return;
    if (draft.sourceSystemId === draft.targetSystemId) return;

    const connection = { ...draft, description: draft.description.trim() };
    const id = addIntegration({
      sourceSystemId: connection.sourceSystemId,
      targetSystemId: connection.targetSystemId,
      type: connection.type,
      direction: connection.direction,
      frequency: connection.frequency,
      description: connection.description || undefined,
      reliability: connection.reliability,
    });

    setAdded((prev) => [...prev, { ...connection, id }]);
    setDraft(EMPTY_DRAFT);
  }, [draft, addIntegration]);

  const handleRemove = useCallback(
    (id: string) => {
      removeIntegration(id);
      setAdded((prev) => prev.filter((intg) => intg.id !== id));
    },
    [removeIntegration],
  );

  const getSystemName = useCallback(
    (id: string) => systems.find((s) => s.id === id)?.name ?? 'Unknown',
    [systems],
  );

  const handleContinue = useCallback(() => {
    router.push(`${basePath}/owners`);
  }, [router, basePath]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  if (systems.length < 2) {
    return (
      <div className="space-y-8">
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
            How do your systems connect to each other?
          </h1>
          <p className="text-lg text-primary-700">
            You need at least two systems to map integrations. You can come back to this step later.
          </p>
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-surface-200">
          <Link
            href={`${basePath}/data`}
            className="btn-secondary inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back
          </Link>
          <button
            type="button"
            onClick={() => router.push(`${basePath}/owners`)}
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

  const canAdd =
    draft.sourceSystemId &&
    draft.targetSystemId &&
    draft.sourceSystemId !== draft.targetSystemId;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
          How do your systems connect to each other?
        </h1>
        <p className="text-lg text-primary-700">
          Add connections between your systems. For example, does your CRM send data to your
          email tool? Does someone copy information between spreadsheets?
        </p>
      </div>

      {/* Added integrations */}
      {added.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            Connections added
          </h2>
          <ul className="space-y-2" role="list">
            {added.map((intg) => (
              <li
                key={intg.id}
                className="flex items-center justify-between bg-white border border-surface-200 rounded-lg p-3"
              >
                <div className="break-words min-w-0">
                  <span className="font-medium text-primary-900 break-words">
                    {getSystemName(intg.sourceSystemId)}
                  </span>
                  <span className="text-primary-500 mx-2">
                    {intg.direction === 'two_way' ? '\u2194' : '\u2192'}
                  </span>
                  <span className="font-medium text-primary-900">
                    {getSystemName(intg.targetSystemId)}
                  </span>
                  <span className="text-sm text-primary-500 ml-2">
                    ({INTEGRATION_TYPES.find((t) => t.value === intg.type)?.label})
                  </span>
                  {intg.reliability === 'fragile' && (
                    <span className="text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 ml-2 font-medium">
                      Fragile
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(intg.id)}
                  aria-label={`Remove connection between ${getSystemName(intg.sourceSystemId)} and ${getSystemName(intg.targetSystemId)}`}
                  className="text-primary-400 hover:text-red-600 transition-colors p-1"
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

      {/* Add integration form */}
      <div className="bg-white border border-surface-200 rounded-lg p-4 sm:p-6 space-y-4">
        <h2 className="font-medium text-primary-900">Add a connection</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            id="source-system"
            label="From system"
            required
            value={draft.sourceSystemId}
            onChange={(e) => updateField('sourceSystemId', e.target.value)}
          >
            <option value="">Choose a system</option>
            {systems.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name}
              </option>
            ))}
          </Select>

          <Select
            id="target-system"
            label="To system"
            required
            value={draft.targetSystemId}
            onChange={(e) => updateField('targetSystemId', e.target.value)}
          >
            <option value="">Choose a system</option>
            {systems.map((sys) => (
              <option key={sys.id} value={sys.id}>
                {sys.name}
              </option>
            ))}
          </Select>

          <Select
            id="integration-type"
            label="How are they connected?"
            value={draft.type}
            onChange={(e) => updateField('type', e.target.value as IntegrationDraft['type'])}
          >
            {INTEGRATION_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Select
            id="integration-direction"
            label="Direction"
            value={draft.direction}
            onChange={(e) => updateField('direction', e.target.value as IntegrationDraft['direction'])}
          >
            {DIRECTION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Select
            id="integration-frequency"
            label="How often?"
            value={draft.frequency}
            onChange={(e) => updateField('frequency', e.target.value as IntegrationDraft['frequency'])}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Select
            id="integration-reliability"
            label="How well does it work?"
            value={draft.reliability}
            onChange={(e) => updateField('reliability', e.target.value as IntegrationDraft['reliability'])}
          >
            {RELIABILITY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>

          <Input
            id="integration-description"
            label="Notes"
            helperText="Optional"
            value={draft.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="e.g. Nightly sync of donor records"
          />
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!canAdd}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add connection
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href={`${basePath}/data`}
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
