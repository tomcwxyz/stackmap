import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataForm } from '@/components/wizard/data-form';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';

// ─── Mocks ───

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/wizard/functions/data',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const addDataCategoryMock = vi.fn().mockReturnValue('mock-dc-id');
const removeDataCategoryMock = vi.fn();

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
  addDataCategory: addDataCategoryMock,
  removeDataCategory: removeDataCategoryMock,
  addIntegration: vi.fn().mockReturnValue(''),
  removeIntegration: vi.fn(),
  addOwner: vi.fn().mockReturnValue(''),
  removeOwner: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(null),
  replaceArchitecture: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContextValue,
}));

describe('DataForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<DataForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<DataForm />);
    expect(
      screen.getByRole('heading', { name: /what kinds of data/i }),
    ).toBeInTheDocument();
  });

  it('shows common data categories as buttons', () => {
    render(<DataForm />);
    expect(screen.getByRole('button', { name: 'Client Records' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Financial Transactions' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Case Notes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Staff Records' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Donor Information' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Impact Data' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Communications' })).toBeInTheDocument();
  });

  it('shows configuration form when a common category is clicked', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Client Records' }));

    expect(screen.getByText(/configure: client records/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/sensitivity level/i)).toBeInTheDocument();
  });

  it('has no accessibility violations on the configuration form', async () => {
    const user = userEvent.setup();
    const { container } = render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Client Records' }));
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows system checkboxes for assignment', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Client Records' }));

    expect(screen.getByText('Xero')).toBeInTheDocument();
    expect(screen.getByText('Salesforce')).toBeInTheDocument();
  });

  it('can add a data category and show it in the list', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Client Records' }));
    await user.click(screen.getByRole('button', { name: /add data category/i }));

    expect(screen.getByText('Client Records')).toBeInTheDocument();
  });

  it('can add a custom category', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.type(screen.getByLabelText(/or type your own/i), 'Volunteer records');
    await user.click(screen.getByRole('button', { name: /use/i }));

    // Should show configuration with the custom name
    expect(screen.getByText(/configure: volunteer records/i)).toBeInTheDocument();
  });

  it('can remove an added data category', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Staff Records' }));
    await user.click(screen.getByRole('button', { name: /add data category/i }));

    await user.click(screen.getByRole('button', { name: /remove staff records/i }));
    // The category button should reappear in common categories
    expect(screen.getByRole('button', { name: 'Staff Records' })).toBeInTheDocument();
  });

  it('saves a category as soon as it is added, not on continue', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Financial Transactions' }));
    await user.click(screen.getByRole('button', { name: /add data category/i }));

    // The user may now leave via the stepper rather than Continue, so the
    // category has to be in the architecture already
    expect(addDataCategoryMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Financial Transactions', sensitivity: 'internal' }),
    );
  });

  it('removes a category from the architecture straight away', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Staff Records' }));
    await user.click(screen.getByRole('button', { name: /add data category/i }));
    await user.click(screen.getByRole('button', { name: /remove staff records/i }));

    expect(removeDataCategoryMock).toHaveBeenCalledWith('mock-dc-id');
  });

  it('only navigates on continue, without rewriting what was added', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Financial Transactions' }));
    await user.click(screen.getByRole('button', { name: /add data category/i }));
    addDataCategoryMock.mockClear();

    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    expect(addDataCategoryMock).not.toHaveBeenCalled();
    expect(removeDataCategoryMock).not.toHaveBeenCalled();
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions/integrations');
  });

  it('has a personal data checkbox', async () => {
    const user = userEvent.setup();
    render(<DataForm />);
    await user.click(screen.getByRole('button', { name: 'Client Records' }));

    const checkbox = screen.getByRole('checkbox', { name: /contains personal data/i });
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();
  });

  it('has a Back link to services', () => {
    render(<DataForm />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/wizard/functions/services',
    );
  });
});
