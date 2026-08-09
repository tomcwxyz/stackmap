import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { ExamplePicker } from '@/components/examples/example-picker';
import { resetWorkspaceCache } from '@/hooks/useWorkspace';
import { STORAGE_KEY, WORKSPACE_KEY, mapStorageKey } from '@/lib/storage/keys';

const assign = vi.fn();

beforeAll(() => {
  // The picker navigates the whole page rather than routing client-side
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, assign },
  });
});

describe('ExamplePicker', () => {
  beforeEach(() => {
    localStorage.clear();
    resetWorkspaceCache();
    vi.clearAllMocks();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<ExamplePicker />);
    expect(await axe(container)).toHaveNoViolations();
  });

  it('offers each example with what it is worth looking at', () => {
    render(<ExamplePicker />);

    expect(screen.getByText('Riverside Advice')).toBeInTheDocument();
    expect(screen.getByText('Green Futures CIC')).toBeInTheDocument();
    expect(screen.getByText('Northfield Borough Council')).toBeInTheDocument();
    expect(screen.getByText(/two crms nobody has reconciled/i)).toBeInTheDocument();
  });

  it('opens an example as its own map, leaving anything else alone', async () => {
    // Nobody should lose an afternoon's work to a curious click
    const existing = JSON.stringify({ organisation: { name: 'My real map' } });
    localStorage.setItem(STORAGE_KEY, existing);

    const user = userEvent.setup();
    render(<ExamplePicker />);

    const card = screen.getByText('Riverside Advice').closest('li')!;
    await user.click(within(card).getByRole('button', { name: /open this example/i }));

    expect(localStorage.getItem(STORAGE_KEY)).toBe(existing);
  });

  it('names the new map so it cannot be mistaken for your own', async () => {
    const user = userEvent.setup();
    render(<ExamplePicker />);

    const card = screen.getByText('Riverside Advice').closest('li')!;
    await user.click(within(card).getByRole('button', { name: /open this example/i }));

    const workspace = JSON.parse(localStorage.getItem(WORKSPACE_KEY)!);
    const added = workspace.maps.find((m: { name: string }) => m.name.includes('Riverside'));
    expect(added.name).toBe('Riverside Advice (example)');
  });

  it('switches to the example and writes its content', async () => {
    const user = userEvent.setup();
    render(<ExamplePicker />);

    const card = screen.getByText('Riverside Advice').closest('li')!;
    await user.click(within(card).getByRole('button', { name: /open this example/i }));

    const workspace = JSON.parse(localStorage.getItem(WORKSPACE_KEY)!);
    const stored = JSON.parse(localStorage.getItem(mapStorageKey(workspace.activeMapId))!);
    expect(stored.organisation.name).toBe('Riverside Advice');
    expect(stored.systems.length).toBeGreaterThan(10);
  });

  it('opens on the review, which shows the most in one screen', async () => {
    const user = userEvent.setup();
    render(<ExamplePicker />);

    const card = screen.getByText('Riverside Advice').closest('li')!;
    await user.click(within(card).getByRole('button', { name: /open this example/i }));

    expect(assign).toHaveBeenCalledWith('/wizard/functions/review');
  });

  it('opens a service-first example on the service-first review', async () => {
    const user = userEvent.setup();
    render(<ExamplePicker />);

    const card = screen.getByText('Green Futures CIC').closest('li')!;
    await user.click(within(card).getByRole('button', { name: /open this example/i }));

    expect(assign).toHaveBeenCalledWith('/wizard/services/review');
  });
});
