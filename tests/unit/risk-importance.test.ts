import { describe, it, expect } from 'vitest';
import { buildRiskImportanceMatrix, QUADRANTS } from '@/lib/analysis/risk-importance';
import type { System, TechFreedomScore } from '@/lib/types';

/** Builds a score summing to the total asked for, spread across dimensions. */
function scoreTotalling(total: number): TechFreedomScore {
  const base = Math.floor(total / 5);
  const remainder = total - base * 5;
  const values = [base, base, base, base, base];
  for (let i = 0; i < remainder; i++) values[i]++;

  return {
    jurisdiction: values[0],
    continuity: values[1],
    surveillance: values[2],
    lockIn: values[3],
    costExposure: values[4],
    isAutoScored: true,
  };
}

function system(
  id: string,
  name: string,
  importance?: number,
  riskTotal?: number,
): System {
  return {
    id,
    name,
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    importance,
    techFreedomScore: riskTotal != null ? scoreTotalling(riskTotal) : undefined,
  };
}

describe('buildRiskImportanceMatrix', () => {
  it('returns empty results for no systems', () => {
    const matrix = buildRiskImportanceMatrix([]);

    expect(matrix.plotted).toEqual([]);
    expect(matrix.unplotted).toEqual([]);
    expect(matrix.byQuadrant.act_first).toEqual([]);
  });

  describe('quadrant assignment', () => {
    it('puts a critical, high-risk system in act first', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Salesforce', 9, 20)]);

      expect(matrix.byQuadrant.act_first.map((p) => p.system.name)).toEqual(['Salesforce']);
    });

    it('puts a critical, low-risk system in protect', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Nextcloud', 9, 8)]);

      expect(matrix.byQuadrant.protect.map((p) => p.system.name)).toEqual(['Nextcloud']);
    });

    it('puts a non-critical, high-risk system in reduce', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Some SaaS', 3, 20)]);

      expect(matrix.byQuadrant.reduce.map((p) => p.system.name)).toEqual(['Some SaaS']);
    });

    it('puts a non-critical, low-risk system in watch', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Canva', 2, 8)]);

      expect(matrix.byQuadrant.watch.map((p) => p.system.name)).toEqual(['Canva']);
    });
  });

  describe('boundaries', () => {
    it('treats importance 8 as critical and 7 as not', () => {
      const matrix = buildRiskImportanceMatrix([
        system('s1', 'Just critical', 8, 20),
        system('s2', 'Just below', 7, 20),
      ]);

      expect(matrix.byQuadrant.act_first.map((p) => p.system.name)).toEqual(['Just critical']);
      expect(matrix.byQuadrant.reduce.map((p) => p.system.name)).toEqual(['Just below']);
    });

    it('uses the same high-risk boundary as the risk level labels', () => {
      // riskLevel: <=14 moderate, 15-17 high
      const matrix = buildRiskImportanceMatrix([
        system('s1', 'Moderate', 9, 14),
        system('s2', 'High', 9, 15),
      ]);

      expect(matrix.byQuadrant.protect.map((p) => p.system.name)).toEqual(['Moderate']);
      expect(matrix.byQuadrant.act_first.map((p) => p.system.name)).toEqual(['High']);
    });
  });

  describe('systems that cannot be plotted', () => {
    it('sets aside a system with no importance score', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Unscored', undefined, 20)]);

      expect(matrix.plotted).toEqual([]);
      expect(matrix.unplotted.map((s) => s.name)).toEqual(['Unscored']);
    });

    it('sets aside a system with no risk score', () => {
      const matrix = buildRiskImportanceMatrix([system('s1', 'Unassessed', 9)]);

      expect(matrix.unplotted.map((s) => s.name)).toEqual(['Unassessed']);
    });

    it('keeps plotted and unplotted systems separate', () => {
      const matrix = buildRiskImportanceMatrix([
        system('s1', 'Plotted', 9, 20),
        system('s2', 'Not plotted', 9),
      ]);

      expect(matrix.plotted).toHaveLength(1);
      expect(matrix.unplotted).toHaveLength(1);
    });
  });

  it('includes shadow tools, since a critical unofficial tool is the point', () => {
    const shadow: System = { ...system('s1', 'WhatsApp', 9, 20), isShadow: true };
    const matrix = buildRiskImportanceMatrix([shadow]);

    expect(matrix.byQuadrant.act_first.map((p) => p.system.name)).toEqual(['WhatsApp']);
  });

  it('orders the most depended-on first, then the most exposed', () => {
    const matrix = buildRiskImportanceMatrix([
      system('s1', 'Lower importance', 8, 25),
      system('s2', 'Top importance, lower risk', 10, 16),
      system('s3', 'Top importance, higher risk', 10, 22),
    ]);

    expect(matrix.byQuadrant.act_first.map((p) => p.system.name)).toEqual([
      'Top importance, higher risk',
      'Top importance, lower risk',
      'Lower importance',
    ]);
  });

  it('reports the risk total and level alongside each system', () => {
    const matrix = buildRiskImportanceMatrix([system('s1', 'Salesforce', 9, 20)]);

    expect(matrix.plotted[0].riskTotal).toBe(20);
    expect(matrix.plotted[0].level).toBe('critical');
    expect(matrix.plotted[0].importance).toBe(9);
  });

  it('defines all four quadrants with the critical one first', () => {
    expect(QUADRANTS.map((q) => q.key)).toEqual(['act_first', 'protect', 'reduce', 'watch']);
    expect(QUADRANTS[0].order).toBe(0);
  });
});
