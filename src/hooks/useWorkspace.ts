'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceStore, type MapMeta, type SnapshotMeta } from '@/lib/storage/workspace';
import type { Architecture } from '@/lib/types';

export interface WorkspaceState {
  maps: MapMeta[];
  activeMapId: string;
  snapshots: SnapshotMeta[];
  /** False before storage has been read, which cannot happen during a build. */
  isReady: boolean;
}

export interface WorkspaceActions extends WorkspaceState {
  createMap: (name: string) => void;
  duplicateActiveMap: (name: string) => void;
  renameMap: (id: string, name: string) => void;
  deleteMap: (id: string) => void;
  switchTo: (id: string) => void;
  takeSnapshot: (label: string) => void;
  restoreSnapshot: (snapshotId: string) => Architecture | null;
  deleteSnapshot: (snapshotId: string) => void;
}

/** What a statically exported page renders before it reaches a browser. */
const NOT_READY: WorkspaceState = {
  maps: [],
  activeMapId: '',
  snapshots: [],
  isReady: false,
};

// The workspace lives in localStorage, which React cannot see changing, so it
// is read through useSyncExternalStore. The snapshot has to be cached: it is
// rebuilt from storage, and returning a fresh object on every call would make
// React re-render for ever.
let store: WorkspaceStore | null = null;
let cached: WorkspaceState | null = null;
const listeners = new Set<() => void>();

function getStore(): WorkspaceStore {
  store ??= new WorkspaceStore();
  return store;
}

function emitChange(): void {
  cached = null;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  // Another tab writing the workspace is a real change to the same data
  window.addEventListener('storage', emitChange);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener('storage', emitChange);
  };
}

function getSnapshot(): WorkspaceState {
  if (cached) return cached;

  const workspace = getStore();
  const { maps, activeMapId } = workspace.read();
  cached = {
    maps,
    activeMapId,
    snapshots: workspace.listSnapshots(activeMapId),
    isReady: true,
  };
  return cached;
}

function getServerSnapshot(): WorkspaceState {
  return NOT_READY;
}

/**
 * The list of maps and the snapshots of whichever one is active.
 *
 * Every action writes to storage and then announces the change, rather than
 * keeping a second copy in React state that could drift from what is stored.
 */
export function useWorkspace(): WorkspaceActions {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const createMap = useCallback((name: string) => {
    getStore().createMap(name, uuidv4());
    emitChange();
  }, []);

  const duplicateActiveMap = useCallback((name: string) => {
    const workspace = getStore();
    workspace.duplicateMap(workspace.getActiveMapId(), name, uuidv4());
    emitChange();
  }, []);

  const renameMap = useCallback((id: string, name: string) => {
    getStore().renameMap(id, name);
    emitChange();
  }, []);

  const deleteMap = useCallback((id: string) => {
    getStore().deleteMap(id);
    emitChange();
  }, []);

  const switchTo = useCallback((id: string) => {
    getStore().switchTo(id);
    emitChange();
  }, []);

  const takeSnapshot = useCallback((label: string) => {
    const workspace = getStore();
    const activeMapId = workspace.getActiveMapId();
    const architecture = workspace.readMap(activeMapId);
    if (!architecture) return;
    workspace.takeSnapshot(activeMapId, label, architecture, uuidv4());
    emitChange();
  }, []);

  const restoreSnapshot = useCallback((snapshotId: string) => {
    const workspace = getStore();
    const restored = workspace.restoreSnapshot(
      workspace.getActiveMapId(),
      snapshotId,
      uuidv4(),
    );
    emitChange();
    return restored;
  }, []);

  const deleteSnapshot = useCallback((snapshotId: string) => {
    const workspace = getStore();
    workspace.deleteSnapshot(workspace.getActiveMapId(), snapshotId);
    emitChange();
  }, []);

  return {
    ...state,
    createMap,
    duplicateActiveMap,
    renameMap,
    deleteMap,
    switchTo,
    takeSnapshot,
    restoreSnapshot,
    deleteSnapshot,
  };
}

/** Drops the cached snapshot, so a test can start from clean storage. */
export function resetWorkspaceCache(): void {
  store = null;
  cached = null;
}
