import { v4 as uuidv4 } from 'uuid';
import type { Architecture, OrgFunction, StandardFunction, System } from '@/lib/types';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { suggestFunction, standardFunctionName } from '@/lib/import/suggest-function';
import { CATEGORY_TO_SYSTEM_TYPE } from '@/lib/import/category-to-system-type';

/** Deliberately not a confidence score: a match is still only a catalogue match. */
export interface QuickAddCandidate {
  key: string;
  input: string;
  name: string;
  recognised: boolean;
  provider?: string;
  category?: string;
  suggestedFunction?: StandardFunction;
  alreadyPresent: boolean;
}

export type QuickAddAssignments = Record<string, StandardFunction | 'none'>;

function normalise(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-GB');
}

/**
 * One tool per line (commas and semicolons also work).
 * Canonicalise recognised aliases so Office 365 / Microsoft 365 cannot be
 * inserted twice. Never treat an unknown name as a provider fact.
 */
export function previewQuickAdd(input: string, arch: Architecture): QuickAddCandidate[] {
  const existing = new Set(arch.systems.map((system) => {
    const known = findMatchingTool(system.name, KNOWN_TOOLS);
    return normalise(known?.name ?? system.name);
  }));
  const seen = new Set<string>();
  const result: QuickAddCandidate[] = [];

  for (const item of input.split(/[\n,;]+/)) {
    const inputName = item.trim().replace(/\s+/g, ' ');
    if (!inputName) continue;
    const known = findMatchingTool(inputName, KNOWN_TOOLS);
    const name = known?.name ?? inputName;
    const key = normalise(name);
    if (seen.has(key)) continue;
    seen.add(key);
    const type = known ? CATEGORY_TO_SYSTEM_TYPE[known.category] ?? 'other' : 'other';
    result.push({
      key,
      input: inputName,
      name,
      recognised: Boolean(known),
      provider: known?.provider,
      category: known?.category,
      suggestedFunction: suggestFunction(name, type, known?.category).suggested,
      alreadyPresent: existing.has(key),
    });
  }
  return result;
}

export interface QuickAddResult {
  architecture: Architecture;
  added: number;
  functionsCreated: number;
}

/**
 * Adds only confirmed preview rows. Blank cost, unknown hosting and absent
 * importance are intentional: the catalogue cannot know those local facts.
 */
export function addQuickSystems(
  arch: Architecture,
  candidates: QuickAddCandidate[],
  assignments: QuickAddAssignments = {},
): QuickAddResult {
  const systems: System[] = [...arch.systems];
  const functions: OrgFunction[] = [...arch.functions];
  const seen = new Set(systems.map((system) =>
    normalise(findMatchingTool(system.name, KNOWN_TOOLS)?.name ?? system.name)));
  let added = 0;
  let functionsCreated = 0;

  for (const candidate of candidates) {
    const known = findMatchingTool(candidate.name, KNOWN_TOOLS);
    const name = known?.name ?? candidate.name.trim();
    const key = normalise(name);
    if (!name || seen.has(key)) continue;
    seen.add(key);

    const chosen = assignments[candidate.key] ?? candidate.suggestedFunction ?? 'none';
    let functionId: string | undefined;
    if (chosen !== 'none') {
      let fn = functions.find((item) => item.type === chosen);
      if (!fn) {
        fn = { id: uuidv4(), name: standardFunctionName(chosen), type: chosen, isActive: true };
        functions.push(fn);
        functionsCreated++;
      }
      functionId = fn.id;
    }

    systems.push({
      id: uuidv4(),
      name,
      type: known ? CATEGORY_TO_SYSTEM_TYPE[known.category] ?? 'other' : 'other',
      vendor: known?.provider,
      hosting: 'unknown',
      status: 'active',
      functionIds: functionId ? [functionId] : [],
      serviceIds: [],
      techFreedomScore: known ? { ...known.score, isAutoScored: true } : undefined,
    });
    added++;
  }

  return {
    architecture: {
      ...arch,
      organisation: {
        ...arch.organisation,
        updatedAt: added > 0 ? new Date().toISOString() : arch.organisation.updatedAt,
      },
      systems,
      functions,
    },
    added,
    functionsCreated,
  };
}
