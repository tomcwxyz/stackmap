import { describe, it, expect } from 'vitest';
import { findRenewals, generateRenewalsIcs } from '@/lib/analysis/renewals';
import type { System } from '@/lib/types';

const TODAY = new Date('2026-08-03T09:30:00Z');

function system(overrides: Partial<System> & { id: string; name: string }): System {
  return {
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

function annual(amount: number) {
  return { amount, period: 'annual' as const, model: 'subscription' as const };
}

describe('findRenewals', () => {
  it('finds nothing when no renewal dates are recorded', () => {
    const result = findRenewals([system({ id: 's1', name: 'Xero' })], { from: TODAY });

    expect(result.upcoming).toEqual([]);
    expect(result.overdue).toEqual([]);
    expect(result.costInWindow).toBe(0);
  });

  it('counts the days until a renewal', () => {
    const result = findRenewals(
      [system({ id: 's1', name: 'Xero', renewalDate: '2026-08-13' })],
      { from: TODAY },
    );

    expect(result.upcoming[0].daysAway).toBe(10);
  });

  it('treats a renewal later today as still ahead', () => {
    const result = findRenewals(
      [system({ id: 's1', name: 'Xero', renewalDate: '2026-08-03' })],
      { from: TODAY },
    );

    expect(result.upcoming[0].daysAway).toBe(0);
    expect(result.overdue).toEqual([]);
  });

  it('separates dates that have already passed', () => {
    const result = findRenewals(
      [
        system({ id: 's1', name: 'Past it', renewalDate: '2026-07-01' }),
        system({ id: 's2', name: 'Coming up', renewalDate: '2026-09-01' }),
      ],
      { from: TODAY },
    );

    expect(result.overdue.map((r) => r.system.name)).toEqual(['Past it']);
    expect(result.upcoming.map((r) => r.system.name)).toEqual(['Coming up']);
  });

  it('puts the soonest renewal first', () => {
    const result = findRenewals(
      [
        system({ id: 's1', name: 'Later', renewalDate: '2026-12-01' }),
        system({ id: 's2', name: 'Sooner', renewalDate: '2026-08-20' }),
      ],
      { from: TODAY },
    );

    expect(result.upcoming.map((r) => r.system.name)).toEqual(['Sooner', 'Later']);
  });

  it('ignores a malformed date rather than failing', () => {
    const result = findRenewals(
      [system({ id: 's1', name: 'Xero', renewalDate: 'next March' })],
      { from: TODAY },
    );

    expect(result.upcoming).toEqual([]);
  });

  describe('notice periods', () => {
    it('works out the last day to give notice', () => {
      const result = findRenewals(
        [
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-10-01',
            noticePeriodDays: 30,
          }),
        ],
        { from: TODAY },
      );

      expect(result.upcoming[0].noticeBy).toBe('2026-09-01');
      expect(result.upcoming[0].noticeDeadlinePassed).toBe(false);
    });

    it('flags a notice deadline that has already gone', () => {
      const result = findRenewals(
        [
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-08-20',
            noticePeriodDays: 90,
          }),
        ],
        { from: TODAY },
      );

      expect(result.upcoming[0].noticeDeadlinePassed).toBe(true);
    });

    it('leaves the deadline unset when no notice period is recorded', () => {
      const result = findRenewals(
        [system({ id: 's1', name: 'Xero', renewalDate: '2026-10-01' })],
        { from: TODAY },
      );

      expect(result.upcoming[0].noticeBy).toBeUndefined();
      expect(result.upcoming[0].noticeDeadlinePassed).toBe(false);
    });
  });

  describe('cost in the window', () => {
    it('adds up what renews within 90 days by default', () => {
      const result = findRenewals(
        [
          system({ id: 's1', name: 'Soon', renewalDate: '2026-09-01', cost: annual(1000) }),
          system({ id: 's2', name: 'Far off', renewalDate: '2027-06-01', cost: annual(5000) }),
        ],
        { from: TODAY },
      );

      expect(result.costInWindow).toBe(1000);
      expect(result.windowDays).toBe(90);
    });

    it('respects a different window', () => {
      const result = findRenewals(
        [system({ id: 's1', name: 'Soon', renewalDate: '2026-09-01', cost: annual(1000) })],
        { from: TODAY, windowDays: 7 },
      );

      expect(result.costInWindow).toBe(0);
    });

    it('annualises a monthly cost', () => {
      const result = findRenewals(
        [
          system({
            id: 's1',
            name: 'Soon',
            renewalDate: '2026-09-01',
            cost: { amount: 100, period: 'monthly', model: 'subscription' },
          }),
        ],
        { from: TODAY },
      );

      expect(result.costInWindow).toBe(1200);
    });
  });
});

describe('generateRenewalsIcs', () => {
  const systems = [
    system({
      id: 'sys-1',
      name: 'Xero',
      renewalDate: '2026-10-01',
      noticePeriodDays: 30,
      cost: annual(400),
    }),
  ];

  it('produces a valid calendar wrapper', () => {
    const ics = generateRenewalsIcs(systems, 'Sunrise Trust');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
  });

  it('uses CRLF line endings, as the format requires', () => {
    expect(generateRenewalsIcs(systems, 'Sunrise Trust')).toContain('\r\n');
  });

  it('writes one all-day event per renewal', () => {
    const ics = generateRenewalsIcs(systems, 'Sunrise Trust');

    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('DTSTART;VALUE=DATE:20261001');
    expect(ics).toContain('UID:sys-1-renewal@stackmap.org');
  });

  it('says what renews and what it costs', () => {
    const ics = generateRenewalsIcs(systems, 'Sunrise Trust');

    expect(ics).toContain('SUMMARY:Xero renews (£400/yr)');
  });

  it('includes the notice deadline in the description', () => {
    const ics = generateRenewalsIcs(systems, 'Sunrise Trust');

    expect(ics).toContain('Give notice by 2026-09-01.');
  });

  it('escapes characters that are structural in the format', () => {
    const ics = generateRenewalsIcs(
      [system({ id: 's1', name: 'Tool A, B; and C', renewalDate: '2026-10-01' })],
      'Sunrise Trust',
    );

    expect(ics).toContain('SUMMARY:Tool A\\, B\\; and C renews');
  });

  it('produces an empty calendar when nothing has a renewal date', () => {
    const ics = generateRenewalsIcs([system({ id: 's1', name: 'Xero' })], 'Sunrise Trust');

    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });
});
