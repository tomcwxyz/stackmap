import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceSystems } from '@/components/wizard/service-systems';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';

// ─── Mocks ───

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const addSystemMock = vi.fn().mockReturnValue('sys-id');

function createMockContext(
  overrides: Partial<ArchitectureContextValue> = {},
): ArchitectureContextValue {
  return {
    architecture: {
      organisation: { id: '1', name: 'Test Org', type: 'charity', createdAt: '', updatedAt: '' },
      functions: [],
      services: [
        { id: 'svc-1', name: 'Youth mentoring', description: 'Mentoring for young people', status: 'active', functionIds: [], systemIds: [] },
        { id: 'svc-2', name: 'Advice sessions', status: 'active', functionIds: [], systemIds: [] },
      ],
      systems: [],
      dataCategories: [],
      integrations: [],
      owners: [],
      metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'service_first' },
    },
    isLoading: false,
    updateOrganisation: vi.fn(),
    addFunction: vi.fn().mockReturnValue(''),
    updateFunction: vi.fn(),
    removeFunction: vi.fn(),
    addService: vi.fn().mockReturnValue(''),
    updateService: vi.fn(),
    removeService: vi.fn(),
    addSystem: addSystemMock,
    updateSystem: vi.fn(),
    removeSystem: vi.fn(),
    addDataCategory: vi.fn().mockReturnValue(''),
    removeDataCategory: vi.fn(),
    addIntegration: vi.fn().mockReturnValue(''),
    removeIntegration: vi.fn(),
    addOwner: vi.fn().mockReturnValue(''),
    removeOwner: vi.fn(),
    setTechFreedomEnabled: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getArchitecture: vi.fn().mockReturnValue(null),
    replaceArchitecture: vi.fn(),
    ...overrides,
  };
}

let mockContext: ArchitectureContextValue;

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext,
}));

describe('ServiceSystems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ServiceSystems />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<ServiceSystems />);
    expect(
      screen.getByRole('heading', { name: /what software do you use/i }),
    ).toBeInTheDocument();
  });

  it('shows service tabs', () => {
    render(<ServiceSystems />);
    expect(screen.getByRole('tab', { name: /youth mentoring/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /advice sessions/i })).toBeInTheDocument();
  });

  it('first service tab is selected by default', () => {
    render(<ServiceSystems />);
    const firstTab = screen.getByRole('tab', { name: /youth mentoring/i });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches active service on tab click', async () => {
    const user = userEvent.setup();
    render(<ServiceSystems />);

    const adviceTab = screen.getByRole('tab', { name: /advice sessions/i });
    await user.click(adviceTab);
    expect(adviceTab).toHaveAttribute('aria-selected', 'true');

    const youthTab = screen.getByRole('tab', { name: /youth mentoring/i });
    expect(youthTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders system form fields', () => {
    render(<ServiceSystems />);
    expect(screen.getByLabelText(/system name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hosting/i)).toBeInTheDocument();
  });

  it('disables Add system button when name is empty', () => {
    render(<ServiceSystems />);
    expect(screen.getByRole('button', { name: /add system/i })).toBeDisabled();
  });

  it('adds a system to the current service', async () => {
    const user = userEvent.setup();
    render(<ServiceSystems />);

    await user.type(screen.getByLabelText(/system name/i), 'Lamplight');
    await user.click(screen.getByRole('button', { name: /add system/i }));

    expect(screen.getByText('Lamplight')).toBeInTheDocument();
  });

  it('removes a system from the list', async () => {
    const user = userEvent.setup();
    render(<ServiceSystems />);

    await user.type(screen.getByLabelText(/system name/i), 'Inform');
    await user.click(screen.getByRole('button', { name: /add system/i }));
    expect(screen.getByText('Inform')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove inform/i }));
    expect(screen.queryByText('Inform')).not.toBeInTheDocument();
  });

  it('clears the form after adding a system', async () => {
    const user = userEvent.setup();
    render(<ServiceSystems />);

    const nameInput = screen.getByLabelText(/system name/i);
    await user.type(nameInput, 'Salesforce');
    await user.click(screen.getByRole('button', { name: /add system/i }));

    expect(nameInput).toHaveValue('');
  });

  it('has a Back link to /wizard/services', () => {
    render(<ServiceSystems />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard/services');
  });

  it('shows empty state when no services exist', () => {
    mockContext = createMockContext({
      architecture: {
        ...createMockContext().architecture!,
        services: [],
      },
    });
    render(<ServiceSystems />);
    expect(screen.getByText(/no services added/i)).toBeInTheDocument();
  });

  it('shows the tab panel associated with the active tab', () => {
    render(<ServiceSystems />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-svc-1');
  });

  it('navigates to /wizard/services/importance on Continue', async () => {
    const user = userEvent.setup();
    render(<ServiceSystems />);

    await user.click(screen.getByRole('button', { name: /continue/i }));
    expect(pushMock).toHaveBeenCalledWith('/wizard/services/importance');
  });

  describe('TechFreedom integration', () => {
    it('shows risk indicator for known tool when techFreedomEnabled is true', async () => {
      const user = userEvent.setup();
      mockContext = createMockContext({
        architecture: {
          ...createMockContext().architecture!,
          metadata: {
            ...createMockContext().architecture!.metadata,
            techFreedomEnabled: true,
          },
        },
      });
      render(<ServiceSystems />);

      const nameInput = screen.getByLabelText(/system name/i);
      await user.type(nameInput, 'Xero');
      // Trigger blur to run matching
      await user.tab();
      await user.click(screen.getByRole('button', { name: /add system/i }));

      expect(screen.getByTestId('risk-indicator')).toBeInTheDocument();
      expect(screen.getByTestId('risk-indicator')).toHaveTextContent(/risk:/i);
    });

    it('does NOT show risk indicator when techFreedomEnabled is false', async () => {
      const user = userEvent.setup();
      mockContext = createMockContext();
      render(<ServiceSystems />);

      const nameInput = screen.getByLabelText(/system name/i);
      await user.type(nameInput, 'Xero');
      await user.tab();
      await user.click(screen.getByRole('button', { name: /add system/i }));

      expect(screen.queryByTestId('risk-indicator')).not.toBeInTheDocument();
    });
  });

  describe('state stability across navigation', () => {
    // Regression: pressing Continue must not rotate system IDs nor wipe
    // functionIds set in the other wizard step. See PLAN.md "Wizard state
    // stability".
    it('does not remove or recreate existing systems on Continue', async () => {
      const user = userEvent.setup();
      const removeSystem = vi.fn();
      const addSystem = vi.fn().mockReturnValue('new-id');
      mockContext = createMockContext({
        architecture: {
          ...createMockContext().architecture!,
          systems: [
            {
              id: 's1',
              name: 'Salesforce',
              type: 'crm',
              hosting: 'cloud',
              status: 'active',
              functionIds: ['fn-1'],
              serviceIds: ['svc-1'],
              importance: 4,
            },
          ],
        },
        removeSystem,
        addSystem,
      });

      render(<ServiceSystems />);
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(removeSystem).not.toHaveBeenCalled();
      const recreated = addSystem.mock.calls.find(
        ([payload]) => payload?.name === 'Salesforce',
      );
      expect(recreated).toBeUndefined();
    });

    it('preserves functionIds when continuing', async () => {
      const user = userEvent.setup();
      const updateSystem = vi.fn();
      const removeSystem = vi.fn();
      mockContext = createMockContext({
        architecture: {
          ...createMockContext().architecture!,
          systems: [
            {
              id: 's1',
              name: 'Notion',
              type: 'document_management',
              hosting: 'cloud',
              status: 'active',
              functionIds: ['fn-1'],
              serviceIds: ['svc-1'],
            },
          ],
        },
        updateSystem,
        removeSystem,
      });

      render(<ServiceSystems />);
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(removeSystem).not.toHaveBeenCalled();
      for (const [id, updates] of updateSystem.mock.calls) {
        if (id === 's1' && Object.prototype.hasOwnProperty.call(updates, 'functionIds')) {
          expect(updates.functionIds).toEqual(expect.arrayContaining(['fn-1']));
        }
      }
    });
  });
});
