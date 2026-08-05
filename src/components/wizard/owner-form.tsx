'use client';

import { useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import type { CheckboxGroupItem } from '@/components/ui/checkbox-group';

interface OwnerDraft {
  name: string;
  role: string;
  isExternal: boolean;
  assignedSystemIds: string[];
}

const EMPTY_DRAFT: OwnerDraft = {
  name: '',
  role: '',
  isExternal: false,
  assignedSystemIds: [],
};

export function OwnerForm() {
  const router = useRouter();
  const pathname = usePathname();
  const basePath = pathname.startsWith('/wizard/services') ? '/wizard/services' : '/wizard/functions';
  const { architecture, addOwner, removeOwner, updateSystem } = useArchitecture();

  const [draft, setDraft] = useState<OwnerDraft>(EMPTY_DRAFT);
  // Hydrate from architecture on re-visit
  const [added, setAdded] = useState<{ name: string; role: string; isExternal: boolean; systemIds: string[]; ownerId?: string }[]>(() => {
    return (architecture?.owners ?? []).map((owner) => ({
      name: owner.name,
      role: owner.role ?? '',
      isExternal: owner.isExternal,
      systemIds: (architecture?.systems ?? [])
        .filter((sys) => sys.ownerId === owner.id)
        .map((sys) => sys.id),
      ownerId: owner.id,
    }));
  });

  const systems = architecture?.systems ?? [];
  const owners = architecture?.owners ?? [];

  const updateField = useCallback(
    <K extends keyof OwnerDraft>(field: K, value: OwnerDraft[K]) => {
      setDraft((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleAdd = useCallback(() => {
    if (!draft.name.trim()) return;
    setAdded((prev) => [
      ...prev,
      {
        name: draft.name.trim(),
        role: draft.role.trim(),
        isExternal: draft.isExternal,
        systemIds: draft.assignedSystemIds,
      },
    ]);
    setDraft(EMPTY_DRAFT);
  }, [draft]);

  const handleRemove = useCallback((index: number) => {
    setAdded((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Systems assigned to owners in this session (map systemId -> owner name)
  const sessionAssignedMap = new Map<string, string>();
  for (const a of added) {
    for (const sId of a.systemIds) {
      sessionAssignedMap.set(sId, a.name);
    }
  }

  // Systems that don't have an owner assigned in this session or previously
  const unownedSystems = systems.filter(
    (sys) => !sessionAssignedMap.has(sys.id) && !sys.ownerId,
  );

  // Build checkbox items for the system multi-select
  const systemCheckboxItems: CheckboxGroupItem[] = systems.map((sys) => {
    const sessionOwner = sessionAssignedMap.get(sys.id);
    const existingOwner = sys.ownerId ? owners.find((o) => o.id === sys.ownerId) : null;
    const assignedToOther = sessionOwner || existingOwner;
    const description = sessionOwner
      ? `Assigned to ${sessionOwner}`
      : existingOwner
        ? `Assigned to ${existingOwner.name}`
        : undefined;
    return {
      value: sys.id,
      label: sys.name,
      description,
      disabled: !!assignedToOther,
    };
  });

  const handleContinue = useCallback(() => {
    // Clear existing owners to avoid duplicates on re-visit
    const existingOwners = architecture?.owners ?? [];
    for (const owner of existingOwners) {
      removeOwner(owner.id);
    }
    // Clear ownerId from systems
    for (const sys of architecture?.systems ?? []) {
      if (sys.ownerId) {
        updateSystem(sys.id, { ownerId: undefined });
      }
    }

    for (const owner of added) {
      const ownerId = addOwner({
        name: owner.name,
        role: owner.role || undefined,
        isExternal: owner.isExternal,
      });
      for (const systemId of owner.systemIds) {
        updateSystem(systemId, { ownerId });
      }
    }
    router.push(`${basePath}/review`);
  }, [added, addOwner, removeOwner, updateSystem, architecture, router, basePath]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-3xl sm:text-4xl font-display font-bold text-primary-900">
          Who is responsible for each system?
        </h1>
        <p className="text-lg text-primary-700">
          Knowing who looks after each system helps when things go wrong or decisions need
          making. Fill in as many as you know — you can carry on without this and come back to
          it later.
        </p>
      </div>

      {/* What is still unassigned. Deliberately not a warning: an owner is
          useful to record, but nobody should be stuck at this step because they
          do not know who looks after a system, and plenty of small
          organisations genuinely have no single answer. */}
      {unownedSystems.length > 0 && (
        <div className="bg-surface-100 border border-surface-300 rounded-lg p-4">
          <p className="text-sm text-primary-800 break-words">
            No owner yet for{' '}
            <span className="font-medium">
              {unownedSystems.map((s) => s.name).join(', ')}
            </span>
            . That is fine — you can continue, and add owners here or from Your systems whenever
            you like.
          </p>
        </div>
      )}

      {/* Added owners */}
      {added.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
            Owners added
          </h2>
          <ul className="space-y-2" role="list">
            {added.map((owner, index) => (
              <li
                key={index}
                className="flex items-center justify-between bg-white border border-surface-200 rounded-lg p-3"
              >
                <div className="break-words min-w-0">
                  <span className="font-medium text-primary-900 break-words">{owner.name}</span>
                  {owner.role && (
                    <span className="text-sm text-primary-500 ml-2">{owner.role}</span>
                  )}
                  {owner.isExternal && (
                    <span className="text-xs bg-blue-100 text-blue-800 rounded px-1.5 py-0.5 ml-2">
                      External
                    </span>
                  )}
                  {owner.systemIds.length > 0 && (
                    <span className="text-sm text-primary-500 ml-2">
                      &rarr; {owner.systemIds.map((sId) => systems.find((s) => s.id === sId)?.name).filter(Boolean).join(', ')}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remove ${owner.name}`}
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

      {/* Add owner form */}
      <div className="bg-white border border-surface-200 rounded-lg p-4 sm:p-6 space-y-4">
        <h2 className="font-medium text-primary-900">Add an owner</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="owner-name"
            label="Name"
            required
            value={draft.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g. Sarah Jones"
          />

          <Input
            id="owner-role"
            label="Role"
            helperText="Optional"
            value={draft.role}
            onChange={(e) => updateField('role', e.target.value)}
            placeholder="e.g. Finance Manager"
          />

          <div className="flex items-center">
            <Checkbox
              label="External (e.g. contractor or supplier)"
              checked={draft.isExternal}
              onChange={(e) => updateField('isExternal', e.target.checked)}
            />
          </div>

          {systems.length > 0 && (
            <div className="sm:col-span-2">
              <CheckboxGroup
                legend="Assign to systems (optional)"
                items={systemCheckboxItems}
                value={draft.assignedSystemIds}
                onChange={(value) => updateField('assignedSystemIds', value)}
              />
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!draft.name.trim()}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add owner
        </button>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-surface-200">
        <Link
          href={`${basePath}/integrations`}
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
