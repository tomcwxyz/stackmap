import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FunctionPicker } from '@/components/wizard/function-picker';
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

const addFunctionMock = vi.fn().mockReturnValue('mock-id');
const removeFunctionMock = vi.fn();

const mockContextValue: ArchitectureContextValue = {
  architecture: {
    organisation: { id: '1', name: '', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [],
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
  addFunction: addFunctionMock,
  updateFunction: vi.fn(),
  removeFunction: removeFunctionMock,
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
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(null),
  replaceArchitecture: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContextValue,
}));

describe('FunctionPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<FunctionPicker />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<FunctionPicker />);
    expect(
      screen.getByRole('heading', { name: /what does your organisation do/i }),
    ).toBeInTheDocument();
  });

  it('renders all 8 standard functions as checkboxes', () => {
    render(<FunctionPicker />);
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(8);
  });

  it('shows function names and descriptions', () => {
    render(<FunctionPicker />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText(/financial management/i)).toBeInTheDocument();
    expect(screen.getByText('Governance')).toBeInTheDocument();
    expect(screen.getByText('People')).toBeInTheDocument();
    expect(screen.getByText('Fundraising')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Service Delivery')).toBeInTheDocument();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Data & Reporting')).toBeInTheDocument();
  });

  it('has Continue button disabled when nothing is selected', () => {
    render(<FunctionPicker />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue button after selecting a function', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    const financeCheckbox = screen.getAllByRole('checkbox')[0];
    await user.click(financeCheckbox);

    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).not.toBeDisabled();
  });

  it('toggles checkbox selection', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    const checkbox = screen.getAllByRole('checkbox')[0];
    expect(checkbox).not.toBeChecked();

    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    await user.click(checkbox);
    expect(checkbox).not.toBeChecked();
  });

  it('calls addFunction and navigates on Continue', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    // Select Finance (first checkbox)
    await user.click(screen.getAllByRole('checkbox')[0]);
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(addFunctionMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Finance', type: 'finance' }),
    );
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions/systems');
  });

  it('shows "Add your own" button', () => {
    render(<FunctionPicker />);
    expect(screen.getByText(/something missing\? add your own/i)).toBeInTheDocument();
  });

  it('reveals input when "Add your own" is clicked', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    await user.click(screen.getByText(/something missing\? add your own/i));
    expect(screen.getByLabelText(/what would you like to call it/i)).toBeInTheDocument();
  });

  it('adds a custom function and enables Continue', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    await user.click(screen.getByText(/something missing\? add your own/i));
    const input = screen.getByLabelText(/what would you like to call it/i);
    await user.type(input, 'Advocacy');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    // Custom function appears in the list
    expect(screen.getByText('Advocacy')).toBeInTheDocument();

    // Continue should be enabled
    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('removes a custom function', async () => {
    const user = userEvent.setup();
    render(<FunctionPicker />);

    // Add a custom function
    await user.click(screen.getByText(/something missing\? add your own/i));
    await user.type(screen.getByLabelText(/what would you like to call it/i), 'Research');
    await user.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText('Research')).toBeInTheDocument();

    // Remove it
    await user.click(screen.getByRole('button', { name: /remove research/i }));
    expect(screen.queryByText('Research')).not.toBeInTheDocument();
  });

  it('has a Back link to /wizard', () => {
    render(<FunctionPicker />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard');
  });

  describe('functions specific to the kind of organisation', () => {
    function withOrgType(type: 'charity' | 'council' | 'private_business') {
      mockContextValue.architecture = {
        ...mockContextValue.architecture!,
        organisation: { ...mockContextValue.architecture!.organisation, type },
        functions: [],
      };
    }

    afterEach(() => {
      withOrgType('charity');
    });

    it('offers nothing extra to a charity', () => {
      withOrgType('charity');
      render(<FunctionPicker />);

      expect(screen.queryByTestId('sector-functions')).not.toBeInTheDocument();
    });

    it('offers council functions to a council', () => {
      withOrgType('council');
      render(<FunctionPicker />);

      const section = screen.getByTestId('sector-functions');
      expect(within(section).getByText('Revenues & Benefits')).toBeInTheDocument();
      expect(within(section).getByText('Adult Social Care')).toBeInTheDocument();
    });

    it('offers business functions to a business', () => {
      withOrgType('private_business');
      render(<FunctionPicker />);

      expect(within(screen.getByTestId('sector-functions')).getByText('Sales')).toBeInTheDocument();
    });

    it('adds a chosen one as a custom function, with its description', async () => {
      withOrgType('council');
      const user = userEvent.setup();
      render(<FunctionPicker />);

      await user.click(screen.getByRole('checkbox', { name: /revenues & benefits/i }));
      await user.click(screen.getByRole('button', { name: /^continue$/i }));

      expect(addFunctionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Revenues & Benefits',
          type: 'custom',
          description: expect.stringMatching(/council tax/i),
        }),
      );
    });

    it('can be unticked again', async () => {
      withOrgType('council');
      const user = userEvent.setup();
      render(<FunctionPicker />);

      const checkbox = screen.getByRole('checkbox', { name: /revenues & benefits/i });
      await user.click(checkbox);
      await user.click(checkbox);

      expect(checkbox).not.toBeChecked();
    });
  });
});
