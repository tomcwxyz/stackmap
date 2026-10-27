'use client';

import { useMemo, useState } from 'react';
import type { Architecture } from '@/lib/types';
import { STANDARD_FUNCTIONS } from '@/lib/functions';
import {
  addQuickSystems,
  previewQuickAdd,
  type QuickAddAssignments,
} from '@/lib/import/quick-add';

const MAX_TOOLS = 100;

interface QuickAddSystemsProps {
  architecture: Architecture;
  onApply: (architecture: Architecture) => void;
  initiallyOpen?: boolean;
}

/**
 * A low-friction alternative to the full wizard. All candidate tools and
 * proposed functions are shown before anything is written.
 */
export function QuickAddSystems({
  architecture,
  onApply,
  initiallyOpen = false,
}: QuickAddSystemsProps) {
  const [open, setOpen] = useState(initiallyOpen);
  const [input, setInput] = useState('');
  const [assignments, setAssignments] = useState<QuickAddAssignments>({});
  const [message, setMessage] = useState('');
  const candidates = useMemo(() => previewQuickAdd(input, architecture), [input, architecture]);
  const toAdd = candidates.filter((row) => !row.alreadyPresent);
  const tooMany = candidates.length > MAX_TOOLS;

  const handleAdd = () => {
    if (tooMany || toAdd.length === 0) return;
    const result = addQuickSystems(architecture, candidates, assignments);
    onApply(result.architecture);
    setInput('');
    setAssignments({});
    setMessage(
      String(result.added) + ' systems added. ' +
      (result.functionsCreated > 0 ? String(result.functionsCreated) + ' organisational areas created. ' : '') +
      'You can review owners, costs and importance at any time.',
    );
  };

  return (
    <section className="border border-primary-200 bg-primary-50 rounded-xl p-4 sm:p-5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-semibold text-primary-900">Already know your tools?</h2>
          <p className="text-sm text-primary-700">Paste a list to build your inventory in one go.</p>
        </div>
        <button
          type="button"
          className="btn-secondary text-sm px-4 py-2"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? 'Close quick add' : 'Paste a list'}
        </button>
      </div>
      {message && <p role="status" className="text-sm text-primary-800">{message}</p>}
      {open && (
        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="quick-add-list" className="block text-sm font-medium text-primary-900">
              Software, spreadsheets or other systems
            </label>
            <textarea
              id="quick-add-list"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setMessage('');
              }}
              rows={5}
              placeholder={'Microsoft 365\nXero\nA bespoke case management tool\nVolunteer spreadsheet'}
              className="w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-base text-primary-950 focus-visible:ring-2 focus-visible:ring-primary-500"
            />
            <p className="text-xs text-primary-600">
              One per line, or separated by commas. You can add up to {MAX_TOOLS} different tools at a time.
              Nothing is saved until you confirm below.
            </p>
          </div>

          {tooMany && (
            <p role="alert" className="text-sm text-red-800">
              This list contains {candidates.length} different tools. Split it into batches of {MAX_TOOLS} or fewer.
            </p>
          )}
          {candidates.length > 0 && !tooMany && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-primary-900">
                Preview: {toAdd.length} new, {candidates.length - toAdd.length} already in this map
              </p>
              <p className="text-xs text-primary-600">
                Names and suggested areas come from a tool catalogue and may need correcting.
                Costs, hosting and importance are left unknown rather than guessed.
              </p>
              <ul className="space-y-2 max-h-96 overflow-y-auto" role="list">
                {candidates.map((candidate, index) => (
                  <li key={candidate.key} className="bg-white border border-surface-200 rounded-lg p-3 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-primary-900">{candidate.name}</p>
                      <p className="text-xs text-primary-600">
                        {candidate.alreadyPresent
                          ? 'Already in your map — skipped'
                          : candidate.recognised
                            ? 'Catalogue match: ' + candidate.provider
                            : 'Not recognised — add details later'}
                      </p>
                    </div>
                    {!candidate.alreadyPresent && (
                      <div className="flex flex-col gap-1">
                        <label htmlFor={'quick-function-' + index} className="text-xs text-primary-700">
                          Organisational area
                        </label>
                        <select
                          id={'quick-function-' + index}
                          value={assignments[candidate.key] ?? candidate.suggestedFunction ?? 'none'}
                          onChange={(event) => setAssignments((previous) => ({
                            ...previous,
                            [candidate.key]: event.target.value as QuickAddAssignments[string],
                          }))}
                          className="rounded-md border border-surface-300 bg-white p-2 text-sm text-primary-900"
                        >
                          <option value="none">Decide later</option>
                          {STANDARD_FUNCTIONS.map((fn) => (
                            <option key={fn.type} value={fn.type}>{fn.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={toAdd.length === 0}
                className="btn-primary px-5 py-2.5 text-sm disabled:opacity-50"
                onClick={handleAdd}
              >
                Add {toAdd.length} {toAdd.length === 1 ? 'system' : 'systems'} to the map
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
