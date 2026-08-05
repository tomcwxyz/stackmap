'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useArchitecture } from '@/hooks/useArchitecture';
import { ImportDialog } from '@/components/import/import-dialog';
import { addSpendToArchitecture } from '@/lib/import';
import type { SpendMatch } from '@/lib/import';
import type { FunctionAssignments } from '@/lib/import/spend-to-systems';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { Organisation } from '@/lib/types';

const ORG_TYPE_LABELS: Record<Organisation['type'], string> = {
  charity: 'Charity',
  social_enterprise: 'Social enterprise',
  council: 'Council',
  cooperative: 'Co-operative',
  private_business: 'Private business',
  other: 'Other',
};

const SIZE_LABELS: Record<NonNullable<Organisation['size']>, string> = {
  micro: 'Micro (1-5 staff)',
  small: 'Small (6-25 staff)',
  medium: 'Medium (26-100 staff)',
  large: 'Large (100+ staff)',
};

export default function PathSelectorPage() {
  const { architecture, updateOrganisation, replaceArchitecture, clear, isLoading } = useArchitecture();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const router = useRouter();


  const org = architecture?.organisation;
  const orgHasName = Boolean(org?.name?.trim());

  // On first visit (no name), show form expanded; on re-visit, show summary
  const showForm = !orgHasName || isEditing;

  const hasExistingData =
    !isLoading &&
    architecture &&
    (architecture.functions.length > 0 || architecture.systems.length > 0);

  const itemCount = architecture
    ? architecture.functions.length +
      architecture.systems.length +
      architecture.services.length +
      architecture.integrations.length +
      architecture.owners.length
    : 0;

  // Spend adds systems to the map rather than replacing it, so it needs its
  // own handler even here, where the map is usually empty.
  const handleImportSpend = useCallback(
    (matches: SpendMatch[], assignments: FunctionAssignments) => {
      if (!architecture) return;
      const { architecture: next } = addSpendToArchitecture(matches, architecture, assignments);
      replaceArchitecture(next);
      setShowImport(false);
    },
    [architecture, replaceArchitecture],
  );

  const handleClear = async () => {
    await clear();
    setShowConfirm(false);
    setIsEditing(false);
  };

  const handleOrgFieldBlur = useCallback(
    (field: keyof Organisation, value: string | number | undefined) => {
      if (value === undefined || value === '') return;
      updateOrganisation({ [field]: value });
    },
    [updateOrganisation],
  );

  const handleOrgSelectChange = useCallback(
    (field: keyof Organisation, value: string) => {
      updateOrganisation({ [field]: value });
    },
    [updateOrganisation],
  );

  const handlePathSelect = useCallback((path: 'function_first' | 'service_first') => {
    if (architecture) {
      replaceArchitecture({
        ...architecture,
        metadata: { ...architecture.metadata, mappingPath: path },
      });
    }
    router.push('/wizard/techfreedom');
  }, [architecture, replaceArchitecture, router]);

  return (
    <div className="space-y-10">
      <div className="space-y-3 max-w-xl">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-display-md font-display text-primary-900">
            How would you like to begin?
          </h1>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            className="text-sm px-4 py-2 rounded-lg border border-surface-300 text-primary-700 hover:bg-surface-50 transition-colors flex-shrink-0"
          >
            Import
          </button>
        </div>
        <p className="text-body-lg text-primary-700">
          There are two ways to approach your technology map. Pick whichever
          feels most natural &mdash; you can always change your mind.
        </p>
      </div>

      {/* Organisation setup */}
      <section aria-labelledby="org-setup-heading" className="space-y-4">
        <h2 id="org-setup-heading" className="text-xl font-display font-bold text-primary-900">
          About your organisation
        </h2>

        {/* Summary card (shown when org has a name and not editing) */}
        {orgHasName && !showForm && org && (
          <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-primary-900">
                {org.name}
                {org.type && <> &middot; {ORG_TYPE_LABELS[org.type]}</>}
                {org.size && <> &middot; {SIZE_LABELS[org.size]}</>}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              Edit
            </button>
          </div>
        )}

        {/* Organisation form */}
        {showForm && (
          <OrgSetupForm
            org={org}
            onFieldBlur={handleOrgFieldBlur}
            onSelectChange={handleOrgSelectChange}
            onDone={orgHasName ? () => setIsEditing(false) : undefined}
          />
        )}
      </section>

      {/* Existing data banner */}
      {hasExistingData && !showConfirm && (
        <div className="rounded-lg border-2 border-accent-200 bg-accent-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-primary-900">
              You have an existing map ({itemCount} item{itemCount === 1 ? '' : 's'})
            </p>
            <p className="text-sm text-primary-600 mt-0.5">
              Continue where you left off, or start fresh.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowConfirm(true)}
            className="btn-secondary text-sm whitespace-nowrap"
          >
            Start fresh
          </button>
        </div>
      )}

      {/* Confirmation dialog */}
      {showConfirm && (
        <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 space-y-3">
          <p className="text-sm font-medium text-red-900">
            This will clear your current map ({itemCount} item{itemCount === 1 ? '' : 's'}). This cannot be undone.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClear}
              className="text-sm font-medium text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
            >
              Yes, clear everything
            </button>
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="btn-secondary text-sm"
            >
              Keep my data
            </button>
          </div>
        </div>
      )}

      {/* Path selection cards */}
      {!orgHasName && (
        <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 text-center">
          <p className="text-sm text-primary-600">
            Tell us about your organisation first
          </p>
        </div>
      )}

      <ul
        className={`space-y-4 list-none p-0 m-0 ${!orgHasName ? 'opacity-50 pointer-events-none' : ''}`}
        aria-label="Mapping path options"
      >
        {/* Recommended path */}
        <li>
          <button
            type="button"
            onClick={() => handlePathSelect('function_first')}
            aria-disabled={!orgHasName}
            tabIndex={orgHasName ? undefined : -1}
            className={`
              group block w-full rounded-xl border-2 border-primary-300 bg-primary-50 p-6 sm:p-8
              text-left
              hover:border-primary-500 hover:bg-primary-100
              focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              transition-all duration-150
              ${!orgHasName ? 'cursor-not-allowed' : ''}
            `}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary-600 text-white flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-display font-bold text-primary-900 group-hover:text-primary-700">
                    Start with what we do
                  </h2>
                  <span className="text-xs font-medium bg-primary-200 text-primary-800 rounded-full px-2.5 py-0.5">
                    Most people start here
                  </span>
                </div>
                <p className="text-primary-700 leading-relaxed mb-3">
                  Pick from common organisational functions &mdash; finance, fundraising,
                  service delivery &mdash; then map the systems behind each one. More structured,
                  uses standard categories that are easy to follow.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 group-hover:text-primary-700">
                  Get started
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        </li>

        {/* Alternative path */}
        <li>
          <button
            type="button"
            onClick={() => handlePathSelect('service_first')}
            aria-disabled={!orgHasName}
            tabIndex={orgHasName ? undefined : -1}
            className={`
              group block w-full rounded-xl border-2 border-surface-300 bg-surface-100 p-6 sm:p-8
              text-left
              hover:border-primary-300 hover:bg-surface-50
              focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2
              transition-all duration-150
              ${!orgHasName ? 'cursor-not-allowed' : ''}
            `}
          >
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 sm:gap-6">
              <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-surface-300 text-primary-700 flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-display font-bold text-primary-900 group-hover:text-primary-700 mb-1">
                  Start with what we deliver
                </h2>
                <p className="text-primary-600 leading-relaxed mb-3">
                  Better for organisations with clear service offerings &mdash; you define your
                  own categories and work from there. More flexible, but less guided.
                </p>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-500 group-hover:text-primary-600">
                  Choose this path
                  <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </span>
              </div>
            </div>
          </button>
        </li>
      </ul>

      <ImportDialog
        open={showImport}
        existingArchitecture={architecture}
        onClose={() => setShowImport(false)}
        onImport={(arch) => {
          replaceArchitecture(arch);
          setShowImport(false);
        }}
        onImportSpend={handleImportSpend}
      />
    </div>
  );
}

// ─── Organisation setup form (extracted for clarity) ───

interface OrgSetupFormProps {
  org: Organisation | undefined;
  onFieldBlur: (field: keyof Organisation, value: string | number | undefined) => void;
  onSelectChange: (field: keyof Organisation, value: string) => void;
  onDone?: () => void;
}

function OrgSetupForm({ org, onFieldBlur, onSelectChange, onDone }: OrgSetupFormProps) {
  const [localName, setLocalName] = useState(org?.name ?? '');
  const [localStaffCount, setLocalStaffCount] = useState(
    org?.staffCount !== undefined ? String(org.staffCount) : '',
  );
  const [localTurnover, setLocalTurnover] = useState(
    org?.annualTurnover !== undefined ? String(org.annualTurnover) : '',
  );

  return (
    <div className="rounded-lg border border-surface-200 bg-white p-4 sm:p-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          id="org-name"
          label="Organisation name"
          required
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={() => onFieldBlur('name', localName.trim())}
          placeholder="e.g. Sunrise Community Trust"
        />

        <Select
          id="org-type"
          label="Organisation type"
          value={org?.type ?? 'charity'}
          onChange={(e) =>
            onSelectChange('type', e.target.value)
          }
        >
          <option value="charity">Charity</option>
          <option value="social_enterprise">Social enterprise</option>
          <option value="council">Council</option>
          <option value="cooperative">Co-operative</option>
          <option value="private_business">Private business</option>
          <option value="other">Other</option>
        </Select>

        <Select
          id="org-size"
          label="Organisation size"
          value={org?.size ?? ''}
          onChange={(e) =>
            onSelectChange('size', e.target.value)
          }
        >
          <option value="">Select size...</option>
          <option value="micro">Micro (1-5 staff)</option>
          <option value="small">Small (6-25 staff)</option>
          <option value="medium">Medium (26-100 staff)</option>
          <option value="large">Large (100+ staff)</option>
        </Select>

        <Input
          id="org-staff-count"
          label="Staff count"
          type="number"
          min={0}
          helperText="Optional &mdash; approximate FTE staff"
          value={localStaffCount}
          onChange={(e) => setLocalStaffCount(e.target.value)}
          onBlur={() => {
            const parsed = parseInt(localStaffCount, 10);
            onFieldBlur('staffCount', isNaN(parsed) ? undefined : parsed);
          }}
          placeholder="Approximate FTE staff"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="org-turnover" className="text-sm font-medium text-primary-900 font-body">
            Annual turnover
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-500 text-sm pointer-events-none">
              {'\u00A3'}
            </span>
            <input
              id="org-turnover"
              type="number"
              min={0}
              step="any"
              value={localTurnover}
              onChange={(e) => setLocalTurnover(e.target.value)}
              onBlur={() => {
                const parsed = parseFloat(localTurnover);
                onFieldBlur('annualTurnover', isNaN(parsed) ? undefined : parsed);
              }}
              placeholder="e.g. 500000"
              className="w-full rounded-lg border border-surface-300 bg-white pl-7 pr-3 py-2 text-base font-body text-primary-950 placeholder:text-primary-400 hover:border-surface-400 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:outline-none transition-colors duration-150"
            />
          </div>
          <p className="text-sm text-primary-600 font-body">Optional &mdash; in GBP</p>
        </div>
      </div>

      {onDone && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onDone}
            className="btn-secondary text-sm"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
