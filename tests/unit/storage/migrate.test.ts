import { describe, it, expect } from 'vitest';
import { migrateArchitecture } from '@/lib/storage/migrate';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';

function validRaw() {
  return {
    organisation: {
      id: 'org-1',
      name: 'Acme Trust',
      type: 'charity',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance', isActive: true }],
    services: [],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: SCHEMA_VERSION,
      exportedAt: '2026-01-01T00:00:00.000Z',
      stackmapVersion: STACKMAP_VERSION,
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

describe('migrateArchitecture', () => {
  describe('rejects what cannot be a map', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an array', []],
      ['a string', 'nope'],
      ['a number', 42],
    ])('returns no architecture for %s', (_label, input) => {
      expect(migrateArchitecture(input).architecture).toBeNull();
    });

    it('returns no architecture when the organisation is missing', () => {
      const raw = validRaw() as Record<string, unknown>;
      delete raw.organisation;
      expect(migrateArchitecture(raw).architecture).toBeNull();
    });
  });

  describe('valid documents', () => {
    it('accepts a well-formed architecture', () => {
      const result = migrateArchitecture(validRaw());
      expect(result.architecture).not.toBeNull();
      expect(result.architecture!.organisation.name).toBe('Acme Trust');
      expect(result.architecture!.systems).toHaveLength(1);
      expect(result.droppedCount).toBe(0);
    });

    it('keeps an in-progress map whose organisation has no name yet', () => {
      const raw = validRaw();
      raw.organisation.name = '';
      const result = migrateArchitecture(raw);
      expect(result.architecture).not.toBeNull();
      expect(result.architecture!.organisation.name).toBe('');
    });
  });

  describe('fills in fields added by later versions', () => {
    it('adds missing collections as empty arrays', () => {
      const raw = validRaw() as Record<string, unknown>;
      delete raw.services;
      delete raw.dataCategories;
      delete raw.integrations;
      delete raw.owners;

      const arch = migrateArchitecture(raw).architecture;
      expect(arch).not.toBeNull();
      expect(arch!.services).toEqual([]);
      expect(arch!.dataCategories).toEqual([]);
      expect(arch!.integrations).toEqual([]);
      expect(arch!.owners).toEqual([]);
    });

    it('defaults missing metadata', () => {
      const raw = validRaw() as Record<string, unknown>;
      delete raw.metadata;

      const arch = migrateArchitecture(raw).architecture;
      expect(arch).not.toBeNull();
      expect(arch!.metadata.version).toBe(SCHEMA_VERSION);
      expect(arch!.metadata.stackmapVersion).toBe(STACKMAP_VERSION);
      expect(arch!.metadata.mappingPath).toBe('function_first');
      expect(arch!.metadata.techFreedomEnabled).toBe(false);
    });

    it('normalises an absent techFreedomEnabled flag to false', () => {
      const raw = validRaw() as { metadata: Record<string, unknown> };
      delete raw.metadata.techFreedomEnabled;
      const arch = migrateArchitecture(raw).architecture;
      expect(arch!.metadata.techFreedomEnabled).toBe(false);
    });

    it('adds serviceIds to systems saved before services existed', () => {
      const raw = validRaw() as { systems: Record<string, unknown>[] };
      delete raw.systems[0].serviceIds;

      const arch = migrateArchitecture(raw).architecture;
      expect(arch!.systems[0].serviceIds).toEqual([]);
    });

    it('adds systemIds to services saved before the link existed', () => {
      const raw = validRaw() as unknown as { services: unknown[] };
      raw.services = [
        { id: 'svc-1', name: 'Advice', status: 'active', functionIds: [] },
      ];

      const arch = migrateArchitecture(raw).architecture;
      expect(arch!.services[0].systemIds).toEqual([]);
    });

    it('timestamps an organisation missing createdAt and updatedAt', () => {
      const raw = validRaw() as { organisation: Record<string, unknown> };
      delete raw.organisation.createdAt;
      delete raw.organisation.updatedAt;

      const arch = migrateArchitecture(raw).architecture;
      expect(typeof arch!.organisation.createdAt).toBe('string');
      expect(arch!.organisation.createdAt).not.toBe('');
      expect(typeof arch!.organisation.updatedAt).toBe('string');
    });
  });

  describe('partially damaged documents', () => {
    it('drops unusable entities but keeps the rest of the map', () => {
      const raw = validRaw() as unknown as { systems: unknown[] };
      raw.systems = [
        ...raw.systems,
        { name: 'No id here', type: 'crm', hosting: 'cloud', status: 'active' },
        'not even an object',
      ];

      const result = migrateArchitecture(raw);
      expect(result.architecture).not.toBeNull();
      expect(result.architecture!.systems).toHaveLength(1);
      expect(result.architecture!.systems[0].name).toBe('Xero');
      expect(result.droppedCount).toBe(2);
    });

    it('reports drops across several collections', () => {
      const raw = validRaw() as unknown as {
        functions: unknown[];
        owners: unknown[];
      };
      raw.functions = [...raw.functions, { name: 'Nameless function' }];
      raw.owners = [{ id: 'owner-1' }];

      const result = migrateArchitecture(raw);
      expect(result.droppedCount).toBe(2);
      expect(result.architecture!.functions).toHaveLength(1);
      expect(result.architecture!.owners).toEqual([]);
    });
  });
});

describe('fields added for contract tracking', () => {
  it('keeps renewal details on a system that has them', () => {
    const raw = validRaw() as { systems: Record<string, unknown>[] };
    raw.systems[0].seats = 12;
    raw.systems[0].renewalDate = '2027-03-01';
    raw.systems[0].noticePeriodDays = 60;

    const arch = migrateArchitecture(raw).architecture;

    expect(arch!.systems[0].seats).toBe(12);
    expect(arch!.systems[0].renewalDate).toBe('2027-03-01');
    expect(arch!.systems[0].noticePeriodDays).toBe(60);
  });

  it('loads a map written before renewal tracking existed', () => {
    const arch = migrateArchitecture(validRaw()).architecture;

    expect(arch!.systems[0].renewalDate).toBeUndefined();
    expect(arch!.systems).toHaveLength(1);
  });

  it('clears a renewal date nothing can read, without losing the system', () => {
    const raw = validRaw() as { systems: Record<string, unknown>[] };
    raw.systems[0].renewalDate = 'next March';

    const result = migrateArchitecture(raw);

    expect(result.droppedCount).toBe(0);
    expect(result.architecture!.systems).toHaveLength(1);
    expect(result.architecture!.systems[0].renewalDate).toBeUndefined();
  });
});
