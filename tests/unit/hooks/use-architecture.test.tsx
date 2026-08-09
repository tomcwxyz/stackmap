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

describe('removing something other things point at', () => {
  // A reference to a function that no longer exists is not a grouping, it is
  // an invisible orphan: the system disappears from the diagram's subgraphs
  // and turns up under "Other systems" with no explanation.
  function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useArchitecture>) => void }) {
    const ctx = useArchitecture();
    onReady(ctx);
    return <span data-testid="systems">{JSON.stringify(ctx.architecture?.systems ?? [])}</span>;
  }

  async function setUp() {
    let ctx: ReturnType<typeof useArchitecture> | null = null;
    render(
      <ArchitectureProvider adapter={new FakeAdapter()}>
        <Harness onReady={(c) => { ctx = c; }} />
      </ArchitectureProvider>,
    );
    await waitFor(() => expect(ctx!.architecture).not.toBeNull());
    return () => ctx!;
  }

  it('takes the function off any system that referenced it', async () => {
    const get = await setUp();

    let fnId = '';
    await act(async () => { fnId = get().addFunction({ name: 'Finance', type: 'finance', isActive: true }); });
    await act(async () => {
      get().addSystem({
        name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active',
        functionIds: [fnId], serviceIds: [],
      });
    });
    expect(get().architecture!.systems[0].functionIds).toEqual([fnId]);

    await act(async () => { get().removeFunction(fnId); });

    expect(get().architecture!.systems[0].functionIds).toEqual([]);
  });

  it('leaves other functions on that system alone', async () => {
    const get = await setUp();

    let keep = '';
    let drop = '';
    await act(async () => {
      keep = get().addFunction({ name: 'Finance', type: 'finance', isActive: true });
      drop = get().addFunction({ name: 'Operations', type: 'operations', isActive: true });
    });
    await act(async () => {
      get().addSystem({
        name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active',
        functionIds: [keep, drop], serviceIds: [],
      });
    });

    await act(async () => { get().removeFunction(drop); });

    expect(get().architecture!.systems[0].functionIds).toEqual([keep]);
  });

  it('does the same when a service is removed', async () => {
    const get = await setUp();

    let svcId = '';
    await act(async () => {
      svcId = get().addService({ name: 'Advice line', status: 'active', functionIds: [], systemIds: [] });
    });
    await act(async () => {
      get().addSystem({
        name: 'Lamplight', type: 'case_management', hosting: 'cloud', status: 'active',
        functionIds: [], serviceIds: [svcId],
      });
    });

    await act(async () => { get().removeService(svcId); });

    expect(get().architecture!.systems[0].serviceIds).toEqual([]);
  });
});

describe('clearing one section at a time', () => {
  function Harness({ onReady }: { onReady: (ctx: ReturnType<typeof useArchitecture>) => void }) {
    const ctx = useArchitecture();
    onReady(ctx);
    return null;
  }

  async function setUp() {
    let ctx: ReturnType<typeof useArchitecture> | null = null;
    render(
      <ArchitectureProvider adapter={new FakeAdapter()}>
        <Harness onReady={(c) => { ctx = c; }} />
      </ArchitectureProvider>,
    );
    await waitFor(() => expect(ctx!.architecture).not.toBeNull());
    const get = () => ctx!;

    // A small map with something in every section
    let fnId = '';
    let svcId = '';
    let sysA = '';
    let sysB = '';
    let ownerId = '';
    let partyId = '';
    let categoryId = '';
    await act(async () => {
      fnId = get().addFunction({ name: 'Finance', type: 'finance', isActive: true });
      ownerId = get().addOwner({ name: 'Priya', isExternal: false });
      partyId = get().addExternalParty({ name: 'The Lottery', type: 'funder' });
    });
    await act(async () => {
      svcId = get().addService({ name: 'Advice', status: 'active', functionIds: [fnId], systemIds: [] });
    });
    await act(async () => {
      sysA = get().addSystem({
        name: 'Xero', type: 'finance', hosting: 'cloud', status: 'active',
        functionIds: [fnId], serviceIds: [svcId], ownerId,
      });
      sysB = get().addSystem({
        name: 'Lamplight', type: 'case_management', hosting: 'cloud', status: 'active',
        functionIds: [fnId], serviceIds: [],
      });
    });
    await act(async () => {
      categoryId = get().addDataCategory({
        name: 'Case notes', sensitivity: 'restricted', containsPersonalData: true, systemIds: [sysA, sysB],
      });
      get().addIntegration({
        sourceSystemId: sysA, targetSystemId: sysB, type: 'api',
        direction: 'one_way', frequency: 'scheduled', reliability: 'reliable',
      });
    });
    await act(async () => {
      get().addDataFlow({
        systemId: sysA, partyId, dataCategoryIds: [categoryId],
        method: 'portal', frequency: 'annual',
      });
    });
    await act(async () => {
      get().updateService(svcId, { systemIds: [sysA] });
    });

    return get;
  }

  it('empties only what was asked for', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('integrations'); });

    expect(get().architecture!.integrations).toEqual([]);
    expect(get().architecture!.systems).toHaveLength(2);
    expect(get().architecture!.functions).toHaveLength(1);
  });

  it('takes the functions off systems and services when functions go', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('functions'); });

    expect(get().architecture!.functions).toEqual([]);
    expect(get().architecture!.systems.every((s) => s.functionIds.length === 0)).toBe(true);
    expect(get().architecture!.services.every((s) => s.functionIds.length === 0)).toBe(true);
  });

  it('takes the owner off systems when owners go', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('owners'); });

    expect(get().architecture!.owners).toEqual([]);
    expect(get().architecture!.systems.every((s) => s.ownerId === undefined)).toBe(true);
  });

  it('clears what depended on systems, since everything hangs off them', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('systems'); });

    const arch = get().architecture!;
    expect(arch.systems).toEqual([]);
    expect(arch.integrations).toEqual([]);
    expect(arch.dataFlows).toEqual([]);
    expect(arch.services.every((s) => s.systemIds.length === 0)).toBe(true);
    expect(arch.dataCategories.every((d) => d.systemIds.length === 0)).toBe(true);
    // The things that do not depend on a system are left alone
    expect(arch.functions).toHaveLength(1);
    expect(arch.owners).toHaveLength(1);
  });

  it('takes both ends of sharing together', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('sharing'); });

    expect(get().architecture!.externalParties).toEqual([]);
    expect(get().architecture!.dataFlows).toEqual([]);
  });

  it('leaves flows pointing at nothing when the data categories go', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('dataCategories'); });

    expect(get().architecture!.dataCategories).toEqual([]);
    expect(get().architecture!.dataFlows.every((f) => f.dataCategoryIds.length === 0)).toBe(true);
    expect(get().architecture!.dataFlows).toHaveLength(1);
  });

  it('takes systems off services when services go', async () => {
    const get = await setUp();

    await act(async () => { get().clearSection('services'); });

    expect(get().architecture!.services).toEqual([]);
    expect(get().architecture!.systems.every((s) => s.serviceIds.length === 0)).toBe(true);
  });
});

