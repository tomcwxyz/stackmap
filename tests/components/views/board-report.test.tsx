import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BoardReport } from '@/components/views/board-report';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

function makeArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Sunrise Trust',
      type: 'charity',
      staffCount: 18,
      createdAt: '',
      updatedAt: '',
    },
    functions: [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'fn-2', name: 'Service delivery', type: 'service_delivery', isActive: true },
    ],
    services: [],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
        ownerId: 'own-1',
        importance: 9,
        cost: { amount: 400, period: 'annual', model: 'subscription' },
      },
      {
        id: 'sys-2',
        name: 'Lamplight',
        type: 'case_management',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-2'],
        serviceIds: [],
        importance: 10,
        cost: { amount: 100, period: 'monthly', model: 'subscription' },
      },
    ],
    dataCategories: [
      {
        id: 'dc-1',
        name: 'Client records',
        sensitivity: 'restricted',
        containsPersonalData: true,
        systemIds: ['sys-2'],
      },
    ],
    integrations: [],
    owners: [{ id: 'own-1', name: 'Priya Shah', role: 'Finance lead', isExternal: false }],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '2026-04-01T00:00:00.000Z',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

let currentArchitecture: Architecture | null = makeArchitecture();
let loading = false;

const mockContext = (): ArchitectureContextValue => ({
  architecture: currentArchitecture,
  isLoading: loading,
  updateOrganisation: vi.fn(),
  addFunction: vi.fn().mockReturnValue(''),
  updateFunction: vi.fn(),
  removeFunction: vi.fn(),
  addService: vi.fn().mockReturnValue(''),
  updateService: vi.fn(),
  removeService: vi.fn(),
  addSystem: vi.fn().mockReturnValue(''),
  updateSystem: vi.fn(),
  removeSystem: vi.fn(),
  addDataCategory: vi.fn().mockReturnValue(''),
  updateDataCategory: vi.fn(),
  removeDataCategory: vi.fn(),
  addIntegration: vi.fn().mockReturnValue(''),
  removeIntegration: vi.fn(),
  addOwner: vi.fn().mockReturnValue(''),
  removeOwner: vi.fn(),
  addExternalParty: vi.fn().mockReturnValue(''),
  updateExternalParty: vi.fn(),
  removeExternalParty: vi.fn(),
  addDataFlow: vi.fn().mockReturnValue(''),
  updateDataFlow: vi.fn(),
  removeDataFlow: vi.fn(),
  replaceArchitecture: vi.fn(),
  clearSection: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(currentArchitecture),
});

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext(),
}));

describe('BoardReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentArchitecture = makeArchitecture();
    loading = false;
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<BoardReport />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('leads with the organisation and when it was mapped', () => {
    render(<BoardReport />);

    expect(screen.getByRole('heading', { name: 'Sunrise Trust', level: 1 })).toBeInTheDocument();
    expect(screen.getByText(/mapped 1 april 2026/i)).toBeInTheDocument();
    expect(screen.getByText(/18 staff/)).toBeInTheDocument();
  });

  it('shows headline numbers including annualised cost', () => {
    render(<BoardReport />);

    expect(screen.getByText('Systems')).toBeInTheDocument();
    // £400 + (£100/month × 12)
    expect(screen.getByText('£1,600')).toBeInTheDocument();
  });

  it('lists what needs attention', () => {
    render(<BoardReport />);

    const section = screen.getByRole('heading', { name: /what needs attention/i }).closest('section')!;
    // Lamplight is critical, holds personal data and has no owner — it is
    // raised under both headings, since the two matter for different reasons
    expect(within(section).getByText(/a critical system has no named owner/i)).toBeInTheDocument();
    expect(
      within(section).getByText(/a system holding personal data has no named owner/i),
    ).toBeInTheDocument();
    expect(within(section).getAllByText(/Lamplight/).length).toBeGreaterThan(0);
  });

  it('says so plainly when nothing needs attention', () => {
    const arch = makeArchitecture();
    arch.systems[1].ownerId = 'own-1';
    arch.systems.push({
      id: 'sys-3',
      name: 'Second finance tool',
      type: 'spreadsheet',
      hosting: 'cloud',
      status: 'active',
      functionIds: ['fn-1', 'fn-2'],
      serviceIds: [],
      ownerId: 'own-1',
      cost: { amount: 0, period: 'annual', model: 'free' },
    });
    currentArchitecture = arch;

    render(<BoardReport />);

    expect(screen.getByText(/nothing stands out/i)).toBeInTheDocument();
  });

  it('lists the systems the organisation could not operate without', () => {
    render(<BoardReport />);

    const section = screen
      .getByRole('heading', { name: /could not operate without/i })
      .closest('section')!;
    const rows = within(section).getAllByRole('row').slice(1);

    // Most important first
    expect(rows[0]).toHaveTextContent('Lamplight');
    expect(rows[0]).toHaveTextContent('Nobody named');
    expect(rows[0]).toHaveTextContent('Yes'); // holds personal data
    expect(rows[1]).toHaveTextContent('Xero');
    expect(rows[1]).toHaveTextContent('Priya Shah');
  });

  it('breaks cost down by area', () => {
    render(<BoardReport />);

    const section = screen.getByRole('heading', { name: /where the money goes/i }).closest('section')!;
    expect(within(section).getByText('Service delivery')).toBeInTheDocument();
    expect(within(section).getByText('£1,200')).toBeInTheDocument();
  });

  it('omits the risk section when risk assessment is off', () => {
    render(<BoardReport />);
    expect(screen.queryByRole('heading', { name: /technology risk/i })).not.toBeInTheDocument();
  });

  it('summarises risk in words when risk assessment is on', () => {
    const arch = makeArchitecture();
    arch.metadata.techFreedomEnabled = true;
    arch.systems[0].techFreedomScore = {
      jurisdiction: 4,
      continuity: 4,
      surveillance: 4,
      lockIn: 5,
      costExposure: 4,
      isAutoScored: true,
    };
    currentArchitecture = arch;

    render(<BoardReport />);

    const section = screen.getByRole('heading', { name: /technology risk/i }).closest('section')!;
    expect(within(section).getByText(/critical/i)).toBeInTheDocument();
    expect(within(section).getByText('Lock-in')).toBeInTheDocument();
    expect(within(section).getByText('Xero')).toBeInTheDocument();
  });

  it('shows what to deal with first when risk and importance are both known', () => {
    const arch = makeArchitecture();
    arch.metadata.techFreedomEnabled = true;
    arch.systems[0].techFreedomScore = {
      jurisdiction: 4,
      continuity: 4,
      surveillance: 4,
      lockIn: 4,
      costExposure: 4,
      isAutoScored: true,
    };
    currentArchitecture = arch;

    render(<BoardReport />);

    const section = screen
      .getByRole('heading', { name: /what to deal with first/i })
      .closest('section')!;
    // Xero: importance 9, risk 20
    expect(
      within(section).getByRole('heading', { name: /critical and exposed/i }),
    ).toBeInTheDocument();
    expect(within(section).getByText('Xero')).toBeInTheDocument();
  });

  it('omits what to deal with first when risk assessment is off', () => {
    render(<BoardReport />);

    expect(
      screen.queryByRole('heading', { name: /what to deal with first/i }),
    ).not.toBeInTheDocument();
  });

  it('notes what the figures are based on', () => {
    render(<BoardReport />);
    expect(screen.getByText(/should be checked before decisions/i)).toBeInTheDocument();
  });

  it('prints on request', async () => {
    const user = userEvent.setup();
    const printMock = vi.fn();
    window.print = printMock;

    render(<BoardReport />);
    await user.click(screen.getByRole('button', { name: /print or save as pdf/i }));

    expect(printMock).toHaveBeenCalled();
  });

  it('shows an empty state before anything is mapped', () => {
    currentArchitecture = { ...makeArchitecture(), systems: [] };
    render(<BoardReport />);

    expect(screen.getByRole('heading', { name: /nothing to report yet/i })).toBeInTheDocument();
  });
});
