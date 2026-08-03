'use client';

import { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import { aggregateRisk, totalScore, riskLevel, RISK_DIMENSIONS } from '@/lib/techfreedom/risk';
import { calculateCostSummary, formatCurrency } from '@/lib/cost-analysis';
import { resolveStaffCount } from '@/lib/cost-estimates';
import { findDuplication } from '@/lib/analysis/duplication';
import { generateMarkdownExport } from '@/lib/export/markdown';
import { generateCsvExport } from '@/lib/export/csv';
import { BullseyeDiagram } from './bullseye-diagram';
import { RiskImportanceGrid } from '@/components/analysis/risk-importance-grid';
import { RenewalTimeline } from '@/components/analysis/renewal-timeline';
import { generateRenewalsIcs } from '@/lib/analysis/renewals';
import { buildRiskImportanceMatrix } from '@/lib/analysis/risk-importance';
import { getImportanceTier } from '@/lib/importance';

/** Colour accents per function type for visual distinction in the summary */
const FUNCTION_COLORS: Record<string, string> = {
  finance: 'border-l-emerald-500',
  governance: 'border-l-blue-500',
  people: 'border-l-violet-500',
  fundraising: 'border-l-amber-500',
  communications: 'border-l-rose-500',
  service_delivery: 'border-l-sky-500',
  operations: 'border-l-stone-500',
  data_reporting: 'border-l-teal-500',
  custom: 'border-l-accent-500',
};

const SENSITIVITY_COLORS: Record<string, string> = {
  public: 'text-green-700 bg-green-100',
  internal: 'text-blue-700 bg-blue-100',
  confidential: 'text-orange-700 bg-orange-100',
  restricted: 'text-red-700 bg-red-100',
};

function sensitivityColor(level: string): string {
  return `inline-block px-2 py-0.5 rounded text-xs font-medium ${SENSITIVITY_COLORS[level] ?? ''}`;
}

const RISK_COLORS: Record<string, string> = {
  low: 'text-green-700 bg-green-100',
  moderate: 'text-amber-700 bg-amber-100',
  high: 'text-orange-700 bg-orange-100',
  critical: 'text-red-700 bg-red-100',
};

export function ReviewSummary() {
  const pathname = usePathname();
  const basePath = pathname.startsWith('/wizard/services') ? '/wizard/services' : '/wizard/functions';
  const { architecture, getArchitecture } = useArchitecture();

  const handleExportJson = useCallback(() => {
    const arch = getArchitecture();
    if (!arch) return;
    const costSummary = calculateCostSummary(arch.systems, arch.functions, {
      staffCount: resolveStaffCount(arch.organisation),
    });
    const exportDuplication = findDuplication(arch.systems, arch.functions);
    const techFreedomOn = arch.metadata?.techFreedomEnabled === true;
    const exportRiskSummary = techFreedomOn ? aggregateRisk(arch.systems) : null;
    const exportData = { ...arch, costSummary, duplication: exportDuplication, ...(exportRiskSummary ? { riskSummary: exportRiskSummary } : {}) };
    const json = JSON.stringify(exportData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stackmap-${arch.organisation.name || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getArchitecture]);

  const handleExportMarkdown = useCallback(() => {
    const arch = getArchitecture();
    if (!arch) return;
    const markdown = generateMarkdownExport(arch);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stackmap-${arch.organisation.name || 'export'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getArchitecture]);

  const handleExportRenewals = useCallback(() => {
    const arch = getArchitecture();
    if (!arch) return;
    const ics = generateRenewalsIcs(arch.systems, arch.organisation.name);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stackmap-renewals-${arch.organisation.name || 'export'}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getArchitecture]);

  const handleExportCsv = useCallback(() => {
    const arch = getArchitecture();
    if (!arch) return;
    const csv = generateCsvExport(arch);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stackmap-${arch.organisation.name || 'export'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [getArchitecture]);

  if (!architecture) {
    return (
      <div className="flex items-center justify-center py-12" role="status">
        <p className="text-primary-600">Loading...</p>
      </div>
    );
  }

  const { organisation, functions, services, systems, dataCategories, integrations, owners } =
    architecture;

  const techFreedomEnabled = architecture.metadata?.techFreedomEnabled === true;
  const riskSummary = techFreedomEnabled ? aggregateRisk(systems) : null;

  const costSummary = calculateCostSummary(systems, functions, {
    staffCount: resolveStaffCount(organisation),
  });
  const duplication = findDuplication(systems, functions);
  const hasCostData = costSummary.systemCount > 0;

  const totalItems = functions.length + systems.length + services.length +
    dataCategories.length + integrations.length + owners.length;

  return (
    <div className="space-y-8">
      {/* Organisation header */}
      <div className="space-y-2 max-w-xl">
        <h1 className="text-display-md font-display text-primary-900">
          Technology map for {organisation.name || 'your organisation'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs bg-surface-200 text-primary-700 rounded px-2 py-0.5 font-medium">
            {organisation.type === 'charity'
              ? 'Charity'
              : organisation.type === 'social_enterprise'
                ? 'Social Enterprise'
                : organisation.type === 'council'
                  ? 'Council'
                  : organisation.type === 'cooperative'
                    ? 'Cooperative'
                    : organisation.type === 'private_business'
                      ? 'Private Business'
                      : 'Other'}
          </span>
          {organisation.size && (
            <span className="text-xs bg-surface-200 text-primary-700 rounded px-2 py-0.5 font-medium">
              {organisation.size.charAt(0).toUpperCase() + organisation.size.slice(1)}
            </span>
          )}
          {organisation.staffCount != null && organisation.staffCount > 0 && (
            <span className="text-xs bg-surface-200 text-primary-700 rounded px-2 py-0.5 font-medium">
              {organisation.staffCount} staff
            </span>
          )}
        </div>
        <p className="text-body-lg text-primary-700 pt-1">
          Well done &mdash; you have mapped{' '}
          <strong className="text-primary-900 font-semibold">{totalItems} items</strong> across
          your organisation. Here is the full picture.
        </p>
      </div>

      {/* Summary stats bar */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: 'Functions', count: functions.length },
          { label: 'Systems', count: systems.length },
          ...(services.length > 0 ? [{ label: 'Services', count: services.length }] : []),
          ...(integrations.length > 0 ? [{ label: 'Integrations', count: integrations.length }] : []),
          ...(owners.length > 0 ? [{ label: 'Owners', count: owners.length }] : []),
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-surface-100 border border-surface-300 rounded-lg px-4 py-2"
          >
            <span className="text-2xl font-display font-bold text-primary-800">{stat.count}</span>
            <span className="text-sm text-primary-500 ml-1.5">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Functions & Systems — grouped with colour coding */}
      <section className="space-y-4">
        <h2 className="font-display font-semibold text-primary-900 text-lg">
          Functions &amp; Systems
        </h2>
        {functions.length === 0 ? (
          <p className="text-primary-500">No functions added.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {functions.map((fn) => {
              const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
              const colorClass = FUNCTION_COLORS[fn.type] || 'border-l-primary-500';
              return (
                <div
                  key={fn.id}
                  className={`bg-surface-100 border border-surface-300 border-l-4 ${colorClass} rounded-lg p-4`}
                >
                  <h3 className="font-display font-semibold text-primary-900 text-base">
                    {fn.name}
                  </h3>
                  {fn.description && (
                    <p className="text-sm text-primary-500 mt-0.5">{fn.description}</p>
                  )}
                  {fnSystems.length > 0 && (
                    <ul className="mt-2 space-y-1" role="list">
                      {fnSystems.map((sys) => {
                        const sysScore = sys.techFreedomScore;
                        const sysTotal = sysScore ? totalScore(sysScore) : null;
                        const sysLevel = sysTotal !== null ? riskLevel(sysTotal) : null;
                        return (
                        <li key={sys.id} className="text-sm text-primary-700 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" aria-hidden="true" />
                          {sys.name}
                          {sys.vendor && (
                            <span className="text-primary-400">({sys.vendor})</span>
                          )}
                          {techFreedomEnabled && sysLevel !== null && sysTotal !== null && (
                            <span
                              className={`text-xs font-medium px-1.5 py-0.5 rounded ${RISK_COLORS[sysLevel]}`}
                              data-testid="review-risk-indicator"
                            >
                              {sysTotal}/25 {sysLevel.charAt(0).toUpperCase() + sysLevel.slice(1)}
                            </span>
                          )}
                        </li>
                        );
                      })}
                    </ul>
                  )}
                  {fnSystems.length === 0 && (
                    <p className="text-xs text-primary-400 mt-2 italic">No systems mapped yet</p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Systems not linked to any function */}
        {(() => {
          const unlinked = systems.filter(
            (s) => !s.functionIds.some((fId) => functions.some((f) => f.id === fId)),
          );
          if (unlinked.length === 0) return null;
          return (
            <div className="bg-surface-100 border border-surface-300 border-l-4 border-l-surface-400 rounded-lg p-4">
              <h3 className="font-display font-semibold text-primary-800 text-base">Other systems</h3>
              <ul className="mt-2 space-y-1" role="list">
                {unlinked.map((sys) => (
                  <li key={sys.id} className="text-sm text-primary-700 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" aria-hidden="true" />
                    {sys.name}
                  </li>
                ))}
              </ul>
            </div>
          );
        })()}
      </section>

      {/* Technology Risk Summary — only when TechFreedom is enabled and at least one system has a score */}
      {riskSummary && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-3">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Technology Risk Summary
          </h2>
          <div className="flex flex-wrap gap-3">
            <div className="bg-white border border-surface-200 rounded-lg px-3 py-2">
              <span className="text-sm text-primary-500">Overall risk: </span>
              <span
                className={`text-sm font-semibold px-1.5 py-0.5 rounded ${RISK_COLORS[riskLevel(riskSummary.averageTotal)]}`}
              >
                {riskLevel(riskSummary.averageTotal).charAt(0).toUpperCase() + riskLevel(riskSummary.averageTotal).slice(1)}
              </span>
            </div>
            <div className="bg-white border border-surface-200 rounded-lg px-3 py-2">
              <span className="text-sm text-primary-500">Worst dimension: </span>
              <span className="text-sm font-semibold text-primary-900">
                {RISK_DIMENSIONS.find((d) => d.key === riskSummary.worstDimension)?.label ?? riskSummary.worstDimension}
              </span>
            </div>
            <div className="bg-white border border-surface-200 rounded-lg px-3 py-2">
              <span className="text-sm text-primary-500">Most critical: </span>
              <span className="text-sm font-semibold text-primary-900">
                {riskSummary.mostCriticalSystem}
              </span>
            </div>
            <div className="bg-white border border-surface-200 rounded-lg px-3 py-2">
              <span className="text-sm text-primary-500">Systems assessed: </span>
              <span className="text-sm font-semibold text-primary-900">
                {riskSummary.systemCount}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {riskSummary.countByLevel.low > 0 && (
              <span className={`px-2 py-1 rounded font-medium ${RISK_COLORS.low}`}>
                {riskSummary.countByLevel.low} Low
              </span>
            )}
            {riskSummary.countByLevel.moderate > 0 && (
              <span className={`px-2 py-1 rounded font-medium ${RISK_COLORS.moderate}`}>
                {riskSummary.countByLevel.moderate} Moderate
              </span>
            )}
            {riskSummary.countByLevel.high > 0 && (
              <span className={`px-2 py-1 rounded font-medium ${RISK_COLORS.high}`}>
                {riskSummary.countByLevel.high} High
              </span>
            )}
            {riskSummary.countByLevel.critical > 0 && (
              <span className={`px-2 py-1 rounded font-medium ${RISK_COLORS.critical}`}>
                {riskSummary.countByLevel.critical} Critical
              </span>
            )}
          </div>
          <div className="bg-white border border-surface-200 rounded-lg p-4 mt-3 space-y-2">
            <p className="text-sm text-primary-700 leading-relaxed">
              Want help improving these scores? The TechFreedom programme offers cohort-based
              support for organisations looking to reduce technology risk, plus bespoke
              guidance for more complex stacks.
            </p>
            <a
              href="https://techfreedom.eu/programme/#signup-cta"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-800 hover:underline"
            >
              Learn about TechFreedom support
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
          </div>
        </section>
      )}

      {/* Services */}
      {services.length > 0 && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-2">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Services ({services.length})
          </h2>
          <ul className="space-y-3" role="list">
            {services.map((svc) => {
              const svcFunctions = (svc.functionIds ?? [])
                .map((fId) => functions.find((f) => f.id === fId))
                .filter(Boolean);
              const svcSystems = (svc.systemIds ?? [])
                .map((sId) => systems.find((s) => s.id === sId))
                .filter(Boolean);
              return (
              <li key={svc.id} className="text-primary-700">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent-400 flex-shrink-0" aria-hidden="true" />
                  {svc.name}
                  <span className="text-xs bg-surface-200 text-primary-500 rounded px-1.5 py-0.5">
                    {svc.status}
                  </span>
                </div>
                {(svcFunctions.length > 0 || svcSystems.length > 0) && (
                  <div className="ml-4 mt-1 flex flex-wrap gap-1.5">
                    {svcFunctions.map((fn) => (
                      <span key={fn!.id} className="text-xs bg-violet-100 text-violet-700 rounded px-1.5 py-0.5">
                        {fn!.name}
                      </span>
                    ))}
                    {svcSystems.map((sys) => (
                      <span key={sys!.id} className="text-xs bg-sky-100 text-sky-700 rounded px-1.5 py-0.5">
                        {sys!.name}
                      </span>
                    ))}
                  </div>
                )}
              </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Data categories */}
      {dataCategories.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-primary-900">Data</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-primary-600 border-b border-surface-200">
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4">Sensitivity</th>
                  <th className="py-2 pr-4">Personal data</th>
                  <th className="py-2">Systems</th>
                </tr>
              </thead>
              <tbody>
                {dataCategories.map((dc) => (
                  <tr key={dc.id} className="border-b border-surface-100">
                    <td className="py-2 pr-4 font-medium text-primary-900">{dc.name}</td>
                    <td className="py-2 pr-4">
                      <span className={sensitivityColor(dc.sensitivity)}>
                        {dc.sensitivity}
                      </span>
                    </td>
                    <td className="py-2 pr-4">{dc.containsPersonalData ? 'Yes' : 'No'}</td>
                    <td className="py-2 text-primary-600">
                      {dc.systemIds.map((id) => systems.find((s) => s.id === id)?.name).filter(Boolean).join(', ') || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Integrations */}
      {integrations.length > 0 && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-2">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Integrations ({integrations.length})
          </h2>
          <ul className="space-y-1.5" role="list">
            {integrations.map((intg) => {
              const source = systems.find((s) => s.id === intg.sourceSystemId)?.name ?? 'Unknown';
              const target = systems.find((s) => s.id === intg.targetSystemId)?.name ?? 'Unknown';
              return (
                <li key={intg.id} className="text-primary-700 flex items-center gap-2">
                  <span className="font-medium text-primary-800">{source}</span>
                  <span className="text-primary-400" aria-label={intg.direction === 'two_way' ? 'connects both ways to' : 'connects to'}>
                    {intg.direction === 'two_way' ? '\u2194' : '\u2192'}
                  </span>
                  <span className="font-medium text-primary-800">{target}</span>
                  <span className="text-xs bg-surface-200 text-primary-500 rounded px-1.5 py-0.5">
                    {intg.type}
                  </span>
                  {intg.reliability === 'fragile' && (
                    <span className="text-xs bg-amber-100 text-amber-800 rounded px-1.5 py-0.5 font-medium">
                      Fragile
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Owners */}
      {owners.length > 0 && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-2">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Owners ({owners.length})
          </h2>
          <ul className="space-y-1.5" role="list">
            {owners.map((owner) => {
              const ownedSystems = systems.filter((s) => s.ownerId === owner.id);
              return (
                <li key={owner.id} className="text-primary-700 flex items-center gap-2 flex-wrap">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" aria-hidden="true" />
                  <span className="font-medium text-primary-800">{owner.name}</span>
                  {owner.role && (
                    <span className="text-xs text-primary-500">
                      &mdash; {owner.role}
                    </span>
                  )}
                  {owner.isExternal && (
                    <span className="text-xs bg-blue-100 text-blue-800 rounded px-1.5 py-0.5 font-medium">
                      External
                    </span>
                  )}
                  {ownedSystems.length > 0 && (
                    <span className="text-sm text-primary-500">
                      &middot; {ownedSystems.map((s) => s.name).join(', ')}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Cost Overview */}
      {hasCostData && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-4" data-testid="cost-overview">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Cost Overview
          </h2>

          {/* Total annual cost */}
          <div className="bg-white border border-surface-200 rounded-lg px-4 py-3">
            <p className="text-sm text-primary-500">Total annual cost</p>
            <p className="text-3xl font-display font-bold text-primary-900">
              {formatCurrency(costSummary.totalAnnual)}
              <span className="text-base font-normal text-primary-500">/year</span>
            </p>
            {costSummary.estimatedCount > 0 && (
              <p className="text-sm text-primary-600 mt-1" data-testid="cost-estimate-note">
                Plus roughly {formatCurrency(costSummary.estimatedAnnual)}/year estimated for{' '}
                {costSummary.estimatedCount}{' '}
                {costSummary.estimatedCount === 1 ? 'system' : 'systems'} with no cost recorded
                &mdash; about {formatCurrency(costSummary.totalAnnual + costSummary.estimatedAnnual)}
                /year in total.
              </p>
            )}
          </div>

          {/* Breakdown by function */}
          {costSummary.byFunction.some((f) => f.total > 0) && (
            <div>
              <h3 className="text-sm font-semibold text-primary-700 mb-2">Breakdown by function</h3>
              <ul className="space-y-1.5" role="list">
                {costSummary.byFunction
                  .filter((f) => f.total > 0)
                  .sort((a, b) => b.total - a.total)
                  .map((f) => (
                    <li key={f.functionId} className="flex items-center justify-between text-sm">
                      <span className="text-primary-700">{f.functionName}</span>
                      <span className={`font-medium ${
                        f.total > 5000
                          ? 'text-red-700'
                          : f.total > 1000
                            ? 'text-amber-700'
                            : 'text-primary-900'
                      }`}>
                        {formatCurrency(f.total)}/year
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Top 3 most expensive */}
          {costSummary.mostExpensive.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-primary-700 mb-2">Most expensive systems</h3>
              <ul className="space-y-1.5" role="list">
                {costSummary.mostExpensive.map((sys) => (
                  <li key={sys.name} className="flex items-center justify-between text-sm">
                    <span className="text-primary-700">{sys.name}</span>
                    <span className={`font-semibold ${
                      sys.annualCost > 5000
                        ? 'text-red-700'
                        : sys.annualCost > 1000
                          ? 'text-amber-700'
                          : 'text-primary-900'
                    }`}>
                      {formatCurrency(sys.annualCost)}/year
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Info notes */}
          <div className="flex flex-wrap gap-3 text-xs text-primary-500">
            {costSummary.uncostCount > 0 && (
              <span>{costSummary.uncostCount} {costSummary.uncostCount === 1 ? 'system has' : 'systems have'} no cost information</span>
            )}
            {costSummary.freeCount > 0 && (
              <span>{costSummary.freeCount} {costSummary.freeCount === 1 ? 'system is' : 'systems are'} free</span>
            )}
          </div>
        </section>
      )}

      {/* Importance Overview */}
      {systems.some(s => s.importance !== undefined) && (() => {
        const officialSystems = systems.filter(s => !s.isShadow);
        const coreCount = officialSystems.filter(s => (s.importance ?? 0) >= 8).length;
        const importantCount = officialSystems.filter(s => (s.importance ?? 0) >= 4 && (s.importance ?? 0) < 8).length;
        const peripheralCount = officialSystems.filter(s => (s.importance ?? 0) >= 1 && (s.importance ?? 0) < 4).length;
        const shadowSystems = systems.filter(s => s.isShadow);
        const highImportanceShadow = shadowSystems.filter(s => (s.importance ?? 0) >= 8);

        return (
          <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-4" data-testid="importance-overview">
            <h2 className="font-display font-semibold text-primary-900 text-lg">
              Importance Overview
            </h2>
            <div className="w-full max-w-sm mx-auto">
              <BullseyeDiagram systems={systems} functions={functions} />
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {coreCount > 0 && <span className="text-green-700">{coreCount} core</span>}
              {importantCount > 0 && <span className="text-amber-700">{importantCount} important</span>}
              {peripheralCount > 0 && <span className="text-stone-600">{peripheralCount} peripheral</span>}
              {shadowSystems.length > 0 && <span className="text-primary-500">{shadowSystems.length} shadow</span>}
            </div>
            {highImportanceShadow.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                {highImportanceShadow.map(s => s.name).join(', ')}
                {highImportanceShadow.length === 1 ? ' is' : ' are'} classified as shadow but scored as core — consider formalising {highImportanceShadow.length === 1 ? 'it' : 'them'}.
              </div>
            )}
          </section>
        );
      })()}

      {/* Risk against importance — only useful once both are known */}
      {techFreedomEnabled && buildRiskImportanceMatrix(systems).plotted.length > 0 && (
        <section
          className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-3"
          data-testid="risk-importance-section"
        >
          <div>
            <h2 className="font-display font-semibold text-primary-900 text-lg">
              What to deal with first
            </h2>
            <p className="text-sm text-primary-600">
              Your systems crossed against how much you depend on them and how risky they are.
            </p>
          </div>
          <RiskImportanceGrid systems={systems} />
        </section>
      )}

      {/* Shadow & Informal Tools */}
      {systems.some(s => s.isShadow) && (
        <section className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-3" data-testid="shadow-tools">
          <h2 className="font-display font-semibold text-primary-900 text-lg">
            Shadow &amp; Informal Tools
          </h2>
          <ul className="space-y-2" role="list">
            {systems.filter(s => s.isShadow).map(s => {
              const tier = getImportanceTier(s.importance);
              return (
                <li key={s.id} className="flex items-center justify-between text-sm border-b border-surface-200 pb-2">
                  <div>
                    <span className="font-medium text-primary-800">{s.name}</span>
                  </div>
                  {tier && (
                    <span className={`text-xs rounded px-1.5 py-0.5 font-medium ${
                      tier.tier === 'core' ? 'text-green-700 bg-green-100' :
                      tier.tier === 'important' ? 'text-amber-700 bg-amber-100' :
                      'text-stone-600 bg-stone-100'
                    }`}>
                      {s.importance}/10
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Renewals */}
      {systems.some((s) => s.renewalDate) && (
        <section
          className="bg-surface-100 border border-surface-300 rounded-lg p-4 sm:p-6 space-y-3"
          data-testid="renewals-section"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display font-semibold text-primary-900 text-lg">
                What renews next
              </h2>
              <p className="text-sm text-primary-600">
                Contract dates you have recorded, soonest first.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportRenewals}
              className="btn-secondary text-sm whitespace-nowrap"
            >
              Add to calendar
            </button>
          </div>
          <RenewalTimeline systems={systems} />
        </section>
      )}

      {/* Systems that appear to do the same job */}
      {duplication.length > 0 && (
        <section className="bg-amber-50 border border-amber-300 rounded-lg p-4 sm:p-6 space-y-3" data-testid="overlap-warnings">
          <h2 className="font-display font-semibold text-amber-900 text-lg">
            Potential overlaps
          </h2>
          <ul className="space-y-3" role="list">
            {duplication.map((group) => (
              <li key={group.key} className="text-sm text-amber-800">
                <p className="font-medium">
                  You have {group.systems.length} {group.label.toLowerCase()} systems:{' '}
                  {group.systems.map((s) => s.name).join(', ')}
                  {group.functionNames.length > 0 && (
                    <span className="font-normal"> ({group.functionNames.join(', ')})</span>
                  )}
                </p>
                <p className="text-amber-700 text-xs mt-0.5">
                  {group.potentialSaving > 0
                    ? `Together they cost ${formatCurrency(group.combinedAnnualCost)}/year. Consolidating onto one could free up as much as ${formatCurrency(group.potentialSaving)}/year.`
                    : 'Consider whether all of them are needed, or if one could replace the others.'}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* TechFreedom acknowledgement */}
      {techFreedomEnabled && (
        <div className="bg-surface-100 border border-surface-200 rounded-lg p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-primary-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <div className="text-sm text-primary-700 leading-relaxed">
            <p>
              Risk assessment powered by{' '}
              <a
                href="https://techfreedom.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary-800 underline underline-offset-2 hover:text-accent-600 transition-colors"
              >
                TechFreedom
              </a>
              . Thank you to the TechFreedom programme for generously allowing the inclusion of their
              risk lens and assessment framework, helping organisations understand their technology dependencies.
            </p>
          </div>
        </div>
      )}

      {/* Actions — prominent, celebratory */}
      <div className="bg-primary-900 rounded-xl p-6 sm:p-8 space-y-4">
        <h2 className="font-display font-bold text-primary-100 text-xl">
          What next?
        </h2>
        <p className="text-primary-300 text-sm leading-relaxed max-w-lg">
          Your technology map is ready. View it as a diagram or export the data.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/view/diagram"
            className="bg-accent-500 hover:bg-accent-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            View diagram
          </Link>
          <Link
            href="/view/report"
            className="bg-accent-500 hover:bg-accent-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-accent-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247M16.5 4.875c0 .621-.504 1.125-1.125 1.125h-6.75A1.125 1.125 0 017.5 4.875v-1.5c0-.621.504-1.125 1.125-1.125h6.75c.621 0 1.125.504 1.125 1.125v1.5z" />
            </svg>
            Board report
          </Link>
          <Link
            href="/view/systems"
            className="bg-primary-700 hover:bg-primary-600 text-primary-100 px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
            Edit your systems
          </Link>
          <button
            type="button"
            onClick={handleExportJson}
            className="bg-primary-700 hover:bg-primary-600 text-primary-100 px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Export as JSON
          </button>
          <button
            type="button"
            onClick={handleExportMarkdown}
            className="bg-primary-700 hover:bg-primary-600 text-primary-100 px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
            Export as Markdown
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="bg-primary-700 hover:bg-primary-600 text-primary-100 px-5 py-2.5 rounded-lg font-semibold text-sm inline-flex items-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-900"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M10.875 12c-.621 0-1.125.504-1.125 1.125M12 10.875c-.621 0-1.125.504-1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125m0 1.5c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 1.5v-1.5m0 0c0-.621.504-1.125 1.125-1.125" />
            </svg>
            Export as CSV
          </button>
        </div>
      </div>

      {/* Back link */}
      <div className="pt-2">
        <Link
          href={`${basePath}/owners`}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to previous step
        </Link>
      </div>
    </div>
  );
}
