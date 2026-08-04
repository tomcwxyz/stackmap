'use client';

import { useCallback, useState } from 'react';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import type {
  DataFlowFrequency,
  DataFlowMethod,
  ExternalPartyType,
  PartyLocation,
} from '@/lib/types';

const PARTY_TYPES: { value: ExternalPartyType; label: string }[] = [
  { value: 'funder', label: 'Funder' },
  { value: 'regulator', label: 'Regulator' },
  { value: 'auditor', label: 'Auditor or accountant' },
  { value: 'partner', label: 'Delivery partner' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'other', label: 'Other' },
];

const LOCATIONS: { value: PartyLocation; label: string }[] = [
  { value: 'uk', label: 'UK' },
  { value: 'eea', label: 'Europe (EEA)' },
  { value: 'rest_of_world', label: 'Outside Europe' },
  { value: 'unknown', label: "Don't know" },
];

const METHODS: { value: DataFlowMethod; label: string }[] = [
  { value: 'portal', label: 'Their online portal' },
  { value: 'email', label: 'Email' },
  { value: 'file_transfer', label: 'File or spreadsheet' },
  { value: 'api', label: 'Automatic (API)' },
  { value: 'post', label: 'Post' },
  { value: 'manual', label: 'Someone types it in' },
  { value: 'unknown', label: "Don't know" },
];

const FREQUENCIES: { value: DataFlowFrequency; label: string }[] = [
  { value: 'annual', label: 'Once a year' },
  { value: 'scheduled', label: 'On a regular schedule' },
  { value: 'on_demand', label: 'When asked' },
  { value: 'real_time', label: 'Continuously' },
  { value: 'unknown', label: "Don't know" },
];

interface PartyDraft {
  name: string;
  type: ExternalPartyType;
  location: PartyLocation;
}

const EMPTY_PARTY: PartyDraft = { name: '', type: 'funder', location: 'uk' };

interface FlowDraft {
  systemId: string;
  partyId: string;
  dataCategoryIds: string[];
  purpose: string;
  method: DataFlowMethod;
  frequency: DataFlowFrequency;
}

const EMPTY_FLOW: FlowDraft = {
  systemId: '',
  partyId: '',
  dataCategoryIds: [],
  purpose: '',
  method: 'portal',
  frequency: 'annual',
};

/**
 * Who outside the organisation sees its data.
 *
 * The map stopped at the organisation boundary, but reporting to funders and
 * regulators is most of what a small charity does with its data — and it is the
 * part a record of processing activities has to describe.
 */
export function SharingForm() {
  const {
    architecture,
    addExternalParty,
    removeExternalParty,
    addDataFlow,
    removeDataFlow,
  } = useArchitecture();

  const [party, setParty] = useState<PartyDraft>(EMPTY_PARTY);
  const [flow, setFlow] = useState<FlowDraft>(EMPTY_FLOW);

  const handleAddParty = useCallback(() => {
    const name = party.name.trim();
    if (!name) return;
    addExternalParty({ name, type: party.type, location: party.location });
    setParty(EMPTY_PARTY);
  }, [party, addExternalParty]);

  const handleAddFlow = useCallback(() => {
    if (!flow.systemId || !flow.partyId) return;
    addDataFlow({
      systemId: flow.systemId,
      partyId: flow.partyId,
      dataCategoryIds: flow.dataCategoryIds,
      purpose: flow.purpose.trim() || undefined,
      method: flow.method,
      frequency: flow.frequency,
    });
    setFlow(EMPTY_FLOW);
  }, [flow, addDataFlow]);

  if (!architecture) return null;

  const { systems, dataCategories, externalParties, dataFlows } = architecture;
  const canAddFlow = Boolean(flow.systemId && flow.partyId);

  return (
    <section className="space-y-6" aria-labelledby="sharing-heading">
      <div className="space-y-1">
        <h2 id="sharing-heading" className="text-xl font-display font-bold text-primary-900">
          Who outside the organisation sees this data?
        </h2>
        <p className="text-primary-700">
          Funders, regulators, auditors and delivery partners. Recording this now is what
          makes a data protection record possible later.
        </p>
      </div>

      {/* Parties */}
      <div className="space-y-3">
        {externalParties.length > 0 && (
          <ul className="space-y-2" role="list">
            {externalParties.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between bg-white border border-surface-200 rounded-lg p-3"
              >
                <div className="min-w-0">
                  <span className="font-medium text-primary-900">{p.name}</span>
                  <span className="text-sm text-primary-500 ml-2">
                    {PARTY_TYPES.find((t) => t.value === p.type)?.label}
                  </span>
                  {p.location && p.location !== 'uk' && (
                    <span className="text-xs bg-surface-200 text-primary-600 rounded px-1.5 py-0.5 ml-2">
                      {LOCATIONS.find((l) => l.value === p.location)?.label}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeExternalParty(p.id)}
                  aria-label={`Remove ${p.name}`}
                  className="text-primary-400 hover:text-red-600 transition-colors p-1"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="bg-white border border-surface-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-primary-900">Add someone you share with</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              id="party-name"
              label="Name"
              value={party.name}
              onChange={(e) => setParty((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. The National Lottery Community Fund"
            />
            <Select
              id="party-type"
              label="What are they to you?"
              value={party.type}
              onChange={(e) =>
                setParty((prev) => ({ ...prev, type: e.target.value as ExternalPartyType }))
              }
            >
              {PARTY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
            <Select
              id="party-location"
              label="Where are they?"
              value={party.location}
              onChange={(e) =>
                setParty((prev) => ({ ...prev, location: e.target.value as PartyLocation }))
              }
            >
              {LOCATIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <button
            type="button"
            onClick={handleAddParty}
            disabled={!party.name.trim()}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
      </div>

      {/* Flows */}
      {externalParties.length > 0 && systems.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            What goes to them
          </h3>

          {dataFlows.length > 0 && (
            <ul className="space-y-2" role="list">
              {dataFlows.map((f) => {
                const system = systems.find((s) => s.id === f.systemId);
                const target = externalParties.find((p) => p.id === f.partyId);
                const categories = f.dataCategoryIds
                  .map((id) => dataCategories.find((dc) => dc.id === id)?.name)
                  .filter(Boolean);

                return (
                  <li
                    key={f.id}
                    className="flex items-start justify-between bg-white border border-surface-200 rounded-lg p-3 gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-primary-900">
                        <span className="font-medium">{system?.name ?? 'Unknown system'}</span>
                        <span className="text-primary-500 mx-2">&rarr;</span>
                        <span className="font-medium">{target?.name ?? 'Unknown'}</span>
                      </p>
                      {categories.length > 0 && (
                        <p className="text-sm text-primary-600">{categories.join(', ')}</p>
                      )}
                      {f.purpose && (
                        <p className="text-sm text-primary-500 italic">{f.purpose}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDataFlow(f.id)}
                      aria-label={`Remove sharing from ${system?.name ?? 'system'} to ${target?.name ?? 'party'}`}
                      className="text-primary-400 hover:text-red-600 transition-colors p-1 flex-shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="bg-white border border-surface-200 rounded-lg p-4 space-y-3">
            <h4 className="font-medium text-primary-900">Record something you share</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="flow-system"
                label="From which system?"
                value={flow.systemId}
                onChange={(e) => setFlow((prev) => ({ ...prev, systemId: e.target.value }))}
              >
                <option value="">Choose a system</option>
                {systems.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>

              <Select
                id="flow-party"
                label="To whom?"
                value={flow.partyId}
                onChange={(e) => setFlow((prev) => ({ ...prev, partyId: e.target.value }))}
              >
                <option value="">Choose someone</option>
                {externalParties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>

              <Select
                id="flow-method"
                label="How does it get there?"
                value={flow.method}
                onChange={(e) =>
                  setFlow((prev) => ({ ...prev, method: e.target.value as DataFlowMethod }))
                }
              >
                {METHODS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <Select
                id="flow-frequency"
                label="How often?"
                value={flow.frequency}
                onChange={(e) =>
                  setFlow((prev) => ({
                    ...prev,
                    frequency: e.target.value as DataFlowFrequency,
                  }))
                }
              >
                {FREQUENCIES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </div>

            <Input
              id="flow-purpose"
              label="Why do they need it?"
              value={flow.purpose}
              onChange={(e) => setFlow((prev) => ({ ...prev, purpose: e.target.value }))}
              placeholder="e.g. Quarterly grant reporting"
              helperText="The first thing a regulator asks"
            />

            {dataCategories.length > 0 && (
              <CheckboxGroup
                legend="Which data?"
                items={dataCategories.map((dc) => ({ value: dc.id, label: dc.name }))}
                value={flow.dataCategoryIds}
                onChange={(ids) => setFlow((prev) => ({ ...prev, dataCategoryIds: ids }))}
              />
            )}

            <button
              type="button"
              onClick={handleAddFlow}
              disabled={!canAddFlow}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
