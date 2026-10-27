import { describe, expect, it } from 'vitest';
import { addQuickSystems, previewQuickAdd } from '@/lib/import/quick-add';
import type { Architecture, System } from '@/lib/types';

function arch(systems: System[] = []): Architecture {
  return {
    organisation: { id: 'org', name: '', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [], services: [], systems, dataCategories: [], integrations: [],
    owners: [], externalParties: [], dataFlows: [],
    metadata: { version: '1', exportedAt: '', stackmapVersion: '0.3', mappingPath: 'function_first' },
  };
}

describe('quick system entry', () => {
  it('recognises catalogue aliases and removes repeats from a pasted list', () => {
    const rows = previewQuickAdd('Office 365\nMicrosoft 365, Xero;\nXero', arch());
    expect(rows.map((row) => row.name)).toEqual(['Microsoft 365', 'Xero']);
    expect(rows.every((row) => row.recognised)).toBe(true);
  });

  it('skips existing systems even when entered by an alias', () => {
    const systems: System[] = [{
      id: 'already', name: 'Microsoft 365', type: 'email', status: 'active',
      hosting: 'cloud', functionIds: [], serviceIds: [],
    }];
    const existing = arch(systems);
    const rows = previewQuickAdd('Office 365\nMystery CRM', existing);
    expect(rows[0].alreadyPresent).toBe(true);
    const result = addQuickSystems(existing, rows);
    expect(result.added).toBe(1);
    expect(result.architecture.systems).toHaveLength(2);
    expect(existing.systems).toHaveLength(1);
  });

  it('does not silently assume a cost, hosting or importance', () => {
    const existing = arch();
    const rows = previewQuickAdd('Xero\nUnfamiliar local tool', existing);
    const result = addQuickSystems(existing, rows);
    expect(result.added).toBe(2);
    const xero = result.architecture.systems.find((system) => system.name === 'Xero');
    expect(xero?.techFreedomScore?.isAutoScored).toBe(true);
    expect(xero?.hosting).toBe('unknown');
    expect(xero?.cost).toBeUndefined();
    expect(xero?.importance).toBeUndefined();
    expect(result.architecture.systems.find((system) => system.name === 'Unfamiliar local tool')?.techFreedomScore).toBeUndefined();
  });

  it('honours decide later and creates suggested functions only once', () => {
    const existing = arch();
    const rows = previewQuickAdd('Xero\nQuickBooks', existing);
    const result = addQuickSystems(existing, rows, { [rows[0].key]: 'none' });
    expect(result.architecture.systems[0].functionIds).toEqual([]);
    expect(result.functionsCreated).toBe(1);
    expect(result.architecture.functions).toHaveLength(1);
    expect(result.architecture.systems[1].functionIds).toEqual([result.architecture.functions[0].id]);
  });

  it('does not duplicate a pasted candidate when applying the same preview twice', () => {
    const first = arch();
    const rows = previewQuickAdd('Xero', first);
    const added = addQuickSystems(first, rows);
    const repeated = addQuickSystems(added.architecture, rows);
    expect(repeated.added).toBe(0);
  });
});
