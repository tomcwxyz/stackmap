import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { TechFreedomView } from '@/components/views/techfreedom-view';
import type { Architecture } from '@/lib/types';
import type { TechFreedomScore } from '@/lib/techfreedom/types';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const highRiskScore: TechFreedomScore = {
  jurisdiction: 5,
  continuity: 4,
  surveillance: 5,
  lockIn: 4,
  costExposure: 3,
  isAutoScored: true,
};

const lowRiskScore: TechFreedomScore = {
  jurisdiction: 1,
  continuity: 2,
  surveillance: 1,
  lockIn: 1,
  costExposure: 2,
  isAutoScored: false,
};

function createTestArchitecture(options?: {
  withScores?: boolean;
  emptySystems?: boolean;
}): Architecture {
  const systems = options?.emptySystems
    ? []
    : options?.withScores
      ? [
          {
            id: 'sys-1',
            name: 'Salesforce',
            type: 'crm' as const,
            hosting: 'cloud' as const,
            status: 'active' as const,
            functionIds: ['fn-1'],
            serviceIds: [],
            techFreedomScore: highRiskScore,
          },
          {
            id: 'sys-2',
            name: 'Signal',
            type: 'messaging' as const,
            hosting: 'cloud' as const,
            status: 'active' as const,
            functionIds: [],
            serviceIds: [],
            techFreedomScore: lowRiskScore,
          },
        ]
      : [
          {
            id: 'sys-1',
            name: 'Xero',
            type: 'finance' as const,
            hosting: 'cloud' as const,
            status: 'active' as const,
            functionIds: ['fn-1'],
            serviceIds: [],
          },
        ];

  return {
    organisation: {
      id: 'org-1',
      name: 'Test Charity',
      type: 'charity',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance', isActive: true }],
    services: [],
    systems,
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '2025-01-01T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
      techFreedomEnabled: true,
    },
  };
}

describe('TechFreedomView', () => {
  it('has no axe accessibility violations', async () => {
    const arch = createTestArchitecture({ withScores: true });
    const { container } = render(
      <TechFreedomView architecture={arch} isLoading={false} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows loading state when isLoading is true', () => {
    render(<TechFreedomView architecture={null} isLoading={true} />);
    const loading = document.querySelector('.animate-pulse');
    expect(loading).toBeTruthy();
  });

  it('shows empty state when no systems have scores', () => {
    const arch = createTestArchitecture({ withScores: false });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    expect(
      screen.getByText(/no systems have been risk-assessed yet/i),
    ).toBeTruthy();
  });

  it('shows empty state when architecture is null', () => {
    render(<TechFreedomView architecture={null} isLoading={false} />);
    expect(
      screen.getByText(/no systems have been risk-assessed yet/i),
    ).toBeTruthy();
  });

  it('renders summary panel with overall risk level', () => {
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    // Should show the heading
    expect(screen.getByText('Technology Risk Assessment')).toBeTruthy();
    // Should show aggregate risk info — the summary panel has risk level text
    expect(screen.getByText('Overall Risk Summary')).toBeTruthy();
    // Should show most critical system (appears in summary and table)
    expect(screen.getAllByText('Salesforce').length).toBeGreaterThanOrEqual(1);
  });

  it('renders heatmap table with system rows', () => {
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    const table = screen.getByRole('table');
    expect(table).toBeTruthy();

    // Check column headers
    const headers = within(table).getAllByRole('columnheader');
    const headerTexts = headers.map((h) => h.textContent?.replace(/[↕↑↓\u2191\u2193\u2195]/g, '').trim());
    expect(headerTexts).toContain('System');
    expect(headerTexts).toContain('Total');
    expect(headerTexts).toContain('Risk Level');

    // Check system rows
    const rows = within(table).getAllByRole('row');
    // header row + 2 system rows = 3
    expect(rows.length).toBeGreaterThanOrEqual(3);
    // Salesforce appears in summary too, so use getAllByText
    expect(screen.getAllByText('Salesforce').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Signal')).toBeTruthy();
  });

  it('renders radar chart', () => {
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    const radarChart = screen.getByLabelText(
      /radar chart showing risk scores/i,
    );
    expect(radarChart).toBeTruthy();
  });

  it('sorts table by clicking column headers', async () => {
    const user = userEvent.setup();
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);

    const table = screen.getByRole('table');
    const rows = within(table).getAllByRole('row');

    // Default sort: total descending — Salesforce (21) should be first data row
    const firstDataRow = rows[1];
    expect(within(firstDataRow).getByText('Salesforce')).toBeTruthy();

    // Click "System" header to sort alphabetically
    const systemHeader = screen.getByRole('columnheader', { name: /system/i });
    await user.click(systemHeader);

    const rowsAfterSort = within(table).getAllByRole('row');
    const firstRowAfterSort = rowsAfterSort[1];
    // Alphabetical ascending: Salesforce before Signal
    expect(within(firstRowAfterSort).getByText('Salesforce')).toBeTruthy();

    // Click again to reverse
    await user.click(systemHeader);
    const rowsAfterReverse = within(table).getAllByRole('row');
    const firstRowAfterReverse = rowsAfterReverse[1];
    expect(within(firstRowAfterReverse).getByText('Signal')).toBeTruthy();
  });

  it('shows "Edit your map" link pointing to review page', () => {
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    const link = screen.getByText('Edit your map');
    expect(link.closest('a')).toBeTruthy();
    expect(link.closest('a')?.getAttribute('href')).toBe('/wizard/functions/review');
  });

  it('shows count by risk category in summary', () => {
    const arch = createTestArchitecture({ withScores: true });
    render(<TechFreedomView architecture={arch} isLoading={false} />);
    // highRiskScore total = 21 => critical, lowRiskScore total = 7 => low
    expect(screen.getByText(/1 Critical/i)).toBeTruthy();
    expect(screen.getByText(/1 Low/i)).toBeTruthy();
  });
});
