import { v4 as uuidv4 } from 'uuid';
import type { Architecture, System, SystemType } from '@/lib/types';
import type { SpendMatch } from './parse-spend';

/** Known tool categories mapped onto the system types the wizard uses. */
const CATEGORY_TO_TYPE: Record<string, SystemType> = {
  CRM: 'crm',
  Finance: 'finance',
  Payment: 'finance',
  Email: 'email',
  Marketing: 'email',
  Messaging: 'messaging',
  Communication: 'messaging',
  Storage: 'document_management',
  Productivity: 'document_management',
  CMS: 'website',
  Hosting: 'website',
  Database: 'database',
  'Data Visualisation': 'database',
  'Project Management': 'database',
};

function typeFor(match: SpendMatch): SystemType {
  if (!match.tool) return 'other';
  return CATEGORY_TO_TYPE[match.tool.category] ?? 'other';
}

/** Systems are matched by name, ignoring case and surrounding whitespace. */
function matchKey(name: string): string {
  return name.trim().toLowerCase();
}

export interface SpendImportResult {
  architecture: Architecture;
  added: number;
  updated: number;
}

/**
 * Combine payee groups that name the same tool.
 *
 * `GOOGLE` and `GOOGLE *GSUITE` clean to different payees but resolve to the
 * same known tool, and they are two streams of payments for one subscription.
 * Left separate, the first would create the system and the second would find
 * it already there, so half the money would go missing.
 */
function consolidate(matches: SpendMatch[]): SpendMatch[] {
  const byTarget = new Map<string, SpendMatch>();

  for (const match of matches) {
    const key = matchKey(match.tool?.name ?? match.payee);
    const current = byTarget.get(key);

    if (!current) {
      byTarget.set(key, { ...match });
      continue;
    }

    byTarget.set(key, {
      ...current,
      estimatedAnnualCost: current.estimatedAnnualCost + match.estimatedAnnualCost,
      totalAmount: current.totalAmount + match.totalAmount,
      transactions: current.transactions + match.transactions,
      // Both descriptors are worth keeping: the note is how a user works out
      // which line on their statement a system came from.
      originalPayee: `${current.originalPayee}, ${match.originalPayee}`,
    });
  }

  return [...byTarget.values()];
}

/**
 * Turn confirmed spend into systems on the map.
 *
 * Cost here comes from what the organisation actually paid, so it replaces a
 * figure Stackmap guessed and refreshes one an earlier import wrote — but
 * never one the user typed in themselves, which they had a reason for.
 */
export function addSpendToArchitecture(
  matches: SpendMatch[],
  existing: Architecture,
): SpendImportResult {
  const systems = existing.systems.map((s) => ({ ...s }));
  const byName = new Map(systems.map((s) => [matchKey(s.name), s]));

  let added = 0;
  let updated = 0;

  for (const match of consolidate(matches)) {
    const name = match.tool?.name ?? match.payee;
    const key = matchKey(name);
    const cost: System['cost'] = {
      amount: match.estimatedAnnualCost,
      period: 'annual',
      model: 'subscription',
      source: 'spend',
    };

    const current = byName.get(key);

    if (current) {
      // Only a figure a person entered outranks real money leaving the bank.
      // A cost with no recorded source predates provenance being tracked and
      // is left alone: a stale estimate is better than a destroyed decision.
      if (!current.cost || current.cost.source === 'estimate' || current.cost.source === 'spend') {
        current.cost = cost;
      }
      current.vendor ??= match.tool?.provider;
      current.techFreedomScore ??= match.tool
        ? { ...match.tool.score, isAutoScored: true }
        : undefined;
      updated++;
      continue;
    }

    const system: System = {
      id: uuidv4(),
      name,
      type: typeFor(match),
      vendor: match.tool?.provider,
      hosting: match.tool ? 'cloud' : 'unknown',
      status: 'active',
      functionIds: [],
      serviceIds: [],
      cost,
      notes: `Found in spend: ${match.transactions} payment${match.transactions === 1 ? '' : 's'} to "${match.originalPayee}".`,
      techFreedomScore: match.tool
        ? { ...match.tool.score, isAutoScored: true }
        : undefined,
    };

    systems.push(system);
    byName.set(key, system);
    added++;
  }

  return {
    architecture: {
      ...existing,
      organisation: { ...existing.organisation, updatedAt: new Date().toISOString() },
      systems,
    },
    added,
    updated,
  };
}
