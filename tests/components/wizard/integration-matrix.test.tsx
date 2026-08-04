import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IntegrationMatrix } from '@/components/wizard/integration-matrix';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';

// ─── Mocks ───

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/wizard/functions/integrations',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const addIntegrationMock = vi.fn().mockReturnValue('mock-intg-id');
const removeIntegrationMock = vi.fn();

const makeMock = (systemCount: number): ArchitectureContextValue => ({
  architecture: {
    organisation: { id: '1', name: 'Test Org', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance', isActive: true }],
    services: [],
    systems: Array.from({ length: systemCount }, (_, i) => ({
      id: `sys-${i + 1}`,
      name: `System ${i + 1}`,
      type: 'other' as const,
      hosting: 'cloud' as const,
      status: 'active' as const,
      functionIds: ['fn-1'],
      serviceIds: [],
    })),
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'function_first' },
  },
  isLoading: false,
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
  addIntegration: addIntegrationMock,
  removeIntegration: removeIntegrationMock,
  addOwner: vi.fn().mockReturnValue(''),
  removeOwner: vi.fn(),
  addExternalParty: vi.fn().mockReturnValue(''),
  updateExternalParty: vi.fn(),
  removeExternalParty: vi.fn(),
  addDataFlow: vi.fn().mockReturnValue(''),
  updateDataFlow: vi.fn(),
  removeDataFlow: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(null),
  replaceArchitecture: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
});

let currentMock = makeMock(2);

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => currentMock,
}));

describe('IntegrationMatrix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMock = makeMock(2);
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<IntegrationMatrix />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<IntegrationMatrix />);
    expect(
      screen.getByRole('heading', { name: /how do your systems connect/i }),
    ).toBeInTheDocument();
  });

  it('shows a message when fewer than 2 systems exist', () => {
    currentMock = makeMock(1);
    render(<IntegrationMatrix />);
    expect(screen.getByText(/you need at least two systems/i)).toBeInTheDocument();
  });

  it('shows from/to system dropdowns', () => {
    render(<IntegrationMatrix />);
    expect(screen.getByLabelText(/from system/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/to system/i)).toBeInTheDocument();
  });

  it('disables add button when no systems selected', () => {
    render(<IntegrationMatrix />);
    expect(screen.getByRole('button', { name: /add connection/i })).toBeDisabled();
  });

  it('can add a connection between two systems', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    expect(screen.getByText(/connections added/i)).toBeInTheDocument();
    // System names appear in both the list and the dropdowns, so use getAllByText
    expect(screen.getAllByText('System 1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('System 2').length).toBeGreaterThanOrEqual(1);
  });

  it('can remove an added connection', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    await user.click(screen.getByRole('button', { name: /remove connection/i }));
    expect(screen.queryByText(/connections added/i)).not.toBeInTheDocument();
  });

  it('shows integration type, direction, frequency and reliability selects', () => {
    render(<IntegrationMatrix />);
    expect(screen.getByLabelText(/how are they connected/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/direction/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how often/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/how well does it work/i)).toBeInTheDocument();
  });

  it('records how well a connection works', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.selectOptions(screen.getByLabelText(/how well does it work/i), 'fragile');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    expect(addIntegrationMock).toHaveBeenCalledWith(
      expect.objectContaining({ reliability: 'fragile' }),
    );
  });

  it('flags a fragile connection in the list', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.selectOptions(screen.getByLabelText(/how well does it work/i), 'fragile');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    expect(screen.getByText('Fragile')).toBeInTheDocument();
  });

  it('defaults reliability to unknown when not answered', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    expect(addIntegrationMock).toHaveBeenCalledWith(
      expect.objectContaining({ reliability: 'unknown' }),
    );
  });

  it('saves a connection as soon as it is added, not on continue', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));

    // The user may now leave via the stepper rather than Continue, so the
    // connection has to be in the architecture already
    expect(addIntegrationMock).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
      }),
    );
  });

  it('removes a connection from the architecture straight away', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));
    await user.click(screen.getByRole('button', { name: /remove connection/i }));

    expect(removeIntegrationMock).toHaveBeenCalledWith('mock-intg-id');
  });

  it('only navigates on continue, without rewriting what was added', async () => {
    const user = userEvent.setup();
    render(<IntegrationMatrix />);

    await user.selectOptions(screen.getByLabelText(/from system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to system/i), 'sys-2');
    await user.click(screen.getByRole('button', { name: /add connection/i }));
    addIntegrationMock.mockClear();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(addIntegrationMock).not.toHaveBeenCalled();
    expect(removeIntegrationMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions/owners');
  });

  it('has a Back link to data', () => {
    render(<IntegrationMatrix />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/wizard/functions/data',
    );
  });
});
