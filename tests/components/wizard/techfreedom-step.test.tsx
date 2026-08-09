import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';

const pushMock = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/wizard/techfreedom',
}));

const setTechFreedomEnabledMock = vi.fn();
let mockMappingPath = 'function_first';
let mockTechFreedomEnabled = false;

vi.mock('@/hooks/useArchitecture', () => ({
  useArchitecture: () => ({
    architecture: {
      metadata: { mappingPath: mockMappingPath, techFreedomEnabled: mockTechFreedomEnabled },
    },
    setTechFreedomEnabled: setTechFreedomEnabledMock,
    replaceArchitecture: vi.fn(),
    clearSection: vi.fn(),
  }),
}));

import TechFreedomStepPage from '@/app/wizard/techfreedom/page';

describe('TechFreedomStepPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMappingPath = 'function_first';
    mockTechFreedomEnabled = false;
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<TechFreedomStepPage />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('renders heading about technology risk', () => {
    render(<TechFreedomStepPage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/technology risk/i);
  });

  it('shows yes and no buttons', () => {
    render(<TechFreedomStepPage />);
    expect(screen.getByRole('button', { name: /yes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /no/i })).toBeInTheDocument();
  });

  it('enables TechFreedom and navigates to functions on yes click', async () => {
    const user = userEvent.setup();
    render(<TechFreedomStepPage />);
    await user.click(screen.getByRole('button', { name: /yes/i }));
    expect(setTechFreedomEnabledMock).toHaveBeenCalledWith(true);
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions');
  });

  it('disables TechFreedom and navigates on no click', async () => {
    const user = userEvent.setup();
    render(<TechFreedomStepPage />);
    await user.click(screen.getByRole('button', { name: /no/i }));
    expect(setTechFreedomEnabledMock).toHaveBeenCalledWith(false);
    expect(pushMock).toHaveBeenCalledWith('/wizard/functions');
  });

  it('navigates to services path when mappingPath is service_first', async () => {
    mockMappingPath = 'service_first';
    const user = userEvent.setup();
    render(<TechFreedomStepPage />);
    await user.click(screen.getByRole('button', { name: /yes/i }));
    expect(pushMock).toHaveBeenCalledWith('/wizard/services');
  });

  it('has a back link to /wizard', () => {
    render(<TechFreedomStepPage />);
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/wizard');
  });
});
