import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ArchitectureProvider, useArchitecture } from '@/hooks/useArchitecture';
import { useStorageStatus } from '@/hooks/useStorageStatus';
import type { StorageAdapter, LoadReport } from '@/lib/storage/adapter';
import type { Architecture } from '@/lib/types';

class FakeAdapter implements StorageAdapter {
  saves: Architecture[] = [];
  failWith: Error | null = null;
  loadReport: LoadReport | null = null;

  async load(): Promise<Architecture | null> {
    return null;
  }

  async save(arch: Architecture): Promise<void> {
    if (this.failWith) throw this.failWith;
    this.saves.push(arch);
  }

  async clear(): Promise<void> {}

  getLastLoadReport(): LoadReport | null {
    return this.loadReport;
  }
}

function Probe() {
  const { architecture, updateOrganisation } = useArchitecture();
  const { saveState, saveError, loadReport } = useStorageStatus();

  return (
    <div>
      <span data-testid="loaded">{architecture ? 'yes' : 'no'}</span>
      <span data-testid="org-name">{architecture?.organisation.name ?? ''}</span>
      <span data-testid="save-state">{saveState}</span>
      <span data-testid="save-error">{saveError ?? ''}</span>
      <span data-testid="dropped">{loadReport?.droppedCount ?? ''}</span>
      <button type="button" onClick={() => updateOrganisation({ name: 'One' })}>
        rename one
      </button>
      <button type="button" onClick={() => updateOrganisation({ name: 'Two' })}>
        rename two
      </button>
    </div>
  );
}

function renderWithAdapter(adapter: StorageAdapter) {
  return render(
    <ArchitectureProvider adapter={adapter}>
      <Probe />
    </ArchitectureProvider>,
  );
}

/** Edits made before the initial load resolves are dropped, so always wait. */
async function waitForLoad() {
  await waitFor(() => expect(screen.getByTestId('loaded')).toHaveTextContent('yes'));
}

describe('ArchitectureProvider persistence', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('debounces rapid edits into a single write', async () => {
    const adapter = new FakeAdapter();
    renderWithAdapter(adapter);
    await waitForLoad();

    await act(async () => {
      screen.getByRole('button', { name: 'rename one' }).click();
      screen.getByRole('button', { name: 'rename two' }).click();
    });

    // Nothing written while edits are still arriving
    expect(adapter.saves).toHaveLength(0);

    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(adapter.saves).toHaveLength(1);
    expect(adapter.saves[0].organisation.name).toBe('Two');
  });

  it('reports a save failure instead of swallowing it', async () => {
    const adapter = new FakeAdapter();
    adapter.failWith = Object.assign(new Error('exceeded the quota'), {
      name: 'QuotaExceededError',
    });
    renderWithAdapter(adapter);
    await waitForLoad();

    await act(async () => {
      screen.getByRole('button', { name: 'rename one' }).click();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByTestId('save-state')).toHaveTextContent('error');
    expect(screen.getByTestId('save-error')).toHaveTextContent(/no room left/i);
  });

  it('recovers to a saved state once storage works again', async () => {
    const adapter = new FakeAdapter();
    adapter.failWith = new Error('nope');
    renderWithAdapter(adapter);
    await waitForLoad();

    await act(async () => {
      screen.getByRole('button', { name: 'rename one' }).click();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });
    expect(screen.getByTestId('save-state')).toHaveTextContent('error');

    adapter.failWith = null;
    await act(async () => {
      screen.getByRole('button', { name: 'rename two' }).click();
    });
    await act(async () => {
      vi.advanceTimersByTime(600);
    });

    expect(screen.getByTestId('save-state')).toHaveTextContent('saved');
    expect(screen.getByTestId('save-error')).toHaveTextContent('');
  });

  it('surfaces entities the adapter had to drop on load', async () => {
    const adapter = new FakeAdapter();
    adapter.loadReport = { droppedCount: 2, backedUp: false };
    renderWithAdapter(adapter);

    await waitFor(() => {
      expect(screen.getByTestId('dropped')).toHaveTextContent('2');
    });
  });

  it('ignores a clean load report', async () => {
    const adapter = new FakeAdapter();
    adapter.loadReport = { droppedCount: 0, backedUp: false };
    renderWithAdapter(adapter);
    await waitForLoad();

    expect(screen.getByTestId('dropped')).toHaveTextContent('');
  });

  it('flushes a pending write when the provider unmounts', async () => {
    const adapter = new FakeAdapter();
    const { unmount } = renderWithAdapter(adapter);
    await waitForLoad();

    await act(async () => {
      screen.getByRole('button', { name: 'rename one' }).click();
    });
    expect(adapter.saves).toHaveLength(0);

    await act(async () => {
      unmount();
    });

    expect(adapter.saves).toHaveLength(1);
    expect(adapter.saves[0].organisation.name).toBe('One');
  });
});
