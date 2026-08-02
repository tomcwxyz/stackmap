import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorageAdapter, STORAGE_KEY, BACKUP_KEY } from '@/lib/storage/local';
import type { Architecture } from '@/lib/types';

const mockArchitecture: Architecture = {
  organisation: {
    id: 'org-1',
    name: 'Acme Corp',
    type: 'charity',

    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
  functions: [
    { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
  ],
  services: [],
  systems: [
    {
      id: 'sys-1',
      name: 'CRM',
      type: 'crm',
      hosting: 'cloud',
      status: 'active',
      functionIds: ['fn-1'],
      serviceIds: [],
    },
  ],
  dataCategories: [],
  integrations: [],
  owners: [],
  metadata: {
    version: '1.0.0',
    exportedAt: '2026-01-01T00:00:00.000Z',
    stackmapVersion: '0.1.0',
    mappingPath: 'function_first',
    techFreedomEnabled: false,
  },
};

describe('LocalStorageAdapter', () => {
  let adapter: LocalStorageAdapter;

  beforeEach(() => {
    localStorage.clear();
    adapter = new LocalStorageAdapter();
  });

  describe('load', () => {
    it('returns null when no data is stored', async () => {
      const result = await adapter.load();
      expect(result).toBeNull();
    });

    it('returns parsed Architecture when valid data exists', async () => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mockArchitecture));
      const result = await adapter.load();
      expect(result).toEqual(mockArchitecture);
    });

    it('returns null and clears corrupt data', async () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json!!!');
      const result = await adapter.load();
      expect(result).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('keeps a backup of data it could not parse', async () => {
      localStorage.setItem(STORAGE_KEY, '{invalid json!!!');
      await adapter.load();
      expect(localStorage.getItem(BACKUP_KEY)).toBe('{invalid json!!!');
      expect(adapter.getLastLoadReport()).toEqual({ droppedCount: 0, backedUp: true });
    });

    it('keeps a backup of data whose shape cannot be repaired', async () => {
      const unusable = JSON.stringify({ notAnArchitecture: true });
      localStorage.setItem(STORAGE_KEY, unusable);

      const result = await adapter.load();

      expect(result).toBeNull();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
      expect(localStorage.getItem(BACKUP_KEY)).toBe(unusable);
      expect(adapter.getLastLoadReport()?.backedUp).toBe(true);
    });

    it('returns null when stored value is "null"', async () => {
      localStorage.setItem(STORAGE_KEY, 'null');
      const result = await adapter.load();
      expect(result).toBeNull();
    });

    it('migrates a map written before a field existed', async () => {
      const older = JSON.parse(JSON.stringify(mockArchitecture));
      delete older.services;
      delete older.metadata.techFreedomEnabled;
      delete older.systems[0].serviceIds;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(older));

      const result = await adapter.load();

      expect(result).not.toBeNull();
      expect(result!.services).toEqual([]);
      expect(result!.systems[0].serviceIds).toEqual([]);
      expect(result!.metadata.techFreedomEnabled).toBe(false);
      // A repairable document is not treated as lost
      expect(localStorage.getItem(BACKUP_KEY)).toBeNull();
    });

    it('reports entities it had to drop without losing the map', async () => {
      const damaged = JSON.parse(JSON.stringify(mockArchitecture));
      damaged.systems.push({ name: 'System with no id', type: 'crm' });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(damaged));

      const result = await adapter.load();

      expect(result!.systems).toHaveLength(1);
      expect(adapter.getLastLoadReport()).toEqual({ droppedCount: 1, backedUp: false });
    });
  });

  describe('save', () => {
    it('persists Architecture to localStorage', async () => {
      await adapter.save(mockArchitecture);
      const stored = localStorage.getItem(STORAGE_KEY);
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(mockArchitecture);
    });

    it('overwrites existing data', async () => {
      await adapter.save(mockArchitecture);
      const updated: Architecture = {
        ...mockArchitecture,
        organisation: { ...mockArchitecture.organisation, name: 'Updated Corp' },
      };
      await adapter.save(updated);
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
      expect(stored.organisation.name).toBe('Updated Corp');
    });
  });

  describe('clear', () => {
    it('removes data from localStorage', async () => {
      await adapter.save(mockArchitecture);
      await adapter.clear();
      expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not throw when no data exists', async () => {
      await expect(adapter.clear()).resolves.toBeUndefined();
    });
  });

  describe('SSR fallback (in-memory)', () => {
    it('works when localStorage is unavailable', async () => {
      const memAdapter = new LocalStorageAdapter({ forceInMemory: true });

      // save and load
      await memAdapter.save(mockArchitecture);
      const result = await memAdapter.load();
      expect(result).toEqual(mockArchitecture);

      // clear
      await memAdapter.clear();
      const cleared = await memAdapter.load();
      expect(cleared).toBeNull();
    });
  });
});
