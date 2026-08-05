'use client';

import { formatCurrency } from '@/lib/cost-analysis';
import type { SpendCadence, SpendMatch } from '@/lib/import/parse-spend';

const CADENCE_LABELS: Record<SpendCadence, string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Yearly',
  irregular: 'Occasional',
};

export interface SpendPreviewTableProps {
  matches: SpendMatch[];
  /** Payees currently ticked, keyed by original payee text. */
  selected: Set<string>;
  onToggle: (originalPayee: string) => void;
  /** Heading for this group of rows. */
  caption: string;
}

/**
 * What was found in the spend file, for the user to confirm.
 *
 * Nothing is added to the map without being ticked here: matching a bank
 * descriptor to a product is a guess, and a wrong guess is more annoying than a
 * missed one.
 */
export function SpendPreviewTable({
  matches,
  selected,
  onToggle,
  caption,
}: SpendPreviewTableProps) {
  if (matches.length === 0) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <caption className="text-left text-sm font-medium text-primary-800 mb-1">
          {caption}
        </caption>
        <thead>
          <tr className="border-b border-surface-200 text-left text-xs uppercase tracking-wider text-primary-600">
            <th scope="col" className="py-1.5 pr-2">
              <span className="sr-only">Include</span>
            </th>
            <th scope="col" className="py-1.5 pr-2">Payee</th>
            <th scope="col" className="py-1.5 pr-2">Looks like</th>
            <th scope="col" className="py-1.5 pr-2">Payments</th>
            <th scope="col" className="py-1.5">A year costs</th>
          </tr>
        </thead>
        <tbody>
          {matches.map((match) => (
            <tr key={match.originalPayee} className="border-b border-surface-100">
              <td className="py-1.5 pr-2">
                <input
                  type="checkbox"
                  checked={selected.has(match.originalPayee)}
                  onChange={() => onToggle(match.originalPayee)}
                  aria-label={`Include ${match.tool?.name ?? match.payee}`}
                  className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-2 focus:ring-primary-500"
                />
              </td>
              <td className="py-1.5 pr-2 text-primary-700">
                <span className="block font-medium text-primary-900">{match.payee}</span>
                {match.payee !== match.originalPayee && (
                  <span className="block text-xs text-primary-500">{match.originalPayee}</span>
                )}
              </td>
              <td className="py-1.5 pr-2 text-primary-700">
                {match.tool ? match.tool.name : <span className="text-primary-500">Not recognised</span>}
              </td>
              <td className="py-1.5 pr-2 text-primary-700">
                {match.transactions} · {CADENCE_LABELS[match.cadence]}
              </td>
              <td className="py-1.5 text-primary-900 font-medium">
                {formatCurrency(match.estimatedAnnualCost)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
