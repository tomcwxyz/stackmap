import type { Architecture } from '@/lib/types';
import {
  DEFAULT_MAP_ID,
  WORKSPACE_KEY,
  mapStorageKey,
  snapshotsStorageKey,
} from './keys';

export { DEFAULT_MAP_ID, WORKSPACE_KEY, mapStorageKey, snapshotsStorageKey };

/** How many snapshots of a map are kept before the oldest is dropped. */
export const MAX_SNAPSHOTS = 10;

export interface MapMeta {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  activeMapId: string;
  maps: MapMeta[];
}

export interface SnapshotMeta {
  id: string;
  /** What the user called it, or the date if they called it nothing. */
  label: string;
  takenAt: string;
}

export interface Snapshot extends SnapshotMeta {
  architecture: Architecture;
}

/** Minimal surface of localStorage, so the store can be driven in tests. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function isMapMeta(value: unknown): value is MapMeta {
  if (typeof value !== 'object' || value === null) return false;
  const meta = value as Record<string, unknown>;
  return typeof meta.id === 'string' && typeof meta.name === 'string';
}

function defaultName(arch: Architecture | null): string {
  const name = arch?.organisation.name?.trim();
  return name && name.length > 0 ? name : 'Your map';
}

/**
 * Several maps in one browser, and snapshots of each.
 *
 * An advisor working with four charities, or an organisation asking "what would
 * this look like if we moved off SharePoint", both need more than the single
 * document the app started with. Both work the same way: a map is a document
 * under its own key, and the workspace records which one is being edited.
 *
 * All of it is synchronous because localStorage is, and because the callers are
 * event handlers that want to know the result before they navigate.
 */
export class WorkspaceStore {
  private readonly store: KeyValueStore | null;

  constructor(store?: KeyValueStore) {
    this.store = store ?? WorkspaceStore.defaultStore();
  }

  private static defaultStore(): KeyValueStore | null {
    try {
      const testKey = '__stackmap_workspace_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return localStorage;
    } catch {
      return null;
    }
  }

  /** True when there is somewhere to store a workspace at all. */
  get isAvailable(): boolean {
    return this.store !== null;
  }

  private readJson<T>(key: string): T | null {
    if (!this.store) return null;
    const raw = this.store.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  private writeJson(key: string, value: unknown): void {
    this.store?.setItem(key, JSON.stringify(value));
  }

  /**
   * The workspace, created from whatever is already stored if it does not exist.
   *
   * A user who has been mapping since before there were several maps has a
   * document and no workspace; that document becomes their first map rather
   * than being ignored.
   */
  read(): Workspace {
    const stored = this.readJson<Partial<Workspace>>(WORKSPACE_KEY);
    const maps = Array.isArray(stored?.maps) ? stored.maps.filter(isMapMeta) : [];

    if (maps.length === 0) {
      const now = new Date().toISOString();
      const existing = this.readMap(DEFAULT_MAP_ID);
      return {
        activeMapId: DEFAULT_MAP_ID,
        maps: [
          {
            id: DEFAULT_MAP_ID,
            name: defaultName(existing),
            createdAt: existing?.organisation.createdAt || now,
            updatedAt: existing?.organisation.updatedAt || now,
          },
        ],
      };
    }

    // A stored active id can point at a map that has since been deleted
    const activeMapId = maps.some((m) => m.id === stored?.activeMapId)
      ? (stored!.activeMapId as string)
      : maps[0].id;

    return { activeMapId, maps };
  }

  private write(workspace: Workspace): void {
    this.writeJson(WORKSPACE_KEY, workspace);
  }

  listMaps(): MapMeta[] {
    return this.read().maps;
  }

  getActiveMapId(): string {
    return this.read().activeMapId;
  }

  readMap(id: string): Architecture | null {
    return this.readJson<Architecture>(mapStorageKey(id));
  }

  writeMap(id: string, arch: Architecture): void {
    this.writeJson(mapStorageKey(id), arch);
  }

  /** Records that a map changed, so the list can be ordered by recency. */
  touch(id: string, at: Date = new Date()): void {
    const workspace = this.read();
    this.write({
      ...workspace,
      maps: workspace.maps.map((m) =>
        m.id === id ? { ...m, updatedAt: at.toISOString() } : m,
      ),
    });
  }

  createMap(name: string, id: string, at: Date = new Date()): MapMeta {
    const workspace = this.read();
    const meta: MapMeta = {
      id,
      name: name.trim() || 'Untitled map',
      createdAt: at.toISOString(),
      updatedAt: at.toISOString(),
    };
    this.write({ activeMapId: workspace.activeMapId, maps: [...workspace.maps, meta] });
    return meta;
  }

  /**
   * A copy of a map, for trying a change without risking the original.
   *
   * The copy keeps every id inside the document. Ids only have to be unique
   * within a map, and rewriting them would break every reference in it.
   */
  duplicateMap(sourceId: string, name: string, id: string, at: Date = new Date()): MapMeta | null {
    const source = this.readMap(sourceId);
    if (!source) return null;

    const meta = this.createMap(name, id, at);
    this.writeMap(id, source);
    return meta;
  }

  renameMap(id: string, name: string): void {
    const trimmed = name.trim();
    if (!trimmed) return;
    const workspace = this.read();
    this.write({
      ...workspace,
      maps: workspace.maps.map((m) => (m.id === id ? { ...m, name: trimmed } : m)),
    });
  }

  /**
   * Removes a map and everything kept about it.
   *
   * The last map is never deleted: an empty workspace has no active map, and
   * "start again" is what clearing a map is for.
   */
  deleteMap(id: string): boolean {
    const workspace = this.read();
    if (workspace.maps.length <= 1) return false;
    if (!workspace.maps.some((m) => m.id === id)) return false;

    const maps = workspace.maps.filter((m) => m.id !== id);
    const activeMapId = workspace.activeMapId === id ? maps[0].id : workspace.activeMapId;

    this.write({ activeMapId, maps });
    this.store?.removeItem(mapStorageKey(id));
    this.store?.removeItem(snapshotsStorageKey(id));
    return true;
  }

  switchTo(id: string): boolean {
    const workspace = this.read();
    if (!workspace.maps.some((m) => m.id === id)) return false;
    this.write({ ...workspace, activeMapId: id });
    return true;
  }

  // ─── Snapshots ───

  private readSnapshots(mapId: string): Snapshot[] {
    const stored = this.readJson<unknown>(snapshotsStorageKey(mapId));
    return Array.isArray(stored) ? (stored as Snapshot[]) : [];
  }

  /** Newest first, without the documents, which are large. */
  listSnapshots(mapId: string): SnapshotMeta[] {
    return this.readSnapshots(mapId).map(({ id, label, takenAt }) => ({ id, label, takenAt }));
  }

  /**
   * Keeps a copy of the map as it is now.
   *
   * Old snapshots are dropped past a limit rather than filling the browser's
   * storage, which would take the live map down with them.
   */
  takeSnapshot(
    mapId: string,
    label: string,
    architecture: Architecture,
    id: string,
    at: Date = new Date(),
  ): SnapshotMeta {
    const takenAt = at.toISOString();
    const snapshot: Snapshot = {
      id,
      label: label.trim() || takenAt.slice(0, 10),
      takenAt,
      architecture,
    };

    const kept = [snapshot, ...this.readSnapshots(mapId)].slice(0, MAX_SNAPSHOTS);
    this.writeJson(snapshotsStorageKey(mapId), kept);

    return { id: snapshot.id, label: snapshot.label, takenAt };
  }

  /**
   * Puts a snapshot back over the map, having first snapshotted what was there.
   *
   * Restoring is otherwise the one destructive thing in here, and "I restored
   * the wrong one" should not cost anybody their afternoon.
   */
  restoreSnapshot(mapId: string, snapshotId: string, backupId: string, at: Date = new Date()): Architecture | null {
    const snapshot = this.readSnapshots(mapId).find((s) => s.id === snapshotId);
    if (!snapshot) return null;

    const current = this.readMap(mapId);
    if (current) {
      this.takeSnapshot(mapId, 'Before restoring', current, backupId, at);
    }

    this.writeMap(mapId, snapshot.architecture);
    this.touch(mapId, at);
    return snapshot.architecture;
  }

  deleteSnapshot(mapId: string, snapshotId: string): void {
    const remaining = this.readSnapshots(mapId).filter((s) => s.id !== snapshotId);
    this.writeJson(snapshotsStorageKey(mapId), remaining);
  }
}
