import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContextualTip } from '@/components/wizard/contextual-tip';
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

// ─── Mock usePathname ───

let mockPathname = '/wizard/functions';

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

// ─── Mock getTip ───

let mockTipReturn = '';

vi.mock('@/components/wizard/tips', () => ({
  getTip: (...args: unknown[]) => mockTipReturn,
}));

// ─── Helpers ───

function setArchitecture(arch: Architecture) {
  mockContextValue.architecture = arch;
}

// ─── Tests ───

describe('ContextualTip', () => {
  beforeEach(() => {
    setArchitecture(blank);
    mockPathname = '/wizard/functions';
    mockTipReturn = '';
  });

  it('has no axe violations when tip is shown', async () => {
    mockTipReturn = 'Select your functions.';
    const { container } = render(<ContextualTip />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('shows correct tip text', () => {
    mockTipReturn = 'Start by selecting the functions your organisation performs.';
    render(<ContextualTip />);
    expect(screen.getByText('Start by selecting the functions your organisation performs.')).toBeInTheDocument();
  });

  it('has role="status" on the tip element', () => {
    mockTipReturn = 'Some tip text';
    render(<ContextualTip />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('returns null when getTip returns empty string', () => {
    mockTipReturn = '';
    const { container } = render(<ContextualTip />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when architecture is null', () => {
    mockContextValue.architecture = null;
    mockTipReturn = 'Some tip';
    const { container } = render(<ContextualTip />);
    expect(container.innerHTML).toBe('');
  });
});
