'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { validateArchitectureJson, parseCsvSystems, csvRowsToArchitecture } from '@/lib/import';
import { previewCsvMerge } from '@/lib/import/csv-to-architecture';
import { parseSpendCsv, inspectSpendCsv } from '@/lib/import/parse-spend';
import { SpendColumnMapper } from './spend-column-mapper';
import type { SpendColumnMapping, SpendFilePreview } from '@/lib/import/parse-spend';
import type { FunctionAssignments } from '@/lib/import/spend-to-systems';
import type { StandardFunction } from '@/lib/types';
import { CsvPreviewTable } from './csv-preview-table';
import { SpendPreviewTable } from './spend-preview-table';
import { suggestFunction, standardFunctionName } from '@/lib/import/suggest-function';
import type { Architecture, OrgFunction } from '@/lib/types';
import type { CsvSystemRow, SpendMatch } from '@/lib/import';

type ImportStep = 'format' | 'file' | 'columns' | 'preview' | 'error';
type ImportFormat = 'json' | 'csv' | 'spend';

export interface ImportDialogProps {
  open: boolean;
  mode?: 'replace' | 'merge';
  onClose: () => void;
  onImport: (arch: Architecture) => void;
  onMergeCsv?: (rows: CsvSystemRow[]) => void;
  /** Called with the spend rows the user confirmed. */
  onImportSpend?: (matches: SpendMatch[], assignments: FunctionAssignments) => void;
  /** The map being merged into, used to preview what a merge would change. */
  existingArchitecture?: Architecture | null;
}

interface ErrorState {
  message: string;
  details?: string[];
}

/**
 * The dialog's working state, mounted only while it is open.
 *
 * Keeping this in a child means closing the dialog unmounts it and the state
 * goes with it, rather than an effect having to reset six fields by hand.
 */
function ImportDialogContent({
  mode = 'replace',
  onClose,
  onImport,
  onMergeCsv,
  onImportSpend,
  existingArchitecture,
}: Omit<ImportDialogProps, 'open'>) {
  const isMerge = mode === 'merge';
  const [step, setStep] = useState<ImportStep>('format');
  const [format, setFormat] = useState<ImportFormat>(isMerge ? 'csv' : 'json');
  const [validatedArch, setValidatedArch] = useState<Architecture | null>(null);
  const [csvRows, setCsvRows] = useState<CsvSystemRow[]>([]);
  const [csvWarnings, setCsvWarnings] = useState<string[]>([]);
  const [spendMatches, setSpendMatches] = useState<SpendMatch[]>([]);
  const [spendUnmatched, setSpendUnmatched] = useState<SpendMatch[]>([]);
  const [spendSelected, setSpendSelected] = useState<Set<string>>(new Set());
  // Kept so the file can be re-read against a mapping without asking for it
  // again — a user correcting a column should not have to pick the file twice.
  const [spendText, setSpendText] = useState<string>('');
  const [spendPreview, setSpendPreview] = useState<SpendFilePreview | null>(null);
  // Only what the user has changed; anything absent uses the suggestion
  const [spendAssignments, setSpendAssignments] = useState<FunctionAssignments>({});
  const [error, setError] = useState<ErrorState | null>(null);

  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);
  const firstSelectRef = useRef<HTMLSelectElement>(null);

  // Focus the first interactive element on open and whenever the step changes.
  // The column mapper opens on a select rather than a button, so it carries its
  // own ref.
  useEffect(() => {
    if (firstFocusableRef.current) {
      firstFocusableRef.current.focus();
      return;
    }
    firstSelectRef.current?.focus();
  }, [step]);

  // Escape key handler
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap
  useEffect(() => {
    if (!dialogRef.current) return;

    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [step]);

  const handleFormatSelect = useCallback((fmt: ImportFormat) => {
    setFormat(fmt);
    setStep('file');
  }, []);

  /** Read the file against a mapping, and show what came out of it. */
  const readSpend = useCallback((text: string, mapping: SpendColumnMapping) => {
    const result = parseSpendCsv(text, mapping);
    if (!result.success) {
      setError({ message: result.error });
      setStep('error');
      return;
    }
    setSpendMatches(result.matches);
    setSpendUnmatched(result.unmatched);
    // Recognised tools start ticked; guesses the user must opt into
    setSpendSelected(new Set(result.matches.map((m) => m.originalPayee)));
    setSpendAssignments({});
    setCsvWarnings(result.warnings);
    setStep('preview');
  }, []);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const text = await file.text();

      if (format === 'spend') {
        setSpendText(text);
        const inspected = inspectSpendCsv(text);
        if (!inspected.success) {
          setError({ message: inspected.error });
          setStep('error');
          return;
        }

        setSpendPreview(inspected.preview);
        const { payee, amount } = inspected.preview.suggested;

        // Nothing recognisable to go on: ask rather than fail, since the file
        // is almost certainly fine and only its headers are unfamiliar.
        if (!payee || !amount) {
          setStep('columns');
          return;
        }

        readSpend(text, inspected.preview.suggested as SpendColumnMapping);
        return;
      }

      if (format === 'json') {
        const result = validateArchitectureJson(text);
        if (result.success) {
          setValidatedArch(result.data);
          setStep('preview');
        } else {
          setError({
            message: result.error,
            details: result.errors,
          });
          setStep('error');
        }
      } else {
        const result = parseCsvSystems(text);
        if (result.success) {
          setCsvRows(result.rows);
          setCsvWarnings(result.warnings);
          setStep('preview');
        } else {
          setError({ message: result.error });
          setStep('error');
        }
      }
    },
    [format, readSpend],
  );

  const handleBack = useCallback(() => {
    if (step === 'file' || step === 'error') {
      if (step === 'error') {
        setStep('file');
        setError(null);
      } else {
        setStep('format');
      }
    }
  }, [step]);

  const handleImportJson = useCallback(() => {
    if (validatedArch) {
      onImport(validatedArch);
    }
  }, [validatedArch, onImport]);

  const dialogTitle = 'Import data';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="import-dialog-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div className="w-full max-w-lg rounded-xl border border-surface-300 bg-white p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h2
              id="import-dialog-title"
              className="font-display text-xl font-semibold text-primary-900"
            >
              {dialogTitle}
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg text-primary-400 hover:text-primary-600 hover:bg-surface-100 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {step === 'format' && (
            <FormatStep
              mode={mode}
              // Spend adds systems to the map rather than replacing it, so it
              // needs its own handler. Offering it without one is a dead end:
              // the preview would accept a choice and then do nothing.
              offerSpend={Boolean(onImportSpend)}
              onSelect={handleFormatSelect}
              firstRef={firstFocusableRef}
            />
          )}

          {step === 'file' && (
            <FileStep
              format={format}
              onFileChange={handleFileChange}
              onBack={handleBack}
              firstRef={firstFocusableRef}
            />
          )}

          {step === 'preview' && format === 'json' && validatedArch && (
            <JsonPreviewStep
              arch={validatedArch}
              onImport={handleImportJson}
              onCancel={onClose}
              firstRef={firstFocusableRef}
            />
          )}

          {step === 'preview' && format === 'csv' && (
            <CsvPreviewStep
              rows={csvRows}
              warnings={csvWarnings}
              onChange={setCsvRows}
              mode={mode}
              mergePreview={
                isMerge && existingArchitecture
                  ? previewCsvMerge(csvRows, existingArchitecture)
                  : undefined
              }
              onImport={(rows) => {
                if (isMerge && onMergeCsv) {
                  onMergeCsv(rows);
                } else {
                  const arch = csvRowsToArchitecture(rows, 'My Organisation', 'charity');
                  onImport(arch);
                }
              }}
              onCancel={onClose}
              firstRef={firstFocusableRef}
            />
          )}

          {step === 'columns' && spendPreview && (
            <SpendColumnMapper
              preview={spendPreview}
              firstRef={firstSelectRef}
              onConfirm={(mapping) => readSpend(spendText, mapping)}
              onCancel={() => setStep('file')}
            />
          )}

          {step === 'preview' && format === 'spend' && (
            <SpendPreviewStep
              matches={spendMatches}
              unmatched={spendUnmatched}
              warnings={csvWarnings}
              selected={spendSelected}
              assignments={spendAssignments}
              onAssign={(payee, value) =>
                setSpendAssignments((prev) => ({ ...prev, [payee]: value }))
              }
              onToggle={(payee) =>
                setSpendSelected((prev) => {
                  const next = new Set(prev);
                  if (next.has(payee)) next.delete(payee);
                  else next.add(payee);
                  return next;
                })
              }
              onImport={() => {
                const chosen = [...spendMatches, ...spendUnmatched].filter((m) =>
                  spendSelected.has(m.originalPayee),
                );
                onImportSpend?.(chosen, spendAssignments);
              }}
              onCancel={onClose}
              onChangeColumns={spendPreview ? () => setStep('columns') : undefined}
              existingFunctions={existingArchitecture?.functions ?? []}
              firstRef={firstFocusableRef}
            />
          )}

          {step === 'error' && error && (
            <ErrorStep
              error={error}
              onTryAgain={() => {
                setError(null);
                setStep('file');
              }}
              firstRef={firstFocusableRef}
            />
          )}
        </div>
      </div>
    </>
  );
}

export function ImportDialog({ open, ...rest }: ImportDialogProps) {
  if (!open) return null;
  return <ImportDialogContent {...rest} />;
}

// ─── Sub-steps ───

interface FormatStepProps {
  mode: 'replace' | 'merge';
  offerSpend: boolean;
  onSelect: (fmt: ImportFormat) => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function FormatStep({ mode, offerSpend, onSelect, firstRef }: FormatStepProps) {
  // Replacing the whole map from a JSON export only makes sense when starting
  // out; part-way through, everything on offer adds to what is already there.
  const offerJson = mode === 'replace';

  return (
    <div className="grid grid-cols-2 gap-4">
      {offerJson && (
        <button
          ref={firstRef}
          type="button"
          onClick={() => onSelect('json')}
          className="rounded-lg border border-surface-300 p-4 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <span className="block font-display font-semibold text-primary-900">
            JSON
          </span>
          <span className="block text-sm text-primary-700">
            Full architecture
          </span>
          <span className="mt-1 block text-xs text-primary-500">
            Import a previously exported Stackmap file
          </span>
        </button>
      )}

      <button
        ref={offerJson ? undefined : firstRef}
        type="button"
        onClick={() => onSelect('csv')}
        className="rounded-lg border border-surface-300 p-4 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        <span className="block font-display font-semibold text-primary-900">
          CSV
        </span>
        <span className="block text-sm text-primary-700">
          Systems list
        </span>
        <span className="mt-1 block text-xs text-primary-500">
          Import a spreadsheet of tools and systems
        </span>
      </button>

      {offerSpend && (
        <button
          type="button"
          onClick={() => onSelect('spend')}
          className="col-span-2 rounded-lg border border-surface-300 p-4 text-left transition-colors hover:border-primary-400 hover:bg-primary-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          <span className="block font-display font-semibold text-primary-900">
            Spend
          </span>
          <span className="block text-sm text-primary-700">
            Accounting or bank export
          </span>
          <span className="mt-1 block text-xs text-primary-500">
            Find the tools you pay for, with what they actually cost
          </span>
        </button>
      )}
    </div>
  );
}

interface FileStepProps {
  format: ImportFormat;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBack: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function FileStep({ format, onFileChange, onBack, firstRef }: FileStepProps) {
  const accept = format === 'json' ? '.json' : '.csv';
  const label = `Select a ${accept} file`;

  return (
    <div className="space-y-4">
      <label
        htmlFor="import-file-input"
        className="block text-sm font-medium text-primary-800"
      >
        {label}
      </label>
      {format === 'spend' && (
        <p className="text-sm text-primary-600">
          Export your transactions from your accounting software or online banking. Stackmap
          reads the payee, amount and date columns, and looks for tools it recognises. The file
          is read in your browser and never uploaded.
        </p>
      )}
      <input
        id="import-file-input"
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="block w-full text-sm text-primary-700 file:mr-4 file:rounded-lg file:border-0 file:bg-primary-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary-700 hover:file:bg-primary-100"
      />
      <div className="flex justify-start">
        <button
          ref={firstRef}
          type="button"
          onClick={onBack}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Back
        </button>
      </div>
    </div>
  );
}

interface JsonPreviewStepProps {
  arch: Architecture;
  onImport: () => void;
  onCancel: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function JsonPreviewStep({ arch, onImport, onCancel, firstRef }: JsonPreviewStepProps) {
  const counts = [
    { label: 'functions', count: arch.functions.length },
    { label: 'systems', count: arch.systems.length },
    { label: 'services', count: arch.services.length },
    { label: 'integrations', count: arch.integrations.length },
    { label: 'owners', count: arch.owners.length },
    { label: 'data categories', count: arch.dataCategories.length },
  ].filter((c) => c.count > 0);

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-700">This file contains:</p>
      <ul className="space-y-1 text-sm text-primary-800">
        {counts.map((c) => (
          <li key={c.label}>
            <span className="font-semibold">{c.count}</span>{' '}
            {c.count === 1 ? c.label.replace(/s$/, '') : c.label}
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <button
          ref={firstRef}
          type="button"
          onClick={onImport}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Replace current data
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface SpendPreviewStepProps {
  matches: SpendMatch[];
  unmatched: SpendMatch[];
  warnings: string[];
  selected: Set<string>;
  onToggle: (originalPayee: string) => void;
  assignments: FunctionAssignments;
  onAssign: (originalPayee: string, value: StandardFunction | 'none') => void;
  onImport: () => void;
  onCancel: () => void;
  /** Offered when the file's columns are known, so a wrong guess is fixable. */
  onChangeColumns?: () => void;
  /** Functions the map already has, so new ones can be called out. */
  existingFunctions: OrgFunction[];
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function SpendPreviewStep({
  matches,
  unmatched,
  warnings,
  selected,
  onToggle,
  assignments,
  onAssign,
  onImport,
  onCancel,
  onChangeColumns,
  existingFunctions,
  firstRef,
}: SpendPreviewStepProps) {
  const chosen = selected.size;

  // Filing a system somewhere may mean creating that somewhere. Say so here
  // rather than letting functions appear on the map unannounced.
  const willCreate = [...new Set(
    [...matches, ...unmatched]
      .filter((m) => selected.has(m.originalPayee))
      .map((m) => {
        const choice = assignments[m.originalPayee];
        if (choice === 'none') return undefined;
        return choice ?? suggestFunction(m.tool?.name ?? m.payee, undefined, m.tool?.category).suggested;
      })
      .filter((type): type is StandardFunction => Boolean(type))
      .filter((type) => !existingFunctions.some((fn) => fn.type === type)),
  )].map(standardFunctionName);

  return (
    <div className="space-y-4 max-h-[70vh] overflow-y-auto">
      <p className="text-sm text-primary-700" data-testid="spend-summary">
        Found <span className="font-semibold">{matches.length}</span>{' '}
        {matches.length === 1 ? 'payee that looks like a tool' : 'payees that look like tools'}
        {unmatched.length > 0 && `, and ${unmatched.length} it did not recognise`}.
      </p>

      {onChangeColumns && (
        <button
          type="button"
          onClick={onChangeColumns}
          className="text-sm text-primary-600 underline hover:text-primary-800"
        >
          Reading the wrong columns? Choose them yourself
        </button>
      )}

      <SpendPreviewTable
        matches={matches}
        selected={selected}
        onToggle={onToggle}
        assignments={assignments}
        onAssign={onAssign}
        caption="Tools Stackmap recognised"
      />

      {unmatched.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-medium text-primary-700">
            Show the {unmatched.length} it did not recognise
          </summary>
          <p className="text-xs text-primary-600 my-2">
            These might be software too — tick anything that belongs on your map. Rent,
            salaries and suppliers do not.
          </p>
          <SpendPreviewTable
            matches={unmatched}
            selected={selected}
            onToggle={onToggle}
            assignments={assignments}
            onAssign={onAssign}
            caption="Other payees"
          />
        </details>
      )}

      {willCreate.length > 0 && (
        <p className="text-sm text-primary-700" data-testid="spend-new-functions">
          {willCreate.join(', ')} will be added to your map, so these have somewhere to sit.
        </p>
      )}

      {warnings.length > 0 && (
        <ul className="text-sm text-amber-700">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}

      <div className="flex gap-3">
        <button
          ref={firstRef}
          type="button"
          onClick={onImport}
          disabled={chosen === 0}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Add {chosen} {chosen === 1 ? 'system' : 'systems'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface CsvPreviewStepProps {
  rows: CsvSystemRow[];
  warnings: string[];
  onChange: (rows: CsvSystemRow[]) => void;
  mode: 'replace' | 'merge';
  /** Present only when merging into a known map. */
  mergePreview?: { newCount: number; updatedCount: number };
  onImport: (rows: CsvSystemRow[]) => void;
  onCancel: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function CsvPreviewStep({
  rows,
  warnings,
  onChange,
  mode,
  mergePreview,
  onImport,
  onCancel,
  firstRef,
}: CsvPreviewStepProps) {
  const actionLabel = mergePreview
    ? `Merge ${rows.length} ${rows.length === 1 ? 'row' : 'rows'}`
    : `${mode === 'merge' ? 'Add' : 'Import'} ${rows.length} ${rows.length === 1 ? 'system' : 'systems'}`;

  return (
    <div className="space-y-4">
      <p className="text-sm text-primary-700">
        Found <span className="font-semibold">{rows.length}</span> systems in the CSV file.
      </p>
      {mergePreview && (
        <p className="text-sm text-primary-700" data-testid="merge-preview">
          <span className="font-semibold">{mergePreview.newCount}</span>{' '}
          {mergePreview.newCount === 1 ? 'system is' : 'systems are'} new.{' '}
          {mergePreview.updatedCount > 0 ? (
            <>
              <span className="font-semibold">{mergePreview.updatedCount}</span>{' '}
              {mergePreview.updatedCount === 1 ? 'is' : 'are'} already in your map and will be
              updated rather than added again.
            </>
          ) : (
            'None of them are already in your map.'
          )}
        </p>
      )}
      <CsvPreviewTable rows={rows} onChange={onChange} />

      {warnings.length > 0 && (
        <ul className="text-sm text-amber-700">
          {warnings.map((w, i) => (
            <li key={i}>{w}</li>
          ))}
        </ul>
      )}
      <div className="flex gap-3">
        <button
          ref={firstRef}
          type="button"
          onClick={() => onImport(rows)}
          className="inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          {actionLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

interface ErrorStepProps {
  error: ErrorState;
  onTryAgain: () => void;
  firstRef: React.RefObject<HTMLButtonElement | null>;
}

function ErrorStep({ error, onTryAgain, firstRef }: ErrorStepProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-sm font-medium text-red-800">{error.message}</p>
        {error.details && error.details.length > 0 && (
          <ul className="mt-2 list-disc pl-5 text-xs text-red-700">
            {error.details.map((d, i) => (
              <li key={i}>{d}</li>
            ))}
          </ul>
        )}
      </div>
      <button
        ref={firstRef}
        type="button"
        onClick={onTryAgain}
        className="inline-flex items-center rounded-lg px-4 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-surface-100 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      >
        Try again
      </button>
    </div>
  );
}
