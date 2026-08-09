import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClearSections } from '@/components/wizard/clear-sections';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

const clearSectionMock = vi.fn();

function makeArchitecture(overrides: Partial<Architecture> = {}): Architecture {
  return {
    organisation: { id: 'org-1', name: 'Sunrise Trust', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance', isActive: true }],
    services: [],
    systems: [
      {
        id: 'sys-1', name: 'Xero', type: 'finance', hosting: 'cloud',
        status: 'active', functionIds: ['fn-1'], serviceIds: [],
      },
      {
        id: 'sys-2', name: 'Lamplight', type: 'case_management', hosting: 'cloud',
        status: 'active', functionIds: ['fn-1'], serviceIds: [],
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [{ id: 'own-1', name: 'Priya', isExternal: false }],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0', exportedAt: '', stackmapVersion: '0.3.0',
      mappingPath: 'function_first', techFreedomEnabled: false,
    },
    ...overrides,
  };
}

let currentArchitecture: Architecture | null = makeArchitecture();

const mockContext = (): ArchitectureContextValue =>
  ({
    architecture: currentArchitecture,
    isLoading: false,
    clearSection: clearSectionMock,
  }) as unknown as ArchitectureContextValue;

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContext(),
}));

describe('ClearSections', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentArchitecture = makeArchitecture();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ClearSections />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers only the sections that have something in them', () => {
    render(<ClearSections />);

    expect(screen.getByRole('button', { name: /systems \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /functions \(1\)/i })).toBeInTheDocument();
    // Nothing to clear here, so nothing offered
    expect(screen.queryByRole('button', { name: /connections/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /services/i })).not.toBeInTheDocument();
  });

  it('shows nothing at all for an empty map', () => {
    currentArchitecture = makeArchitecture({
      functions: [], systems: [], owners: [],
    });

    const { container } = render(<ClearSections />);

    expect(container).toBeEmptyDOMElement();
  });

  it('asks before clearing, and says what goes with it', async () => {
    const user = userEvent.setup();
    render(<ClearSections />);

    await user.click(screen.getByRole('button', { name: /systems \(2\)/i }));

    expect(
      screen.getByText(/connections and sharing that referred to them/i),
    ).toBeInTheDocument();
    expect(clearSectionMock).not.toHaveBeenCalled();
  });

  it('clears the section once confirmed', async () => {
    const user = userEvent.setup();
    render(<ClearSections />);

    await user.click(screen.getByRole('button', { name: /systems \(2\)/i }));
    await user.click(screen.getByRole('button', { name: /yes, clear systems/i }));

    expect(clearSectionMock).toHaveBeenCalledWith('systems');
  });

  it('leaves the map alone when the clearing is called off', async () => {
    const user = userEvent.setup();
    render(<ClearSections />);

    await user.click(screen.getByRole('button', { name: /functions \(1\)/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));

    expect(clearSectionMock).not.toHaveBeenCalled();
  });

  it('says what it cleared afterwards', async () => {
    const user = userEvent.setup();
    render(<ClearSections />);

    await user.click(screen.getByRole('button', { name: /owners \(1\)/i }));
    await user.click(screen.getByRole('button', { name: /yes, clear owners/i }));

    expect(screen.getByRole('status')).toHaveTextContent(/owners cleared/i);
  });
});
