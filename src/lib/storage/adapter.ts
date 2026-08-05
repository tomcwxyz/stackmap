import type { Architecture } from '@/lib/types';

/** What happened the last time the adapter read stored data. */
export interface LoadReport {
  /** Entities that could not be repaired and were discarded. */
  droppedCount: number;
  /**
   * True when the stored document was unusable. The raw text is kept under a
   * backup key so it is never destroyed without the user knowing.
   */
  backedUp: boolean;
}

export interface StorageAdapter {
  load(): Promise<Architecture | null>;
  save(arch: Architecture): Promise<void>;
  clear(): Promise<void>;
  /** Details of the most recent load, for adapters that track them. */
  getLastLoadReport?(): LoadReport | null;
}
