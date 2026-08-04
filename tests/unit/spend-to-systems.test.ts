import { describe, it, expect } from 'vitest';
import { addSpendToArchitecture } from '@/lib/import/spend-to-systems';
import type { SpendMatch } from '@/lib/import/parse-spend';
import type { Architecture, System } from '@/lib/types';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';

const xeroTool = KNOWN_TOOLS.find((t) => t.name === 'Xero')!;

function match(overrides: Partial<SpendMatch> = {}): SpendMatch {
  return {
    payee: 'XERO',
    originalPayee: 'XERO LIMITED',
    tool: xeroTool,
    transactions: 12,
    totalAmount: 396,
    cadence: 'monthly',
    estimatedAnnualCost: 396,
    ...overrides,
  };
}

function architecture(systems: System[] = []): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
    },
    functions: [],
    services: [],
    systems,
    dataCategories: [],
    integrations: [],
    owners: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '2026-01-01',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

function system(overrides: Partial<System> & { id: string; name: string }): System {
  return {
    type: 'other',
    hosting: 'unknown',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

describe('addSpendToArchitecture', () => {
  it('adds a system for a recognised tool', () => {
    const result = addSpendToArchitecture([match()], architecture());

    expect(result.added).toBe(1);
    expect(result.architecture.systems).toHaveLength(1);
    expect(result.architecture.systems[0].name).toBe('Xero');
  });

  it('costs it from what was actually paid', () => {
    const result = addSpendToArchitecture([match({ estimatedAnnualCost: 396 })], architecture());

    expect(result.architecture.systems[0].cost).toEqual({
      amount: 396,
      period: 'annual',
      model: 'subscription',
    });
  });

  it('takes the supplier and risk scores from the tools database', () => {
    const result = addSpendToArchitecture([match()], architecture());
    const added = result.architecture.systems[0];

    expect(added.vendor).toBe(xeroTool.provider);
    expect(added.techFreedomScore?.isAutoScored).toBe(true);
    expect(added.type).toBe('finance');
  });

  it('records where the system came from', () => {
    const result = addSpendToArchitecture([match({ transactions: 3 })], architecture());

    expect(result.architecture.systems[0].notes).toMatch(/3 payments to "XERO LIMITED"/);
  });

  it('uses the payee when no tool was recognised', () => {
    const result = addSpendToArchitecture(
      [match({ tool: undefined, payee: 'BOB THE PLUMBER' })],
      architecture(),
    );

    expect(result.architecture.systems[0].name).toBe('BOB THE PLUMBER');
    expect(result.architecture.systems[0].type).toBe('other');
    expect(result.architecture.systems[0].techFreedomScore).toBeUndefined();
  });

  describe('when the system is already mapped', () => {
    it('updates rather than adding a second copy', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([system({ id: 's1', name: 'Xero' })]),
      );

      expect(result.added).toBe(0);
      expect(result.updated).toBe(1);
      expect(result.architecture.systems).toHaveLength(1);
      expect(result.architecture.systems[0].id).toBe('s1');
    });

    it('fills in a cost that was never recorded', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([system({ id: 's1', name: 'Xero' })]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(396);
    });

    it('does not overwrite a cost the user entered', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([
          system({
            id: 's1',
            name: 'Xero',
            cost: { amount: 500, period: 'annual', model: 'subscription' },
          }),
        ]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(500);
    });

    it('replaces a cost that was only ever a guess', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([
          system({
            id: 's1',
            name: 'Xero',
            cost: { amount: 500, period: 'annual', model: 'unknown' },
          }),
        ]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(396);
    });

    it('matches regardless of case', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([system({ id: 's1', name: 'xero' })]),
      );

      expect(result.updated).toBe(1);
    });
  });

  it('leaves the rest of the map alone', () => {
    const before = architecture([system({ id: 's1', name: 'Salesforce' })]);
    const result = addSpendToArchitecture([match()], before);

    expect(result.architecture.functions).toEqual(before.functions);
    expect(result.architecture.owners).toEqual(before.owners);
    expect(result.architecture.systems.map((s) => s.name)).toEqual(['Salesforce', 'Xero']);
  });

  it('is safe to run twice with the same spend', () => {
    const once = addSpendToArchitecture([match()], architecture());
    const twice = addSpendToArchitecture([match()], once.architecture);

    expect(twice.architecture.systems).toHaveLength(1);
    expect(twice.added).toBe(0);
  });
});
