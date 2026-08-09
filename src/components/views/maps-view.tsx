'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';
import { useWorkspace } from '@/hooks/useWorkspace';
import { ExamplePicker } from '@/components/examples/example-picker';

function formatDate(iso: string): string {
  if (!iso) return 'never';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'never';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Several maps in one browser, and snapshots of the one being worked on.
 *
 * Two people need this: an advisor who works with more than one organisation
 * and had to clear the map between them, and anyone who wants to ask "what if
 * we moved off this" without risking the map that describes what is real.
 */
export function MapsView() {
  const router = useRouter();
  const {
    maps,
    activeMapId,
    snapshots,
    isReady,
    createMap,
    duplicateActiveMap,
    renameMap,
    deleteMap,
    switchTo,
    takeSnapshot,
    restoreSnapshot,
    deleteSnapshot,
  } = useWorkspace();

  const [newName, setNewName] = useState('');
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmingMapId, setConfirmingMapId] = useState<string | null>(null);
  const [confirmingSnapshotId, setConfirmingSnapshotId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createMap(newName);
    setNewName('');
    setMessage(`Added ${newName.trim()}. Switch to it when you are ready.`);
  }, [newName, createMap]);

  const handleDuplicate = useCallback(() => {
    const active = maps.find((m) => m.id === activeMapId);
    duplicateActiveMap(`Copy of ${active?.name ?? 'map'}`);
    setMessage('Copied. The original is untouched.');
  }, [maps, activeMapId, duplicateActiveMap]);

  const handleRename = useCallback(() => {
    if (!renamingId || !renameValue.trim()) return;
    renameMap(renamingId, renameValue);
    setRenamingId(null);
    setRenameValue('');
  }, [renamingId, renameValue, renameMap]);

  // Everything else reads the active map when it mounts, so a switch has to
  // leave this page for the change to be visible anywhere.
  const handleSwitch = useCallback(
    (id: string) => {
      switchTo(id);
      router.push('/view/systems');
    },
    [switchTo, router],
  );

  const handleSnapshot = useCallback(() => {
    takeSnapshot(snapshotLabel);
    setSnapshotLabel('');
    setMessage('Snapshot saved.');
  }, [snapshotLabel, takeSnapshot]);

  const handleRestore = useCallback(
    (snapshotId: string) => {
      const restored = restoreSnapshot(snapshotId);
      setMessage(
        restored
          ? 'Restored. What was there was snapshotted first, in case that was a mistake.'
          : 'That snapshot could not be read.',
      );
    },
    [restoreSnapshot],
  );

  if (!isReady) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  const activeMap = maps.find((m) => m.id === activeMapId);
  const canDelete = maps.length > 1;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-primary-900 font-display">Your maps</h1>
        <p className="text-sm text-primary-600 mt-1">
          Everything is stored in this browser. Maps are kept separately, so switching does not
          touch the one you were on.
        </p>
      </div>

      {message && (
        <p className="text-sm text-primary-800 bg-surface-100 border border-surface-200 rounded-lg px-3 py-2" role="status">
          {message}
        </p>
      )}

      <section className="space-y-3" aria-labelledby="maps-heading">
        <h2 id="maps-heading" className="text-sm font-semibold text-primary-800 uppercase tracking-wide">
          Maps
        </h2>

        <ul className="space-y-2" role="list">
          {maps.map((map) => (
            <li
              key={map.id}
              className="bg-white border border-surface-200 rounded-lg p-3 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-medium text-primary-900">{map.name}</span>
                  {map.id === activeMapId && (
                    <span className="text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5 ml-2 font-medium">
                      Working on this
                    </span>
                  )}
                  <span className="block text-xs text-primary-500">
                    Last changed {formatDate(map.updatedAt)}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {map.id !== activeMapId && (
                    <button
                      type="button"
                      onClick={() => handleSwitch(map.id)}
                      className="btn-primary text-sm px-3 py-1.5"
                    >
                      Switch to this
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setRenamingId(map.id);
                      setRenameValue(map.name);
                    }}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingMapId(map.id)}
                    disabled={!canDelete}
                    title={canDelete ? undefined : 'The last map cannot be deleted'}
                    className="btn-secondary text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {renamingId === map.id && (
                <div className="flex items-end gap-2 border-t border-surface-200 pt-3">
                  <div className="flex-1">
                    <Input
                      id={`rename-${map.id}`}
                      label="New name"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename();
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleRename}
                    disabled={!renameValue.trim()}
                    className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save name
                  </button>
                  <button
                    type="button"
                    onClick={() => setRenamingId(null)}
                    className="btn-secondary text-sm px-3 py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {confirmingMapId === map.id && (
                <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm font-medium text-red-900">
                    Delete {map.name}, and everything snapshotted of it? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        deleteMap(map.id);
                        setConfirmingMapId(null);
                        setMessage(`Deleted ${map.name}.`);
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
                    >
                      Yes, delete it
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingMapId(null)}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      Keep it
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className="bg-white border border-surface-200 rounded-lg p-4 space-y-3">
          <h3 className="font-medium text-primary-900">Start another map</h3>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="new-map-name"
                label="What is it called?"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                }}
                placeholder="e.g. Riverside Community Trust"
                helperText="A blank map, for a different organisation"
              />
            </div>
            <button
              type="button"
              onClick={handleCreate}
              disabled={!newName.trim()}
              className="btn-primary text-sm px-3 py-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <button type="button" onClick={handleDuplicate} className="btn-secondary text-sm px-3 py-1.5">
            Or copy {activeMap?.name ?? 'this map'}
          </button>
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="snapshots-heading">
        <h2
          id="snapshots-heading"
          className="text-sm font-semibold text-primary-800 uppercase tracking-wide"
        >
          Snapshots of {activeMap?.name ?? 'this map'}
        </h2>
        <p className="text-sm text-primary-600">
          A snapshot is the map as it is now, kept so you can come back to it. The last{' '}
          {snapshots.length === 1 ? 'one is' : 'ten are'} kept.
        </p>

        {snapshots.length > 0 && (
          <ul className="space-y-2" role="list">
            {snapshots.map((snapshot) => (
              <li
                key={snapshot.id}
                className="bg-white border border-surface-200 rounded-lg p-3 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-medium text-primary-900">{snapshot.label}</span>
                    <span className="block text-xs text-primary-500">
                      Taken {formatDate(snapshot.takenAt)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(snapshot.id)}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingSnapshotId(snapshot.id)}
                      aria-label={`Delete snapshot ${snapshot.label}`}
                      className="btn-secondary text-sm px-3 py-1.5"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {confirmingSnapshotId === snapshot.id && (
                  <div className="rounded-lg border-2 border-red-200 bg-red-50 p-3 space-y-2">
                    <p className="text-sm font-medium text-red-900">
                      Delete the snapshot &ldquo;{snapshot.label}&rdquo;?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          deleteSnapshot(snapshot.id);
                          setConfirmingSnapshotId(null);
                        }}
                        className="bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-1.5 rounded-lg font-medium"
                      >
                        Yes, delete it
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmingSnapshotId(null)}
                        className="btn-secondary text-sm px-3 py-1.5"
                      >
                        Keep it
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="bg-white border border-surface-200 rounded-lg p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                id="snapshot-label"
                label="Save a snapshot"
                value={snapshotLabel}
                onChange={(e) => setSnapshotLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSnapshot();
                }}
                placeholder="e.g. Before we move off SharePoint"
                helperText="Optional — today's date is used if you leave it blank"
              />
            </div>
            <button type="button" onClick={handleSnapshot} className="btn-primary text-sm px-3 py-1.5">
              Save
            </button>
          </div>
        </div>
      </section>

      <div className="pt-4 border-t border-surface-200">
        <ExamplePicker />
      </div>

      <div className="pt-4 border-t border-surface-200">
        <Link href="/view/systems" className="btn-secondary text-sm px-3 py-1.5 inline-flex">
          Back to your systems
        </Link>
      </div>
    </div>
  );
}
