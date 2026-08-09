import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FunctionTagger } from '@/components/wizard/function-tagger';
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

const addFunctionMock = vi.fn().mockReturnValue('fn-id');
const removeFunctionMock = vi.fn();
const updateSystemMock = vi.fn();

function createMockContext(
  overrides: Partial<ArchitectureContextValue> = {},
): ArchitectureContextValue {
  return {
    architecture: {
      organisation: { id: '1', name: 'Test Org', type: 'charity', createdAt: '', updatedAt: '' },
      functions: [],
      services: [
        { id: 'svc-1', name: 'Youth mentoring', status: 'active', functionIds: [], systemIds: [] },
      ],
      systems: [
        { id: 'sys-1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: ['svc-1'] },
        { id: 'sys-2', name: 'Lamplight', type: 'case_management', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: ['svc-1'] },
      ],
      dataCategories: [],
      integrations: [],
      owners: [],
      externalParties: [],
      dataFlows: [],
      metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'service_first' },
    },
    isLoading: false,
    updateOrganisation: vi.fn(),
    addFunction: addFunctionMock,
    updateFunction: vi.fn(),
    removeFunction: removeFunctionMock,
    addService: vi.fn().mockReturnValue(''),
    updateService: vi.fn(),
    removeService: vi.fn(),
    addSystem: vi.fn().mockReturnValue(''),
    updateSystem: updateSystemMock,
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
    setTechFreedomEnabled: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    getArchitecture: vi.fn().mockReturnValue(null),
    replaceArchitecture: vi.fn(),
    clearSection: vi.fn(),
    ...overrides,
  };
}

let mockContext: ArchitectureContextValue;

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext,
}));

describe('FunctionTagger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContext = createMockContext();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FunctionTagger />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<FunctionTagger />);
    expect(
      screen.getByRole('heading', { name: /which areas do these systems support/i }),
    ).toBeInTheDocument();
  });

  it('renders all 8 standard functions as checkboxes', () => {
    render(<FunctionTagger />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Fundraising')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Service Delivery')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Data & Reporting')).toBeInTheDocument();
  });

  it('has Continue button disabled when nothing is selected', () => {
    render(<FunctionTagger />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue button after selecting a function', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    // Click the first function checkbox (Finance)
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('shows system assignments when a function is selected', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    // Select Finance function
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    // Should show system names as assignable checkboxes
    expect(screen.getByText('Systems tagged')).toBeInTheDocument();
    // Xero is a finance system, should be auto-tagged
    expect(screen.getByText('Xero')).toBeInTheDocument();
    expect(screen.getByText('Lamplight')).toBeInTheDocument();
  });

  it('auto-assigns systems based on type', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    // Select Finance — Xero is type 'finance', should be auto-checked
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]); // Finance function checkbox

    // After clicking Finance, system assignment checkboxes appear
    // Xero (finance type) should be auto-checked for Finance function
    const allCheckboxes = screen.getAllByRole('checkbox');
    // Find the Xero system checkbox (after the function checkboxes)
    const xeroCheckbox = allCheckboxes.find((cb) => {
      const label = cb.closest('label');
      return label && label.textContent?.includes('Xero');
    });
    expect(xeroCheckbox).toBeChecked();
  });

  it('calls addFunction and navigates on Continue', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    // Select Finance
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(addFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Finance', type: 'finance' }),
    );
    expect(pushMock).toHaveBeenCalledWith('/wizard/services/data');
  });

  it('has a Back link to /wizard/services/systems', () => {
    render(<FunctionTagger />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard/services/systems');
  });

  it('shows selection count', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    expect(screen.getByText(/1 function selected/i)).toBeInTheDocument();
  });

  it('updates systems with functionIds on Continue', async () => {
    const user = userEvent.setup();
    render(<FunctionTagger />);

    // Select Finance (Xero is auto-assigned as finance type)
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await user.click(screen.getByRole('button', { name: /continue/i }));

    // updateSystem should be called for Xero (it's auto-assigned to Finance)
    expect(updateSystemMock).toHaveBeenCalledWith(
      'sys-1',
      expect.objectContaining({ functionIds: expect.arrayContaining(['fn-id']) }),
    );
  });

  describe('state stability across navigation', () => {
    // Regression: revisiting must not rotate function IDs nor drop custom
    // functions. See PLAN.md "Wizard state stability".
    it('does not remove existing standard functions on Continue', async () => {
      const user = userEvent.setup();
      mockContext = createMockContext({
        architecture: {
          ...createMockContext().architecture!,
          functions: [
            { id: 'existing-fn-1', name: 'Finance', type: 'finance', isActive: true },
          ],
          systems: [
            { id: 'sys-1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['existing-fn-1'], serviceIds: ['svc-1'] },
          ],
        },
      });

      render(<FunctionTagger />);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(removeFunctionMock).not.toHaveBeenCalledWith('existing-fn-1');
    });

    it('preserves custom functions on Continue', async () => {
      const user = userEvent.setup();
      mockContext = createMockContext({
        architecture: {
          ...createMockContext().architecture!,
          functions: [
            { id: 'custom-1', name: 'Volunteer engagement', type: 'custom', isActive: true },
          ],
        },
      });

      render(<FunctionTagger />);
      // Select something so Continue is enabled
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);
      await user.click(screen.getByRole('button', { name: /continue/i }));

      expect(removeFunctionMock).not.toHaveBeenCalledWith('custom-1');
    });
  });
});
