import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import PathSelectorPage from '@/app/wizard/page';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: pushMock }),
}));

const clearMock = vi.fn().mockResolvedValue(undefined);
const replaceArchitectureMock = vi.fn();

const emptyArch = {
  organisation: { id: '1', name: '', type: 'charity', createdAt: '', updatedAt: '' },
  functions: [],
  services: [],
  systems: [],
  dataCategories: [],
  integrations: [],
  owners: [],
  externalParties: [],
  dataFlows: [],
  metadata: { version: '1', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'function_first', techFreedomEnabled: false },
};

const namedArch = {
  ...emptyArch,
  organisation: { ...emptyArch.organisation, name: 'Test Org' },
};

const populatedArch = {
  ...namedArch,
  functions: [
    { id: 'f1', name: 'Finance', type: 'finance', isActive: true },
    { id: 'f2', name: 'People', type: 'people', isActive: true },
  ],
  systems: [
    { id: 's1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['f1'], serviceIds: [] },
  ],
};

let mockArchitecture = emptyArch as typeof emptyArch | typeof populatedArch;

vi.mock('@/components/import/import-dialog', () => ({
  ImportDialog: () => null,
}));

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => ({
    architecture: mockArchitecture,
    isLoading: false,
    clear: clearMock,
    updateOrganisation: vi.fn(),
    replaceArchitecture: replaceArchitectureMock,
    clearSection: vi.fn(),
  }),
}));

describe('PathSelectorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockArchitecture = emptyArch;
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<PathSelectorPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the page heading', () => {
    render(<PathSelectorPage />);
    expect(
      screen.getByRole('heading', { name: /how would you like to begin/i }),
    ).toBeInTheDocument();
  });

  it('renders both path options', () => {
    render(<PathSelectorPage />);
    expect(screen.getByText('Start with what we do')).toBeInTheDocument();
    expect(screen.getByText('Start with what we deliver')).toBeInTheDocument();
  });

  it('shows descriptions for each path', () => {
    render(<PathSelectorPage />);
    expect(
      screen.getByText(/common organisational functions/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/clear service offerings/i),
    ).toBeInTheDocument();
  });

  it('renders path cards as buttons', () => {
    mockArchitecture = namedArch;
    render(<PathSelectorPage />);
    expect(screen.getByRole('button', { name: /start with what we do/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start with what we deliver/i })).toBeInTheDocument();
  });

  it('renders a list of mapping options', () => {
    render(<PathSelectorPage />);
    const list = screen.getByRole('list', { name: /mapping path options/i });
    expect(list).toBeInTheDocument();
    // Scoped to that list: the page also carries the worked examples
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
  });

  it('navigates to /wizard/techfreedom when function-first path is selected', async () => {
    mockArchitecture = namedArch;
    render(<PathSelectorPage />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /start with what we do/i });
    await user.click(btn);
    expect(pushMock).toHaveBeenCalledWith('/wizard/techfreedom');
  });

  it('sets mappingPath to function_first when that path is selected', async () => {
    mockArchitecture = namedArch;
    render(<PathSelectorPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /start with what we do/i }));
    expect(replaceArchitectureMock).toHaveBeenCalled();
    const newArch = replaceArchitectureMock.mock.calls[0][0];
    expect(newArch.metadata.mappingPath).toBe('function_first');
  });

  it('navigates to /wizard/techfreedom when service-first path is selected', async () => {
    mockArchitecture = namedArch;
    render(<PathSelectorPage />);
    const user = userEvent.setup();
    const btn = screen.getByRole('button', { name: /start with what we deliver/i });
    await user.click(btn);
    expect(pushMock).toHaveBeenCalledWith('/wizard/techfreedom');
  });

  it('sets mappingPath to service_first when that path is selected', async () => {
    mockArchitecture = namedArch;
    render(<PathSelectorPage />);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /start with what we deliver/i }));
    expect(replaceArchitectureMock).toHaveBeenCalled();
    const newArch = replaceArchitectureMock.mock.calls[0][0];
    expect(newArch.metadata.mappingPath).toBe('service_first');
  });

  it('does not show existing data banner when architecture is empty', () => {
    render(<PathSelectorPage />);
    expect(screen.queryByText(/existing map/i)).not.toBeInTheDocument();
  });

  it('shows existing data banner when architecture has data', () => {
    mockArchitecture = populatedArch;
    render(<PathSelectorPage />);
    expect(screen.getByText(/existing map/i)).toBeInTheDocument();
    expect(screen.getByText(/3 items/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start fresh/i })).toBeInTheDocument();
  });

  it('shows confirmation when Start fresh is clicked', async () => {
    const user = userEvent.setup();
    mockArchitecture = populatedArch;
    render(<PathSelectorPage />);

    await user.click(screen.getByRole('button', { name: /start fresh/i }));
    expect(screen.getByText(/cannot be undone/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /yes, clear everything/i })).toBeInTheDocument();
  });

  it('calls clear when confirmed', async () => {
    const user = userEvent.setup();
    mockArchitecture = populatedArch;
    render(<PathSelectorPage />);

    await user.click(screen.getByRole('button', { name: /start fresh/i }));
    await user.click(screen.getByRole('button', { name: /yes, clear everything/i }));
    expect(clearMock).toHaveBeenCalled();
  });

  it('renders an import button', () => {
    render(<PathSelectorPage />);
    expect(screen.getByRole('button', { name: /import/i })).toBeInTheDocument();
  });

  it('cancels confirmation with Keep my data', async () => {
    const user = userEvent.setup();
    mockArchitecture = populatedArch;
    render(<PathSelectorPage />);

    await user.click(screen.getByRole('button', { name: /start fresh/i }));
    await user.click(screen.getByRole('button', { name: /keep my data/i }));
    expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
    expect(clearMock).not.toHaveBeenCalled();
  });
});
