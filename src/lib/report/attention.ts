import type { Architecture, System } from '@/lib/types';
import { getImportanceTier } from '@/lib/importance';
import { findRenewals } from '@/lib/analysis/renewals';

export type AttentionSeverity = 'high' | 'medium';

export interface AttentionPoint {
  /** Stable key for rendering and testing. */
  id: string;
  severity: AttentionSeverity;
  /** What was found, in one line a trustee would understand. */
  title: string;
  /** The systems or connections it concerns. */
  detail: string;
}

/** Systems the organisation would struggle without. */
function isCore(system: System): boolean {
  return getImportanceTier(system.importance)?.tier === 'core';
}

function list(names: string[]): string {
  return names.join(', ');
}

/**
 * The handful of things worth raising when this map is shown to a board.
 *
 * Everything here is read straight from what the user already entered — no
 * scoring, no thresholds beyond the importance tiers the app already defines.
 * The point is to save someone re-reading the whole map to find them.
 */
export function findAttentionPoints(arch: Architecture): AttentionPoint[] {
  const points: AttentionPoint[] = [];
  const { systems, integrations, dataCategories, functions } = arch;
  const active = systems.filter((s) => s.status !== 'retiring');

  // Critical systems nobody is responsible for
  const coreUnowned = active.filter((s) => isCore(s) && !s.ownerId);
  if (coreUnowned.length > 0) {
    points.push({
      id: 'core-unowned',
      severity: 'high',
      title: `${coreUnowned.length === 1 ? 'A critical system has' : `${coreUnowned.length} critical systems have`} no named owner`,
      detail: list(coreUnowned.map((s) => s.name)),
    });
  }

  // Critical work happening on tools that were never formally adopted
  const coreShadow = systems.filter((s) => isCore(s) && s.isShadow);
  if (coreShadow.length > 0) {
    points.push({
      id: 'core-shadow',
      severity: 'high',
      title: `${coreShadow.length === 1 ? 'A critical tool is' : `${coreShadow.length} critical tools are`} informal or unofficial`,
      detail: list(coreShadow.map((s) => s.name)),
    });
  }

  // Connections the user told us break
  const fragile = integrations.filter((i) => i.reliability === 'fragile');
  if (fragile.length > 0) {
    const described = fragile.map((i) => {
      const source = systems.find((s) => s.id === i.sourceSystemId)?.name ?? 'Unknown';
      const target = systems.find((s) => s.id === i.targetSystemId)?.name ?? 'Unknown';
      return `${source} → ${target}`;
    });
    points.push({
      id: 'fragile-integrations',
      severity: 'high',
      title: `${fragile.length === 1 ? 'A connection is' : `${fragile.length} connections are`} fragile`,
      detail: list(described),
    });
  }

  // Functions resting on a single system
  const singleSystemFunctions = functions.filter((fn) => {
    const count = active.filter((s) => s.functionIds.includes(fn.id) && !s.isShadow).length;
    return count === 1;
  });
  if (singleSystemFunctions.length > 0) {
    points.push({
      id: 'single-system-functions',
      severity: 'medium',
      title: `${singleSystemFunctions.length === 1 ? 'One area depends' : `${singleSystemFunctions.length} areas depend`} on a single system`,
      detail: list(singleSystemFunctions.map((fn) => fn.name)),
    });
  }

  // Personal data sitting on systems nobody owns
  const personalDataSystemIds = new Set(
    dataCategories.filter((dc) => dc.containsPersonalData).flatMap((dc) => dc.systemIds),
  );
  const personalUnowned = active.filter(
    (s) => personalDataSystemIds.has(s.id) && !s.ownerId,
  );
  if (personalUnowned.length > 0) {
    points.push({
      id: 'personal-data-unowned',
      severity: 'high',
      title: `${personalUnowned.length === 1 ? 'A system holding personal data has' : `${personalUnowned.length} systems holding personal data have`} no named owner`,
      detail: list(personalUnowned.map((s) => s.name)),
    });
  }

  // Contracts that auto-renew before anyone can act
  const { upcoming } = findRenewals(systems);
  const missedNotice = upcoming.filter((r) => r.noticeDeadlinePassed);
  if (missedNotice.length > 0) {
    points.push({
      id: 'notice-deadline-passed',
      severity: 'high',
      title: `${missedNotice.length === 1 ? 'A contract will auto-renew' : `${missedNotice.length} contracts will auto-renew`} — the notice deadline has passed`,
      detail: list(missedNotice.map((r) => `${r.system.name} (renews ${r.date})`)),
    });
  }

  const renewingSoon = upcoming.filter((r) => !r.noticeDeadlinePassed && r.daysAway <= 90);
  if (renewingSoon.length > 0) {
    points.push({
      id: 'renewing-soon',
      severity: 'medium',
      title: `${renewingSoon.length === 1 ? 'One contract renews' : `${renewingSoon.length} contracts renew`} in the next 90 days`,
      detail: list(renewingSoon.map((r) => `${r.system.name} (${r.date})`)),
    });
  }

  // Old systems still in service
  const ageing = systems.filter((s) => s.status === 'legacy' || s.status === 'retiring');
  if (ageing.length > 0) {
    points.push({
      id: 'ageing-systems',
      severity: 'medium',
      title: `${ageing.length === 1 ? 'One system is' : `${ageing.length} systems are`} legacy or being retired`,
      detail: list(ageing.map((s) => s.name)),
    });
  }

  // Systems with no cost recorded, which makes the total an understatement
  const uncosted = active.filter((s) => !s.cost && !s.isShadow);
  if (uncosted.length > 0) {
    points.push({
      id: 'uncosted-systems',
      severity: 'medium',
      title: `${uncosted.length === 1 ? 'One system has' : `${uncosted.length} systems have`} no cost recorded`,
      detail: `The total below is therefore lower than what you actually spend. Missing: ${list(uncosted.map((s) => s.name))}`,
    });
  }

  // High severity first, order within a severity preserved
  return [
    ...points.filter((p) => p.severity === 'high'),
    ...points.filter((p) => p.severity === 'medium'),
  ];
}
