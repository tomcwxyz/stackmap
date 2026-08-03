import type { RiskLevel, System } from '@/lib/types';
import { getImportanceTier } from '@/lib/importance';
import { riskLevel, totalScore } from '@/lib/techfreedom/risk';

export type QuadrantKey = 'act_first' | 'protect' | 'reduce' | 'watch';

export interface QuadrantDefinition {
  key: QuadrantKey;
  label: string;
  /** What the quadrant means, in terms a non-specialist can act on. */
  description: string;
  /** Critical systems come first wherever quadrants are listed. */
  order: number;
}

export const QUADRANTS: QuadrantDefinition[] = [
  {
    key: 'act_first',
    label: 'Critical and exposed',
    description:
      'You depend on these and they carry real risk. Start here — these are where a problem would hurt most.',
    order: 0,
  },
  {
    key: 'protect',
    label: 'Critical and solid',
    description:
      'You depend on these but they look sound. Keep them that way: named owners, working backups, no surprises at renewal.',
    order: 1,
  },
  {
    key: 'reduce',
    label: 'Exposed but not critical',
    description:
      'Risky tools you could live without. Often the easiest wins — drop, replace or consolidate them.',
    order: 2,
  },
  {
    key: 'watch',
    label: 'Low priority',
    description: 'Neither critical nor especially risky. Nothing to do for now.',
    order: 3,
  },
];

export interface PlottedSystem {
  system: System;
  importance: number;
  riskTotal: number;
  level: RiskLevel;
  quadrant: QuadrantKey;
}

export interface RiskImportanceMatrix {
  plotted: PlottedSystem[];
  byQuadrant: Record<QuadrantKey, PlottedSystem[]>;
  /** Systems missing an importance score, a risk score, or both. */
  unplotted: System[];
}

/** A system is treated as critical at the top of the importance scale. */
function isCritical(system: System): boolean {
  return getImportanceTier(system.importance)?.tier === 'core';
}

/**
 * Risk totals above the moderate band. Matches riskLevel's own boundaries, so
 * "exposed" here means the same thing as "high" or "critical" everywhere else.
 */
function isExposed(total: number): boolean {
  const level = riskLevel(total);
  return level === 'high' || level === 'critical';
}

function quadrantFor(critical: boolean, exposed: boolean): QuadrantKey {
  if (critical) return exposed ? 'act_first' : 'protect';
  return exposed ? 'reduce' : 'watch';
}

/**
 * Cross how much the organisation depends on each system with how risky it is.
 *
 * Both numbers are already collected — importance on its own step, risk from
 * the tools database or by hand — but they are only ever shown apart, so the
 * systems that are both critical and exposed never surface as a group.
 */
export function buildRiskImportanceMatrix(systems: System[]): RiskImportanceMatrix {
  const plotted: PlottedSystem[] = [];
  const unplotted: System[] = [];

  for (const system of systems) {
    const score = system.techFreedomScore;
    if (system.importance == null || !score) {
      unplotted.push(system);
      continue;
    }

    const total = totalScore(score);
    const exposed = isExposed(total);

    plotted.push({
      system,
      importance: system.importance,
      riskTotal: total,
      level: riskLevel(total),
      quadrant: quadrantFor(isCritical(system), exposed),
    });
  }

  // Within a quadrant, the most exposed of the most depended-on come first
  plotted.sort((a, b) => b.importance - a.importance || b.riskTotal - a.riskTotal);

  const byQuadrant: Record<QuadrantKey, PlottedSystem[]> = {
    act_first: [],
    protect: [],
    reduce: [],
    watch: [],
  };
  for (const entry of plotted) {
    byQuadrant[entry.quadrant].push(entry);
  }

  return { plotted, byQuadrant, unplotted };
}
