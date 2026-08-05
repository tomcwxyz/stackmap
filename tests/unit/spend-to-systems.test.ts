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
    externalParties: [],
    dataFlows: [],
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
      source: 'spend',
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
            cost: { amount: 500, period: 'annual', model: 'subscription', source: 'user' },
          }),
        ]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(500);
    });

    it('replaces a cost Stackmap guessed, which is the point of the feature', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([
          system({
            id: 's1',
            name: 'Xero',
            // What the wizard writes for a tool it recognised: a guess that
            // reads as a subscription, because most software is one
            cost: { amount: 500, period: 'annual', model: 'subscription', source: 'estimate' },
          }),
        ]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(396);
    });

    it('refreshes a figure an earlier import wrote', () => {
      const result = addSpendToArchitecture(
        [match({ estimatedAnnualCost: 420 })],
        architecture([
          system({
            id: 's1',
            name: 'Xero',
            cost: { amount: 396, period: 'annual', model: 'subscription', source: 'spend' },
          }),
        ]),
      );

      expect(result.architecture.systems[0].cost?.amount).toBe(420);
    });

    it('leaves a cost with no recorded source alone', () => {
      // Written before provenance was tracked, so it could be either. A stale
      // estimate is a smaller harm than a destroyed decision.
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

      expect(result.architecture.systems[0].cost?.amount).toBe(500);
    });

    it('matches regardless of case', () => {
      const result = addSpendToArchitecture(
        [match()],
        architecture([system({ id: 's1', name: 'xero' })]),
      );

      expect(result.updated).toBe(1);
    });
  });

  describe('two payee groups naming the same tool', () => {
    // A statement can carry both `GOOGLE` and `GOOGLE *GSUITE`; they clean to
    // different payees but are one subscription.
    const twoStreams = [
      match({ payee: 'XERO', originalPayee: 'XERO LIMITED', estimatedAnnualCost: 300, transactions: 10, totalAmount: 300 }),
      match({ payee: 'XERO PAYROLL', originalPayee: 'XERO PAYROLL 4471', estimatedAnnualCost: 96, transactions: 12, totalAmount: 96 }),
    ];

    it('creates one system, not one plus a silent no-op', () => {
      const result = addSpendToArchitecture(twoStreams, architecture());

      expect(result.architecture.systems).toHaveLength(1);
      expect(result.added).toBe(1);
      expect(result.updated).toBe(0);
    });

    it('counts all the money, rather than losing the second stream', () => {
      const result = addSpendToArchitecture(twoStreams, architecture());

      expect(result.architecture.systems[0].cost?.amount).toBe(396);
    });

    it('names both descriptors, so a statement line can still be traced', () => {
      const result = addSpendToArchitecture(twoStreams, architecture());

      expect(result.architecture.systems[0].notes).toContain('XERO LIMITED');
      expect(result.architecture.systems[0].notes).toContain('XERO PAYROLL 4471');
      expect(result.architecture.systems[0].notes).toContain('22 payments');
    });

    it('keeps unrecognised payees apart, since only a tool makes them the same', () => {
      const result = addSpendToArchitecture(
        [
          match({ payee: 'Plumber', originalPayee: 'A PLUMBER', tool: undefined }),
          match({ payee: 'Electrician', originalPayee: 'AN ELECTRICIAN', tool: undefined }),
        ],
        architecture(),
      );

      expect(result.architecture.systems).toHaveLength(2);
    });
  });

  it('leaves the rest of the map alone', () => {
    const before = architecture([system({ id: 's1', name: 'Salesforce' })]);
    const result = addSpendToArchitecture([match()], before);

    expect(result.architecture.owners).toEqual(before.owners);
    expect(result.architecture.services).toEqual(before.services);
    expect(result.architecture.systems.map((s) => s.name)).toEqual(['Salesforce', 'Xero']);
  });

  describe('filing systems under a function', () => {
    // Imported systems used to arrive attached to nothing, so they sat in an
    // "Other systems" bucket and had to be added again through the wizard.

    it('files a tool where the wizard would have suggested it', () => {
      const result = addSpendToArchitecture([match()], architecture());

      const finance = result.architecture.functions.find((f) => f.type === 'finance');
      expect(finance).toBeDefined();
      expect(result.architecture.systems[0].functionIds).toEqual([finance!.id]);
    });

    it('uses a function the map already has rather than making another', () => {
      const before = architecture();
      before.functions = [
        { id: 'fn-existing', name: 'Money', type: 'finance', isActive: true },
      ];

      const result = addSpendToArchitecture([match()], before);

      expect(result.architecture.functions).toHaveLength(1);
      expect(result.architecture.systems[0].functionIds).toEqual(['fn-existing']);
      expect(result.functionsCreated).toEqual([]);
    });

    it('says which functions it had to create', () => {
      const result = addSpendToArchitecture([match()], architecture());

      expect(result.functionsCreated).toEqual(['Finance']);
    });

    it('honours a function the user picked over the one it guessed', () => {
      const result = addSpendToArchitecture([match()], architecture(), {
        'XERO LIMITED': 'operations',
      });

      const operations = result.architecture.functions.find((f) => f.type === 'operations');
      expect(operations).toBeDefined();
      expect(result.architecture.systems[0].functionIds).toEqual([operations!.id]);
      expect(result.architecture.functions.some((f) => f.type === 'finance')).toBe(false);
    });

    it('leaves a system unattached when the user asked for that', () => {
      const result = addSpendToArchitecture([match()], architecture(), {
        'XERO LIMITED': 'none',
      });

      expect(result.architecture.systems[0].functionIds).toEqual([]);
      expect(result.functionsCreated).toEqual([]);
    });

    it('fills in a blank on a system already mapped, without moving it', () => {
      const placed = architecture([
        system({ id: 's1', name: 'Xero', functionIds: ['fn-somewhere'] }),
      ]);

      const result = addSpendToArchitecture([match()], placed);

      expect(result.architecture.systems[0].functionIds).toEqual(['fn-somewhere']);
      expect(result.functionsCreated).toEqual([]);
    });

    it('creates each function once, however many tools want it', () => {
      const result = addSpendToArchitecture(
        [
          match({ payee: 'XERO', originalPayee: 'XERO LIMITED' }),
          match({ payee: 'QUICKBOOKS', originalPayee: 'QUICKBOOKS UK' }),
        ],
        architecture(),
      );

      expect(result.architecture.functions.filter((f) => f.type === 'finance')).toHaveLength(1);
      expect(result.functionsCreated).toEqual(['Finance']);
    });
  });

  it('is safe to run twice with the same spend', () => {
    const once = addSpendToArchitecture([match()], architecture());
    const twice = addSpendToArchitecture([match()], once.architecture);

    expect(twice.architecture.systems).toHaveLength(1);
    expect(twice.added).toBe(0);
  });
});
