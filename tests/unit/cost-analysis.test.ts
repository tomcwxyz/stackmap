import { describe, it, expect } from 'vitest';
import { calculateCostSummary, estimateUncosted, formatCurrency } from '@/lib/cost-analysis';
import type { System, OrgFunction } from '@/lib/types';

function makeSystem(overrides: Partial<System> & { id: string; name: string }): System {
  return {
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

function makeFunction(overrides: Partial<OrgFunction> & { id: string; name: string }): OrgFunction {
  return {
    type: 'custom',
    isActive: true,
    ...overrides,
  };
}

describe('formatCurrency', () => {
  it('formats a whole number with pound sign', () => {
    expect(formatCurrency(1200)).toBe('\u00A31,200');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('\u00A30');
  });

  it('formats a large number with commas', () => {
    expect(formatCurrency(25000)).toBe('\u00A325,000');
  });
});

describe('calculateCostSummary', () => {
  const functions: OrgFunction[] = [
    makeFunction({ id: 'fn-1', name: 'Finance', type: 'finance' }),
    makeFunction({ id: 'fn-2', name: 'Fundraising', type: 'fundraising' }),
  ];

  it('calculates total annual cost from annual costs', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Xero', functionIds: ['fn-1'],
        cost: { amount: 2400, period: 'annual', model: 'subscription' },
      }),
      makeSystem({
        id: 's2', name: 'Salesforce', functionIds: ['fn-2'],
        cost: { amount: 6000, period: 'annual', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.totalAnnual).toBe(8400);
  });

  it('normalises monthly costs to annual', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Slack', functionIds: ['fn-1'],
        cost: { amount: 100, period: 'monthly', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.totalAnnual).toBe(1200);
    expect(result.totalMonthly).toBe(100);
  });

  it('counts free systems separately', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Google Docs', functionIds: ['fn-1'],
        cost: { amount: 0, period: 'annual', model: 'free' },
      }),
      makeSystem({
        id: 's2', name: 'Xero', functionIds: ['fn-1'],
        cost: { amount: 2400, period: 'annual', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.freeCount).toBe(1);
    expect(result.systemCount).toBe(2);
  });

  it('counts systems without cost data as uncostCount', () => {
    const systems: System[] = [
      makeSystem({ id: 's1', name: 'Unknown Tool', functionIds: ['fn-1'] }),
      makeSystem({
        id: 's2', name: 'Xero', functionIds: ['fn-1'],
        cost: { amount: 2400, period: 'annual', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.uncostCount).toBe(1);
    expect(result.systemCount).toBe(1);
  });

  it('groups costs by function', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Xero', functionIds: ['fn-1'],
        cost: { amount: 2400, period: 'annual', model: 'subscription' },
      }),
      makeSystem({
        id: 's2', name: 'Sage', functionIds: ['fn-1'],
        cost: { amount: 1200, period: 'annual', model: 'subscription' },
      }),
      makeSystem({
        id: 's3', name: 'Salesforce', functionIds: ['fn-2'],
        cost: { amount: 6000, period: 'annual', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.byFunction).toEqual([
      { functionId: 'fn-1', functionName: 'Finance', total: 3600 },
      { functionId: 'fn-2', functionName: 'Fundraising', total: 6000 },
    ]);
  });

  it('returns top 3 most expensive systems', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Xero', functionIds: ['fn-1'],
        cost: { amount: 2400, period: 'annual', model: 'subscription' },
      }),
      makeSystem({
        id: 's2', name: 'Salesforce', functionIds: ['fn-2'],
        cost: { amount: 6000, period: 'annual', model: 'subscription' },
      }),
      makeSystem({
        id: 's3', name: 'Slack', functionIds: ['fn-1'],
        cost: { amount: 100, period: 'monthly', model: 'subscription' },
      }),
      makeSystem({
        id: 's4', name: 'Zoom', functionIds: ['fn-1'],
        cost: { amount: 500, period: 'annual', model: 'subscription' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.mostExpensive).toHaveLength(3);
    expect(result.mostExpensive[0].name).toBe('Salesforce');
    expect(result.mostExpensive[0].annualCost).toBe(6000);
    expect(result.mostExpensive[1].name).toBe('Xero');
    expect(result.mostExpensive[2].name).toBe('Slack');
  });

  it('returns empty summary when no systems exist', () => {
    const result = calculateCostSummary([], functions);
    expect(result.totalAnnual).toBe(0);
    expect(result.systemCount).toBe(0);
    expect(result.uncostCount).toBe(0);
    expect(result.mostExpensive).toHaveLength(0);
    expect(result.freeCount).toBe(0);
  });

  it('excludes free systems from mostExpensive', () => {
    const systems: System[] = [
      makeSystem({
        id: 's1', name: 'Free Tool', functionIds: ['fn-1'],
        cost: { amount: 0, period: 'annual', model: 'free' },
      }),
    ];
    const result = calculateCostSummary(systems, functions);
    expect(result.mostExpensive).toHaveLength(0);
  });
});

describe('estimating what is missing', () => {
  const functions: OrgFunction[] = [];

  it('leaves estimates at zero when no staff count is given', () => {
    const systems = [makeSystem({ id: 's1', name: 'Slack' })];

    const result = calculateCostSummary(systems, functions);

    expect(result.estimatedAnnual).toBe(0);
    expect(result.estimatedCount).toBe(0);
    expect(result.uncostCount).toBe(1);
  });

  it('prices uncosted systems it recognises', () => {
    const systems = [makeSystem({ id: 's1', name: 'Slack' })];

    const result = calculateCostSummary(systems, functions, { staffCount: 15 });

    expect(result.estimatedCount).toBe(1);
    expect(result.estimatedAnnual).toBeGreaterThan(0);
  });

  it('does not estimate systems that already have a cost', () => {
    const systems = [
      makeSystem({
        id: 's1',
        name: 'Slack',
        cost: { amount: 500, period: 'annual', model: 'subscription' },
      }),
    ];

    const result = calculateCostSummary(systems, functions, { staffCount: 15 });

    expect(result.totalAnnual).toBe(500);
    expect(result.estimatedAnnual).toBe(0);
    expect(result.estimatedCount).toBe(0);
  });

  it('cannot price a system it does not recognise', () => {
    const systems = [makeSystem({ id: 's1', name: 'Our in-house rota tool' })];

    const result = calculateCostSummary(systems, functions, { staffCount: 15 });

    expect(result.uncostCount).toBe(1);
    expect(result.estimatedCount).toBe(0);
  });

  it('scales the estimate with headcount', () => {
    const systems = [makeSystem({ id: 's1', name: 'Slack' })];

    const small = calculateCostSummary(systems, functions, { staffCount: 5 });
    const large = calculateCostSummary(systems, functions, { staffCount: 200 });

    expect(large.estimatedAnnual).toBeGreaterThan(small.estimatedAnnual);
  });

  it('keeps recorded and estimated figures separate', () => {
    const systems = [
      makeSystem({
        id: 's1',
        name: 'Xero',
        cost: { amount: 400, period: 'annual', model: 'subscription' },
      }),
      makeSystem({ id: 's2', name: 'Slack' }),
    ];

    const result = calculateCostSummary(systems, functions, { staffCount: 15 });

    expect(result.totalAnnual).toBe(400);
    expect(result.estimatedAnnual).toBeGreaterThan(0);
  });
});

describe('estimateUncosted', () => {
  it('ignores free tools, which add nothing to the bill', () => {
    // Signal is free in the tools database
    const result = estimateUncosted([makeSystem({ id: 's1', name: 'Signal' })], 15);

    expect(result).toEqual({ total: 0, count: 0 });
  });

  it('adds up several recognised systems', () => {
    const result = estimateUncosted(
      [makeSystem({ id: 's1', name: 'Slack' }), makeSystem({ id: 's2', name: 'Xero' })],
      15,
    );

    expect(result.count).toBe(2);
    expect(result.total).toBeGreaterThan(0);
  });
});
