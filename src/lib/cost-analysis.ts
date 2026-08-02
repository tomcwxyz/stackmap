import type { System, OrgFunction } from './types';

export interface CostSummary {
  totalAnnual: number;
  totalMonthly: number;
  systemCount: number;
  uncostCount: number;
  byFunction: { functionId: string; functionName: string; total: number }[];
  mostExpensive: { name: string; annualCost: number }[];
  freeCount: number;
}

export interface SystemOverlap {
  functionId: string;
  functionName: string;
  systems: { id: string; name: string; type: string }[];
  overlapType: string;
}

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  crm: 'CRM',
  finance: 'finance',
  hr: 'HR',
  case_management: 'case management',
  website: 'website',
  email: 'email',
  document_management: 'document management',
  database: 'database',
  spreadsheet: 'spreadsheet',
  messaging: 'messaging',
  custom: 'custom',
  other: 'other',
};

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

export function calculateCostSummary(
  systems: System[],
  functions: OrgFunction[],
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

  return {
    totalAnnual,
    totalMonthly: Math.round((totalAnnual / 12) * 100) / 100,
    systemCount: withCost.length,
    uncostCount: withoutCost.length,
    byFunction,
    mostExpensive,
    freeCount,
  };
}

export function findSystemOverlaps(
  systems: System[],
  functions: OrgFunction[],
): SystemOverlap[] {
  const overlaps: SystemOverlap[] = [];

  for (const fn of functions) {
    const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
    // Group by system type
    const byType = new Map<string, System[]>();
    for (const sys of fnSystems) {
      const existing = byType.get(sys.type) ?? [];
      existing.push(sys);
      byType.set(sys.type, existing);
    }

    for (const [type, typeSystems] of byType) {
      if (typeSystems.length >= 2 && type !== 'other' && type !== 'custom') {
        const label = SYSTEM_TYPE_LABELS[type] ?? type;
        overlaps.push({
          functionId: fn.id,
          functionName: fn.name,
          systems: typeSystems.map((s) => ({ id: s.id, name: s.name, type: s.type })),
          overlapType: `${typeSystems.length} ${label} systems`,
        });
      }
    }
  }

  // Sort by number of duplicate systems descending
  overlaps.sort((a, b) => b.systems.length - a.systems.length);

  return overlaps;
}

export function formatCurrency(amount: number): string {
  return `\u00A3${amount.toLocaleString('en-GB')}`;
}
