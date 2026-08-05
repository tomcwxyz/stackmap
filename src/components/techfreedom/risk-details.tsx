'use client';

import { RISK_DIMENSIONS } from '@/lib/techfreedom/risk';
import type { TechFreedomScore, RiskDimensionKey } from '@/lib/techfreedom/types';

export interface RiskDetailsProps {
  score: TechFreedomScore;
  onChange?: (score: TechFreedomScore) => void;
  readOnly?: boolean;
  /** Scopes the field ids, so several systems can be scored on one page. */
  idPrefix?: string;
  /** Whether the panel starts open. */
  defaultOpen?: boolean;
}

const scoreColours: Record<number, string> = {
  1: 'bg-green-50',
  2: 'bg-green-100',
  3: 'bg-amber-50',
  4: 'bg-orange-50',
  5: 'bg-red-50',
};

export function RiskDetails({
  score,
  onChange,
  readOnly,
  idPrefix = 'risk',
  defaultOpen = false,
}: RiskDetailsProps) {
  const isEditable = !!onChange && !readOnly;

  function handleChange(key: RiskDimensionKey, value: number) {
    if (!onChange) return;
    onChange({ ...score, [key]: value });
  }

  return (
    <details open={defaultOpen} className="rounded-lg border border-surface-300">
      <summary className="cursor-pointer px-4 py-2 text-sm font-medium font-body text-primary-800 hover:bg-surface-50">
        View risk details
      </summary>
      <div className="border-t border-surface-200 px-4 py-3">
        <p className="mb-3 text-xs font-body text-primary-600">
          {score.isAutoScored ? 'Auto-scored' : 'Manually assessed'}
        </p>
        <div className="grid gap-2">
          {RISK_DIMENSIONS.map((dim) => {
            const dimScore = score[dim.key];
            return (
              <div
                key={dim.key}
                className={`flex items-center justify-between gap-3 rounded-md px-3 py-2 ${scoreColours[dimScore] ?? 'bg-surface-50'}`}
              >
                <label
                  htmlFor={`${idPrefix}-dim-${dim.key}`}
                  className="text-sm font-medium font-body text-primary-900"
                >
                  {dim.label}
                  <span className="block text-xs font-normal text-primary-600">
                    {dim.description}
                  </span>
                </label>
                <select
                  id={`${idPrefix}-dim-${dim.key}`}
                  value={dimScore}
                  disabled={!isEditable}
                  onChange={(e) => handleChange(dim.key, Number(e.target.value))}
                  className="rounded border border-surface-300 bg-white px-2 py-1 text-sm font-body text-primary-950 focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 focus-visible:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={`${dim.label} risk score`}
                >
                  {[1, 2, 3, 4, 5].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>
    </details>
  );
}
