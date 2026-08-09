import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionSystems } from '@/components/wizard/function-systems';
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
      functions: [
        { id: 'fn-1', name: 'Finance', type: 'finance', description: 'Financial management', isActive: true },
        { id: 'fn-2', name: 'People', type: 'people', description: 'HR and staff', isActive: true },
      ],
      services: [],
      systems: [],
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
    addSystem: addSystemMock,
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
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getArchitecture: vi.fn().mockReturnValue(null),
    replaceArchitecture: vi.fn(),
    clearSection: vi.fn(),
    setTechFreedomEnabled: vi.fn(),
    ...overrides,
  };
}

let mockContext: ArchitectureContextValue;

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext,
}));

describe('FunctionSystems', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FunctionSystems />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<FunctionSystems />);
    expect(
      screen.getByRole('heading', { name: /what software do you use/i }),
    ).toBeInTheDocument();
  });

  it('shows function tabs', () => {
    render(<FunctionSystems />);
    expect(screen.getByRole('tab', { name: /finance/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /people/i })).toBeInTheDocument();
  });

  it('first function tab is selected by default', () => {
    render(<FunctionSystems />);
    const financeTab = screen.getByRole('tab', { name: /finance/i });
    expect(financeTab).toHaveAttribute('aria-selected', 'true');
  });

  it('switches active function on tab click', async () => {
    const user = userEvent.setup();
    render(<FunctionSystems />);

    const peopleTab = screen.getByRole('tab', { name: /people/i });
    await user.click(peopleTab);
    expect(peopleTab).toHaveAttribute('aria-selected', 'true');

    const financeTab = screen.getByRole('tab', { name: /finance/i });
    expect(financeTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders system form fields', () => {
    render(<FunctionSystems />);
    expect(screen.getByLabelText(/system name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/system type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/vendor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/hosting/i)).toBeInTheDocument();
  });

  it('disables Add system button when name is empty', () => {
    render(<FunctionSystems />);
    expect(screen.getByRole('button', { name: /add system/i })).toBeDisabled();
  });

  it('adds a system to the current function', async () => {
    const user = userEvent.setup();
    render(<FunctionSystems />);

    await user.type(screen.getByLabelText(/system name/i), 'Xero');
    await user.selectOptions(screen.getByLabelText(/system type/i), 'finance');
    await user.click(screen.getByRole('button', { name: /add system/i }));

    // System appears in the list
    expect(screen.getByText('Xero')).toBeInTheDocument();
  });

  it('removes a system from the list', async () => {
    const user = userEvent.setup();
    render(<FunctionSystems />);

    await user.type(screen.getByLabelText(/system name/i), 'Sage');
    await user.click(screen.getByRole('button', { name: /add system/i }));
    expect(screen.getByText('Sage')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove sage/i }));
    expect(screen.queryByText('Sage')).not.toBeInTheDocument();
  });

  it('clears the form after adding a system', async () => {
    const user = userEvent.setup();
    render(<FunctionSystems />);

    const nameInput = screen.getByLabelText(/system name/i);
    await user.type(nameInput, 'QuickBooks');
    await user.click(screen.getByRole('button', { name: /add system/i }));

    expect(nameInput).toHaveValue('');
  });

  it('has a Back link to /wizard/functions', () => {
    render(<FunctionSystems />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard/functions');
  });

  it('shows empty state when no functions are selected', () => {
    mockContext = createMockContext({
      architecture: {
        ...createMockContext().architecture!,
        functions: [],
      },
    });
    render(<FunctionSystems />);
    expect(screen.getByText(/no functions selected/i)).toBeInTheDocument();
  });

  it('shows the tab panel associated with the active tab', () => {
    render(<FunctionSystems />);
    const panel = screen.getByRole('tabpanel');
    expect(panel).toBeInTheDocument();
    expect(panel).toHaveAttribute('aria-labelledby', 'tab-fn-1');
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
      render(<FunctionSystems />);

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
      // Default mock context has no techFreedomEnabled (falsy)
      mockContext = createMockContext();
      render(<FunctionSystems />);

      const nameInput = screen.getByLabelText(/system name/i);
      await user.type(nameInput, 'Xero');
      await user.tab();
      await user.click(screen.getByRole('button', { name: /add system/i }));

      expect(screen.queryByTestId('risk-indicator')).not.toBeInTheDocument();
    });
  });

  describe('state stability across navigation', () => {
    // Regression: pressing Continue must not rotate system IDs nor drop fields
    // such as `importance`, `serviceIds`, or multi-function links. See PLAN.md
    // "Wizard state stability" for the full rationale.
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
              name: 'Xero',
              type: 'finance',
              hosting: 'cloud',
              status: 'active',
              functionIds: ['fn-1'],
              serviceIds: ['svc-1'],
              importance: 5,
            },
          ],
        },
        removeSystem,
        addSystem,
      });

      render(<FunctionSystems />);
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(removeSystem).not.toHaveBeenCalled();
      // Continue must not create a duplicate system with the same name.
      const recreatedXero = addSystem.mock.calls.find(
        ([payload]) => payload?.name === 'Xero',
      );
      expect(recreatedXero).toBeUndefined();
    });

    it('preserves multi-function links on Continue', async () => {
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
              functionIds: ['fn-1', 'fn-2'],
              serviceIds: [],
            },
          ],
        },
        updateSystem,
        removeSystem,
      });

      render(<FunctionSystems />);
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(removeSystem).not.toHaveBeenCalled();
      // If updateSystem was called for s1, functionIds must still contain both.
      for (const [id, updates] of updateSystem.mock.calls) {
        if (id === 's1' && Array.isArray(updates?.functionIds)) {
          expect(updates.functionIds).toEqual(
            expect.arrayContaining(['fn-1', 'fn-2']),
          );
        }
      }
    });
  });
});
