import { v4 as uuidv4 } from 'uuid';
import type { Architecture, System, OrgFunction, StandardFunction } from '@/lib/types';
import type { CsvSystemRow } from './parse-csv';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';

const FUNCTION_NAMES: Record<string, string> = {
  finance: 'Finance',
  governance: 'Governance',
  people: 'People',
  fundraising: 'Fundraising',
  communications: 'Communications',
  service_delivery: 'Service delivery',
  operations: 'Operations',
  data_reporting: 'Data & reporting',
};

export function csvRowsToArchitecture(
  rows: CsvSystemRow[],
  orgName: string,
  orgType: string,
): Architecture {
  const now = new Date().toISOString();

  // 1. Deduplicate functions — one per unique StandardFunction
  const functionMap = new Map<StandardFunction, OrgFunction>();

  for (const row of rows) {
    if (row.matchedFunction && !functionMap.has(row.matchedFunction)) {
      functionMap.set(row.matchedFunction, {
        id: uuidv4(),
        name: FUNCTION_NAMES[row.matchedFunction] ?? row.matchedFunction,
        type: row.matchedFunction,
        isActive: true,
      });
    }
  }

  // 2. Create systems from rows
  const systems: System[] = rows.map((row) => {
    const fnId = row.matchedFunction
      ? functionMap.get(row.matchedFunction)?.id
      : undefined;
    const matchedTool = findMatchingTool(row.name, KNOWN_TOOLS);

    const system: System = {
      id: uuidv4(),
      name: row.name,
      type: row.matchedType,
      vendor: row.vendor,
      hosting: (row.hosting as System['hosting']) ?? 'unknown',
      status: (row.status as System['status']) ?? 'active',
      functionIds: fnId ? [fnId] : [],
      serviceIds: [],
      cost: row.cost
        ? {
            amount: row.cost,
            period: (row.costPeriod === 'monthly' ? 'monthly' : 'annual') as
              | 'monthly'
              | 'annual',
            model: 'subscription' as const,
          }
        : undefined,
      techFreedomScore: matchedTool?.score
        ? { ...matchedTool.score, isAutoScored: true }
        : undefined,
    };

    return system;
  });

  // 3. Build Architecture
  return {
    organisation: {
      id: uuidv4(),
      name: orgName,
      type: orgType as Architecture['organisation']['type'],
      createdAt: now,
      updatedAt: now,
    },
    functions: Array.from(functionMap.values()),
    services: [],
    systems,
    dataCategories: [],
    integrations: [],
    owners: [],
    metadata: {
      version: SCHEMA_VERSION,
      exportedAt: now,
      stackmapVersion: STACKMAP_VERSION,
      mappingPath: 'function_first' as const,
    },
  };
}

export function mergeCsvIntoArchitecture(
  rows: CsvSystemRow[],
  existing: Architecture,
): Architecture {
  const now = new Date().toISOString();

  // Build map of existing functions by type for reuse
  const functionIdByType = new Map<string, string>();
  for (const fn of existing.functions) {
    functionIdByType.set(fn.type, fn.id);
  }

  // Find new functions needed
  const newFunctions: OrgFunction[] = [];
  for (const row of rows) {
    if (row.matchedFunction && !functionIdByType.has(row.matchedFunction)) {
      const fn: OrgFunction = {
        id: uuidv4(),
        name: FUNCTION_NAMES[row.matchedFunction] ?? row.matchedFunction,
        type: row.matchedFunction,
        isActive: true,
      };
      newFunctions.push(fn);
      functionIdByType.set(row.matchedFunction, fn.id);
    }
  }

  // Create new systems
  const newSystems: System[] = rows.map((row) => {
    const fnId = row.matchedFunction
      ? functionIdByType.get(row.matchedFunction)
      : undefined;
    const matchedTool = findMatchingTool(row.name, KNOWN_TOOLS);

    return {
      id: uuidv4(),
      name: row.name,
      type: row.matchedType,
      vendor: row.vendor,
      hosting: (row.hosting as System['hosting']) ?? 'unknown',
      status: (row.status as System['status']) ?? 'active',
      functionIds: fnId ? [fnId] : [],
      serviceIds: [],
      cost: row.cost
        ? {
            amount: row.cost,
            period: (row.costPeriod === 'monthly' ? 'monthly' : 'annual') as
              | 'monthly'
              | 'annual',
            model: 'subscription' as const,
          }
        : undefined,
      techFreedomScore: matchedTool?.score
        ? { ...matchedTool.score, isAutoScored: true }
        : undefined,
    };
  });

  return {
    ...existing,
    organisation: { ...existing.organisation, updatedAt: now },
    functions: [...existing.functions, ...newFunctions],
    systems: [...existing.systems, ...newSystems],
  };
}
