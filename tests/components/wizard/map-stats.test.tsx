import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MapStats } from '@/components/wizard/map-stats';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

// ─── Blank architecture ───

const blank: Architecture = {
  organisation: { id: '1', name: '', type: 'charity', createdAt: '', updatedAt: '' },
  functions: [],
  services: [],
  systems: [],
  dataCategories: [],
  integrations: [],
  owners: [],
  externalParties: [],
  dataFlows: [],
  metadata: { version: '1', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'function_first' },
};

// ─── Mock context ───

const mockContextValue: ArchitectureContextValue = {
  architecture: blank,
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

// ─── Helpers ───

function setArchitecture(arch: Architecture) {
  mockContextValue.architecture = arch;
}

// ─── Tests ───

describe('MapStats', () => {
  beforeEach(() => {
    setArchitecture(blank);
  });

  it('has no axe violations', async () => {
    const { container } = render(<MapStats />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows "No items yet" when architecture is empty', () => {
    render(<MapStats />);
    expect(screen.getByText('No items yet')).toBeInTheDocument();
  });

  it('renders function count when functions exist', () => {
    setArchitecture({
      ...blank,
      functions: [{ id: '1', name: 'Finance', type: 'finance', isActive: true }],
    });
    render(<MapStats />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('function')).toBeInTheDocument();
  });

  it('renders system count when systems exist', () => {
    setArchitecture({
      ...blank,
      systems: [
        { id: '1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
        { id: '2', name: 'Slack', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
    });
    render(<MapStats />);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('systems')).toBeInTheDocument();
  });

  it('renders integration count when integrations exist', () => {
    setArchitecture({
      ...blank,
      integrations: [
        { id: '1', sourceSystemId: 's1', targetSystemId: 's2', type: 'api', direction: 'one_way', frequency: 'real_time', reliability: 'reliable' },
      ],
    });
    render(<MapStats />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('integration')).toBeInTheDocument();
  });

  it('renders owner count when owners exist', () => {
    setArchitecture({
      ...blank,
      owners: [{ id: 'o1', name: 'Sarah', isExternal: false }],
    });
    render(<MapStats />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('owner')).toBeInTheDocument();
  });

  it('does not render zero counts', () => {
    setArchitecture({
      ...blank,
      functions: [{ id: '1', name: 'Finance', type: 'finance', isActive: true }],
      // systems, integrations, owners are all empty
    });
    render(<MapStats />);
    expect(screen.queryByText('system')).not.toBeInTheDocument();
    expect(screen.queryByText('systems')).not.toBeInTheDocument();
    expect(screen.queryByText('integration')).not.toBeInTheDocument();
    expect(screen.queryByText('owner')).not.toBeInTheDocument();
  });

  it('has aria-live="polite" on the container', () => {
    render(<MapStats />);
    const container = screen.getByLabelText('Architecture summary');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('shows shared systems count when systems belong to multiple functions', () => {
    setArchitecture({
      ...blank,
      systems: [
        { id: '1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['f1', 'f2'], serviceIds: [] },
        { id: '2', name: 'Slack', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: ['f1'], serviceIds: [] },
      ],
    });
    render(<MapStats />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('shared')).toBeInTheDocument();
  });

  it('does not show shared count when no systems are shared', () => {
    setArchitecture({
      ...blank,
      systems: [
        { id: '1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['f1'], serviceIds: [] },
        { id: '2', name: 'Slack', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: ['f2'], serviceIds: [] },
      ],
    });
    render(<MapStats />);
    expect(screen.queryByText('shared')).not.toBeInTheDocument();
  });
});
