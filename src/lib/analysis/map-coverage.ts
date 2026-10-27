import type { Architecture, System } from '@/lib/types';

export interface CoverageCheck {
  id: string;
  label: string;
  recorded: number;
  total: number;
  examples: string[];
  /** Destination for reviewing missing details. */
  href: string;
}

export interface MapCoverage {
  checks: CoverageCheck[];
  recorded: number;
  total: number;
  missing: number;
}

/**
 * Measures how much of the map has been described, NOT whether the information
 * is correct, independently verified, or safe.
 *
 * Only include checks with something to inspect. Planned and retiring systems
 * do not count as current operational dependencies.
 */
export function assessMapCoverage(arch: Architecture): MapCoverage {
  const systems = arch.systems.filter(
    (system) => system.status !== 'planned' && system.status !== 'retiring',
  );
  const ownerIds = new Set(arch.owners.map((owner) => owner.id));
  const functionIds = new Set(arch.functions.map((fn) => fn.id));
  const systemIds = new Set(arch.systems.map((system) => system.id));
  const checks: CoverageCheck[] = [];

  function addSystemCheck(
    id: string,
    label: string,
    predicate: (system: System) => boolean,
  ) {
    if (systems.length === 0) return;
    const missingSystems = systems.filter((system) => !predicate(system));
    checks.push({
      id,
      label,
      recorded: systems.length - missingSystems.length,
      total: systems.length,
      examples: missingSystems.slice(0, 3).map((system) => system.name),
      href: '/view/systems',
    });
  }

  addSystemCheck('owner', 'Named responsibility',
    (system) => Boolean(system.ownerId && ownerIds.has(system.ownerId)));
  addSystemCheck('importance', 'Importance described',
    (system) => system.importance !== undefined);
  addSystemCheck('cost', 'Actual cost recorded',
    (system) => Boolean(system.cost && system.cost.source !== 'estimate'));
  addSystemCheck('hosting', 'Hosting identified',
    (system) => system.hosting !== 'unknown');
  addSystemCheck('function', 'Linked to an organisational function',
    (system) => system.functionIds.some((id) => functionIds.has(id)));

  if (arch.metadata.techFreedomEnabled) {
    addSystemCheck('risk', 'Risk score present',
      (system) => system.techFreedomScore !== undefined);
  }

  if (arch.integrations.length > 0) {
    const unknown = arch.integrations.filter(
      (connection) => connection.reliability === 'unknown' ||
        !systemIds.has(connection.sourceSystemId) ||
        !systemIds.has(connection.targetSystemId),
    );
    checks.push({
      id: 'connections',
      label: 'Connection reliability described',
      recorded: arch.integrations.length - unknown.length,
      total: arch.integrations.length,
      examples: unknown.slice(0, 3).map((connection) => {
        const from = arch.systems.find((s) => s.id === connection.sourceSystemId)?.name ?? 'Unknown system';
        const to = arch.systems.find((s) => s.id === connection.targetSystemId)?.name ?? 'Unknown system';
        return from + ' to ' + to;
      }),
      href: '/wizard/' + (arch.metadata.mappingPath === 'service_first' ? 'services' : 'functions') + '/integrations',
    });
  }

  const personal = arch.dataCategories.filter((category) => category.containsPersonalData);
  if (personal.length > 0) {
    const incomplete = personal.filter((category) =>
      !category.subjects?.trim() ||
      !category.retention?.trim() ||
      !category.lawfulBasis ||
      !category.systemIds.some((id) => systemIds.has(id)),
    );
    checks.push({
      id: 'personal-data',
      label: 'Personal data descriptions',
      recorded: personal.length - incomplete.length,
      total: personal.length,
      examples: incomplete.slice(0, 3).map((category) => category.name),
      href: '/wizard/' + (arch.metadata.mappingPath === 'service_first' ? 'services' : 'functions') + '/data',
    });
  }

  const recorded = checks.reduce((total, check) => total + check.recorded, 0);
  const total = checks.reduce((sum, check) => sum + check.total, 0);
  return { checks, recorded, total, missing: total - recorded };
}
