import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect } from 'vitest';
import { RenewalTimeline } from '@/components/analysis/renewal-timeline';
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

describe('RenewalTimeline', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(
      <RenewalTimeline
        from={TODAY}
        systems={[
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-09-01',
            noticePeriodDays: 30,
            cost: { amount: 400, period: 'annual', model: 'subscription' },
          }),
        ]}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('explains what to do when no dates are recorded', () => {
    render(<RenewalTimeline from={TODAY} systems={[system({ id: 's1', name: 'Xero' })]} />);

    expect(screen.getByText(/no renewal dates recorded yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId('renewal-timeline')).not.toBeInTheDocument();
  });

  it('lists renewals with a readable date and how soon they are', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[system({ id: 's1', name: 'Xero', renewalDate: '2026-08-13' })]}
      />,
    );

    expect(screen.getByText(/13 August 2026 \(in 10 days\)/)).toBeInTheDocument();
  });

  it('rounds longer waits to months', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[system({ id: 's1', name: 'Xero', renewalDate: '2026-11-01' })]}
      />,
    );

    expect(screen.getByText(/in about 3 months/)).toBeInTheDocument();
  });

  it('totals what renews in the window', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-09-01',
            cost: { amount: 400, period: 'annual', model: 'subscription' },
          }),
          system({
            id: 's2',
            name: 'Salesforce',
            renewalDate: '2026-09-15',
            cost: { amount: 1600, period: 'annual', model: 'subscription' },
          }),
        ]}
      />,
    );

    expect(screen.getByText('£2,000')).toBeInTheDocument();
  });

  it('shows the notice deadline while there is still time', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-10-01',
            noticePeriodDays: 30,
          }),
        ]}
      />,
    );

    expect(screen.getByText(/give notice by 1 September 2026/i)).toBeInTheDocument();
  });

  it('warns loudly once the notice deadline has gone', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[
          system({
            id: 's1',
            name: 'Xero',
            renewalDate: '2026-08-20',
            noticePeriodDays: 90,
          }),
        ]}
      />,
    );

    expect(screen.getByText(/notice deadline passed/i)).toBeInTheDocument();
  });

  it('separates dates that have already gone by, and says why', () => {
    render(
      <RenewalTimeline
        from={TODAY}
        systems={[system({ id: 's1', name: 'Old contract', renewalDate: '2026-01-01' })]}
      />,
    );

    expect(screen.getByText(/dates that have passed/i)).toBeInTheDocument();
    expect(screen.getByText(/needs updating/i)).toBeInTheDocument();
  });
});
