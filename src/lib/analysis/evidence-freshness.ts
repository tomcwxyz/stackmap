import type { Architecture, System, SystemReview } from '@/lib/types';

export const REVIEW_INTERVAL_DAYS = 180;
export type ReviewState = 'not_checked' | 'due' | 'recent';

function plainDate(text: string | undefined): Date | null {
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const parsed = new Date(text + 'T00:00:00.000Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === text
    ? parsed : null;
}

export function systemReviewState(
  system: System,
  at: Date = new Date(),
  intervalDays = REVIEW_INTERVAL_DAYS,
): ReviewState {
  const review = system.review;
  if (!review?.checkedBy.trim() || !review.source) return 'not_checked';
  const date = plainDate(review.checkedAt);
  if (!date) return 'not_checked';
  const today = Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate());
  const elapsed = Math.floor((today - date.getTime()) / 86400000);
  // Future-dated records cannot be considered currently checked.
  if (elapsed < 0) return 'not_checked';
  return elapsed >= intervalDays ? 'due' : 'recent';
}

export interface ReviewSummary {
  relevant: number;
  recent: number;
  due: System[];
  notChecked: System[];
}

/**
 * A lightweight self-reported freshness check, not a measure of external truth.
 * Planned or retiring systems are outside the current operational review cycle.
 */
export function assessSystemReviews(
  arch: Architecture,
  at: Date = new Date(),
): ReviewSummary {
  const systems = arch.systems.filter((s) =>
    s.status !== 'planned' && s.status !== 'retiring');
  const due: System[] = [];
  const notChecked: System[] = [];
  let recent = 0;
  for (const system of systems) {
    const state = systemReviewState(system, at);
    if (state === 'recent') recent++;
    else if (state === 'due') due.push(system);
    else notChecked.push(system);
  }
  return { relevant: systems.length, recent, due, notChecked };
}

export const SYSTEM_REVIEW_SOURCES: { value: SystemReview['source']; label: string }[] = [
  { value: 'system_owner', label: 'System owner or user' },
  { value: 'finance_records', label: 'Finance or expenditure records' },
  { value: 'supplier', label: 'Supplier or provider information' },
  { value: 'contract', label: 'Contract or agreement' },
  { value: 'other', label: 'Other evidence' },
];

/**
 * Invalidate a checked record when another editor or wizard changes details.
 * Explicitly supplied review metadata is honoured only by the caller that
 * obtains a new confirmation; ordinary updates must never silently retain it.
 */
export function applySystemUpdate(
  original: System,
  updates: Partial<Omit<System, 'id'>>,
): System {
  const changed = (Object.keys(updates) as (keyof typeof updates)[]).some((field) =>
    field !== 'review' && JSON.stringify(updates[field]) !== JSON.stringify(original[field]));
  const hasReview = Object.prototype.hasOwnProperty.call(updates, 'review');
  return {
    ...original,
    ...updates,
    review: hasReview ? updates.review : changed ? undefined : original.review,
  };
}
