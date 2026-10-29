import Link from 'next/link';
import type { Architecture } from '@/lib/types';
import { assessSystemReviews } from '@/lib/analysis/evidence-freshness';

export function EvidenceFreshnessPanel({
  architecture,
  compact = false,
}: {
  architecture: Architecture;
  compact?: boolean;
}) {
  const summary = assessSystemReviews(architecture);
  if (summary.relevant === 0) return null;
  const needsReview = [...summary.notChecked, ...summary.due];
  return (
    <section className="rounded-xl border border-surface-300 bg-white p-4 sm:p-5 space-y-2 break-inside-avoid"
      aria-labelledby="evidence-freshness-heading">
      <h2 id="evidence-freshness-heading" className="font-display text-lg font-semibold text-primary-900">
        How recently has this been checked?
      </h2>
      <p className="text-sm text-primary-800">
        {summary.recent} of {summary.relevant} current system records checked within the
        last 180 days · {summary.notChecked.length} never checked · {summary.due.length} due again.
      </p>
      <p className="text-xs text-primary-600">
        Dates reflect staff confirmations, not independent assurance. Unlisted systems remain unknown.
      </p>
      {needsReview.length > 0 && (
        <p className="text-sm text-primary-700">
          Records to revisit: {needsReview.slice(0, compact ? 3 : 8).map(s => s.name).join(', ')}
          {needsReview.length > (compact ? 3 : 8) ? ' and others' : ''}.
        </p>
      )}
      <Link href="/view/systems" className="inline-block text-sm text-primary-700 underline underline-offset-2 print:hidden">
        Review your systems
      </Link>
    </section>
  );
}
