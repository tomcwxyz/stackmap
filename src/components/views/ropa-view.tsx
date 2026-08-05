'use client';

import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { buildRopa, generateRopaCsv, LAWFUL_BASIS_LABELS } from '@/lib/report/ropa';
import type { LawfulBasis } from '@/lib/types';

const BASIS_OPTIONS = Object.entries(LAWFUL_BASIS_LABELS) as [LawfulBasis, string][];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

/**
 * A draft record of processing activities.
 *
 * Most of what Article 30 asks for is already in the map — what data is held,
 * where, who sees it and why. The three things it does not know (who the data
 * is about, why you are allowed to hold it, how long you keep it) are asked for
 * here rather than in the wizard, so this only costs time when the artefact is
 * actually wanted.
 */
export function RopaView() {
  const { architecture, isLoading, updateDataCategory } = useArchitecture();

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  const report = architecture ? buildRopa(architecture) : null;

  if (!architecture || !report || report.entries.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary-900 font-display mb-4">
          Nothing here yet
        </h1>
        <p className="text-primary-600 mb-8">
          This record covers data about people. Flag a data category as containing personal
          data in the wizard and it will appear here.
        </p>
        <Link href="/wizard" className="btn-primary px-6 py-2.5 rounded-lg inline-flex">
          Go to the wizard
        </Link>
      </div>
    );
  }

  function handleExport() {
    if (!report) return;
    const csv = generateRopaCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ropa-${report.organisation || 'export'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const incomplete = report.entries.length - report.completeCount;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 font-display">
            Record of processing activities
          </h1>
          <p className="text-sm text-primary-600 mt-1">
            {report.organisation || 'Your organisation'} &middot; drafted{' '}
            {formatDate(report.generatedAt)}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/view/systems" className="btn-secondary text-sm px-3 py-1.5">
            Your systems
          </Link>
          <button type="button" onClick={handleExport} className="btn-primary text-sm px-3 py-1.5">
            Export as CSV
          </button>
        </div>
      </div>

      <div className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
        <p className="text-sm text-amber-900 font-medium">This is a draft, not a finished record.</p>
        <p className="text-sm text-amber-800 mt-1">
          Stackmap has filled in what it can from your map. Check every line, complete what is
          missing, and have someone accountable sign it off. Article 30 records are your
          responsibility, not a tool&rsquo;s.
        </p>
      </div>

      <p className="text-sm text-primary-700" role="status">
        {report.entries.length} {report.entries.length === 1 ? 'activity' : 'activities'} covering
        personal data.{' '}
        {incomplete > 0
          ? `${incomplete} still ${incomplete === 1 ? 'needs' : 'need'} something.`
          : 'Nothing outstanding.'}
      </p>

      <div className="space-y-4">
        {report.entries.map((entry) => (
          <section
            key={entry.categoryId}
            className="rounded-lg border border-surface-300 bg-white p-4 space-y-4"
            aria-labelledby={`ropa-${entry.categoryId}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2
                id={`ropa-${entry.categoryId}`}
                className="font-display font-semibold text-primary-900 text-lg"
              >
                {entry.category}
              </h2>
              {entry.missing.length === 0 ? (
                <span className="text-xs bg-green-100 text-green-800 rounded px-1.5 py-0.5 font-medium">
                  Complete
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-medium">
                  Needs {entry.missing.join(', ')}
                </span>
              )}
              {entry.hasInternationalTransfer && (
                <span className="text-xs bg-red-100 text-red-800 rounded px-1.5 py-0.5 font-medium">
                  Leaves the UK
                </span>
              )}
            </div>

            <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-primary-600">Held in</dt>
                <dd className="text-primary-900">
                  {entry.systems.length > 0 ? entry.systems.join(', ') : 'No system recorded'}
                </dd>
              </div>
              <div>
                <dt className="text-primary-600">Hosting</dt>
                <dd className="text-primary-900">
                  {entry.hosting.length > 0 ? entry.hosting.join(', ') : '—'}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-primary-600">Shared with</dt>
                <dd className="text-primary-900">
                  {entry.recipients.length === 0
                    ? 'Nobody outside the organisation'
                    : entry.recipients
                        .map((r) => (r.purpose ? `${r.name} (${r.purpose})` : r.name))
                        .join(', ')}
                </dd>
              </div>
            </dl>

            {/* The three things the map cannot know */}
            <div className="grid gap-3 sm:grid-cols-3 border-t border-surface-200 pt-3">
              <Input
                id={`subjects-${entry.categoryId}`}
                label="Who is it about?"
                defaultValue={entry.subjects ?? ''}
                onBlur={(e) =>
                  updateDataCategory(entry.categoryId, {
                    subjects: e.target.value.trim() || undefined,
                  })
                }
                placeholder="e.g. People we support"
              />

              <Select
                id={`basis-${entry.categoryId}`}
                label="Lawful basis"
                value={entry.lawfulBasis ?? ''}
                onChange={(e) =>
                  updateDataCategory(entry.categoryId, {
                    lawfulBasis: (e.target.value || undefined) as LawfulBasis | undefined,
                  })
                }
              >
                <option value="">Not decided</option>
                {BASIS_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>

              <Input
                id={`retention-${entry.categoryId}`}
                label="Kept for how long?"
                defaultValue={entry.retention ?? ''}
                onBlur={(e) =>
                  updateDataCategory(entry.categoryId, {
                    retention: e.target.value.trim() || undefined,
                  })
                }
                placeholder="e.g. 7 years after last contact"
              />
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
