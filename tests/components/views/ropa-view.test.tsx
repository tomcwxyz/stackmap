import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RopaView } from '@/components/views/ropa-view';
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
      createdAt: '',
      updatedAt: '',
    },
    functions: [],
    services: [],
    systems: [
      {
        id: 'sys-1',
        name: 'Lamplight',
        type: 'case_management',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      },
    ],
    dataCategories: [
      {
        id: 'dc-1',
        name: 'Client records',
        sensitivity: 'restricted',
        containsPersonalData: true,
        systemIds: ['sys-1'],
      },
      {
        id: 'dc-2',
        name: 'Website content',
        sensitivity: 'public',
        containsPersonalData: false,
        systemIds: ['sys-1'],
      },
    ],
    integrations: [],
    owners: [],
    externalParties: [
      { id: 'party-1', name: 'The Lottery', type: 'funder', location: 'uk' },
    ],
    dataFlows: [
      {
        id: 'flow-1',
        systemId: 'sys-1',
        partyId: 'party-1',
        dataCategoryIds: ['dc-1'],
        purpose: 'Quarterly grant reporting',
        method: 'portal',
        frequency: 'scheduled',
      },
    ],
    metadata: {
      version: '1.0.0',
      exportedAt: '',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

let currentArchitecture: Architecture | null = makeArchitecture();
let loading = false;
const updateDataCategoryMock = vi.fn();

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
  updateDataCategory: updateDataCategoryMock,
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

describe('RopaView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentArchitecture = makeArchitecture();
    loading = false;
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<RopaView />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('warns that the record is a draft, so nobody files it as-is', () => {
    render(<RopaView />);

    expect(screen.getByText(/this is a draft, not a finished record/i)).toBeInTheDocument();
  });

  it('lists only the categories holding personal data', () => {
    render(<RopaView />);

    expect(screen.getByRole('heading', { name: 'Client records' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Website content' })).not.toBeInTheDocument();
  });

  it('shows where the data lives and who it goes to', () => {
    render(<RopaView />);

    expect(screen.getByText('Lamplight')).toBeInTheDocument();
    expect(screen.getByText('The Lottery (Quarterly grant reporting)')).toBeInTheDocument();
  });

  it('says what is still missing rather than inventing it', () => {
    render(<RopaView />);

    expect(
      screen.getByText(/needs who the data is about, lawful basis, how long it is kept/i),
    ).toBeInTheDocument();
  });

  it('records who the data is about', async () => {
    const user = userEvent.setup();
    render(<RopaView />);

    const field = screen.getByLabelText(/who is it about/i);
    await user.type(field, 'People we support');
    await user.tab();

    expect(updateDataCategoryMock).toHaveBeenCalledWith('dc-1', {
      subjects: 'People we support',
    });
  });

  it('records the lawful basis', async () => {
    const user = userEvent.setup();
    render(<RopaView />);

    await user.selectOptions(screen.getByLabelText(/lawful basis/i), 'public_task');

    expect(updateDataCategoryMock).toHaveBeenCalledWith('dc-1', {
      lawfulBasis: 'public_task',
    });
  });

  it('clears a field rather than storing an empty string', async () => {
    currentArchitecture = {
      ...makeArchitecture(),
      dataCategories: [
        {
          id: 'dc-1',
          name: 'Client records',
          sensitivity: 'restricted',
          containsPersonalData: true,
          systemIds: ['sys-1'],
          retention: '7 years',
        },
      ],
    };
    const user = userEvent.setup();
    render(<RopaView />);

    const field = screen.getByLabelText(/kept for how long/i);
    await user.clear(field);
    await user.tab();

    expect(updateDataCategoryMock).toHaveBeenCalledWith('dc-1', { retention: undefined });
  });

  it('flags a transfer out of the UK, which needs its own safeguards', () => {
    currentArchitecture = {
      ...makeArchitecture(),
      externalParties: [
        { id: 'party-1', name: 'US Analytics Co', type: 'supplier', location: 'rest_of_world' },
      ],
    };

    render(<RopaView />);

    expect(screen.getByText('Leaves the UK')).toBeInTheDocument();
  });

  it('points at the wizard when there is no personal data to record', () => {
    currentArchitecture = { ...makeArchitecture(), dataCategories: [] };

    render(<RopaView />);

    expect(screen.getByRole('heading', { name: /nothing here yet/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to the wizard/i })).toHaveAttribute(
      'href',
      '/wizard',
    );
  });

  it('shows a loading state while the map is being read', () => {
    loading = true;
    currentArchitecture = null;

    render(<RopaView />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading...');
  });
});
