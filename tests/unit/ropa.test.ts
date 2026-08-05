import { describe, it, expect } from 'vitest';
import { buildRopa, generateRopaCsv } from '@/lib/report/ropa';
import type { Architecture, DataCategory, System } from '@/lib/types';

const NOW = new Date('2026-08-04T12:00:00Z');

function architecture(overrides: Partial<Architecture> = {}): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Sunrise Trust',
      type: 'charity',
      createdAt: '',
      updatedAt: '',
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
    ...overrides,
  };
}

function system(overrides: Partial<System> & { id: string; name: string }): System {
  return {
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

function category(overrides: Partial<DataCategory> & { id: string; name: string }): DataCategory {
  return {
    sensitivity: 'confidential',
    containsPersonalData: true,
    systemIds: [],
    ...overrides,
  };
}

describe('buildRopa', () => {
  it('produces nothing for a map with no personal data', () => {
    const report = buildRopa(architecture(), NOW);

    expect(report.entries).toEqual([]);
    expect(report.completeCount).toBe(0);
  });

  it('covers only personal data, which is what Article 30 is about', () => {
    const arch = architecture({
      dataCategories: [
        category({ id: 'dc-1', name: 'Client records' }),
        category({ id: 'dc-2', name: 'Website content', containsPersonalData: false }),
      ],
    });

    const report = buildRopa(arch, NOW);

    expect(report.entries.map((e) => e.category)).toEqual(['Client records']);
  });

  it('names the organisation and when it was produced', () => {
    const report = buildRopa(architecture(), NOW);

    expect(report.organisation).toBe('Sunrise Trust');
    expect(report.generatedAt).toBe(NOW.toISOString());
  });

  it('lists the systems holding the data, and how they are hosted', () => {
    const arch = architecture({
      systems: [
        system({ id: 's1', name: 'Lamplight', hosting: 'cloud' }),
        system({ id: 's2', name: 'Old server', hosting: 'on_premise' }),
      ],
      dataCategories: [category({ id: 'dc-1', name: 'Case notes', systemIds: ['s1', 's2'] })],
    });

    const entry = buildRopa(arch, NOW).entries[0];

    expect(entry.systems).toEqual(['Lamplight', 'Old server']);
    expect(entry.hosting).toEqual(['Cloud', 'On-premise']);
  });

  describe('recipients', () => {
    const shared = architecture({
      systems: [system({ id: 's1', name: 'Lamplight' })],
      dataCategories: [category({ id: 'dc-1', name: 'Case notes', systemIds: ['s1'] })],
      externalParties: [
        { id: 'p1', name: 'The Lottery', type: 'funder', location: 'uk' },
        { id: 'p2', name: 'US Analytics Co', type: 'supplier', location: 'rest_of_world' },
      ],
      dataFlows: [
        {
          id: 'f1',
          systemId: 's1',
          partyId: 'p1',
          dataCategoryIds: ['dc-1'],
          purpose: 'Quarterly grant reporting',
          method: 'portal',
          frequency: 'scheduled',
        },
      ],
    });

    it('names who the data goes to, and why', () => {
      const entry = buildRopa(shared, NOW).entries[0];

      expect(entry.recipients).toEqual([
        { name: 'The Lottery', outsideUk: false, purpose: 'Quarterly grant reporting' },
      ]);
    });

    it('flags a transfer outside the UK', () => {
      const arch = {
        ...shared,
        dataFlows: [
          {
            id: 'f2',
            systemId: 's1',
            partyId: 'p2',
            dataCategoryIds: ['dc-1'],
            method: 'api' as const,
            frequency: 'real_time' as const,
          },
        ],
      };

      const entry = buildRopa(arch, NOW).entries[0];

      expect(entry.hasInternationalTransfer).toBe(true);
      expect(entry.recipients[0].outsideUk).toBe(true);
    });

    it('does not flag a transfer when everyone is in the UK', () => {
      expect(buildRopa(shared, NOW).entries[0].hasInternationalTransfer).toBe(false);
    });

    it('ignores flows for other data categories', () => {
      const arch = {
        ...shared,
        dataCategories: [
          ...shared.dataCategories,
          category({ id: 'dc-2', name: 'Staff records', systemIds: ['s1'] }),
        ],
      };

      const staffEntry = buildRopa(arch, NOW).entries.find((e) => e.category === 'Staff records');
      expect(staffEntry?.recipients).toEqual([]);
    });
  });

  describe('gaps', () => {
    it('says what a bare category is still missing', () => {
      const arch = architecture({
        dataCategories: [category({ id: 'dc-1', name: 'Client records' })],
      });

      const entry = buildRopa(arch, NOW).entries[0];

      expect(entry.missing).toEqual([
        'who the data is about',
        'lawful basis',
        'how long it is kept',
        'which system holds it',
      ]);
    });

    it('reports nothing missing once it is filled in', () => {
      const arch = architecture({
        systems: [system({ id: 's1', name: 'Lamplight' })],
        dataCategories: [
          category({
            id: 'dc-1',
            name: 'Client records',
            systemIds: ['s1'],
            subjects: 'People we support',
            lawfulBasis: 'legitimate_interests',
            retention: '7 years after last contact',
          }),
        ],
      });

      const report = buildRopa(arch, NOW);

      expect(report.entries[0].missing).toEqual([]);
      expect(report.completeCount).toBe(1);
    });

    it('counts only the complete records', () => {
      const arch = architecture({
        systems: [system({ id: 's1', name: 'Lamplight' })],
        dataCategories: [
          category({
            id: 'dc-1',
            name: 'Done',
            systemIds: ['s1'],
            subjects: 'Clients',
            lawfulBasis: 'consent',
            retention: '2 years',
          }),
          category({ id: 'dc-2', name: 'Not done' }),
        ],
      });

      expect(buildRopa(arch, NOW).completeCount).toBe(1);
    });
  });
});

describe('generateRopaCsv', () => {
  const arch = architecture({
    systems: [system({ id: 's1', name: 'Lamplight' })],
    dataCategories: [
      category({
        id: 'dc-1',
        name: 'Client records',
        systemIds: ['s1'],
        subjects: 'People we support',
        lawfulBasis: 'legitimate_interests',
        retention: '7 years, after last contact',
      }),
    ],
    externalParties: [{ id: 'p1', name: 'The Lottery', type: 'funder', location: 'uk' }],
    dataFlows: [
      {
        id: 'f1',
        systemId: 's1',
        partyId: 'p1',
        dataCategoryIds: ['dc-1'],
        purpose: 'Grant reporting',
        method: 'portal',
        frequency: 'scheduled',
      },
    ],
  });

  const csv = generateRopaCsv(buildRopa(arch, NOW));

  it('uses the headings a record of processing activities needs', () => {
    const header = csv.split('\n')[0];

    expect(header).toContain('Lawful basis');
    expect(header).toContain('Retention period');
    expect(header).toContain('Recipients');
    expect(header).toContain('Transfers outside the UK');
  });

  it('writes one row per processing activity', () => {
    expect(csv.split('\n')).toHaveLength(2);
  });

  it('spells out the lawful basis rather than the stored key', () => {
    expect(csv).toContain('Legitimate interests');
    expect(csv).not.toContain('legitimate_interests');
  });

  it('quotes values containing commas', () => {
    expect(csv).toContain('"7 years, after last contact"');
  });

  it('says whether data leaves the UK', () => {
    expect(csv.split('\n')[1]).toContain('No');
  });
});
