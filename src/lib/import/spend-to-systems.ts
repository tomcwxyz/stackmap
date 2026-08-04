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
 * Turn confirmed spend into systems on the map.
 *
 * Cost here comes from what the organisation actually paid, so it replaces an
 * estimate where one was guessed — but never a figure the user typed in
 * themselves, which they had a reason for.
 */
export function addSpendToArchitecture(
  matches: SpendMatch[],
  existing: Architecture,
): SpendImportResult {
  const systems = existing.systems.map((s) => ({ ...s }));
  const byName = new Map(systems.map((s) => [matchKey(s.name), s]));

  let added = 0;
  let updated = 0;

  for (const match of matches) {
    const name = match.tool?.name ?? match.payee;
    const key = matchKey(name);
    const cost: System['cost'] = {
      amount: match.estimatedAnnualCost,
      period: 'annual',
      model: 'subscription',
    };

    const current = byName.get(key);

    if (current) {
      // A cost the user entered by hand outranks anything derived here
      if (!current.cost || current.cost.model === 'unknown') {
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
