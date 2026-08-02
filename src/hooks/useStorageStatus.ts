'use client';

import { createContext, useContext } from 'react';
import type { LoadReport } from '@/lib/storage/adapter';

export type SaveState = 'idle' | 'saved' | 'error';

export interface StorageStatus {
  /** Whether the last write to storage succeeded. */
  saveState: SaveState;
  /** Plain-English reason the map could not be saved, when it could not. */
  saveError: string | null;
  /** What happened when the stored map was read back, if anything notable. */
  loadReport: LoadReport | null;
}

export const DEFAULT_STORAGE_STATUS: StorageStatus = {
  saveState: 'idle',
  saveError: null,
  loadReport: null,
};

const StorageStatusContext = createContext<StorageStatus>(DEFAULT_STORAGE_STATUS);

export const StorageStatusProvider = StorageStatusContext.Provider;

/**
 * Health of the browser-side store backing the current map.
 *
 * Deliberately separate from useArchitecture: it is a cross-cutting concern
 * rather than part of the map's own API, and it has a safe default so any
 * component can read it without a provider.
 */
export function useStorageStatus(): StorageStatus {
  return useContext(StorageStatusContext);
}
