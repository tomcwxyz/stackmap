import type { ToolPricing, PricingTier } from './techfreedom/types';

export type OrgSize = 'micro' | 'small' | 'medium' | 'large';

// Kept for backward compatibility — old tests import this
export const SIZE_MULTIPLIERS: Record<OrgSize, number> = {
  micro: 0.5,
  small: 1.0,
  medium: 2.5,
  large: 5.0,
};

// Default staff counts per size band (used when staffCount not provided)
export const DEFAULT_STAFF: Record<OrgSize, number> = {
  micro: 3,
  small: 15,
  medium: 60,
  large: 200,
};

/**
 * Staff to price per-seat tools for: what the organisation told us, or the
 * midpoint of its size band when it did not say.
 */
export function resolveStaffCount(org: {
  staffCount?: number;
  size?: OrgSize;
}): number {
  if (org.staffCount != null && org.staffCount > 0) return org.staffCount;
  return DEFAULT_STAFF[org.size ?? 'small'];
}

export interface CostEstimate {
  annualTotal: number;
  perSeat?: number;
  seats: number;
  tier?: string;
  notes?: string;
  breakdown: string;
}

export function estimateToolCost(
  pricing: ToolPricing | undefined,
  fallbackAnnualCost: number | undefined,
  staffCount: number,
): CostEstimate {
  if (!pricing) {
    // Fallback to old simple estimate
    if (!fallbackAnnualCost) return { annualTotal: 0, seats: 0, breakdown: 'No cost data' };
    const ratio = staffCount / 15; // base estimate was for ~15 users
    return {
      annualTotal: Math.round(fallbackAnnualCost * ratio),
      seats: staffCount,
      breakdown: `Estimated from base cost, scaled for ${staffCount} staff`,
    };
  }

  if (pricing.model === 'free') {
    return { annualTotal: 0, seats: staffCount, breakdown: 'Free' };
  }

  if (pricing.model === 'flat') {
    // Find the right tier based on staff count
    const tier = selectTier(pricing.tiers, staffCount);
    const annual =
      tier ? (tier.annualPerSeat > 0 ? tier.annualPerSeat : pricing.flatAnnual ?? 0) : pricing.flatAnnual ?? 0;
    return {
      annualTotal: Math.round(annual),
      seats: 1,
      tier: tier?.name,
      notes: pricing.notes,
      breakdown: `Flat rate${tier ? ` (${tier.name})` : ''}`,
    };
  }

  // per_seat or tiered
  const penetration = pricing.penetrationRate ?? 1.0;
  const seats = Math.max(1, Math.round(staffCount * penetration));
  const tier = selectTier(pricing.tiers, seats);
  const perSeat = tier?.annualPerSeat ?? pricing.annualPerSeat ?? 0;
  const total = perSeat * seats;

  return {
    annualTotal: Math.round(total),
    perSeat,
    seats,
    tier: tier?.name,
    notes: pricing.notes,
    breakdown:
      `${seats} licence${seats === 1 ? '' : 's'} \u00D7 \u00A3${perSeat}/year${tier ? ` (${tier.name})` : ''}${penetration < 1 ? ` \u2014 ${Math.round(penetration * 100)}% of staff` : ''}`,
  };
}

export function selectTier(
  tiers: PricingTier[] | undefined,
  userCount: number,
): PricingTier | undefined {
  if (!tiers || tiers.length === 0) return undefined;

  // Find tiers that fit the user count
  const eligible = tiers.filter(
    (t) =>
      (!t.minUsers || userCount >= t.minUsers) &&
      (!t.maxUsers || userCount <= t.maxUsers),
  );

  if (eligible.length === 0) {
    // No tier fits — use the one with highest maxUsers or no limit
    return tiers[tiers.length - 1];
  }

  // For orgs with real staff (>3), prefer the cheapest PAID tier over free tiers.
  // Rationale: a 15-person org using ChatGPT will have paid licences, not 15 free accounts.
  // Free tiers are realistic only for very small teams or genuinely free tools.
  if (userCount > 3) {
    const paidEligible = eligible.filter((t) => t.annualPerSeat > 0);
    if (paidEligible.length > 0) {
      const recommended = paidEligible.find((t) => t.recommended);
      if (recommended) return recommended;
      return paidEligible.sort((a, b) => a.annualPerSeat - b.annualPerSeat)[0];
    }
  }

  // For very small orgs or when only free tiers exist
  const recommended = eligible.find((t) => t.recommended);
  if (recommended) return recommended;

  return eligible.sort((a, b) => a.annualPerSeat - b.annualPerSeat)[0];
}

// Backward-compatible convenience wrapper
export function estimateCost(baseCost: number, size: OrgSize): number {
  const staffCount = DEFAULT_STAFF[size];
  const result = estimateToolCost(undefined, baseCost, staffCount);
  return result.annualTotal;
}
