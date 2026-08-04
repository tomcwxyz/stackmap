import { render, screen, fireEvent } from '@testing-library/react';
import { axe } from 'jest-axe';
import { describe, it, expect, vi } from 'vitest';
import { ImportanceStep } from '@/components/wizard/importance-step';

// Mock useArchitecture
const mockUpdateSystem = vi.fn();
const mockAddSystem = vi.fn().mockReturnValue('new-id');

const mockArchitecture = {
  organisation: { id: 'org-1', name: 'Test Org', type: 'charity' as const, createdAt: '', updatedAt: '' },
  functions: [
    { id: 'fn-1', name: 'Finance', type: 'finance' as const, isActive: true },
    { id: 'fn-2', name: 'Communications', type: 'communications' as const, isActive: true },
  ],
  systems: [
    {
      id: 'sys-1', name: 'Xero', type: 'finance' as const, hosting: 'cloud' as const,
      status: 'active' as const, functionIds: ['fn-1'], serviceIds: [],
    },
    {
      id: 'sys-2', name: 'Mailchimp', type: 'email' as const, hosting: 'cloud' as const,
      status: 'active' as const, functionIds: ['fn-2'], serviceIds: [],
    },
  ],
  services: [],
  dataCategories: [],
  integrations: [],
  owners: [],
  externalParties: [],
  dataFlows: [],
  metadata: { version: '1.0.0', exportedAt: '', stackmapVersion: '0.1.0', mappingPath: 'function_first' as const },
};

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => ({
    architecture: mockArchitecture,
    isLoading: false,
    updateSystem: mockUpdateSystem,
    addSystem: mockAddSystem,
  }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/wizard/functions/importance',
}));

describe('ImportanceStep', () => {
  it('has no accessibility violations', async () => {
    const { container } = render(<ImportanceStep />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('renders systems grouped by function', () => {
    render(<ImportanceStep />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
    expect(screen.getByText('Communications')).toBeInTheDocument();
    expect(screen.getByText('Xero')).toBeInTheDocument();
    expect(screen.getByText('Mailchimp')).toBeInTheDocument();
  });

  it('renders tier definitions', () => {
    render(<ImportanceStep />);
    expect(screen.getByText(/Core/)).toBeInTheDocument();
    expect(screen.getByText(/operations would stop/i)).toBeInTheDocument();
  });

  it('renders importance sliders for each system', () => {
    render(<ImportanceStep />);
    const sliders = screen.getAllByRole('slider');
    expect(sliders).toHaveLength(2); // Xero and Mailchimp
  });

  it('calls updateSystem when slider changes', () => {
    render(<ImportanceStep />);
    const sliders = screen.getAllByRole('slider');
    fireEvent.change(sliders[0], { target: { value: '8' } });
    expect(mockUpdateSystem).toHaveBeenCalledWith('sys-1', { importance: 8 });
  });

  it('renders shadow tool prompts per function', () => {
    render(<ImportanceStep />);
    expect(screen.getByText(/tools people use informally for Finance/i)).toBeInTheDocument();
    expect(screen.getByText(/tools people use informally for Communications/i)).toBeInTheDocument();
  });

  it('renders add shadow tool buttons', () => {
    render(<ImportanceStep />);
    const buttons = screen.getAllByRole('button', { name: /add shadow tool/i });
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});
