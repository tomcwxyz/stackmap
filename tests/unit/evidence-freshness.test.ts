import { describe, expect, it } from 'vitest';
import { assessSystemReviews, systemReviewState, applySystemUpdate } from '@/lib/analysis/evidence-freshness';
import { buildRiversideAdvice } from '@/lib/examples/riverside-advice';
import { buildSuggestedActions, applyActionDecisions, updateActionDecision } from '@/lib/analysis/action-plan';
import { migrateArchitecture } from '@/lib/storage/migrate';
import { exportAsJson } from '@/lib/storage/export';

const today = new Date('2026-10-29T12:00:00Z');

describe('evidence review freshness', () => {
  it('does not equate a catalogue score or entered value with verification', () => {
    const arch = buildRiversideAdvice();
    expect(assessSystemReviews(arch, today).recent).toBe(0);
    expect(assessSystemReviews(arch, today).notChecked.length).toBeGreaterThan(0);
    expect(buildSuggestedActions(arch, today).some(a => a.id === 'review:system-records')).toBe(true);
  });

  it('treats self-reported reviews as current only for 180 days', () => {
    const arch = buildRiversideAdvice();
    const system = arch.systems[0];
    system.review = { checkedBy: 'Pat', source: 'system_owner', checkedAt: '2026-05-02' };
    expect(systemReviewState(system, today)).toBe('due'); // exactly 180 days
    system.review.checkedAt = '2026-05-03';
    expect(systemReviewState(system, today)).toBe('recent');
    system.review.checkedAt = '2026-12-01';
    expect(systemReviewState(system, today)).toBe('not_checked'); // future date
    system.review.checkedAt = '2026-02-31';
    expect(systemReviewState(system, today)).toBe('not_checked');
  });

  it('invalidates a review when a different editing pathway modifies a record', () => {
    const original = buildRiversideAdvice().systems[0];
    original.review = { checkedAt: '2026-10-29', checkedBy: 'Alex', source: 'system_owner' };
    expect(applySystemUpdate(original, { notes: 'New information' }).review).toBeUndefined();
    expect(applySystemUpdate(original, { notes: original.notes }).review).toEqual(original.review);
    expect(applySystemUpdate(original, { name: original.name }).review).toEqual(original.review);
    expect(original.review).toBeDefined();
  });

  it('excludes planned and retiring systems from current review demands', () => {
    const arch = buildRiversideAdvice();
    arch.systems.forEach(s => { s.status = 'planned'; });
    expect(assessSystemReviews(arch, today).relevant).toBe(0);
    expect(buildSuggestedActions(arch, today).some(a => a.id === 'review:system-records')).toBe(false);
  });

  it('saves genuine human reviews in JSON and protects old maps', () => {
    const arch = buildRiversideAdvice();
    arch.systems[0].review = {
      checkedAt: '2026-10-28', checkedBy: 'Alex',
      source: 'contract', notes: 'Renewal checked with finance',
    };
    const restored = migrateArchitecture(JSON.parse(exportAsJson(arch)));
    expect(restored.architecture?.systems[0].review).toEqual(arch.systems[0].review);
    expect(restored.droppedCount).toBe(0);
    const prior = buildRiversideAdvice();
    expect(migrateArchitecture(prior).architecture?.systems[0].review).toBeUndefined();
  });

  it('keeps system details when review metadata is malformed', () => {
    const arch = buildRiversideAdvice();
    const corrupted = { ...arch, systems: arch.systems.map((s, i) =>
      i === 0 ? { ...s, review: { checkedBy: '', source: 'unknown', checkedAt: 'oops' } } : s) };
    const result = migrateArchitecture(corrupted);
    expect(result.architecture?.systems).toHaveLength(arch.systems.length);
    expect(result.architecture?.systems[0].review).toBeUndefined();
    expect(result.droppedCount).toBe(1);
  });

  it('reopens earlier human decisions when evidence freshness changes', () => {
    const arch = buildRiversideAdvice();
    const previous = buildSuggestedActions(arch, today).find(a => a.id === 'review:system-records')!;
    const saved = updateActionDecision(arch, previous, { status: 'reviewed' }, today);
    saved.systems[0].review = {
      checkedAt: '2026-10-29', checkedBy: 'Sam', source: 'system_owner',
    };
    const next = buildSuggestedActions(saved, today).find(a => a.id === 'review:system-records')!;
    const state = applyActionDecisions([next], saved.actionDecisions)[0];
    expect(state.changed).toBe(true);
    expect(state.effectiveStatus).toBe('open');
  });
});
