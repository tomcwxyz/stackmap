import type { OrgFunction, System } from '@/lib/types';
import { annualiseCost } from '@/lib/cost-analysis';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';

const SYSTEM_TYPE_LABELS: Record<string, string> = {
  crm: 'CRM',
  finance: 'Finance',
  hr: 'HR',
  case_management: 'Case management',
  website: 'Website',
  email: 'Email',
  document_management: 'Document management',
  database: 'Database',
  spreadsheet: 'Spreadsheet',
  messaging: 'Messaging',
};

export interface DuplicateSystem {
  id: string;
  name: string;
  annualCost: number;
  isShadow: boolean;
}

export interface DuplicationGroup {
  /** Stable key for rendering — the category these systems share. */
  key: string;
  label: string;
  systems: DuplicateSystem[];
  /** Areas of the organisation these systems sit under. */
  functionNames: string[];
  combinedAnnualCost: number;
  /**
   * Everything but the cheapest option, as a rough ceiling on what consolidating
   * onto one tool could free up. Deliberately crude — it ignores migration cost
   * and whether the tools are really interchangeable.
   */
  potentialSaving: number;
}

/**
 * What kind of thing a system is, for the purpose of spotting duplication.
 *
 * The user's own system type comes first: they chose it, and it tracks what the
 * tool is used for here rather than what it is in general. The known tools
 * database splits along different lines — Slack is filed under Communication and
 * WhatsApp under Messaging, though a small charity would happily swap one for
 * the other — so its category is only used to rescue systems typed "other" or
 * "custom", where there is nothing else to go on.
 */
function categoryOf(system: System): string | null {
  const byType = SYSTEM_TYPE_LABELS[system.type];
  if (byType) return byType;

  return findMatchingTool(system.name, KNOWN_TOOLS)?.category ?? null;
}

/**
 * Systems that appear to do the same job as each other.
 *
 * Compared across the whole map rather than one function at a time: two CRMs in
 * different departments is the more common and more expensive case, and it was
 * invisible when each function was examined on its own.
 */
export function findDuplication(
  systems: System[],
  functions: OrgFunction[],
): DuplicationGroup[] {
  const functionName = new Map(functions.map((fn) => [fn.id, fn.name]));

  // Systems on the way out are already being dealt with
  const candidates = systems.filter((s) => s.status !== 'retiring');

  const groups = new Map<string, { systems: System[] }>();
  for (const system of candidates) {
    const category = categoryOf(system);
    if (!category) continue;

    const group = groups.get(category) ?? { systems: [] };
    group.systems.push(system);
    groups.set(category, group);
  }

  const result: DuplicationGroup[] = [];

  for (const [category, group] of groups) {
    if (group.systems.length < 2) continue;

    const costs = group.systems.map(annualiseCost);
    const combinedAnnualCost = costs.reduce((sum, c) => sum + c, 0);
    const cheapest = Math.min(...costs);

    const names = new Set<string>();
    for (const system of group.systems) {
      for (const fnId of system.functionIds) {
        const name = functionName.get(fnId);
        if (name) names.add(name);
      }
    }

    result.push({
      key: category,
      label: category,
      systems: group.systems.map((s) => ({
        id: s.id,
        name: s.name,
        annualCost: annualiseCost(s),
        isShadow: s.isShadow === true,
      })),
      functionNames: [...names],
      combinedAnnualCost,
      potentialSaving: combinedAnnualCost - cheapest,
    });
  }

  // Biggest opportunity first; where nothing is costed, the widest spread
  result.sort(
    (a, b) =>
      b.potentialSaving - a.potentialSaving ||
      b.systems.length - a.systems.length ||
      a.label.localeCompare(b.label),
  );

  return result;
}
