import type { Architecture } from '@/lib/types';
import type { LoadReport, StorageAdapter } from './adapter';
import { migrateArchitecture } from './migrate';

export const STORAGE_KEY = 'stackmap_architecture';
/** Where unusable stored data is parked rather than deleted outright. */
export const BACKUP_KEY = 'stackmap_architecture_backup';

interface LocalStorageAdapterOptions {
  forceInMemory?: boolean;
}

export class LocalStorageAdapter implements StorageAdapter {
  private inMemoryStore: string | null = null;
  private inMemoryBackup: string | null = null;
  private readonly useMemory: boolean;
  private lastLoadReport: LoadReport | null = null;

  constructor(options?: LocalStorageAdapterOptions) {
    this.useMemory = options?.forceInMemory ?? !LocalStorageAdapter.isLocalStorageAvailable();
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
    return this.useMemory ? this.inMemoryStore : localStorage.getItem(STORAGE_KEY);
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
    localStorage.removeItem(STORAGE_KEY);
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
      localStorage.setItem(STORAGE_KEY, json);
    }
  }

  async clear(): Promise<void> {
    if (this.useMemory) {
      this.inMemoryStore = null;
    } else {
      localStorage.removeItem(STORAGE_KEY);
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
