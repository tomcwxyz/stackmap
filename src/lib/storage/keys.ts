/**
 * Where things live in the browser's storage.
 *
 * Kept apart from the adapter and the workspace so both can agree on the layout
 * without importing each other.
 */

export const STORAGE_KEY = 'stackmap_architecture';
/** Where unusable stored data is parked rather than deleted outright. */
export const BACKUP_KEY = 'stackmap_architecture_backup';
export const WORKSPACE_KEY = 'stackmap_workspace';

/**
 * The first map keeps the original single-map storage key.
 *
 * Nothing is moved when a workspace is created, so an existing map is adopted
 * without being rewritten, and anyone who never makes a second map is still
 * storing exactly what they stored before.
 */
export const DEFAULT_MAP_ID = 'default';

export function mapStorageKey(id: string): string {
  return id === DEFAULT_MAP_ID ? STORAGE_KEY : `stackmap_map_${id}`;
}

export function snapshotsStorageKey(mapId: string): string {
  return `stackmap_snapshots_${mapId}`;
}
