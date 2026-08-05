import { v4 as uuidv4 } from 'uuid';
import {
  StoredArchitectureSchema,
  OrgFunctionSchema,
  ServiceSchema,
  SystemSchema,
  DataCategorySchema,
  IntegrationSchema,
  OwnerSchema,
  ExternalPartySchema,
  DataFlowSchema,
} from '@/lib/schema';
import type { Architecture } from '@/lib/types';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';
import type { z } from 'zod';

export interface MigrationResult {
  /** The usable architecture, or null when the document is beyond repair. */
  architecture: Architecture | null;
  /** How many individual entities had to be discarded to get there. */
  droppedCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function isCalendarDate(value: unknown): boolean {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

/**
 * Validate each entity in a collection, keeping the ones that parse.
 *
 * A single malformed system should cost the user that system, not the whole
 * map, so damaged entries are counted and dropped rather than failing the
 * document.
 */
function keepValid<S extends z.ZodType>(
  items: unknown[],
  schema: S,
): { kept: unknown[]; dropped: number } {
  const kept: unknown[] = [];
  let dropped = 0;

  for (const item of items) {
    if (schema.safeParse(item).success) {
      kept.push(item);
    } else {
      dropped++;
    }
  }

  return { kept, dropped };
}

/**
 * Bring a stored document up to the current Architecture shape.
 *
 * Handles the two things that go wrong with browser-persisted data: documents
 * written by an earlier version that predate a field, and documents that have
 * been truncated or hand-edited into an invalid state. Fields added since the
 * document was written are defaulted; entities that cannot be repaired are
 * dropped and counted so the caller can tell the user.
 */
export function migrateArchitecture(raw: unknown): MigrationResult {
  if (!isRecord(raw) || !isRecord(raw.organisation)) {
    return { architecture: null, droppedCount: 0 };
  }

  const now = new Date().toISOString();
  const org = raw.organisation;
  const metadata = isRecord(raw.metadata) ? raw.metadata : {};

  const functions = keepValid(
    asArray(raw.functions)
      .filter(isRecord)
      .map((fn) => ({ ...fn, isActive: fn.isActive !== false })),
    OrgFunctionSchema,
  );

  const services = keepValid(
    asArray(raw.services)
      .filter(isRecord)
      .map((svc) => ({
        ...svc,
        status: svc.status ?? 'active',
        functionIds: asArray(svc.functionIds),
        systemIds: asArray(svc.systemIds),
      })),
    ServiceSchema,
  );

  const systems = keepValid(
    asArray(raw.systems)
      .filter(isRecord)
      .map((sys) => ({
        ...sys,
        hosting: sys.hosting ?? 'unknown',
        status: sys.status ?? 'active',
        functionIds: asArray(sys.functionIds),
        serviceIds: asArray(sys.serviceIds),
        // A date nothing can read costs the user the field, not the system
        renewalDate: isCalendarDate(sys.renewalDate) ? sys.renewalDate : undefined,
      })),
    SystemSchema,
  );

  const dataCategories = keepValid(
    asArray(raw.dataCategories)
      .filter(isRecord)
      .map((dc) => ({
        ...dc,
        sensitivity: dc.sensitivity ?? 'internal',
        containsPersonalData: dc.containsPersonalData === true,
        systemIds: asArray(dc.systemIds),
      })),
    DataCategorySchema,
  );

  const integrations = keepValid(
    asArray(raw.integrations)
      .filter(isRecord)
      .map((intg) => ({
        ...intg,
        type: intg.type ?? 'unknown',
        direction: intg.direction ?? 'one_way',
        frequency: intg.frequency ?? 'unknown',
        reliability: intg.reliability ?? 'unknown',
      })),
    IntegrationSchema,
  );

  const owners = keepValid(
    asArray(raw.owners)
      .filter(isRecord)
      .map((owner) => ({ ...owner, isExternal: owner.isExternal === true })),
    OwnerSchema,
  );

  const externalParties = keepValid(
    asArray(raw.externalParties)
      .filter(isRecord)
      .map((party) => ({ ...party, type: party.type ?? 'other' })),
    ExternalPartySchema,
  );

  const dataFlows = keepValid(
    asArray(raw.dataFlows)
      .filter(isRecord)
      .map((flow) => ({
        ...flow,
        dataCategoryIds: asArray(flow.dataCategoryIds),
        method: flow.method ?? 'unknown',
        frequency: flow.frequency ?? 'unknown',
      })),
    DataFlowSchema,
  );

  const droppedCount =
    functions.dropped +
    services.dropped +
    systems.dropped +
    dataCategories.dropped +
    integrations.dropped +
    owners.dropped +
    externalParties.dropped +
    dataFlows.dropped +
    // Entries that were not objects at all never reached keepValid
    countNonRecords(raw);

  const candidate = {
    organisation: {
      ...org,
      id: asString(org.id, uuidv4()),
      name: typeof org.name === 'string' ? org.name : '',
      type: org.type ?? 'other',
      createdAt: asString(org.createdAt, now),
      updatedAt: asString(org.updatedAt, now),
    },
    functions: functions.kept,
    services: services.kept,
    systems: systems.kept,
    dataCategories: dataCategories.kept,
    integrations: integrations.kept,
    owners: owners.kept,
    externalParties: externalParties.kept,
    dataFlows: dataFlows.kept,
    metadata: {
      ...metadata,
      version: asString(metadata.version, SCHEMA_VERSION),
      exportedAt: asString(metadata.exportedAt, now),
      stackmapVersion: asString(metadata.stackmapVersion, STACKMAP_VERSION),
      mappingPath:
        metadata.mappingPath === 'service_first' ? 'service_first' : 'function_first',
      techFreedomEnabled: metadata.techFreedomEnabled === true,
    },
  };

  const result = StoredArchitectureSchema.safeParse(candidate);
  if (!result.success) {
    return { architecture: null, droppedCount };
  }

  return { architecture: result.data as Architecture, droppedCount };
}

const COLLECTION_KEYS = [
  'functions',
  'services',
  'systems',
  'dataCategories',
  'integrations',
  'owners',
  'externalParties',
  'dataFlows',
] as const;

/** Count collection entries that were not objects, since those are dropped too. */
function countNonRecords(raw: Record<string, unknown>): number {
  let count = 0;
  for (const key of COLLECTION_KEYS) {
    for (const item of asArray(raw[key])) {
      if (!isRecord(item)) count++;
    }
  }
  return count;
}
