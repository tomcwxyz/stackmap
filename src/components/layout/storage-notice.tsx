'use client';

import { useState } from 'react';
import { useStorageStatus } from '@/hooks/useStorageStatus';

/**
 * Tells the user when their map is not safely stored.
 *
 * Stackmap keeps everything in the browser, so the two failures that matter —
 * a write that did not land, and a stored map that could not be read back —
 * are otherwise completely invisible.
 */
export function StorageNotice() {
  const { saveState, saveError, loadReport } = useStorageStatus();
  const [dismissed, setDismissed] = useState(false);

  const hasSaveProblem = saveState === 'error';
  const hasLoadProblem =
    loadReport !== null && (loadReport.backedUp || loadReport.droppedCount > 0);

  if (dismissed || (!hasSaveProblem && !hasLoadProblem)) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 pt-4">
      <div
        role="alert"
        className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 flex items-start gap-3"
      >
        <svg
          className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>

        <div className="flex-1 min-w-0 space-y-1">
          {hasSaveProblem && (
            <>
              <p className="text-sm font-medium text-amber-900">{saveError}</p>
              <p className="text-sm text-amber-800">
                Export your map from the review step now, so you do not lose it when
                you close this tab.
              </p>
            </>
          )}

          {hasLoadProblem && loadReport?.backedUp && (
            <>
              <p className="text-sm font-medium text-amber-900">
                We could not read your saved map, so we have started a new one.
              </p>
              <p className="text-sm text-amber-800">
                The old data has not been deleted — it is still in this browser under{' '}
                <code className="font-mono text-xs">stackmap_architecture_backup</code>.
              </p>
            </>
          )}

          {hasLoadProblem && !loadReport?.backedUp && loadReport && (
            <p className="text-sm font-medium text-amber-900">
              {loadReport.droppedCount}{' '}
              {loadReport.droppedCount === 1 ? 'item was' : 'items were'} incomplete in
              your saved map and could not be restored. The rest of your map has loaded
              normally.
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-700 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600 transition-colors flex-shrink-0"
          aria-label="Dismiss storage warning"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
