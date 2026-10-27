'use client';

import Link from 'next/link';
import type { Architecture } from '@/lib/types';
import { assessMapCoverage } from '@/lib/analysis/map-coverage';

interface MapCoveragePanelProps {
  architecture: Architecture;
  compact?: boolean;
}

/** Completeness of recorded fields, not a safety or verification score. */
export function MapCoveragePanel({ architecture, compact = false }: MapCoveragePanelProps) {
  const coverage = assessMapCoverage(architecture);
  const incomplete = coverage.checks.filter((check) => check.recorded < check.total);
  const shown = compact ? incomplete.slice(0, 4) : incomplete;

  return (
    <section aria-labelledby="map-coverage-heading" className="border border-surface-300 rounded-lg p-4 sm:p-5 space-y-3 break-inside-avoid">
      <div>
        <h2 id="map-coverage-heading" className="font-display text-lg font-semibold text-primary-900">
          How complete is this map?
        </h2>
        {coverage.total > 0 ? (
          <p className="text-sm text-primary-700 mt-1">
            {coverage.recorded} of {coverage.total} applicable details recorded across the systems
            and data you have entered.
          </p>
        ) : (
          <p className="text-sm text-primary-700 mt-1">
            Add some systems to start checking how much has been described.
          </p>
        )}
        <p className="text-xs text-primary-600 mt-2">
          This shows missing fields, not accuracy, independent verification or an assurance of safety.
          Unlisted tools and connections cannot be assessed.
        </p>
      </div>
      {incomplete.length > 0 ? (
        <ul className="space-y-2" role="list">
          {shown.map((check) => (
            <li key={check.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
              <span className="text-primary-800">
                {check.label}: {check.total - check.recorded} to review
                {check.examples.length > 0 && (
                  <span className="text-primary-500"> ({check.examples.join(', ')})</span>
                )}
              </span>
              <Link href={check.href} className="text-primary-700 underline underline-offset-2 hover:text-primary-900 print:hidden">
                Review
              </Link>
            </li>
          ))}
          {compact && incomplete.length > shown.length && (
            <li className="text-xs text-primary-600">
              {incomplete.length - shown.length} more areas have incomplete information.
            </li>
          )}
        </ul>
      ) : coverage.total > 0 ? (
        <p className="text-sm text-primary-700">
          All the fields checked here contain information. Their accuracy and the completeness of
          the inventory still need to be confirmed.
        </p>
      ) : null}
    </section>
  );
}
