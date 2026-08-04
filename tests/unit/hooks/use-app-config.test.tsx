import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach } from 'vitest';
import { useAppConfig } from '@/hooks/useAppConfig';

const CONFIG_KEY = 'stackmap_config';

function Probe() {
  const { config, updateConfig } = useAppConfig();

  return (
    <div>
      <span data-testid="available">{String(config.techFreedomAvailable)}</span>
      <button type="button" onClick={() => updateConfig({ techFreedomAvailable: false })}>
        disable
      </button>
      <button type="button" onClick={() => updateConfig({ techFreedomAvailable: true })}>
        enable
      </button>
    </div>
  );
}

describe('useAppConfig', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to TechFreedom being available', () => {
    render(<Probe />);
    expect(screen.getByTestId('available')).toHaveTextContent('true');
  });

  it('reads a stored config', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({ techFreedomAvailable: false }));

    render(<Probe />);

    expect(screen.getByTestId('available')).toHaveTextContent('false');
  });

  it('falls back to the default when the stored config is corrupt', () => {
    localStorage.setItem(CONFIG_KEY, '{not json');

    render(<Probe />);

    expect(screen.getByTestId('available')).toHaveTextContent('true');
  });

  it('fills in fields missing from a stored config', () => {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({}));

    render(<Probe />);

    expect(screen.getByTestId('available')).toHaveTextContent('true');
  });

  it('persists an update', async () => {
    const user = userEvent.setup();
    render(<Probe />);

    await user.click(screen.getByRole('button', { name: 'disable' }));

    expect(screen.getByTestId('available')).toHaveTextContent('false');
    expect(JSON.parse(localStorage.getItem(CONFIG_KEY)!)).toEqual({
      techFreedomAvailable: false,
    });
  });

  it('keeps every mounted reader in step', async () => {
    const user = userEvent.setup();
    render(
      <>
        <Probe />
        <Probe />
      </>,
    );

    await user.click(screen.getAllByRole('button', { name: 'disable' })[0]);

    const values = screen.getAllByTestId('available').map((el) => el.textContent);
    expect(values).toEqual(['false', 'false']);
  });

  it('picks up a change made in another tab', () => {
    render(<Probe />);
    expect(screen.getByTestId('available')).toHaveTextContent('true');

    act(() => {
      localStorage.setItem(CONFIG_KEY, JSON.stringify({ techFreedomAvailable: false }));
      window.dispatchEvent(new StorageEvent('storage', { key: CONFIG_KEY }));
    });

    expect(screen.getByTestId('available')).toHaveTextContent('false');
  });
});
