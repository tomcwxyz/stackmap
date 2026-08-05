import type { System } from '@/lib/types';
import { annualiseCost } from '@/lib/cost-analysis';

export interface Renewal {
  system: System;
  /** The renewal date, as stored (YYYY-MM-DD). */
  date: string;
  /** Whole days from the reference date. Negative once the date has passed. */
  daysAway: number;
  /**
   * The last day to give notice and still leave cleanly. Absent when no notice
   * period is recorded.
   */
  noticeBy?: string;
  /** True when the notice deadline has already gone but the renewal has not. */
  noticeDeadlinePassed: boolean;
  annualCost: number;
}

export interface RenewalSummary {
  /** Renewals still ahead, soonest first. */
  upcoming: Renewal[];
  /** Renewals whose date has passed — usually a date nobody updated. */
  overdue: Renewal[];
  /** Total annual cost of everything renewing within the window. */
  costInWindow: number;
  /** How many days the window covers. */
  windowDays: number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Parse YYYY-MM-DD as a plain date at UTC midnight, avoiding time zone drift. */
function parseDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  return isNaN(date.getTime()) ? null : date;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/**
 * Contract renewals, sorted by how soon they are.
 *
 * Renewal dates are the one piece of cost information that expires: a map that
 * says what you spend is useful once, but a map that says what renews in March
 * is a reason to open it again.
 */
export function findRenewals(
  systems: System[],
  options: { from?: Date; windowDays?: number } = {},
): RenewalSummary {
  const today = startOfUtcDay(options.from ?? new Date());
  const windowDays = options.windowDays ?? 90;

  const upcoming: Renewal[] = [];
  const overdue: Renewal[] = [];

  for (const system of systems) {
    if (!system.renewalDate) continue;

    const date = parseDate(system.renewalDate);
    if (!date) continue;

    const daysAway = Math.round((date.getTime() - today.getTime()) / MS_PER_DAY);

    let noticeBy: string | undefined;
    let noticeDeadlinePassed = false;
    if (system.noticePeriodDays != null && system.noticePeriodDays > 0) {
      const deadline = new Date(date.getTime() - system.noticePeriodDays * MS_PER_DAY);
      noticeBy = toDateString(deadline);
      noticeDeadlinePassed = deadline.getTime() < today.getTime() && daysAway >= 0;
    }

    const renewal: Renewal = {
      system,
      date: system.renewalDate,
      daysAway,
      noticeBy,
      noticeDeadlinePassed,
      annualCost: annualiseCost(system),
    };

    if (daysAway < 0) {
      overdue.push(renewal);
    } else {
      upcoming.push(renewal);
    }
  }

  upcoming.sort((a, b) => a.daysAway - b.daysAway);
  overdue.sort((a, b) => b.daysAway - a.daysAway);

  const costInWindow = upcoming
    .filter((r) => r.daysAway <= windowDays)
    .reduce((sum, r) => sum + r.annualCost, 0);

  return { upcoming, overdue, costInWindow, windowDays };
}

/**
 * Renewals as an iCalendar feed, so they land in the calendar the organisation
 * actually looks at rather than only in this tool.
 */
export function generateRenewalsIcs(systems: System[], organisationName: string): string {
  const { upcoming, overdue } = findRenewals(systems);
  const all = [...overdue, ...upcoming];

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stackmap//Renewals//EN',
    'CALSCALE:GREGORIAN',
  ];

  for (const renewal of all) {
    const compact = renewal.date.replace(/-/g, '');
    const summary = `${renewal.system.name} renews${
      renewal.annualCost > 0 ? ` (£${renewal.annualCost.toLocaleString('en-GB')}/yr)` : ''
    }`;
    const description = [
      `${renewal.system.name} contract renewal for ${organisationName || 'your organisation'}.`,
      renewal.noticeBy ? `Give notice by ${renewal.noticeBy}.` : null,
    ]
      .filter(Boolean)
      .join(' ');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${renewal.system.id}-renewal@stackmap.org`);
    lines.push(`DTSTART;VALUE=DATE:${compact}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');

  // iCalendar requires CRLF line endings
  return lines.join('\r\n');
}

/** Commas, semicolons, backslashes and newlines are structural in iCalendar. */
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
