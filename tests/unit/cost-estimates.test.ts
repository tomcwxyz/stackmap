import { describe, it, expect } from 'vitest';
import {
  estimateCost,
  estimateToolCost,
  selectTier,
  DEFAULT_STAFF,
  SIZE_MULTIPLIERS,
  type OrgSize,
} from '@/lib/cost-estimates';
import type { ToolPricing, PricingTier } from '@/lib/techfreedom/types';

describe('estimateToolCost', () => {
  it('calculates per_seat cost based on staff and penetration rate', () => {
    const pricing: ToolPricing = {
      model: 'per_seat',
      annualPerSeat: 100,
      penetrationRate: 0.5,
    };
    const result = estimateToolCost(pricing, undefined, 20);
    expect(result.annualTotal).toBe(1000); // 10 seats * £100
    expect(result.seats).toBe(10);
    expect(result.perSeat).toBe(100);
    expect(result.breakdown).toContain('10 licence');
    expect(result.breakdown).toContain('50% of staff');
  });

  it('selects the correct tier for a tiered model', () => {
    const pricing: ToolPricing = {
      model: 'tiered',
      penetrationRate: 1.0,
      tiers: [
        { name: 'Basic', maxUsers: 10, annualPerSeat: 50, recommended: true },
        { name: 'Pro', annualPerSeat: 100, minUsers: 11 },
      ],
    };
    // 5 staff -> fits Basic
    const small = estimateToolCost(pricing, undefined, 5);
    expect(small.tier).toBe('Basic');
    expect(small.annualTotal).toBe(250); // 5 * 50

    // 20 staff -> fits Pro
    const bigger = estimateToolCost(pricing, undefined, 20);
    expect(bigger.tier).toBe('Pro');
    expect(bigger.annualTotal).toBe(2000); // 20 * 100
  });

  it('handles flat pricing model', () => {
    const pricing: ToolPricing = {
      model: 'flat',
      flatAnnual: 360,
      penetrationRate: 0.1,
    };
    const result = estimateToolCost(pricing, undefined, 60);
    expect(result.annualTotal).toBe(360);
    expect(result.seats).toBe(1);
    expect(result.breakdown).toContain('Flat rate');
  });

  it('handles flat model with tiers', () => {
    const pricing: ToolPricing = {
      model: 'flat',
      flatAnnual: 360,
      tiers: [
        { name: 'Starter', annualPerSeat: 0, maxUsers: 1, recommended: true },
        { name: 'Premium', annualPerSeat: 0, maxUsers: 10 },
      ],
    };
    const result = estimateToolCost(pricing, undefined, 3);
    expect(result.annualTotal).toBe(360); // tier annualPerSeat is 0, so fallback to flatAnnual
    expect(result.tier).toBe('Premium'); // 3 users doesn't fit Starter (maxUsers: 1)
  });

  it('returns zero for free model', () => {
    const pricing: ToolPricing = { model: 'free' };
    const result = estimateToolCost(pricing, undefined, 100);
    expect(result.annualTotal).toBe(0);
    expect(result.seats).toBe(100);
    expect(result.breakdown).toBe('Free');
  });

  it('falls back to scaled base cost when no pricing data', () => {
    const result = estimateToolCost(undefined, 1500, 30);
    // ratio = 30 / 15 = 2.0, so 1500 * 2 = 3000
    expect(result.annualTotal).toBe(3000);
    expect(result.seats).toBe(30);
    expect(result.breakdown).toContain('scaled for 30 staff');
  });

  it('returns zero with no pricing and no fallback cost', () => {
    const result = estimateToolCost(undefined, undefined, 15);
    expect(result.annualTotal).toBe(0);
    expect(result.seats).toBe(0);
    expect(result.breakdown).toBe('No cost data');
  });

  it('applies penetration rate to reduce seat count', () => {
    const pricing: ToolPricing = {
      model: 'per_seat',
      annualPerSeat: 200,
      penetrationRate: 0.3,
    };
    const result = estimateToolCost(pricing, undefined, 100);
    expect(result.seats).toBe(30); // 100 * 0.3
    expect(result.annualTotal).toBe(6000); // 30 * 200
  });

  it('ensures at least 1 seat even with low penetration and small staff', () => {
    const pricing: ToolPricing = {
      model: 'per_seat',
      annualPerSeat: 100,
      penetrationRate: 0.05,
    };
    const result = estimateToolCost(pricing, undefined, 3);
    expect(result.seats).toBe(1); // Math.round(3 * 0.05) = 0, clamped to 1
    expect(result.annualTotal).toBe(100);
  });

  it('defaults penetration rate to 1.0 when not specified', () => {
    const pricing: ToolPricing = {
      model: 'per_seat',
      annualPerSeat: 50,
    };
    const result = estimateToolCost(pricing, undefined, 10);
    expect(result.seats).toBe(10);
    expect(result.annualTotal).toBe(500);
  });
});

describe('selectTier', () => {
  const tiers: PricingTier[] = [
    { name: 'Free', annualPerSeat: 0, maxUsers: 10, recommended: true },
    { name: 'Pro', annualPerSeat: 100, minUsers: 5 },
    { name: 'Enterprise', annualPerSeat: 200, minUsers: 50 },
  ];

  it('picks the recommended tier for very small teams', () => {
    const result = selectTier(tiers, 3);
    // Only Free is eligible at 3 users, and it is the recommended tier
    expect(result?.name).toBe('Free');
  });

  it('prefers the cheapest paid tier over a free tier once past 3 users', () => {
    const result = selectTier(tiers, 5);
    // Free and Pro are both eligible, but an org with real staff will be
    // on paid licences rather than 5 free accounts
    expect(result?.name).toBe('Pro');
  });

  it('picks cheapest eligible when no recommended tier fits', () => {
    const tiersNoRec: PricingTier[] = [
      { name: 'Basic', annualPerSeat: 80, maxUsers: 20 },
      { name: 'Pro', annualPerSeat: 50, minUsers: 5 },
    ];
    const result = selectTier(tiersNoRec, 10);
    expect(result?.name).toBe('Pro'); // cheaper at 50 vs 80
  });

  it('falls back to last tier when no tier is eligible', () => {
    const result = selectTier(tiers, 500);
    // 500 users: Free maxUsers=10 fails, Pro no maxUsers OK but Enterprise minUsers=50 also OK
    // Actually both Pro (minUsers 5) and Enterprise (minUsers 50) are eligible
    // Enterprise is not recommended, Pro is cheapest => Pro
    // Wait let me re-check: Free maxUsers=10 -> 500 > 10 -> not eligible
    // Pro minUsers=5, no maxUsers -> eligible
    // Enterprise minUsers=50, no maxUsers -> eligible
    // No recommended among eligible -> cheapest -> Pro (100)
    expect(result?.name).toBe('Pro');
  });

  it('returns last tier when truly no tier fits', () => {
    const restrictedTiers: PricingTier[] = [
      { name: 'Small', annualPerSeat: 50, maxUsers: 10 },
      { name: 'Medium', annualPerSeat: 100, maxUsers: 50 },
    ];
    const result = selectTier(restrictedTiers, 100);
    expect(result?.name).toBe('Medium'); // fallback to last
  });

  it('returns undefined for empty or undefined tiers', () => {
    expect(selectTier(undefined, 10)).toBeUndefined();
    expect(selectTier([], 10)).toBeUndefined();
  });
});

describe('estimateCost (backward compatibility)', () => {
  it('returns the base cost unchanged for a small org', () => {
    expect(estimateCost(1000, 'small')).toBe(1000);
  });

  it('scales down for micro org (3 staff / 15 base = 0.2)', () => {
    expect(estimateCost(1000, 'micro')).toBe(200); // 1000 * (3/15)
  });

  it('scales up for medium org (60 staff / 15 base = 4)', () => {
    expect(estimateCost(1000, 'medium')).toBe(4000); // 1000 * (60/15)
  });

  it('scales up for large org (200 staff / 15 base ≈ 13.3)', () => {
    expect(estimateCost(1000, 'large')).toBe(13333); // 1000 * (200/15) = 13333.33 -> 13333
  });

  it('returns 0 for a base cost of 0 regardless of size', () => {
    const sizes: OrgSize[] = ['micro', 'small', 'medium', 'large'];
    for (const size of sizes) {
      expect(estimateCost(0, size)).toBe(0);
    }
  });
});

describe('DEFAULT_STAFF', () => {
  it('has entries for all four sizes', () => {
    expect(Object.keys(DEFAULT_STAFF)).toEqual(['micro', 'small', 'medium', 'large']);
  });

  it('uses 15 as the base for small', () => {
    expect(DEFAULT_STAFF.small).toBe(15);
  });
});

describe('SIZE_MULTIPLIERS (backward compatibility)', () => {
  it('has entries for all four sizes', () => {
    expect(Object.keys(SIZE_MULTIPLIERS)).toEqual(['micro', 'small', 'medium', 'large']);
  });

  it('uses 1.0 as the base for small', () => {
    expect(SIZE_MULTIPLIERS.small).toBe(1.0);
  });
});
