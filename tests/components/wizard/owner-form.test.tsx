import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OwnerForm } from '@/components/wizard/owner-form';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';

// ─── Mocks ───

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/wizard/functions/owners',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const addOwnerMock = vi.fn().mockReturnValue('mock-owner-id');
const updateSystemMock = vi.fn();

const mockContextValue: ArchitectureContextValue = {
  architecture: {
    organisation: { id: '1', name: 'Test Org', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance', isActive: true }],
    services: [],
    systems: [
      { id: 'sys-1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['fn-1'], serviceIds: [] },
      { id: 'sys-2', name: 'Salesforce', type: 'crm', hosting: 'cloud', status: 'active', functionIds: ['fn-1'], serviceIds: [] },
    ],
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
  updateSystem: updateSystemMock,
  removeSystem: vi.fn(),
  addDataCategory: vi.fn().mockReturnValue(''),
  updateDataCategory: vi.fn(),
  removeDataCategory: vi.fn(),
  addIntegration: vi.fn().mockReturnValue(''),
  removeIntegration: vi.fn(),
  addOwner: addOwnerMock,
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
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContextValue,
}));

describe('OwnerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<OwnerForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<OwnerForm />);
    expect(
      screen.getByRole('heading', { name: /who is responsible/i }),
    ).toBeInTheDocument();
  });

  it('says which systems have no owner yet, without demanding one', () => {
    render(<OwnerForm />);

    expect(screen.getByText(/no owner yet for/i)).toBeInTheDocument();
    // Names appear in the note and in the dropdown, so match the note's list
    expect(screen.getByText(/Xero, Salesforce/)).toBeInTheDocument();
    expect(screen.getByText(/that is fine — you can continue/i)).toBeInTheDocument();
  });

  it('lets the step be left without naming a single owner', () => {
    // Nobody should be stuck here because they do not know who looks after a
    // system, and plenty of small organisations have no single answer
    render(<OwnerForm />);

    expect(screen.getByRole('button', { name: /continue/i })).toBeEnabled();
  });

  it('says up front that this can be filled in later', () => {
    render(<OwnerForm />);

    expect(screen.getByText(/come back to it later/i)).toBeInTheDocument();
  });

  it('has name, role, external checkbox, and system assignment fields', () => {
    render(<OwnerForm />);
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/role/i)).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: /external/i })).toBeInTheDocument();
    expect(screen.getByText(/assign to systems/i)).toBeInTheDocument();
  });

  it('disables add button when name is empty', () => {
    render(<OwnerForm />);
    expect(screen.getByRole('button', { name: /add owner/i })).toBeDisabled();
  });

  it('can add an owner and show it in the list', async () => {
    const user = userEvent.setup();
    render(<OwnerForm />);

    await user.type(screen.getByLabelText(/^name/i), 'Sarah Jones');
    await user.type(screen.getByLabelText(/role/i), 'Finance Manager');
    await user.click(screen.getByRole('button', { name: /add owner/i }));

    expect(screen.getByText('Sarah Jones')).toBeInTheDocument();
    expect(screen.getByText('Finance Manager')).toBeInTheDocument();
  });

  it('can mark an owner as external', async () => {
    const user = userEvent.setup();
    render(<OwnerForm />);

    await user.type(screen.getByLabelText(/^name/i), 'IT Support Co');
    await user.click(screen.getByRole('checkbox', { name: /external/i }));
    await user.click(screen.getByRole('button', { name: /add owner/i }));

    expect(screen.getByText('External')).toBeInTheDocument();
  });

  it('can remove an added owner', async () => {
    const user = userEvent.setup();
    render(<OwnerForm />);

    await user.type(screen.getByLabelText(/^name/i), 'John Smith');
    await user.click(screen.getByRole('button', { name: /add owner/i }));
    expect(screen.getByText('John Smith')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove john smith/i }));
    expect(screen.queryByText('John Smith')).not.toBeInTheDocument();
  });

  it('calls addOwner and updateSystem on continue', async () => {
    const user = userEvent.setup();
    render(<OwnerForm />);

    await user.type(screen.getByLabelText(/^name/i), 'Sarah Jones');
    await user.click(screen.getByRole('checkbox', { name: /xero/i }));
    await user.click(screen.getByRole('button', { name: /add owner/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(addOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sarah Jones' }),
    );
    expect(updateSystemMock).toHaveBeenCalledWith('sys-1', { ownerId: 'mock-owner-id' });
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions/review');
  });

  it('allows assigning multiple systems to one owner', async () => {
    const user = userEvent.setup();
    render(<OwnerForm />);

    await user.type(screen.getByLabelText(/^name/i), 'Sarah Jones');
    await user.click(screen.getByRole('checkbox', { name: /xero/i }));
    await user.click(screen.getByRole('checkbox', { name: /salesforce/i }));
    await user.click(screen.getByRole('button', { name: /add owner/i }));
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(addOwnerMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Sarah Jones' }),
    );
    expect(updateSystemMock).toHaveBeenCalledWith('sys-1', { ownerId: 'mock-owner-id' });
    expect(updateSystemMock).toHaveBeenCalledWith('sys-2', { ownerId: 'mock-owner-id' });
  });

  it('has a Back link to integrations', () => {
    render(<OwnerForm />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/wizard/functions/integrations',
    );
  });
});
