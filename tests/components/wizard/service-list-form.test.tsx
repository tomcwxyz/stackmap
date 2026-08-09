import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ServiceListForm } from '@/components/wizard/service-list-form';
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

const addServiceMock = vi.fn().mockReturnValue('svc-id');
const removeServiceMock = vi.fn();

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
    metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'service_first' },
  },
  isLoading: false,
  updateOrganisation: vi.fn(),
  addFunction: vi.fn().mockReturnValue(''),
  updateFunction: vi.fn(),
  removeFunction: vi.fn(),
  addService: addServiceMock,
  updateService: vi.fn(),
  removeService: removeServiceMock,
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
  setTechFreedomEnabled: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(null),
  replaceArchitecture: vi.fn(),
  clearSection: vi.fn(),
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContextValue,
}));

describe('ServiceListForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ServiceListForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<ServiceListForm />);
    expect(
      screen.getByRole('heading', { name: /what services does your organisation deliver/i }),
    ).toBeInTheDocument();
  });

  it('shows example services', () => {
    render(<ServiceListForm />);
    expect(screen.getByText('Advice sessions')).toBeInTheDocument();
    expect(screen.getByText('Grant distribution')).toBeInTheDocument();
    expect(screen.getByText('Youth programmes')).toBeInTheDocument();
  });

  it('has Continue button disabled when no services added', () => {
    render(<ServiceListForm />);
    const continueBtn = screen.getByRole('button', { name: /continue/i });
    expect(continueBtn).toBeDisabled();
  });

  it('enables Continue button after adding a service', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    await user.type(screen.getByLabelText(/service name/i), 'Youth mentoring');
    await user.click(screen.getByRole('button', { name: /add service/i }));

    expect(screen.getByRole('button', { name: /continue/i })).not.toBeDisabled();
  });

  it('adds a service to the list', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    await user.type(screen.getByLabelText(/service name/i), 'Debt counselling');
    await user.click(screen.getByRole('button', { name: /add service/i }));

    expect(screen.getByText('Debt counselling')).toBeInTheDocument();
  });

  it('clears the form after adding a service', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    const nameInput = screen.getByLabelText(/service name/i);
    await user.type(nameInput, 'Training courses');
    await user.click(screen.getByRole('button', { name: /add service/i }));

    expect(nameInput).toHaveValue('');
  });

  it('removes a service from the list', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    await user.type(screen.getByLabelText(/service name/i), 'Debt counselling');
    await user.click(screen.getByRole('button', { name: /add service/i }));
    expect(screen.getByText('Debt counselling')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /remove debt counselling/i }));
    expect(screen.queryByText('Debt counselling')).not.toBeInTheDocument();
  });

  it('disables Add service button when name is empty', () => {
    render(<ServiceListForm />);
    expect(screen.getByRole('button', { name: /add service/i })).toBeDisabled();
  });

  it('calls addService and navigates on Continue', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    await user.type(screen.getByLabelText(/service name/i), 'Community events');
    await user.click(screen.getByRole('button', { name: /add service/i }));
    await user.click(screen.getByRole('button', { name: /continue/i }));

    expect(addServiceMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Community events', status: 'active' }),
    );
    expect(pushMock).toHaveBeenCalledWith('/wizard/services/systems');
  });

  it('has a Back link to /wizard', () => {
    render(<ServiceListForm />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard');
  });

  it('shows a count of added services', async () => {
    const user = userEvent.setup();
    render(<ServiceListForm />);

    await user.type(screen.getByLabelText(/service name/i), 'Service A');
    await user.click(screen.getByRole('button', { name: /add service/i }));

    expect(screen.getByText(/1 service added/i)).toBeInTheDocument();
  });
});
