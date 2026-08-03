'use client';

import { findRenewals } from '@/lib/analysis/renewals';
import { formatCurrency } from '@/lib/cost-analysis';
import type { System } from '@/lib/types';

export interface RenewalTimelineProps {
  systems: System[];
  /** Fixed reference date, for tests. Defaults to today. */
  from?: Date;
}

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function whenText(daysAway: number): string {
  if (daysAway === 0) return 'today';
  if (daysAway === 1) return 'tomorrow';
  if (daysAway < 30) return `in ${daysAway} days`;
  const months = Math.round(daysAway / 30);
  return months === 1 ? 'in about a month' : `in about ${months} months`;
}

/**
 * What renews next, and by when notice has to be given.
 *
 * Cost on its own is a snapshot; a renewal date is the thing that makes someone
 * open the map again before the money goes out.
 */
export function RenewalTimeline({ systems, from }: RenewalTimelineProps) {
  const { upcoming, overdue, costInWindow, windowDays } = findRenewals(systems, { from });

  if (upcoming.length === 0 && overdue.length === 0) {
    return (
      <p className="text-sm text-primary-600">
        No renewal dates recorded yet. Add them to a system from Your systems and they will
        appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="renewal-timeline">
      {costInWindow > 0 && (
        <p className="text-sm text-primary-800">
          <strong>{formatCurrency(costInWindow)}</strong> of contracts renew in the next{' '}
          {windowDays} days.
        </p>
      )}

      {upcoming.length > 0 && (
        <ul className="space-y-1.5" role="list">
          {upcoming.map((renewal) => (
            <li
              key={renewal.system.id}
              className="text-sm flex flex-wrap items-baseline gap-x-2 border-b border-surface-200 pb-1.5"
            >
              <span className="font-medium text-primary-900">{renewal.system.name}</span>
              <span className="text-primary-700">
                {formatDate(renewal.date)} ({whenText(renewal.daysAway)})
              </span>
              {renewal.annualCost > 0 && (
                <span className="text-primary-600">{formatCurrency(renewal.annualCost)}/yr</span>
              )}
              {renewal.noticeDeadlinePassed ? (
                <span className="text-xs bg-red-100 text-red-800 rounded px-1.5 py-0.5 font-medium">
                  Notice deadline passed
                </span>
              ) : (
                renewal.noticeBy && (
                  <span className="text-xs text-primary-600">
                    give notice by {formatDate(renewal.noticeBy)}
                  </span>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      {overdue.length > 0 && (
        <div className="text-sm text-primary-700">
          <p className="font-medium text-primary-900">Dates that have passed</p>
          <p className="text-xs text-primary-600 mb-1">
            Usually means the contract has already renewed and the date needs updating.
          </p>
          <ul className="space-y-1" role="list">
            {overdue.map((renewal) => (
              <li key={renewal.system.id}>
                {renewal.system.name} — {formatDate(renewal.date)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
