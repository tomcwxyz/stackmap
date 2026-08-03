'use client';

import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { findAttentionPoints } from '@/lib/report/attention';
import { RiskImportanceGrid } from '@/components/analysis/risk-importance-grid';
import { buildRiskImportanceMatrix } from '@/lib/analysis/risk-importance';
import { annualiseCost, calculateCostSummary, formatCurrency } from '@/lib/cost-analysis';
import { findDuplication } from '@/lib/analysis/duplication';
import { resolveStaffCount } from '@/lib/cost-estimates';
import { getImportanceTier } from '@/lib/importance';
import { aggregateRisk, riskLevel, RISK_DIMENSIONS } from '@/lib/techfreedom/risk';

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
 * A one-page summary of the map, laid out for print.
 *
 * The wizard's outputs are JSON, Markdown, CSV and a PNG, none of which can be
 * handed to a trustee meeting. This is the same data arranged as something that
 * can: what you run, what it costs, and what needs attention.
 */
export function BoardReport() {
  const { architecture, isLoading } = useArchitecture();

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  if (!architecture || architecture.systems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-primary-900 font-display mb-4">
          Nothing to report yet
        </h1>
        <p className="text-primary-600 mb-8">
          Map some systems first and this becomes a summary you can print or share.
        </p>
        <Link href="/wizard" className="btn-primary px-6 py-2.5 rounded-lg inline-flex">
          Start mapping
        </Link>
      </div>
    );
  }

  const { organisation, systems, functions, integrations, owners, dataCategories, metadata } =
    architecture;

  const costSummary = calculateCostSummary(systems, functions, {
    staffCount: resolveStaffCount(organisation),
  });
  const duplication = findDuplication(systems, functions);
  const attention = findAttentionPoints(architecture);
  const techFreedomEnabled = metadata?.techFreedomEnabled === true;
  const risk = techFreedomEnabled ? aggregateRisk(systems) : null;

  const officialSystems = systems.filter((s) => !s.isShadow);
  const coreSystems = officialSystems
    .filter((s) => getImportanceTier(s.importance)?.tier === 'core')
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  const personalDataSystems = new Set(
    dataCategories.filter((dc) => dc.containsPersonalData).flatMap((dc) => dc.systemIds),
  );

  const headline = [
    { label: 'Systems', value: String(systems.length) },
    {
      label: costSummary.estimatedCount > 0 ? 'Annual cost (est.)' : 'Annual cost recorded',
      value: formatCurrency(costSummary.totalAnnual + costSummary.estimatedAnnual),
    },
    { label: 'Areas covered', value: String(functions.length) },
    { label: 'Named owners', value: String(owners.length) },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 print:py-0 print:max-w-none">
      {/* Controls — not part of the report itself */}
      <div className="flex flex-wrap gap-3 justify-end mb-6 print:hidden">
        <Link href="/view/systems" className="btn-secondary text-sm px-3 py-1.5">
          Edit your systems
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="btn-primary text-sm px-3 py-1.5"
        >
          Print or save as PDF
        </button>
      </div>

      <article className="space-y-8 print:space-y-6">
        {/* Cover */}
        <header className="border-b-2 border-primary-800 pb-4">
          <p className="text-sm uppercase tracking-widest text-accent-600 font-semibold">
            Technology review
          </p>
          <h1 className="text-3xl font-display font-bold text-primary-950 mt-1">
            {organisation.name || 'Your organisation'}
          </h1>
          <p className="text-sm text-primary-600 mt-2">
            Mapped {formatDate(metadata.exportedAt)}
            {organisation.staffCount ? ` · ${organisation.staffCount} staff` : ''}
          </p>
        </header>

        {/* Headline numbers */}
        <section className="break-inside-avoid">
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {headline.map((item) => (
              <div key={item.label} className="border border-surface-300 rounded-lg p-3">
                <dt className="text-xs text-primary-600">{item.label}</dt>
                <dd className="text-2xl font-display font-bold text-primary-900">
                  {item.value}
                </dd>
              </div>
            ))}
          </dl>
          {costSummary.uncostCount > 0 && (
            <p className="text-xs text-primary-600 mt-2">
              {formatCurrency(costSummary.totalAnnual)} of that is recorded.
              {costSummary.estimatedCount > 0 && (
                <>
                  {' '}
                  {formatCurrency(costSummary.estimatedAnnual)} is estimated from typical pricing
                  for {costSummary.estimatedCount}{' '}
                  {costSummary.estimatedCount === 1 ? 'system' : 'systems'}.
                </>
              )}{' '}
              {costSummary.uncostCount - costSummary.estimatedCount > 0 && (
                <>
                  {costSummary.uncostCount - costSummary.estimatedCount}{' '}
                  {costSummary.uncostCount - costSummary.estimatedCount === 1
                    ? 'system could not be priced at all, so the real figure is higher still.'
                    : 'systems could not be priced at all, so the real figure is higher still.'}
                </>
              )}
            </p>
          )}
        </section>

        {/* What needs attention */}
        <section className="break-inside-avoid" aria-labelledby="report-attention">
          <h2 id="report-attention" className="text-xl font-display font-bold text-primary-900 mb-3">
            What needs attention
          </h2>
          {attention.length === 0 ? (
            <p className="text-primary-700">
              Nothing stands out. Every critical system has an owner, no connections were
              marked fragile, and no systems are flagged as legacy.
            </p>
          ) : (
            <ul className="space-y-2" role="list">
              {attention.map((point) => (
                <li
                  key={point.id}
                  className={`border-l-4 pl-3 py-1 break-inside-avoid ${
                    point.severity === 'high' ? 'border-l-red-500' : 'border-l-amber-500'
                  }`}
                >
                  <p className="font-semibold text-primary-900">{point.title}</p>
                  <p className="text-sm text-primary-700">{point.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Critical systems */}
        {coreSystems.length > 0 && (
          <section className="break-inside-avoid" aria-labelledby="report-core">
            <h2 id="report-core" className="text-xl font-display font-bold text-primary-900 mb-3">
              Systems we could not operate without
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-surface-300 text-left">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">System</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Owner</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Annual cost</th>
                  <th scope="col" className="py-1.5 font-semibold">Personal data</th>
                </tr>
              </thead>
              <tbody>
                {coreSystems.map((system) => (
                  <tr key={system.id} className="border-b border-surface-200">
                    <td className="py-1.5 pr-3 font-medium text-primary-900">{system.name}</td>
                    <td className="py-1.5 pr-3 text-primary-700">
                      {owners.find((o) => o.id === system.ownerId)?.name ?? 'Nobody named'}
                    </td>
                    <td className="py-1.5 pr-3 text-primary-700">
                      {system.cost ? formatCurrency(annualiseCost(system)) : 'Not recorded'}
                    </td>
                    <td className="py-1.5 text-primary-700">
                      {personalDataSystems.has(system.id) ? 'Yes' : 'No'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Cost */}
        {costSummary.byFunction.some((f) => f.total > 0) && (
          <section className="break-inside-avoid" aria-labelledby="report-cost">
            <h2 id="report-cost" className="text-xl font-display font-bold text-primary-900 mb-3">
              Where the money goes
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-surface-300 text-left">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Area</th>
                  <th scope="col" className="py-1.5 font-semibold">Annual cost</th>
                </tr>
              </thead>
              <tbody>
                {costSummary.byFunction
                  .filter((f) => f.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .map((f) => (
                    <tr key={f.functionId} className="border-b border-surface-200">
                      <td className="py-1.5 pr-3 text-primary-800">{f.functionName}</td>
                      <td className="py-1.5 text-primary-800">{formatCurrency(f.total)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Possible savings */}
        {duplication.length > 0 && (
          <section className="break-inside-avoid" aria-labelledby="report-overlaps">
            <h2 id="report-overlaps" className="text-xl font-display font-bold text-primary-900 mb-3">
              Possible duplication
            </h2>
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-surface-300 text-left">
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Doing the same job</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Systems</th>
                  <th scope="col" className="py-1.5 pr-3 font-semibold">Costing</th>
                  <th scope="col" className="py-1.5 font-semibold">Could free up</th>
                </tr>
              </thead>
              <tbody>
                {duplication.map((group) => (
                  <tr key={group.key} className="border-b border-surface-200">
                    <td className="py-1.5 pr-3 font-medium text-primary-900">{group.label}</td>
                    <td className="py-1.5 pr-3 text-primary-800">
                      {group.systems.map((s) => s.name).join(', ')}
                    </td>
                    <td className="py-1.5 pr-3 text-primary-800">
                      {group.combinedAnnualCost > 0
                        ? `${formatCurrency(group.combinedAnnualCost)}/yr`
                        : 'Not recorded'}
                    </td>
                    <td className="py-1.5 text-primary-800">
                      {group.potentialSaving > 0
                        ? `up to ${formatCurrency(group.potentialSaving)}/yr`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Risk against importance */}
        {techFreedomEnabled && buildRiskImportanceMatrix(systems).plotted.length > 0 && (
          <section className="break-inside-avoid" aria-labelledby="report-priorities">
            <h2
              id="report-priorities"
              className="text-xl font-display font-bold text-primary-900 mb-3"
            >
              What to deal with first
            </h2>
            <RiskImportanceGrid systems={systems} />
          </section>
        )}

        {/* Risk */}
        {risk && (
          <section className="break-inside-avoid" aria-labelledby="report-risk">
            <h2 id="report-risk" className="text-xl font-display font-bold text-primary-900 mb-3">
              Technology risk
            </h2>
            <p className="text-primary-800 text-sm">
              Across {risk.systemCount} assessed{' '}
              {risk.systemCount === 1 ? 'system' : 'systems'}, overall risk is{' '}
              <strong>{riskLevel(risk.averageTotal)}</strong>. The weakest dimension is{' '}
              <strong>
                {RISK_DIMENSIONS.find((d) => d.key === risk.worstDimension)?.label ??
                  risk.worstDimension}
              </strong>
              , and the most exposed system is <strong>{risk.mostCriticalSystem}</strong>.
            </p>
          </section>
        )}

        {/* Scope note */}
        <footer className="border-t border-surface-300 pt-4 text-xs text-primary-600">
          <p>
            Based on {systems.length} systems, {integrations.length} connections and{' '}
            {dataCategories.length} data categories recorded in Stackmap. Figures come from
            what was entered during mapping and should be checked before decisions are taken
            on them.
          </p>
        </footer>
      </article>
    </div>
  );
}
