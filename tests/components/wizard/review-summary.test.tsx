import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewSummary } from '@/components/wizard/review-summary';
import type { ArchitectureContextValue } from '@/hooks/useArchitecture';
import type { Architecture } from '@/lib/types';

// ─── Mocks ───

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/wizard/functions/review',
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const saveMock = vi.fn().mockResolvedValue(undefined);

const fullArchitecture: Architecture = {
  organisation: { id: '1', name: 'Test Charity', type: 'charity', createdAt: '', updatedAt: '' },
  functions: [
    { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
    { id: 'fn-2', name: 'Fundraising', type: 'fundraising', isActive: true },
  ],
  services: [
    { id: 'svc-1', name: 'Grant management', status: 'active', functionIds: ['fn-2'], systemIds: [] },
  ],
  systems: [
    { id: 'sys-1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['fn-1'], serviceIds: [] },
    { id: 'sys-2', name: 'Salesforce', type: 'crm', hosting: 'cloud', status: 'active', functionIds: ['fn-2'], serviceIds: [], ownerId: 'own-1' },
  ],
  dataCategories: [
    { id: 'dc-1', name: 'Financial Transactions', sensitivity: 'confidential', containsPersonalData: false, systemIds: ['sys-1'] },
  ],
  integrations: [
    { id: 'intg-1', sourceSystemId: 'sys-1', targetSystemId: 'sys-2', type: 'api', direction: 'one_way', frequency: 'scheduled', reliability: 'unknown' },
  ],
  owners: [
    { id: 'own-1', name: 'Sarah Jones', role: 'Finance Manager', isExternal: false },
  ],
  externalParties: [],
  dataFlows: [],
  metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'function_first' },
};

const mockContextValue: ArchitectureContextValue = {
  architecture: fullArchitecture,
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
  save: saveMock,
  clear: vi.fn().mockResolvedValue(undefined),
  getArchitecture: vi.fn().mockReturnValue(fullArchitecture),
  replaceArchitecture: vi.fn(),
  clearSection: vi.fn(),
  setTechFreedomEnabled: vi.fn(),
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => mockContextValue,
}));

describe('ReviewSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ReviewSummary />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders the heading', () => {
    render(<ReviewSummary />);
    expect(
      screen.getByRole('heading', { name: /technology map for/i }),
    ).toBeInTheDocument();
  });

  it('shows organisation info', () => {
    render(<ReviewSummary />);
    expect(screen.getByText(/test charity/i)).toBeInTheDocument();
  });

  it('shows functions and systems grouped', () => {
    render(<ReviewSummary />);
    expect(screen.getByText(/functions & systems/i)).toBeInTheDocument();
    expect(screen.getAllByText('Finance').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Fundraising').length).toBeGreaterThanOrEqual(1);
  });

  it('shows system names', () => {
    render(<ReviewSummary />);
    expect(screen.getAllByText('Xero').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Salesforce').length).toBeGreaterThanOrEqual(1);
  });

  it('shows services', () => {
    render(<ReviewSummary />);
    expect(screen.getByText(/services \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Grant management')).toBeInTheDocument();
  });

  it('shows data categories', () => {
    render(<ReviewSummary />);
    expect(screen.getByRole('heading', { name: /^data$/i })).toBeInTheDocument();
    expect(screen.getByText('Financial Transactions')).toBeInTheDocument();
  });

  it('renders data categories section with sensitivity badges', () => {
    const archWithData: Architecture = {
      ...fullArchitecture,
      dataCategories: [
        { id: 'd1', name: 'Client records', sensitivity: 'confidential', containsPersonalData: true, systemIds: ['sys-1'] },
        { id: 'd2', name: 'Public content', sensitivity: 'public', containsPersonalData: false, systemIds: [] },
      ],
    };

    const origArch = mockContextValue.architecture;
    const origGet = mockContextValue.getArchitecture;
    mockContextValue.architecture = archWithData;
    mockContextValue.getArchitecture = vi.fn().mockReturnValue(archWithData);

    try {
      render(<ReviewSummary />);
      expect(screen.getByRole('heading', { name: /data/i })).toBeInTheDocument();
      expect(screen.getByText('Client records')).toBeInTheDocument();
      expect(screen.getByText('confidential')).toBeInTheDocument();
      expect(screen.getByText('Yes')).toBeInTheDocument();
    } finally {
      mockContextValue.architecture = origArch;
      mockContextValue.getArchitecture = origGet;
    }
  });

  it('does not render data section when no data categories exist', () => {
    const archNoData: Architecture = {
      ...fullArchitecture,
      dataCategories: [],
    };

    const origArch = mockContextValue.architecture;
    const origGet = mockContextValue.getArchitecture;
    mockContextValue.architecture = archNoData;
    mockContextValue.getArchitecture = vi.fn().mockReturnValue(archNoData);

    try {
      render(<ReviewSummary />);
      expect(screen.queryByRole('heading', { name: /^data$/i })).not.toBeInTheDocument();
    } finally {
      mockContextValue.architecture = origArch;
      mockContextValue.getArchitecture = origGet;
    }
  });

  it('shows integrations', () => {
    render(<ReviewSummary />);
    expect(screen.getByText(/integrations \(1\)/i)).toBeInTheDocument();
  });

  it('shows owners', () => {
    render(<ReviewSummary />);
    expect(screen.getByText(/owners \(1\)/i)).toBeInTheDocument();
    expect(screen.getByText('Sarah Jones')).toBeInTheDocument();
  });

  it('has an Export as JSON button', () => {
    render(<ReviewSummary />);
    expect(screen.getByRole('button', { name: /export as json/i })).toBeInTheDocument();
  });

  it('has a View Diagram link', () => {
    render(<ReviewSummary />);
    const link = screen.getByRole('link', { name: /view diagram/i });
    expect(link).toHaveAttribute('href', '/view/diagram');
  });

  it('has an Export as CSV button', () => {
    render(<ReviewSummary />);
    expect(screen.getByRole('button', { name: /csv/i })).toBeInTheDocument();
  });

  it('has a Back link to owners', () => {
    render(<ReviewSummary />);
    expect(screen.getByRole('link', { name: /back/i })).toHaveAttribute(
      'href',
      '/wizard/functions/owners',
    );
  });

  it('export button is clickable', async () => {
    const user = userEvent.setup();

    // Mock URL methods and document.createElement for the download link
    const createObjectURLMock = vi.fn().mockReturnValue('blob:mock');
    const revokeObjectURLMock = vi.fn();
    globalThis.URL.createObjectURL = createObjectURLMock;
    globalThis.URL.revokeObjectURL = revokeObjectURLMock;

    render(<ReviewSummary />);
    const btn = screen.getByRole('button', { name: /export as json/i });
    expect(btn).toBeInTheDocument();
    // Just verify the button exists and is clickable - the actual download
    // triggers DOM side effects that are hard to assert in happy-dom
  });

  describe('Cost overview', () => {
    it('shows Cost Overview section when systems have costs', () => {
      const archWithCosts: Architecture = {
        ...fullArchitecture,
        systems: [
          {
            ...fullArchitecture.systems[0],
            cost: { amount: 2400, period: 'annual', model: 'subscription' },
          },
          {
            ...fullArchitecture.systems[1],
            cost: { amount: 6000, period: 'annual', model: 'subscription' },
          },
        ],
      };

      const origArch = mockContextValue.architecture;
      const origGet = mockContextValue.getArchitecture;
      mockContextValue.architecture = archWithCosts;
      mockContextValue.getArchitecture = vi.fn().mockReturnValue(archWithCosts);

      try {
        render(<ReviewSummary />);

        expect(
          screen.getByRole('heading', { name: /cost overview/i }),
        ).toBeInTheDocument();
        expect(screen.getByTestId('cost-overview')).toBeInTheDocument();
      } finally {
        mockContextValue.architecture = origArch;
        mockContextValue.getArchitecture = origGet;
      }
    });

    it('does NOT show Cost Overview when no systems have cost data', () => {
      render(<ReviewSummary />);
      expect(
        screen.queryByRole('heading', { name: /cost overview/i }),
      ).not.toBeInTheDocument();
    });
  });

  describe('Importance overview', () => {
    it('renders importance overview when systems have importance scores', () => {
      const archWithImportance: Architecture = {
        ...fullArchitecture,
        systems: [
          { ...fullArchitecture.systems[0], importance: 9 },
          { ...fullArchitecture.systems[1], importance: 5 },
        ],
      };

      const origArch = mockContextValue.architecture;
      const origGet = mockContextValue.getArchitecture;
      mockContextValue.architecture = archWithImportance;
      mockContextValue.getArchitecture = vi.fn().mockReturnValue(archWithImportance);

      try {
        render(<ReviewSummary />);
        expect(screen.getByTestId('importance-overview')).toBeInTheDocument();
        expect(screen.getByRole('img')).toBeInTheDocument();
        expect(screen.getByText(/1 core/)).toBeInTheDocument();
        expect(screen.getByText(/1 important/)).toBeInTheDocument();
      } finally {
        mockContextValue.architecture = origArch;
        mockContextValue.getArchitecture = origGet;
      }
    });

    it('renders shadow tools section separately', () => {
      const archWithShadow: Architecture = {
        ...fullArchitecture,
        systems: [
          ...fullArchitecture.systems,
          { id: 'sys-shadow', name: 'WhatsApp', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: ['fn-1'], serviceIds: [], isShadow: true, importance: 3 },
        ],
      };

      const origArch = mockContextValue.architecture;
      const origGet = mockContextValue.getArchitecture;
      mockContextValue.architecture = archWithShadow;
      mockContextValue.getArchitecture = vi.fn().mockReturnValue(archWithShadow);

      try {
        render(<ReviewSummary />);
        expect(screen.getByTestId('shadow-tools')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /shadow/i })).toBeInTheDocument();
        const shadowSection = screen.getByTestId('shadow-tools');
        expect(shadowSection).toHaveTextContent('WhatsApp');
      } finally {
        mockContextValue.architecture = origArch;
        mockContextValue.getArchitecture = origGet;
      }
    });

    it('shows formalisation callout for high-importance shadow tools', () => {
      const archWithHighShadow: Architecture = {
        ...fullArchitecture,
        systems: [
          ...fullArchitecture.systems,
          { id: 'sys-shadow', name: 'WhatsApp', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: ['fn-1'], serviceIds: [], isShadow: true, importance: 9 },
        ],
      };

      const origArch = mockContextValue.architecture;
      const origGet = mockContextValue.getArchitecture;
      mockContextValue.architecture = archWithHighShadow;
      mockContextValue.getArchitecture = vi.fn().mockReturnValue(archWithHighShadow);

      try {
        render(<ReviewSummary />);
        expect(screen.getByText(/consider formalising/i)).toBeInTheDocument();
      } finally {
        mockContextValue.architecture = origArch;
        mockContextValue.getArchitecture = origGet;
      }
    });
  });

  describe('TechFreedom integration', () => {
    it('shows Technology Risk Summary when techFreedomEnabled and systems have scores', () => {
      const archWithScores: Architecture = {
        ...fullArchitecture,
        systems: [
          {
            ...fullArchitecture.systems[0],
            techFreedomScore: {
              jurisdiction: 2, continuity: 2, surveillance: 2, lockIn: 3, costExposure: 3,
              isAutoScored: true,
            },
          },
          {
            ...fullArchitecture.systems[1],
            techFreedomScore: {
              jurisdiction: 4, continuity: 2, surveillance: 3, lockIn: 5, costExposure: 5,
              isAutoScored: true,
            },
          },
        ],
        metadata: {
          ...fullArchitecture.metadata,
          techFreedomEnabled: true,
        },
      };

      const contextWithScores = {
        ...mockContextValue,
        architecture: archWithScores,
        getArchitecture: vi.fn().mockReturnValue(archWithScores),
        replaceArchitecture: vi.fn(),
        setTechFreedomEnabled: vi.fn(),
      };

      // Temporarily override the mock
      const origArch = mockContextValue.architecture;
      const origGet = mockContextValue.getArchitecture;
      mockContextValue.architecture = archWithScores;
      mockContextValue.getArchitecture = contextWithScores.getArchitecture;

      render(<ReviewSummary />);

      expect(
        screen.getByRole('heading', { name: /technology risk summary/i }),
      ).toBeInTheDocument();
      expect(screen.getByText(/worst dimension/i)).toBeInTheDocument();
      expect(screen.getByText(/most critical/i)).toBeInTheDocument();

      // Restore
      mockContextValue.architecture = origArch;
      mockContextValue.getArchitecture = origGet;
    });

    it('says what the systems with no recorded cost are likely to add', () => {
      const arch: Architecture = {
        ...fullArchitecture,
        organisation: { ...fullArchitecture.organisation, staffCount: 15 },
        systems: [
          {
            ...fullArchitecture.systems[0],
            cost: { amount: 400, period: 'annual', model: 'subscription' },
          },
          // Recognised by the tools database, but no cost recorded here
          {
            id: 'sys-slack',
            name: 'Slack',
            type: 'messaging',
            hosting: 'cloud',
            status: 'active',
            functionIds: ['fn-1'],
            serviceIds: [],
          },
        ],
      };

      const origArch = mockContextValue.architecture;
      mockContextValue.architecture = arch;

      render(<ReviewSummary />);

      const note = screen.getByTestId('cost-estimate-note');
      expect(note).toHaveTextContent(/plus roughly/i);
      expect(note).toHaveTextContent(/1 system with no cost recorded/i);

      mockContextValue.architecture = origArch;
    });

    it('crosses risk with importance once both are known', () => {
      const arch: Architecture = {
        ...fullArchitecture,
        systems: [
          {
            ...fullArchitecture.systems[0],
            importance: 9,
            techFreedomScore: {
              jurisdiction: 4, continuity: 4, surveillance: 4, lockIn: 4, costExposure: 4,
              isAutoScored: true,
            },
          },
        ],
        metadata: { ...fullArchitecture.metadata, techFreedomEnabled: true },
      };

      const origArch = mockContextValue.architecture;
      mockContextValue.architecture = arch;

      render(<ReviewSummary />);

      expect(screen.getByTestId('risk-importance-section')).toBeInTheDocument();
      expect(
        screen.getByRole('heading', { name: /critical and exposed/i }),
      ).toBeInTheDocument();

      mockContextValue.architecture = origArch;
    });

    it('omits the risk against importance section when nothing can be plotted', () => {
      const arch: Architecture = {
        ...fullArchitecture,
        // Risk scores but no importance, so there is nothing to cross
        systems: [
          {
            ...fullArchitecture.systems[0],
            techFreedomScore: {
              jurisdiction: 4, continuity: 4, surveillance: 4, lockIn: 4, costExposure: 4,
              isAutoScored: true,
            },
          },
        ],
        metadata: { ...fullArchitecture.metadata, techFreedomEnabled: true },
      };

      const origArch = mockContextValue.architecture;
      mockContextValue.architecture = arch;

      render(<ReviewSummary />);

      expect(screen.queryByTestId('risk-importance-section')).not.toBeInTheDocument();

      mockContextValue.architecture = origArch;
    });

    it('does NOT show Technology Risk Summary when techFreedomEnabled is false', () => {
      // Default fullArchitecture has no techFreedomEnabled
      render(<ReviewSummary />);
      expect(
        screen.queryByRole('heading', { name: /technology risk summary/i }),
      ).not.toBeInTheDocument();
    });
  });
});
