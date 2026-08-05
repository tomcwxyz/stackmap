import type { System, OrgFunction } from './types';
import { estimateToolCost } from './cost-estimates';
import { findMatchingTool } from './techfreedom/match';
import { KNOWN_TOOLS } from './techfreedom/tools';

export interface CostSummary {
  totalAnnual: number;
  totalMonthly: number;
  systemCount: number;
  uncostCount: number;
  byFunction: { functionId: string; functionName: string; total: number }[];
  mostExpensive: { name: string; annualCost: number }[];
  freeCount: number;
  /**
   * Rough annual cost of systems with nothing recorded, from the known tools
   * database. Zero when none of them could be estimated.
   */
  estimatedAnnual: number;
  /** How many of the uncosted systems it was possible to estimate. */
  estimatedCount: number;
}

export interface CostSummaryOptions {
  /**
   * Staff to price per-seat tools for. Without it, uncosted systems are counted
   * but not estimated.
   */
  staffCount?: number;
}

/**
 * A system's cost as an annual figure. Systems with no cost recorded, and
 * systems recorded as free, both come out as 0.
 */
export function annualiseCost(system: System): number {
  if (!system.cost) return 0;
  if (system.cost.model === 'free') return 0;
  if (system.cost.period === 'monthly') return system.cost.amount * 12;
  return system.cost.amount;
}

const annualise = annualiseCost;

/**
 * What the systems with no recorded cost are likely to be costing.
 *
 * The headline total only counts what the user typed in, which for most maps
 * understates the real bill considerably. Where a system matches the known
 * tools database we can price it, so say so rather than leaving a silent gap.
 */
export function estimateUncosted(
  systems: System[],
  staffCount: number,
): { total: number; count: number } {
  let total = 0;
  let count = 0;

  for (const system of systems) {
    if (system.cost) continue;

    const matched = findMatchingTool(system.name, KNOWN_TOOLS);
    if (!matched) continue;

    const estimate = estimateToolCost(matched.pricing, matched.estimatedAnnualCost, staffCount);
    if (estimate.annualTotal <= 0) continue;

    total += estimate.annualTotal;
    count++;
  }

  return { total, count };
}

export function calculateCostSummary(
  systems: System[],
  functions: OrgFunction[],
  options: CostSummaryOptions = {},
): CostSummary {
  const withCost = systems.filter((s) => s.cost !== undefined);
  const withoutCost = systems.filter((s) => s.cost === undefined);
  const freeCount = systems.filter((s) => s.cost?.model === 'free').length;

  const annualCosts = withCost.map((s) => ({ name: s.name, annualCost: annualise(s) }));
  const totalAnnual = annualCosts.reduce((sum, c) => sum + c.annualCost, 0);

  // Top 3 most expensive
  const mostExpensive = [...annualCosts]
    .sort((a, b) => b.annualCost - a.annualCost)
    .slice(0, 3)
    .filter((c) => c.annualCost > 0);

  // By function
  const byFunction = functions.map((fn) => {
    const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
    const total = fnSystems.reduce((sum, s) => sum + annualise(s), 0);
    return { functionId: fn.id, functionName: fn.name, total };
  });

  const estimated =
    options.staffCount != null
      ? estimateUncosted(withoutCost, options.staffCount)
      : { total: 0, count: 0 };

  return {
    totalAnnual,
    totalMonthly: Math.round((totalAnnual / 12) * 100) / 100,
    systemCount: withCost.length,
    uncostCount: withoutCost.length,
    byFunction,
    mostExpensive,
    freeCount,
    estimatedAnnual: estimated.total,
    estimatedCount: estimated.count,
  };
}

export function formatCurrency(amount: number): string {
  return `\u00A3${amount.toLocaleString('en-GB')}`;
}
