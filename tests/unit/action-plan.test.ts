import { describe, expect, it } from 'vitest';
import { buildRiversideAdvice } from '@/lib/examples/riverside-advice';
import { buildSuggestedActions, applyActionDecisions, updateActionDecision } from '@/lib/analysis/action-plan';
import { migrateArchitecture } from '@/lib/storage/migrate';
import { exportAsJson } from '@/lib/storage/export';

describe('evidence-based action plan', () => {
  it('derives explanations and next steps from existing checks', () => {
    const items = buildSuggestedActions(buildRiversideAdvice());
    expect(items.some((a) => a.id === 'attention:fragile-integrations')).toBe(true);
    expect(items.some((a) => a.id === 'overlap:CRM')).toBe(true);
    expect(items.some((a) => a.id === 'coverage:personal-data')).toBe(true);
    expect(items.every((a) => a.evidence.length > 0 && a.nextStep.length > 0)).toBe(true);
    expect(items[0].priority).toBe('high');
  });

  it('persists human decisions in map JSON through migration', () => {
    const arch = buildRiversideAdvice();
    const item = buildSuggestedActions(arch)[0];
    const changed = updateActionDecision(arch, item, {
      status: 'in_progress', owner: 'Alex', note: 'Discuss with colleagues',
    }, new Date('2026-10-29T12:00:00Z'));
    expect(arch.actionDecisions).toBeUndefined();
    const restored = migrateArchitecture(JSON.parse(exportAsJson(changed)));
    expect(restored.droppedCount).toBe(0);
    expect(restored.architecture?.actionDecisions).toEqual(changed.actionDecisions);
    expect(applyActionDecisions([item], changed.actionDecisions)[0].effectiveStatus).toBe('in_progress');
  });

  it('reopens decisions when new evidence is recorded', () => {
    const arch = buildRiversideAdvice();
    const item = buildSuggestedActions(arch).find((a) => a.id === 'attention:fragile-integrations')!;
    const decided = updateActionDecision(arch, item, { status: 'reviewed', note: 'Checked' });
    decided.integrations.push({
      id: 'new', sourceSystemId: 'sys-xero', targetSystemId: 'sys-google',
      type: 'api', direction: 'one_way', frequency: 'scheduled', reliability: 'fragile',
    });
    const next = buildSuggestedActions(decided).find((a) => a.id === item.id)!;
    const state = applyActionDecisions([next], decided.actionDecisions)[0];
    expect(state.changed).toBe(true);
    expect(state.effectiveStatus).toBe('open');
    expect(state.decision?.note).toBe('Checked');
  });

  it('discards invalid decision records without losing the map', () => {
    const arch = buildRiversideAdvice();
    const result = migrateArchitecture({ ...arch, actionDecisions: [
      { id: 'a', evidenceKey: 'b', status: 'planned', updatedAt: '2026-10-29' },
      { id: 'bad', status: 'impossible' },
    ] });
    expect(result.architecture?.systems.length).toBe(arch.systems.length);
    expect(result.architecture?.actionDecisions).toHaveLength(1);
    expect(result.droppedCount).toBe(1);
  });
});
