import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SharingForm } from '@/components/wizard/sharing-form';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

const addExternalPartyMock = vi.fn().mockReturnValue('party-new');
const removeExternalPartyMock = vi.fn();
const addDataFlowMock = vi.fn().mockReturnValue('flow-new');
const removeDataFlowMock = vi.fn();

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
    ],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
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

const mockContext = (): ArchitectureContextValue => ({
  architecture: currentArchitecture,
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
  addIntegration: vi.fn().mockReturnValue(''),
  removeIntegration: vi.fn(),
  addOwner: vi.fn().mockReturnValue(''),
  removeOwner: vi.fn(),
  addExternalParty: addExternalPartyMock,
  updateExternalParty: vi.fn(),
  removeExternalParty: removeExternalPartyMock,
  addDataFlow: addDataFlowMock,
  updateDataFlow: vi.fn(),
  removeDataFlow: removeDataFlowMock,
  replaceArchitecture: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
  save: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(currentArchitecture),
});

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext(),
}));

function withParty(): Architecture {
  return {
    ...makeArchitecture(),
    externalParties: [{ id: 'party-1', name: 'The Lottery', type: 'funder', location: 'uk' }],
  };
}

describe('SharingForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    addExternalPartyMock.mockReturnValue('party-new');
    addDataFlowMock.mockReturnValue('flow-new');
    currentArchitecture = makeArchitecture();
  });

  it('has no accessibility violations', async () => {
    currentArchitecture = withParty();
    const { container } = render(<SharingForm />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('records who the organisation shares with', async () => {
    const user = userEvent.setup();
    render(<SharingForm />);

    await user.type(screen.getByLabelText(/^name$/i), 'The Lottery');
    await user.selectOptions(screen.getByLabelText(/what are they to you/i), 'funder');
    await user.selectOptions(screen.getByLabelText(/where are they/i), 'uk');
    await user.click(screen.getByRole('button', { name: 'Add' }));

    expect(addExternalPartyMock).toHaveBeenCalledWith({
      name: 'The Lottery',
      type: 'funder',
      location: 'uk',
    });
  });

  it('will not add a party without a name', async () => {
    const user = userEvent.setup();
    render(<SharingForm />);

    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    await user.type(screen.getByLabelText(/^name$/i), '   ');
    expect(screen.getByRole('button', { name: 'Add' })).toBeDisabled();
    expect(addExternalPartyMock).not.toHaveBeenCalled();
  });

  it('does not ask what is shared until there is somebody to share it with', () => {
    render(<SharingForm />);

    expect(screen.queryByLabelText(/from which system/i)).not.toBeInTheDocument();
  });

  it('records what goes to a party, and why', async () => {
    currentArchitecture = withParty();
    const user = userEvent.setup();
    render(<SharingForm />);

    await user.selectOptions(screen.getByLabelText(/from which system/i), 'sys-1');
    await user.selectOptions(screen.getByLabelText(/to whom/i), 'party-1');
    await user.selectOptions(screen.getByLabelText(/how does it get there/i), 'portal');
    await user.selectOptions(screen.getByLabelText(/how often/i), 'annual');
    await user.type(screen.getByLabelText(/why do they need it/i), 'Grant reporting');
    await user.click(screen.getByRole('checkbox', { name: 'Client records' }));
    await user.click(screen.getAllByRole('button', { name: 'Add' })[1]);

    expect(addDataFlowMock).toHaveBeenCalledWith({
      systemId: 'sys-1',
      partyId: 'party-1',
      dataCategoryIds: ['dc-1'],
      purpose: 'Grant reporting',
      method: 'portal',
      frequency: 'annual',
    });
  });

  it('needs both ends before a flow can be recorded', async () => {
    currentArchitecture = withParty();
    const user = userEvent.setup();
    render(<SharingForm />);

    const addFlow = screen.getAllByRole('button', { name: 'Add' })[1];
    expect(addFlow).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/from which system/i), 'sys-1');
    expect(addFlow).toBeDisabled();

    await user.selectOptions(screen.getByLabelText(/to whom/i), 'party-1');
    expect(addFlow).toBeEnabled();
  });

  it('shows an existing flow as a sentence a trustee can read', () => {
    currentArchitecture = {
      ...withParty(),
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
    };

    render(<SharingForm />);

    // Scoped to the list, because the same names are also select options
    const flows = within(screen.getAllByRole('list')[1]);
    expect(flows.getByText('Lamplight')).toBeInTheDocument();
    expect(flows.getByText('The Lottery')).toBeInTheDocument();
    expect(flows.getByText('Client records')).toBeInTheDocument();
    expect(flows.getByText('Quarterly grant reporting')).toBeInTheDocument();
  });

  it('removes a party', async () => {
    currentArchitecture = withParty();
    const user = userEvent.setup();
    render(<SharingForm />);

    await user.click(screen.getByRole('button', { name: 'Remove The Lottery' }));

    expect(removeExternalPartyMock).toHaveBeenCalledWith('party-1');
  });

  it('removes a flow', async () => {
    currentArchitecture = {
      ...withParty(),
      dataFlows: [
        {
          id: 'flow-1',
          systemId: 'sys-1',
          partyId: 'party-1',
          dataCategoryIds: [],
          method: 'email',
          frequency: 'annual',
        },
      ],
    };
    const user = userEvent.setup();
    render(<SharingForm />);

    await user.click(
      screen.getByRole('button', { name: 'Remove sharing from Lamplight to The Lottery' }),
    );

    expect(removeDataFlowMock).toHaveBeenCalledWith('flow-1');
  });

  it('marks a party outside the UK, because that is the bit that matters', () => {
    currentArchitecture = {
      ...makeArchitecture(),
      externalParties: [
        { id: 'party-1', name: 'US Analytics Co', type: 'supplier', location: 'rest_of_world' },
      ],
    };

    render(<SharingForm />);

    expect(within(screen.getByRole('list')).getByText('Outside Europe')).toBeInTheDocument();
  });
});
