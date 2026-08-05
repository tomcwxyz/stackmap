import { v4 as uuidv4 } from 'uuid';
import type {
  Architecture,
  OrgFunction,
  StandardFunction,
  System,
  SystemType,
} from '@/lib/types';
import { suggestFunction, standardFunctionName } from './suggest-function';
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
  /** Functions that had to be created to hold the imported systems. */
  functionsCreated: string[];
}

/**
 * Which part of the organisation each imported system belongs to, keyed by the
 * payee text as it appeared in the file.
 *
 * `'none'` means the user chose to leave it unattached. A payee that is absent
 * falls back to whatever the suggestion is.
 */
export type FunctionAssignments = Record<string, StandardFunction | 'none'>;

/**
 * Find the function to hang a system on, creating it if the map has none.
 *
 * A map built by importing spend before touching the wizard has no functions
 * at all, so refusing to create them would leave every imported system in the
 * same "Other systems" bucket this is meant to empty. Creating one is visible
 * in the preview and undone by unpicking it there.
 */
function resolveFunction(
  type: StandardFunction,
  functions: OrgFunction[],
  created: string[],
): string {
  const existing = functions.find((fn) => fn.type === type);
  if (existing) return existing.id;

  const fn: OrgFunction = {
    id: uuidv4(),
    name: standardFunctionName(type),
    type,
    isActive: true,
  };
  functions.push(fn);
  created.push(fn.name);
  return fn.id;
}

/**
 * The function a match should be filed under, honouring the user's choice.
 *
 * Returns undefined when there is nothing sensible to suggest, or the user
 * asked for it to be left unattached.
 */
function functionIdFor(
  match: SpendMatch,
  type: SystemType,
  functions: OrgFunction[],
  created: string[],
  assignments: FunctionAssignments,
): string | undefined {
  const chosen = assignments[match.originalPayee];
  if (chosen === 'none') return undefined;

  const target = chosen ?? suggestFunction(match.tool?.name ?? match.payee, type).suggested;
  if (!target) return undefined;

  return resolveFunction(target, functions, created);
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
  assignments: FunctionAssignments = {},
): SpendImportResult {
  const systems = existing.systems.map((s) => ({ ...s }));
  const functions = existing.functions.map((f) => ({ ...f }));
  const byName = new Map(systems.map((s) => [matchKey(s.name), s]));

  let added = 0;
  let updated = 0;
  const functionsCreated: string[] = [];

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
      // An existing system already sits somewhere; only fill in a blank
      if (current.functionIds.length === 0) {
        const functionId = functionIdFor(
          match,
          current.type,
          functions,
          functionsCreated,
          assignments,
        );
        if (functionId) current.functionIds = [functionId];
      }
      current.vendor ??= match.tool?.provider;
      current.techFreedomScore ??= match.tool
        ? { ...match.tool.score, isAutoScored: true }
        : undefined;
      updated++;
      continue;
    }

    const type = typeFor(match);
    const functionId = functionIdFor(match, type, functions, functionsCreated, assignments);

    const system: System = {
      id: uuidv4(),
      name,
      type,
      vendor: match.tool?.provider,
      hosting: match.tool ? 'cloud' : 'unknown',
      status: 'active',
      functionIds: functionId ? [functionId] : [],
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
      functions,
      systems,
    },
    added,
    updated,
    functionsCreated,
  };
}
