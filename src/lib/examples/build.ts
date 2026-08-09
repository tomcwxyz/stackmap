import type { Architecture, StandardFunction, System, SystemType } from '@/lib/types';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';

/**
 * Helpers for writing example maps as data rather than as long literals.
 *
 * Ids are readable strings rather than uuids: an example is authored by hand
 * and read by hand, and "sys-lamplight" in a diagram is easier to follow than
 * a random hex string. They only have to be unique within one map.
 */

/** A date relative to today, so an example never reads as out of date. */
export function inDays(days: number, now: Date = new Date()): string {
  const date = new Date(now.getTime());
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/**
 * Vendor and risk scores taken from the tools database.
 *
 * Authoring them by hand would mean two sources of truth for the same tool,
 * and the example would quietly disagree with what a real map shows for it.
 */
export function fromKnownTool(name: string): Pick<System, 'vendor' | 'techFreedomScore'> {
  const tool = KNOWN_TOOLS.find((t) => t.name === name);
  if (!tool) return {};
  return {
    vendor: tool.provider,
    techFreedomScore: { ...tool.score, isAutoScored: true },
  };
}

export interface SystemSpec {
  id: string;
  name: string;
  type: SystemType;
  functions: string[];
  hosting?: System['hosting'];
  status?: System['status'];
  owner?: string;
  importance?: number;
  annualCost?: number;
  seats?: number;
  renewalDate?: string;
  noticePeriodDays?: number;
  notes?: string;
  url?: string;
  isShadow?: boolean;
  services?: string[];
}

export function buildSystem(spec: SystemSpec): System {
  return {
    id: spec.id,
    name: spec.name,
    type: spec.type,
    hosting: spec.hosting ?? 'cloud',
    status: spec.status ?? 'active',
    functionIds: spec.functions,
    serviceIds: spec.services ?? [],
    ownerId: spec.owner,
    importance: spec.importance,
    notes: spec.notes,
    url: spec.url,
    isShadow: spec.isShadow,
    seats: spec.seats,
    renewalDate: spec.renewalDate,
    noticePeriodDays: spec.noticePeriodDays,
    cost:
      spec.annualCost === undefined
        ? undefined
        : {
            amount: spec.annualCost,
            period: 'annual',
            model: spec.annualCost === 0 ? 'free' : 'subscription',
            // An example stands in for a map somebody filled in themselves
            source: 'user',
          },
    ...fromKnownTool(spec.name),
  };
}

export function standardFunction(type: StandardFunction, name: string, description: string) {
  return { id: `fn-${type}`, name, type, description, isActive: true } as const;
}

export function customFunction(id: string, name: string, description: string) {
  return { id, name, type: 'custom' as const, description, isActive: true };
}

/** The wrapper every example shares, so each file is only its own content. */
export function architecture(
  parts: Omit<Architecture, 'metadata'> & { metadata?: Partial<Architecture['metadata']> },
): Architecture {
  const now = new Date().toISOString();
  return {
    ...parts,
    organisation: { ...parts.organisation, createdAt: now, updatedAt: now },
    metadata: {
      version: SCHEMA_VERSION,
      exportedAt: now,
      stackmapVersion: STACKMAP_VERSION,
      mappingPath: 'function_first',
      techFreedomEnabled: true,
      ...parts.metadata,
    },
  };
}
