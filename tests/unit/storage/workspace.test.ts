import { describe, it, expect, beforeEach } from 'vitest';
import {
  WorkspaceStore,
  DEFAULT_MAP_ID,
  MAX_SNAPSHOTS,
  WORKSPACE_KEY,
  mapStorageKey,
  snapshotsStorageKey,
  type KeyValueStore,
} from '@/lib/storage/workspace';
import { STORAGE_KEY } from '@/lib/storage/keys';
import type { Architecture } from '@/lib/types';

class MemoryStore implements KeyValueStore {
  private data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
  has(key: string): boolean {
    return this.data.has(key);
  }
}

function architecture(name = 'Sunrise Trust'): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name,
      type: 'charity',
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-02-01T00:00:00.000Z',
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0.0',
      exportedAt: '',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

const AT = new Date('2026-08-04T12:00:00.000Z');

describe('WorkspaceStore', () => {
  let store: MemoryStore;
  let workspace: WorkspaceStore;

  beforeEach(() => {
    store = new MemoryStore();
    workspace = new WorkspaceStore(store);
  });

  describe('storage layout', () => {
    it('leaves the first map where single-map storage always kept it', () => {
      expect(mapStorageKey(DEFAULT_MAP_ID)).toBe(STORAGE_KEY);
    });

    it('gives every other map its own key', () => {
      expect(mapStorageKey('abc')).toBe('stackmap_map_abc');
      expect(mapStorageKey('abc')).not.toBe(mapStorageKey('def'));
    });
  });

  describe('reading a workspace that does not exist yet', () => {
    it('offers a single map', () => {
      const { activeMapId, maps } = workspace.read();

      expect(activeMapId).toBe(DEFAULT_MAP_ID);
      expect(maps).toHaveLength(1);
    });

    it('adopts a map made before there were several, rather than ignoring it', () => {
      store.setItem(STORAGE_KEY, JSON.stringify(architecture('Sunrise Trust')));

      const { maps } = workspace.read();

      expect(maps[0].id).toBe(DEFAULT_MAP_ID);
      expect(maps[0].name).toBe('Sunrise Trust');
    });

    it('does not rewrite the adopted document', () => {
      const original = JSON.stringify(architecture());
      store.setItem(STORAGE_KEY, original);

      workspace.read();

      expect(store.getItem(STORAGE_KEY)).toBe(original);
    });

    it('names an unnamed map something a person can pick out', () => {
      store.setItem(STORAGE_KEY, JSON.stringify(architecture('')));

      expect(workspace.read().maps[0].name).toBe('Your map');
    });

    it('survives a workspace record that cannot be read', () => {
      store.setItem(WORKSPACE_KEY, 'not json');

      expect(workspace.read().maps).toHaveLength(1);
    });

    it('falls back to a real map when the active one has gone', () => {
      store.setItem(
        WORKSPACE_KEY,
        JSON.stringify({
          activeMapId: 'deleted-map',
          maps: [{ id: 'm1', name: 'Kept', createdAt: '', updatedAt: '' }],
        }),
      );

      expect(workspace.read().activeMapId).toBe('m1');
    });
  });

  describe('creating maps', () => {
    it('adds a map without switching to it, so work in progress is not interrupted', () => {
      workspace.createMap('Second charity', 'm2', AT);

      const state = workspace.read();
      expect(state.maps.map((m) => m.name)).toEqual(['Your map', 'Second charity']);
      expect(state.activeMapId).toBe(DEFAULT_MAP_ID);
    });

    it('names a map that was given no name', () => {
      const meta = workspace.createMap('   ', 'm2', AT);

      expect(meta.name).toBe('Untitled map');
    });

    it('renames a map', () => {
      workspace.createMap('Second', 'm2', AT);
      workspace.renameMap('m2', '  Riverside Trust  ');

      expect(workspace.listMaps().find((m) => m.id === 'm2')?.name).toBe('Riverside Trust');
    });

    it('refuses to rename a map to nothing', () => {
      workspace.createMap('Second', 'm2', AT);
      workspace.renameMap('m2', '   ');

      expect(workspace.listMaps().find((m) => m.id === 'm2')?.name).toBe('Second');
    });
  });

  describe('duplicating', () => {
    beforeEach(() => {
      workspace.writeMap(DEFAULT_MAP_ID, architecture());
    });

    it('copies the document so the original is untouched by later edits', () => {
      workspace.duplicateMap(DEFAULT_MAP_ID, 'What if we moved off SharePoint', 'm2', AT);

      expect(workspace.readMap('m2')?.organisation.name).toBe('Sunrise Trust');

      workspace.writeMap('m2', architecture('Changed'));
      expect(workspace.readMap(DEFAULT_MAP_ID)?.organisation.name).toBe('Sunrise Trust');
    });

    it('does nothing when there is no source document', () => {
      expect(workspace.duplicateMap('nope', 'Copy', 'm3', AT)).toBeNull();
      expect(workspace.listMaps()).toHaveLength(1);
    });
  });

  describe('switching', () => {
    it('changes which map is active', () => {
      workspace.createMap('Second', 'm2', AT);

      expect(workspace.switchTo('m2')).toBe(true);
      expect(workspace.getActiveMapId()).toBe('m2');
    });

    it('ignores a map that is not in the workspace', () => {
      expect(workspace.switchTo('ghost')).toBe(false);
      expect(workspace.getActiveMapId()).toBe(DEFAULT_MAP_ID);
    });
  });

  describe('deleting', () => {
    beforeEach(() => {
      workspace.createMap('Second', 'm2', AT);
      workspace.writeMap('m2', architecture('Second'));
    });

    it('removes the map and its document', () => {
      expect(workspace.deleteMap('m2')).toBe(true);

      expect(workspace.listMaps()).toHaveLength(1);
      expect(store.has(mapStorageKey('m2'))).toBe(false);
    });

    it('removes its snapshots too, which are no use without it', () => {
      workspace.takeSnapshot('m2', 'Before', architecture(), 's1', AT);

      workspace.deleteMap('m2');

      expect(store.has(snapshotsStorageKey('m2'))).toBe(false);
    });

    it('moves off a deleted map rather than leaving nothing active', () => {
      workspace.switchTo('m2');
      workspace.deleteMap('m2');

      expect(workspace.getActiveMapId()).toBe(DEFAULT_MAP_ID);
    });

    it('will not delete the only map, since that leaves nothing to work on', () => {
      workspace.deleteMap('m2');

      expect(workspace.deleteMap(DEFAULT_MAP_ID)).toBe(false);
      expect(workspace.listMaps()).toHaveLength(1);
    });

    it('ignores a map that is not there', () => {
      expect(workspace.deleteMap('ghost')).toBe(false);
    });
  });

  describe('snapshots', () => {
    beforeEach(() => {
      workspace.writeMap(DEFAULT_MAP_ID, architecture('Now'));
    });

    it('keeps a copy of the map as it was', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Before the merger', architecture('Then'), 's1', AT);

      const [snapshot] = workspace.listSnapshots(DEFAULT_MAP_ID);
      expect(snapshot.label).toBe('Before the merger');
      expect(snapshot.takenAt).toBe(AT.toISOString());
    });

    it('labels an unlabelled snapshot with its date', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, '', architecture(), 's1', AT);

      expect(workspace.listSnapshots(DEFAULT_MAP_ID)[0].label).toBe('2026-08-04');
    });

    it('lists the newest first', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Older', architecture(), 's1', AT);
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Newer', architecture(), 's2', AT);

      expect(workspace.listSnapshots(DEFAULT_MAP_ID).map((s) => s.label)).toEqual([
        'Newer',
        'Older',
      ]);
    });

    it('drops the oldest rather than filling the browser storage', () => {
      for (let i = 0; i <= MAX_SNAPSHOTS; i++) {
        workspace.takeSnapshot(DEFAULT_MAP_ID, `Snapshot ${i}`, architecture(), `s${i}`, AT);
      }

      const labels = workspace.listSnapshots(DEFAULT_MAP_ID).map((s) => s.label);
      expect(labels).toHaveLength(MAX_SNAPSHOTS);
      expect(labels).not.toContain('Snapshot 0');
    });

    it('keeps snapshots of different maps apart', () => {
      workspace.createMap('Second', 'm2', AT);
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'First map', architecture(), 's1', AT);

      expect(workspace.listSnapshots('m2')).toEqual([]);
    });

    it('puts a snapshot back over the map', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Then', architecture('Then'), 's1', AT);

      const restored = workspace.restoreSnapshot(DEFAULT_MAP_ID, 's1', 'backup-1', AT);

      expect(restored?.organisation.name).toBe('Then');
      expect(workspace.readMap(DEFAULT_MAP_ID)?.organisation.name).toBe('Then');
    });

    it('snapshots what was there first, so the wrong restore is recoverable', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Then', architecture('Then'), 's1', AT);

      workspace.restoreSnapshot(DEFAULT_MAP_ID, 's1', 'backup-1', AT);

      const labels = workspace.listSnapshots(DEFAULT_MAP_ID).map((s) => s.label);
      expect(labels[0]).toBe('Before restoring');
    });

    it('does nothing for a snapshot that is not there', () => {
      expect(workspace.restoreSnapshot(DEFAULT_MAP_ID, 'ghost', 'backup-1', AT)).toBeNull();
      expect(workspace.readMap(DEFAULT_MAP_ID)?.organisation.name).toBe('Now');
    });

    it('deletes a snapshot', () => {
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Keep', architecture(), 's1', AT);
      workspace.takeSnapshot(DEFAULT_MAP_ID, 'Drop', architecture(), 's2', AT);

      workspace.deleteSnapshot(DEFAULT_MAP_ID, 's2');

      expect(workspace.listSnapshots(DEFAULT_MAP_ID).map((s) => s.label)).toEqual(['Keep']);
    });

    it('survives a snapshot record that cannot be read', () => {
      store.setItem(snapshotsStorageKey(DEFAULT_MAP_ID), 'not json');

      expect(workspace.listSnapshots(DEFAULT_MAP_ID)).toEqual([]);
    });
  });

  describe('recency', () => {
    it('records when a map was last changed', () => {
      workspace.touch(DEFAULT_MAP_ID, AT);

      expect(workspace.listMaps()[0].updatedAt).toBe(AT.toISOString());
    });
  });
});
