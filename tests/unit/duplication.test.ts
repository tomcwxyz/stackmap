import { describe, it, expect } from 'vitest';
import { findDuplication } from '@/lib/analysis/duplication';
import type { OrgFunction, System } from '@/lib/types';

const functions: OrgFunction[] = [
  { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
  { id: 'fn-2', name: 'Fundraising', type: 'fundraising', isActive: true },
];

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

function annual(amount: number) {
  return { amount, period: 'annual' as const, model: 'subscription' as const };
}

describe('findDuplication', () => {
  it('finds nothing in an empty map', () => {
    expect(findDuplication([], functions)).toEqual([]);
  });

  it('finds nothing when systems do different jobs', () => {
    const systems = [
      system({ id: 's1', name: 'Xero', type: 'finance' }),
      system({ id: 's2', name: 'Salesforce', type: 'crm' }),
    ];

    expect(findDuplication(systems, functions)).toEqual([]);
  });

  it('groups two systems of the same type', () => {
    const systems = [
      system({ id: 's1', name: 'Salesforce', type: 'crm', functionIds: ['fn-2'] }),
      system({ id: 's2', name: 'HubSpot', type: 'crm', functionIds: ['fn-2'] }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('CRM');
    expect(groups[0].systems.map((s) => s.name)).toEqual(['Salesforce', 'HubSpot']);
  });

  it('spots duplication across different functions, which per-function checks miss', () => {
    const systems = [
      system({ id: 's1', name: 'Salesforce', type: 'crm', functionIds: ['fn-1'] }),
      system({ id: 's2', name: 'HubSpot', type: 'crm', functionIds: ['fn-2'] }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups).toHaveLength(1);
    expect(groups[0].functionNames.sort()).toEqual(['Finance', 'Fundraising']);
  });

  it('reports the same duplication once, not once per function', () => {
    const systems = [
      system({ id: 's1', name: 'Salesforce', type: 'crm', functionIds: ['fn-1', 'fn-2'] }),
      system({ id: 's2', name: 'HubSpot', type: 'crm', functionIds: ['fn-1'] }),
      system({ id: 's3', name: 'Dynamics', type: 'crm', functionIds: ['fn-2'] }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups).toHaveLength(1);
    expect(groups[0].systems).toHaveLength(3);
  });

  it('goes by the type the user chose, not the database’s own filing', () => {
    // Slack is filed under Communication and WhatsApp under Messaging in the
    // tools database, but the user has called both of these messaging tools
    const systems = [
      system({ id: 's1', name: 'Slack', type: 'messaging' }),
      system({ id: 's2', name: 'WhatsApp', type: 'messaging' }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Messaging');
  });

  it('does not group systems the user typed differently', () => {
    const systems = [
      system({ id: 's1', name: 'Google Workspace', type: 'document_management' }),
      system({ id: 's2', name: 'Microsoft 365', type: 'email' }),
    ];

    expect(findDuplication(systems, functions)).toEqual([]);
  });

  it('falls back to the tools database for systems typed "other"', () => {
    const systems = [
      system({ id: 's1', name: 'ChatGPT', type: 'other' }),
      system({ id: 's2', name: 'Claude', type: 'other' }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('AI');
  });

  it('ignores unclassifiable systems it knows nothing about', () => {
    const systems = [
      system({ id: 's1', name: 'Some in-house thing', type: 'other' }),
      system({ id: 's2', name: 'Another in-house thing', type: 'custom' }),
    ];

    expect(findDuplication(systems, functions)).toEqual([]);
  });

  it('ignores systems already being retired', () => {
    const systems = [
      system({ id: 's1', name: 'Salesforce', type: 'crm' }),
      system({ id: 's2', name: 'HubSpot', type: 'crm', status: 'retiring' }),
    ];

    expect(findDuplication(systems, functions)).toEqual([]);
  });

  it('includes shadow tools and flags them', () => {
    const systems = [
      system({ id: 's1', name: 'Slack', type: 'messaging' }),
      system({ id: 's2', name: 'WhatsApp', type: 'messaging', isShadow: true }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups[0].systems.find((s) => s.name === 'WhatsApp')?.isShadow).toBe(true);
  });

  describe('cost', () => {
    it('adds up what the duplication costs', () => {
      const systems = [
        system({ id: 's1', name: 'Salesforce', type: 'crm', cost: annual(1200) }),
        system({ id: 's2', name: 'HubSpot', type: 'crm', cost: annual(800) }),
      ];

      const groups = findDuplication(systems, functions);

      expect(groups[0].combinedAnnualCost).toBe(2000);
    });

    it('annualises monthly costs', () => {
      const systems = [
        system({
          id: 's1',
          name: 'Salesforce',
          type: 'crm',
          cost: { amount: 100, period: 'monthly', model: 'subscription' },
        }),
        system({ id: 's2', name: 'HubSpot', type: 'crm', cost: annual(800) }),
      ];

      const groups = findDuplication(systems, functions);

      expect(groups[0].combinedAnnualCost).toBe(2000);
    });

    it('treats everything but the cheapest as the possible saving', () => {
      const systems = [
        system({ id: 's1', name: 'Salesforce', type: 'crm', cost: annual(1200) }),
        system({ id: 's2', name: 'HubSpot', type: 'crm', cost: annual(800) }),
      ];

      const groups = findDuplication(systems, functions);

      expect(groups[0].potentialSaving).toBe(1200);
    });

    it('reports no saving when nothing is costed', () => {
      const systems = [
        system({ id: 's1', name: 'Salesforce', type: 'crm' }),
        system({ id: 's2', name: 'HubSpot', type: 'crm' }),
      ];

      const groups = findDuplication(systems, functions);

      expect(groups[0].combinedAnnualCost).toBe(0);
      expect(groups[0].potentialSaving).toBe(0);
    });
  });

  it('puts the biggest opportunity first', () => {
    const systems = [
      system({ id: 's1', name: 'Slack', type: 'messaging', cost: annual(100) }),
      system({ id: 's2', name: 'Signal', type: 'messaging', cost: annual(50) }),
      system({ id: 's3', name: 'Salesforce', type: 'crm', cost: annual(5000) }),
      system({ id: 's4', name: 'HubSpot', type: 'crm', cost: annual(3000) }),
    ];

    const groups = findDuplication(systems, functions);

    expect(groups.map((g) => g.label)).toEqual(['CRM', 'Messaging']);
  });
});
