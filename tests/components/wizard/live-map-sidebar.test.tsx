import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LiveMapSidebar } from '@/components/wizard/live-map-sidebar';
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

const populated: Architecture = {
  ...blank,
  functions: [
    { id: 'f1', name: 'Finance', type: 'finance', isActive: true },
    { id: 'f2', name: 'People', type: 'people', isActive: true },
    { id: 'f3', name: 'Governance', type: 'governance', isActive: true },
  ],
  systems: [
    { id: 's1', name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active', functionIds: ['f1'], serviceIds: [] },
    { id: 's2', name: 'Slack', type: 'messaging', hosting: 'cloud', status: 'active', functionIds: ['f2'], serviceIds: [] },
  ],
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

let mockPathname = '/wizard/functions';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

function setArchitecture(arch: Architecture) {
  mockContextValue.architecture = arch;
}

describe('LiveMapSidebar', () => {
  beforeEach(() => {
    setArchitecture(populated);
    mockPathname = '/wizard/functions';
  });

  it('has no axe violations when closed', async () => {
    const { container } = render(<LiveMapSidebar />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders tab buttons when closed', () => {
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it('shows entity count in tab', () => {
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    const allText = buttons.map((b) => b.textContent).join(' ');
    expect(allText).toMatch(/3 functions/);
    expect(allText).toMatch(/2 systems/);
  });

  it('opens overlay panel on click', async () => {
    const user = userEvent.setup();
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);
    expect(screen.getByRole('complementary')).toBeInTheDocument();
    expect(screen.getByRole('complementary')).toHaveAttribute('aria-label', 'Architecture map preview');
  });

  it('has no axe violations when open', async () => {
    const user = userEvent.setup();
    const { container } = render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows MiniMap, MapStats, ContextualTip when open', async () => {
    const user = userEvent.setup();
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);

    expect(screen.getByRole('img')).toBeInTheDocument();
    expect(screen.getByLabelText('Architecture summary')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('close button dismisses overlay', async () => {
    const user = userEvent.setup();
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);
    expect(screen.getByRole('complementary')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close map preview/i }));
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows "View map" when architecture is empty', () => {
    setArchitecture(blank);
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    const allText = buttons.map((b) => b.textContent).join(' ');
    expect(allText).toMatch(/view map/i);
  });

  it('shows heading "Your map" in the open panel', async () => {
    const user = userEvent.setup();
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);
    expect(screen.getByRole('heading', { name: /your map/i })).toBeInTheDocument();
  });

  it('renders BullseyeDiagram instead of MiniMap on importance step', async () => {
    mockPathname = '/wizard/importance';
    const user = userEvent.setup();
    render(<LiveMapSidebar />);
    const buttons = screen.getAllByRole('button', { name: /open map preview/i });
    await user.click(buttons[0]);
    expect(screen.getByRole('img', { name: /importance/i })).toBeInTheDocument();
  });
});
