'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxGroup } from '@/components/ui/checkbox-group';

const COMMON_CATEGORIES = [
  'Client Records',
  'Financial Transactions',
  'Case Notes',
  'Staff Records',
  'Donor Information',
  'Impact Data',
  'Communications',
];

const SENSITIVITY_OPTIONS = [
  { value: 'public', label: 'Public - can be shared openly' },
  { value: 'internal', label: 'Internal - staff only' },
  { value: 'confidential', label: 'Confidential - limited access' },
  { value: 'restricted', label: 'Restricted - highly sensitive' },
] as const;

interface DataDraft {
  name: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  containsPersonalData: boolean;
  systemIds: string[];
}

/** An added category, carrying the id it was given in the architecture. */
interface DataEntry extends DataDraft {
  id: string;
}

const EMPTY_DRAFT: DataDraft = {
  name: '',
  sensitivity: 'internal',
  containsPersonalData: false,
  systemIds: [],
};

export function DataForm() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith('/wizard/services') ? '/wizard/services' : '/wizard/functions';
  const { architecture, addDataCategory, removeDataCategory } = useArchitecture();

  const [draft, setDraft] = useState<DataDraft>(EMPTY_DRAFT);
  // Local mirror of the architecture's categories, keyed by the id each was
  // given when it was added. Categories are written straight through, so
  // leaving this step by any route — Continue, the stepper, the browser back
  // button — keeps what has been entered.
  const [added, setAdded] = useState<DataEntry[]>(() => {
    return (architecture?.dataCategories ?? []).map((dc) => ({
      id: dc.id,
      name: dc.name,
      sensitivity: dc.sensitivity,
      containsPersonalData: dc.containsPersonalData,
      systemIds: dc.systemIds,
    }));
  });
  const [customName, setCustomName] = useState('');

  const systems = architecture?.systems ?? [];

  const updateField = useCallback(
    <K extends keyof DataDraft>(field: K, value: DataDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const toggleSystem = useCallback((sysId: string) => {
    setDraft((prev) => {
      const has = prev.systemIds.includes(sysId);
      return {
        ...prev,
        systemIds: has
          ? prev.systemIds.filter((id) => id !== sysId)
          : [...prev.systemIds, sysId],
      };
    });
  }, []);

  const selectCategory = useCallback((name: string) => {
    setDraft((prev) => ({ ...prev, name }));
  }, []);

  const handleAddCustomCategory = useCallback(() => {
    const trimmed = customName.trim();
    if (!trimmed) return;
    setDraft((prev) => ({ ...prev, name: trimmed }));
    setCustomName('');
  }, [customName]);

  const handleAdd = useCallback(() => {
    if (!draft.name.trim()) return;
    const category = { ...draft, name: draft.name.trim() };
    const id = addDataCategory(category);
    setAdded((prev) => [...prev, { ...category, id }]);
    setDraft(EMPTY_DRAFT);
  }, [draft, addDataCategory]);

  const handleRemove = useCallback(
    (id: string) => {
      removeDataCategory(id);
      setAdded((prev) => prev.filter((dc) => dc.id !== id));
    },
    [removeDataCategory],
  );

  const handleContinue = useCallback(() => {
    router.push(`${basePath}/integrations`);
  }, [router, basePath]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  // Filter out already-added category names for the quick-pick buttons
  const addedNames = new Set(added.map((d) => d.name));
  const availableCategories = COMMON_CATEGORIES.filter((c) => !addedNames.has(c));

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
          What kinds of data do your systems hold?
        </h1>
        <p className="text-lg text-primary-700">
          Understanding your data helps identify risks and responsibilities. Pick from common
          categories or add your own.
        </p>
      </div>

      {/* Added data categories */}
      {added.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            Data categories added
          </h2>
          <ul className="space-y-2" role="list">
            {added.map((dc) => (
              <li
                key={dc.id}
                className="flex items-center justify-between bg-white border border-surface-200 rounded-lg p-3"
              >
                <div className="break-words min-w-0">
                  <span className="font-medium text-primary-900 break-words">{dc.name}</span>
                  <span className="text-sm text-primary-500 ml-2">
                    {SENSITIVITY_OPTIONS.find((s) => s.value === dc.sensitivity)?.label.split(' - ')[0]}
                  </span>
                  {dc.containsPersonalData && (
                    <span className="text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 ml-2">
                      Personal data
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(dc.id)}
                  aria-label={`Remove ${dc.name}`}
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

      {/* Quick-pick common categories */}
      {availableCategories.length > 0 && !draft.name && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            Common categories
          </h2>
          <div className="flex flex-wrap gap-2">
            {availableCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => selectCategory(cat)}
                className="
                  rounded-lg border-2 border-surface-300 bg-white px-3 py-1.5
                  text-sm text-primary-800 hover:border-primary-300 hover:bg-surface-50
                  transition-all duration-150
                "
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2 mt-2">
            <div className="flex-1">
              <Input
                id="custom-category"
                label="Or type your own"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddCustomCategory();
                }}
                placeholder="e.g. Volunteer records"
              />
            </div>
            <button
              type="button"
              onClick={handleAddCustomCategory}
              disabled={!customName.trim()}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Use
            </button>
          </div>
        </div>
      )}

      {/* Configure selected category */}
      {draft.name && (
        <div className="bg-white border border-surface-200 rounded-lg p-4 sm:p-6 space-y-4">
          <h2 className="font-medium text-primary-900 break-words">
            Configure: {draft.name}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              id="data-sensitivity"
              label="Sensitivity level"
              value={draft.sensitivity}
              onChange={(e) => updateField('sensitivity', e.target.value as DataDraft['sensitivity'])}
            >
              {SENSITIVITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>

            <div className="flex items-center">
              <Checkbox
                label="Contains personal data"
                checked={draft.containsPersonalData}
                onChange={(e) => updateField('containsPersonalData', e.target.checked)}
              />
            </div>
          </div>

          {/* Assign to systems */}
          {systems.length > 0 && (
            <CheckboxGroup
              legend="Which systems hold this data?"
              items={systems.map((sys) => ({ value: sys.id, label: sys.name }))}
              value={draft.systemIds}
              onChange={(ids) => setDraft((prev) => ({ ...prev, systemIds: ids }))}
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAdd}
              className="btn-primary inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add data category
            </button>
            <button
              type="button"
              onClick={() => setDraft(EMPTY_DRAFT)}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href={basePath === '/wizard/services' ? '/wizard/services/functions' : '/wizard/functions/services'}
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
