import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SystemsTable } from '@/components/views/systems-table';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const updateSystemMock = vi.fn();
const removeSystemMock = vi.fn();

function makeArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Sunrise Trust',
      type: 'charity',
      createdAt: '',
      updatedAt: '',
    },
    functions: [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'fn-2', name: 'Fundraising', type: 'fundraising', isActive: true },
    ],
    services: [],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero',
        type: 'finance',
        vendor: 'Xero Ltd',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
        ownerId: 'own-1',
        importance: 9,
        cost: { amount: 400, period: 'annual', model: 'subscription' },
      },
      {
        id: 'sys-2',
        name: 'Old Access Database',
        type: 'database',
        hosting: 'on_premise',
        status: 'legacy',
        functionIds: ['fn-2'],
        serviceIds: [],
        importance: 3,
      },
      {
        id: 'sys-3',
        name: 'WhatsApp',
        type: 'messaging',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
        isShadow: true,
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [
      { id: 'own-1', name: 'Priya Shah', role: 'Finance lead', isExternal: false },
      { id: 'own-2', name: 'External IT', isExternal: true },
    ],
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
let loading = false;

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
  updateSystem: updateSystemMock,
  removeSystem: removeSystemMock,
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

function rowNames(): string[] {
  const rows = screen.getAllByRole('row').slice(1); // drop the header row
  return rows.map((row) => within(row).getAllByRole('cell')[0].textContent ?? '');
}

describe('SystemsTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentArchitecture = makeArchitecture();
    loading = false;
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<SystemsTable />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('lists every system, including shadow tools', () => {
    render(<SystemsTable />);

    const names = rowNames().join(' ');
    expect(names).toContain('Xero');
    expect(names).toContain('Old Access Database');
    expect(names).toContain('WhatsApp');
    expect(names).toContain('Shadow');
  });

  it('shows status, so a legacy system is visible as one', () => {
    render(<SystemsTable />);

    const table = screen.getByRole('table');
    expect(within(table).getByText('Legacy')).toBeInTheDocument();
  });

  it('flags systems with no owner', () => {
    render(<SystemsTable />);
    expect(screen.getAllByText('No owner')).toHaveLength(2);
  });

  it('shows an empty state when there are no systems', () => {
    currentArchitecture = { ...makeArchitecture(), systems: [] };
    render(<SystemsTable />);

    expect(screen.getByRole('heading', { name: /no systems yet/i })).toBeInTheDocument();
  });

  describe('filtering', () => {
    it('searches by name', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.type(screen.getByLabelText(/search/i), 'xero');

      expect(rowNames().join(' ')).toContain('Xero');
      expect(rowNames().join(' ')).not.toContain('WhatsApp');
    });

    it('searches by supplier', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.type(screen.getByLabelText(/search/i), 'Xero Ltd');

      expect(rowNames()).toHaveLength(1);
    });

    it('filters by function', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.selectOptions(screen.getByLabelText(/filter by function/i), 'fn-2');

      expect(rowNames().join(' ')).toContain('Old Access Database');
      expect(rowNames().join(' ')).not.toContain('Xero');
    });

    it('filters by status', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.selectOptions(screen.getByLabelText(/filter by status/i), 'legacy');

      expect(rowNames()).toHaveLength(1);
      expect(rowNames()[0]).toContain('Old Access Database');
    });

    it('says when nothing matches', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.type(screen.getByLabelText(/search/i), 'nothing called this');

      expect(screen.getByText(/no systems match those filters/i)).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('sorts by name ascending by default', () => {
      render(<SystemsTable />);
      expect(rowNames()[0]).toContain('Old Access Database');
    });

    it('reverses when the same column is clicked twice', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /system/i }));

      expect(rowNames()[0]).toContain('Xero');
    });

    it('sorts by importance', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /importance/i }));

      // Unscored shadow tool first, then 3, then 9
      expect(rowNames()[2]).toContain('Xero');
    });

    it('marks the sorted column for screen readers', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /^type/i }));

      expect(screen.getByRole('columnheader', { name: /type/i })).toHaveAttribute(
        'aria-sort',
        'ascending',
      );
    });
  });

  describe('editing', () => {
    it('opens an edit form for a system', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));

      expect(screen.getByLabelText(/^name/i)).toHaveValue('Xero');
    });

    it('saves a status change — the one field the wizard never asks for', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.selectOptions(screen.getByLabelText(/^status/i), 'retiring');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-1',
        expect.objectContaining({ status: 'retiring' }),
      );
    });

    it('saves a web address and notes', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.type(screen.getByLabelText(/web address/i), 'https://xero.com');
      await user.type(screen.getByLabelText(/notes/i), 'Renews in March');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-1',
        expect.objectContaining({ url: 'https://xero.com', notes: 'Renews in March' }),
      );
    });

    it('assigns an owner', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit old access database/i }));
      await user.selectOptions(screen.getByLabelText(/owner/i), 'own-2');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-2',
        expect.objectContaining({ ownerId: 'own-2' }),
      );
    });

    it('records contract details so renewals can be tracked', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.type(screen.getByLabelText(/licences/i), '12');
      await user.type(screen.getByLabelText(/renews on/i), '2027-03-01');
      await user.type(screen.getByLabelText(/notice period/i), '60');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-1',
        expect.objectContaining({
          seats: 12,
          renewalDate: '2027-03-01',
          noticePeriodDays: 60,
        }),
      );
    });

    it('will not save a system with no name', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.clear(screen.getByLabelText(/^name/i));

      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
      expect(updateSystemMock).not.toHaveBeenCalled();
    });

    it('discards changes on cancel', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.selectOptions(screen.getByLabelText(/^status/i), 'retiring');
      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(updateSystemMock).not.toHaveBeenCalled();
      expect(screen.queryByLabelText(/^name/i)).not.toBeInTheDocument();
    });
  });

  describe('deleting', () => {
    it('asks for confirmation first', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /delete xero/i }));

      expect(screen.getByText(/delete xero\? this cannot be undone/i)).toBeInTheDocument();
      expect(removeSystemMock).not.toHaveBeenCalled();
    });

    it('deletes once confirmed', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /delete xero/i }));
      await user.click(screen.getByRole('button', { name: /yes, delete it/i }));

      expect(removeSystemMock).toHaveBeenCalledWith('sys-1');
    });

    it('keeps the system when the user backs out', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /delete xero/i }));
      await user.click(screen.getByRole('button', { name: /keep it/i }));

      expect(removeSystemMock).not.toHaveBeenCalled();
      expect(screen.queryByText(/cannot be undone/i)).not.toBeInTheDocument();
    });
  });

  describe('risk column', () => {
    it('is hidden when risk assessment is off', () => {
      render(<SystemsTable />);
      expect(screen.queryByRole('columnheader', { name: /risk/i })).not.toBeInTheDocument();
    });

    it('lets an unscored system be assessed by hand', async () => {
      const user = userEvent.setup();
      const arch = makeArchitecture();
      arch.metadata.techFreedomEnabled = true;
      currentArchitecture = arch;

      render(<SystemsTable />);
      await user.click(screen.getByRole('button', { name: /edit old access database/i }));

      // Nothing in the known tools database matches, so scoring is offered
      expect(screen.getByText(/not in the known tools database/i)).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /score this system/i }));
      await user.selectOptions(screen.getByLabelText(/lock-in risk score/i), '5');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-2',
        expect.objectContaining({
          techFreedomScore: expect.objectContaining({ lockIn: 5, isAutoScored: false }),
        }),
      );
    });

    it('marks an adjusted auto-score as no longer automatic', async () => {
      const user = userEvent.setup();
      const arch = makeArchitecture();
      arch.metadata.techFreedomEnabled = true;
      arch.systems[0].techFreedomScore = {
        jurisdiction: 3,
        continuity: 2,
        surveillance: 3,
        lockIn: 4,
        costExposure: 3,
        isAutoScored: true,
      };
      currentArchitecture = arch;

      render(<SystemsTable />);
      await user.click(screen.getByRole('button', { name: /edit xero/i }));
      await user.selectOptions(screen.getByLabelText(/jurisdiction risk score/i), '1');
      await user.click(screen.getByRole('button', { name: /save changes/i }));

      expect(updateSystemMock).toHaveBeenCalledWith(
        'sys-1',
        expect.objectContaining({
          techFreedomScore: expect.objectContaining({ jurisdiction: 1, isAutoScored: false }),
        }),
      );
    });

    it('offers no scoring when risk assessment is off', async () => {
      const user = userEvent.setup();
      render(<SystemsTable />);

      await user.click(screen.getByRole('button', { name: /edit old access database/i }));

      expect(screen.queryByRole('button', { name: /score this system/i })).not.toBeInTheDocument();
    });

    it('shows scores when risk assessment is on', () => {
      const arch = makeArchitecture();
      arch.metadata.techFreedomEnabled = true;
      arch.systems[0].techFreedomScore = {
        jurisdiction: 3,
        continuity: 2,
        surveillance: 3,
        lockIn: 4,
        costExposure: 3,
        isAutoScored: true,
      };
      currentArchitecture = arch;

      render(<SystemsTable />);

      expect(screen.getByRole('columnheader', { name: /risk/i })).toBeInTheDocument();
      expect(screen.getByText('15/25')).toBeInTheDocument();
    });
  });
});
