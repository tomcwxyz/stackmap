import type { Architecture } from '@/lib/types';
import type { LoadReport, StorageAdapter } from './adapter';
import { migrateArchitecture } from './migrate';
import {
  BACKUP_KEY,
  DEFAULT_MAP_ID,
  STORAGE_KEY,
  WORKSPACE_KEY,
  mapStorageKey,
} from './keys';

export { STORAGE_KEY, BACKUP_KEY };

interface LocalStorageAdapterOptions {
  forceInMemory?: boolean;
  /**
   * Which map to read and write. Left out, the adapter follows whichever map
   * the workspace says is active, so a page does not have to know.
   */
  mapId?: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  private inMemoryStore: string | null = null;
  private inMemoryBackup: string | null = null;
  private readonly useMemory: boolean;
  private readonly fixedMapId?: string;
  private boundKey: string | null = null;
  private lastLoadReport: LoadReport | null = null;

  constructor(options?: LocalStorageAdapterOptions) {
    this.useMemory = options?.forceInMemory ?? !LocalStorageAdapter.isLocalStorageAvailable();
    this.fixedMapId = options?.mapId;
  }

  /** Which map is active right now, according to the workspace. */
  private activeKey(): string {
    if (this.fixedMapId) return mapStorageKey(this.fixedMapId);

    try {
      const raw = localStorage.getItem(WORKSPACE_KEY);
      if (!raw) return STORAGE_KEY;
      const parsed = JSON.parse(raw) as { activeMapId?: unknown };
      return typeof parsed.activeMapId === 'string'
        ? mapStorageKey(parsed.activeMapId)
        : STORAGE_KEY;
    } catch {
      // No workspace, or an unreadable one: the original single map
      return mapStorageKey(DEFAULT_MAP_ID);
    }
  }

  /**
   * The key this adapter works against, fixed at first use.
   *
   * An adapter stands for one open document, so it must keep writing to the
   * map it read. Re-resolving the active map on every write loses data: making
   * a map switches to it, and anything the old page still had in hand — a
   * debounced edit, a flush on the way out — would land on top of the new map
   * and overwrite it with the previous map's contents.
   */
  private storageKey(): string {
    this.boundKey ??= this.activeKey();
    return this.boundKey;
  }

  private static isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__stackmap_test__';
      localStorage.setItem(testKey, '1');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private read(): string | null {
    return this.useMemory ? this.inMemoryStore : localStorage.getItem(this.storageKey());
  }

  /**
   * Move unusable data aside instead of deleting it. The map may represent an
   * afternoon of work, so a parse failure or a shape we cannot repair should
   * cost the user nothing they could not recover by hand.
   */
  private backUpAndClear(raw: string): void {
    if (this.useMemory) {
      this.inMemoryBackup = raw;
      this.inMemoryStore = null;
      return;
    }
    try {
      localStorage.setItem(BACKUP_KEY, raw);
    } catch {
      // If even the backup will not fit, still clear the bad document so the
      // app can start; there is nothing more we can do here.
    }
    localStorage.removeItem(this.storageKey());
  }

  async load(): Promise<Architecture | null> {
    const raw = this.read();

    if (raw === null || raw === undefined) {
      this.lastLoadReport = null;
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.backUpAndClear(raw);
      this.lastLoadReport = { droppedCount: 0, backedUp: true };
      return null;
    }

    if (parsed === null || parsed === undefined) {
      this.lastLoadReport = null;
      return null;
    }

    const { architecture, droppedCount } = migrateArchitecture(parsed);

    if (architecture === null) {
      this.backUpAndClear(raw);
      this.lastLoadReport = { droppedCount, backedUp: true };
      return null;
    }

    this.lastLoadReport = { droppedCount, backedUp: false };
    return architecture;
  }

  async save(arch: Architecture): Promise<void> {
    const json = JSON.stringify(arch);
    if (this.useMemory) {
      this.inMemoryStore = json;
    } else {
      localStorage.setItem(this.storageKey(), json);
    }
  }

  async clear(): Promise<void> {
    if (this.useMemory) {
      this.inMemoryStore = null;
    } else {
      localStorage.removeItem(this.storageKey());
    }
  }

  getLastLoadReport(): LoadReport | null {
    return this.lastLoadReport;
  }

  /** The raw text of the last document that could not be loaded, if any. */
  getBackup(): string | null {
    return this.useMemory ? this.inMemoryBackup : localStorage.getItem(BACKUP_KEY);
  }
}
