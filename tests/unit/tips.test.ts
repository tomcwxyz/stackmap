import { describe, it, expect } from 'vitest';
import { getTip } from '@/components/wizard/tips';
import type { Architecture } from '@/lib/types';

const baseArch: Architecture = {
  organisation: {
    id: 'org-1',
    name: 'Test Org',
    type: 'charity',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
    version: '1.0',
    exportedAt: '2024-01-01T00:00:00Z',
    stackmapVersion: '0.2.0',
    mappingPath: 'function_first',
  },
};

describe('getTip - services step', () => {
  it('returns guidance about beneficiaries when no services exist', () => {
    const tip = getTip('/wizard/functions/services', baseArch);
    expect(tip).toMatch(/deliver|beneficiar/i);
    expect(tip).not.toMatch(/optional/i);
  });

  it('returns guidance on service-first path too', () => {
    const tip = getTip('/wizard/services', baseArch);
    expect(tip).toMatch(/deliver|beneficiar/i);
    expect(tip).not.toMatch(/optional/i);
  });

  it('returns count when services exist', () => {
    const arch: Architecture = {
      ...baseArch,
      services: [
        {
          id: 's-1',
          name: 'Counselling',
          status: 'active',
          functionIds: [],
          systemIds: [],
        },
      ],
    };
    const tip = getTip('/wizard/functions/services', arch);
    expect(tip).toBe('1 service mapped.');
  });
});

describe('getTip - data step personal data', () => {
  it('returns tip about personal data systems on data step', () => {
    const arch: Architecture = {
      ...baseArch,
      systems: [
        {
          id: 's1',
          name: 'CRM',
          type: 'crm',
          hosting: 'cloud',
          status: 'active',
          functionIds: ['f1'],
          serviceIds: [],
        },
      ],
      dataCategories: [
        {
          id: 'd1',
          name: 'Clients',
          sensitivity: 'restricted',
          containsPersonalData: true,
          systemIds: ['s1'],
        },
      ],
    };
    const tip = getTip('/wizard/functions/data', arch);
    expect(tip).toMatch(/personal data/i);
    expect(tip).toMatch(/1 system/i);
  });
});

describe('getTip - review step retiring systems', () => {
  it('returns tip about retiring systems on review step', () => {
    const arch: Architecture = {
      ...baseArch,
      systems: [
        {
          id: 's1',
          name: 'Old CRM',
          type: 'crm',
          hosting: 'cloud',
          status: 'retiring',
          functionIds: ['f1'],
          serviceIds: [],
        },
      ],
    };
    const tip = getTip('/wizard/functions/review', arch);
    expect(tip).toMatch(/retiring/i);
  });
});
