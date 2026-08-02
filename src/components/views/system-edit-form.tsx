'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { Owner, System, SystemType } from '@/lib/types';

const SYSTEM_TYPES: { value: SystemType; label: string }[] = [
  { value: 'crm', label: 'CRM' },
  { value: 'finance', label: 'Finance' },
  { value: 'hr', label: 'HR' },
  { value: 'case_management', label: 'Case management' },
  { value: 'website', label: 'Website' },
  { value: 'email', label: 'Email' },
  { value: 'document_management', label: 'Document management' },
  { value: 'database', label: 'Database' },
  { value: 'spreadsheet', label: 'Spreadsheet' },
  { value: 'messaging', label: 'Messaging' },
  { value: 'custom', label: 'Custom' },
  { value: 'other', label: 'Other' },
];

const HOSTING_OPTIONS: { value: System['hosting']; label: string }[] = [
  { value: 'cloud', label: 'Cloud' },
  { value: 'on_premise', label: 'On-premise' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'unknown', label: "Don't know" },
];

export const STATUS_OPTIONS: { value: System['status']; label: string }[] = [
  { value: 'active', label: 'Active — in use now' },
  { value: 'planned', label: 'Planned — not in use yet' },
  { value: 'retiring', label: 'Retiring — being phased out' },
  { value: 'legacy', label: 'Legacy — old, still running' },
];

const COST_PERIODS: { value: 'monthly' | 'annual'; label: string }[] = [
  { value: 'annual', label: 'Per year' },
  { value: 'monthly', label: 'Per month' },
];

const COST_MODELS: { value: NonNullable<System['cost']>['model']; label: string }[] = [
  { value: 'subscription', label: 'Subscription' },
  { value: 'perpetual', label: 'Perpetual licence' },
  { value: 'free', label: 'Free' },
  { value: 'unknown', label: "Don't know" },
];

export interface SystemEditFormProps {
  system: System;
  owners: Owner[];
  onSave: (updates: Partial<Omit<System, 'id'>>) => void;
  onCancel: () => void;
}

interface Draft {
  name: string;
  type: SystemType;
  vendor: string;
  url: string;
  hosting: System['hosting'];
  status: System['status'];
  ownerId: string;
  costAmount: string;
  costPeriod: 'monthly' | 'annual';
  costModel: NonNullable<System['cost']>['model'];
  importance: string;
  isShadow: boolean;
  notes: string;
}

function toDraft(system: System): Draft {
  return {
    name: system.name,
    type: system.type,
    vendor: system.vendor ?? '',
    url: system.url ?? '',
    hosting: system.hosting,
    status: system.status,
    ownerId: system.ownerId ?? '',
    costAmount: system.cost ? String(system.cost.amount) : '',
    costPeriod: system.cost?.period ?? 'annual',
    costModel: system.cost?.model ?? 'subscription',
    importance: system.importance != null ? String(system.importance) : '',
    isShadow: system.isShadow === true,
    notes: system.notes ?? '',
  };
}

function toUpdates(draft: Draft): Partial<Omit<System, 'id'>> {
  const amount = parseFloat(draft.costAmount);
  const importance = parseInt(draft.importance, 10);

  return {
    name: draft.name.trim(),
    type: draft.type,
    vendor: draft.vendor.trim() || undefined,
    url: draft.url.trim() || undefined,
    hosting: draft.hosting,
    status: draft.status,
    ownerId: draft.ownerId || undefined,
    cost:
      !isNaN(amount) && amount >= 0
        ? { amount, period: draft.costPeriod, model: draft.costModel }
        : undefined,
    importance: !isNaN(importance) ? importance : undefined,
    isShadow: draft.isShadow || undefined,
    notes: draft.notes.trim() || undefined,
  };
}

/**
 * Full edit form for one system.
 *
 * The wizard only ever asks for a subset of a system's fields, so this is the
 * one place status, URL and notes can be set at all.
 */
export function SystemEditForm({ system, owners, onSave, onCancel }: SystemEditFormProps) {
  const [draft, setDraft] = useState<Draft>(() => toDraft(system));

  function update<K extends keyof Draft>(field: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  const nameIsEmpty = draft.name.trim().length === 0;

  return (
    <form
      className="bg-surface-50 border border-surface-300 rounded-lg p-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (nameIsEmpty) return;
        onSave(toUpdates(draft));
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id={`sys-name-${system.id}`}
          label="Name"
          required
          value={draft.name}
          onChange={(e) => update('name', e.target.value)}
          error={nameIsEmpty ? 'A system needs a name' : undefined}
        />

        <Select
          id={`sys-type-${system.id}`}
          label="Type"
          value={draft.type}
          onChange={(e) => update('type', e.target.value as SystemType)}
        >
          {SYSTEM_TYPES.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Input
          id={`sys-vendor-${system.id}`}
          label="Supplier"
          value={draft.vendor}
          onChange={(e) => update('vendor', e.target.value)}
          placeholder="e.g. Xero Ltd"
        />

        <Input
          id={`sys-url-${system.id}`}
          label="Web address"
          type="url"
          value={draft.url}
          onChange={(e) => update('url', e.target.value)}
          placeholder="https://"
          helperText="Where you log in"
        />

        <Select
          id={`sys-status-${system.id}`}
          label="Status"
          value={draft.status}
          onChange={(e) => update('status', e.target.value as System['status'])}
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          id={`sys-hosting-${system.id}`}
          label="Hosting"
          value={draft.hosting}
          onChange={(e) => update('hosting', e.target.value as System['hosting'])}
        >
          {HOSTING_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          id={`sys-owner-${system.id}`}
          label="Owner"
          value={draft.ownerId}
          onChange={(e) => update('ownerId', e.target.value)}
        >
          <option value="">No owner</option>
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
              {owner.role ? ` — ${owner.role}` : ''}
            </option>
          ))}
        </Select>

        <Input
          id={`sys-importance-${system.id}`}
          label="Importance"
          type="number"
          min={1}
          max={10}
          value={draft.importance}
          onChange={(e) => update('importance', e.target.value)}
          helperText="1–10, where 10 means operations stop without it"
        />

        <Input
          id={`sys-cost-${system.id}`}
          label="Cost"
          type="number"
          min={0}
          step="any"
          value={draft.costAmount}
          onChange={(e) => update('costAmount', e.target.value)}
          placeholder="e.g. 400"
        />

        <Select
          id={`sys-cost-period-${system.id}`}
          label="Cost period"
          value={draft.costPeriod}
          onChange={(e) => update('costPeriod', e.target.value as 'monthly' | 'annual')}
        >
          {COST_PERIODS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          id={`sys-cost-model-${system.id}`}
          label="Cost model"
          value={draft.costModel}
          onChange={(e) =>
            update('costModel', e.target.value as NonNullable<System['cost']>['model'])
          }
        >
          {COST_MODELS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <div className="flex items-end pb-2">
          <Checkbox
            label="Shadow or informal tool"
            checked={draft.isShadow}
            onChange={(e) => update('isShadow', e.target.checked)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`sys-notes-${system.id}`}
          className="text-sm font-medium text-primary-900 font-body"
        >
          Notes
        </label>
        <textarea
          id={`sys-notes-${system.id}`}
          rows={3}
          value={draft.notes}
          onChange={(e) => update('notes', e.target.value)}
          placeholder="Anything worth remembering — contract quirks, who set it up, what breaks"
          className="rounded-lg border border-surface-300 bg-white px-3 py-2 text-base font-body text-primary-950 placeholder:text-primary-400 hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors duration-150"
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" disabled={nameIsEmpty} className="btn-primary disabled:opacity-50">
          Save changes
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
      </div>
    </form>
  );
}
