import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DiagramView } from '@/components/views/diagram-view';
import type { Architecture } from '@/lib/types';

// Mock next/dynamic to just render the component synchronously
vi.mock('next/dynamic', () => ({
  __esModule: true,
  default: (loader: () => Promise<{ default: React.ComponentType<unknown> }>) => {
    // Return a simple component that shows the syntax
    const MockComponent = (props: { syntax?: string }) => (
      <div data-testid="mermaid-renderer">{props.syntax}</div>
    );
    MockComponent.displayName = 'MockMermaidRenderer';
    return MockComponent;
  },
}));

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function createTestArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Charity',
      type: 'charity',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
    },
    functions: [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
    ],
    services: [],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
      },
    ],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '2025-01-01T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
    },
  };
}

describe('DiagramView', () => {
  it('shows loading skeleton when isLoading is true', () => {
    render(<DiagramView architecture={null} isLoading={true} />);
    // The skeleton uses animate-pulse
    const container = document.querySelector('.animate-pulse');
    expect(container).toBeTruthy();
  });

  it('shows empty state when architecture is null', () => {
    render(<DiagramView architecture={null} isLoading={false} />);
    expect(screen.getByText('No architecture data yet')).toBeTruthy();
    expect(screen.getByText('Start mapping')).toBeTruthy();
  });

  it('shows empty state when architecture has no systems or functions', () => {
    const arch = createTestArchitecture();
    arch.functions = [];
    arch.systems = [];
    render(<DiagramView architecture={arch} isLoading={false} />);
    expect(screen.getByText('Your map is empty')).toBeTruthy();
    const editLink = screen.getByText('Edit your map');
    expect(editLink.closest('a')?.getAttribute('href')).toBe('/wizard/functions/review');
  });

  it('renders diagram view with toolbar when architecture has data', () => {
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);
    expect(screen.getByText('Architecture diagram')).toBeTruthy();
    expect(screen.getByText('Test Charity')).toBeTruthy();
  });

  it('renders view mode toggle buttons', () => {
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);
    expect(screen.getByText('Full diagram')).toBeTruthy();
    expect(screen.getByText('Systems only')).toBeTruthy();
    expect(screen.getByText('Functions only')).toBeTruthy();
  });

  it('renders zoom controls', () => {
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);
    expect(screen.getByText('100%')).toBeTruthy();
    expect(screen.getByLabelText('Zoom in')).toBeTruthy();
    expect(screen.getByLabelText('Zoom out')).toBeTruthy();
    expect(screen.getByText('Reset')).toBeTruthy();
  });

  it('provides edit link back to review page', () => {
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);
    const editLink = screen.getByText('Edit your map');
    expect(editLink.closest('a')).toBeTruthy();
    expect(editLink.closest('a')?.getAttribute('href')).toBe('/wizard/functions/review');
  });

  it('passes mermaid syntax to renderer', () => {
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);
    const renderer = screen.getByTestId('mermaid-renderer');
    // Should contain mermaid graph syntax
    expect(renderer.textContent).toContain('graph TB');
    expect(renderer.textContent).toContain('Xero');
  });

  it('switches view mode when toggle is clicked', async () => {
    const user = userEvent.setup();
    const arch = createTestArchitecture();
    render(<DiagramView architecture={arch} isLoading={false} />);

    const systemsBtn = screen.getByText('Systems only');
    await user.click(systemsBtn);

    const renderer = screen.getByTestId('mermaid-renderer');
    // Systems-only view should not contain subgraph
    expect(renderer.textContent).not.toContain('subgraph');
    expect(renderer.textContent).toContain('Xero');
  });
});
