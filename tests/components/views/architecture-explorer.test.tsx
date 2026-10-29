import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { afterEach, describe, it, expect, vi } from 'vitest';
import { ArchitectureExplorer } from '@/components/views/architecture-explorer';
import { buildRiversideAdvice } from '@/lib/examples/riverside-advice';

vi.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('ArchitectureExplorer', () => {
  afterEach(() => vi.unstubAllGlobals());

  function useMobileViewport() {
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
  }

  it('starts with an uncluttered system list on a phone', async () => {
    useMobileViewport();
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    expect(await screen.findByTestId('mobile-architecture-explorer')).toBeInTheDocument();
    expect(screen.getByRole('searchbox', { name: 'Find a system' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Lamplight' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Interactive architecture map' })).not.toBeInTheDocument();
  });

  it('filters by search, displays impact, and returns to the list', async () => {
    useMobileViewport();
    const user = userEvent.setup();
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    await screen.findByTestId('mobile-architecture-explorer');
    await user.type(screen.getByRole('searchbox', { name: 'Find a system' }), 'lamplight');
    expect(screen.getByRole('button', { name: 'Inspect Lamplight' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect Xero' })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inspect Lamplight' }));
    expect(screen.getByRole('heading', { name: 'What if this system were unavailable?' })).toBeInTheDocument();
    expect(screen.getByText('Debt advice drop-in')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to systems' }));
    expect(screen.getByRole('searchbox', { name: 'Find a system' })).toHaveValue('lamplight');
  });

  it('keeps the full network accessible on mobile without making it the default', async () => {
    useMobileViewport();
    const user = userEvent.setup();
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    await screen.findByTestId('mobile-architecture-explorer');
    await user.click(screen.getByRole('button', { name: 'Full network' }));
    expect(screen.getByRole('region', { name: 'Interactive architecture map' })).toBeInTheDocument();
    expect(screen.getByText(/Swipe horizontally to see other layers/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Inspect Xero' }));
    expect(screen.getByRole('button', { name: '← Back to network' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '← Back to network' }));
    expect(screen.getByRole('region', { name: 'Interactive architecture map' })).toBeInTheDocument();
  });

  it('shows a usable map with visible systems before a selection', () => {
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    expect(screen.getByRole('heading', { name: 'Explore connections' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Interactive architecture map' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Lamplight' })).toBeInTheDocument();
  });

  it('uses a selected system to describe recorded direct exposure and available data', async () => {
    const user = userEvent.setup();
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    await user.click(screen.getByRole('button', { name: 'Inspect Lamplight' }));
    const panel = screen.getByRole('complementary', { name: 'Selected system details' });
    expect(within(panel).getByRole('heading', { name: 'What if this system were unavailable?' })).toBeInTheDocument();
    expect(within(panel).getByText('Debt advice drop-in')).toBeInTheDocument();
    expect(within(panel).getByText('Benefits casework')).toBeInTheDocument();
    expect(within(panel).getByText(/Google Sheets · fragile connection/)).toBeInTheDocument();
    expect(within(panel).getByText(/Client case notes · personal data/)).toBeInTheDocument();
    expect(within(panel).getByText('Riverside Borough Council')).toBeInTheDocument();
    expect(within(panel).getByText(/not confirmed service failures/i)).toBeInTheDocument();
  });

  it('can select, filter and switch off layers independently', async () => {
    const user = userEvent.setup();
    render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    await user.click(screen.getByRole('button', { name: 'Inspect Xero' }));
    expect(screen.getByRole('complementary', { name: 'Selected system details' })).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Organisational area'), 'fn-service_delivery');
    expect(screen.queryByRole('complementary', { name: 'Selected system details' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Inspect Xero' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inspect Lamplight' })).toBeInTheDocument();
    await user.click(screen.getByRole('checkbox', { name: 'Data' }));
    expect(screen.getByText('Client case notes')).toBeInTheDocument();
  });

  it('has no automated accessibility violations', async () => {
    const { container } = render(<ArchitectureExplorer architecture={buildRiversideAdvice()} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
