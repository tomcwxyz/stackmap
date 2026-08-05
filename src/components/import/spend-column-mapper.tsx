'use client';

import { useCallback, useMemo, useState } from 'react';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import type { SpendColumnMapping, SpendFilePreview } from '@/lib/import/parse-spend';

const NONE = '';

interface SpendColumnMapperProps {
  preview: SpendFilePreview;
  onConfirm: (mapping: SpendColumnMapping) => void;
  onCancel: () => void;
  firstRef?: React.RefObject<HTMLSelectElement | null>;
}

/** A couple of values from the file, so a header name is not the only clue. */
function sampleFor(preview: SpendFilePreview, column: string): string {
  if (!column) return '';
  const values = preview.sampleRows
    .map((row) => (row[column] ?? '').trim())
    .filter(Boolean)
    .slice(0, 2);
  return values.join(', ');
}

/**
 * Lets the user say which column is which.
 *
 * Every bank and accounting package names these differently — Starling says
 * "Counter Party", Xero says "Contact", most banks say "Description" — and
 * there is no list long enough to cover all of them. Detection fills the form
 * in where it can, and the user corrects it where it is wrong.
 */
export function SpendColumnMapper({
  preview,
  onConfirm,
  onCancel,
  firstRef,
}: SpendColumnMapperProps) {
  const [payee, setPayee] = useState(preview.suggested.payee ?? NONE);
  const [amount, setAmount] = useState(preview.suggested.amount ?? NONE);
  const [date, setDate] = useState(preview.suggested.date ?? NONE);
  const [debitOnly, setDebitOnly] = useState(preview.suggested.amountIsDebitOnly === true);

  const canConfirm = Boolean(payee) && Boolean(amount);

  const handleConfirm = useCallback(() => {
    if (!canConfirm) return;
    onConfirm({
      payee,
      amount,
      date: date || undefined,
      amountIsDebitOnly: debitOnly,
    });
  }, [canConfirm, payee, amount, date, debitOnly, onConfirm]);

  const options = useMemo(
    () =>
      preview.headers.map((header) => {
        const sample = sampleFor(preview, header);
        return {
          value: header,
          label: sample ? `${header} — e.g. ${sample}` : header,
        };
      }),
    [preview],
  );

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-primary-800">
          Tell Stackmap which columns to read. Examples from your file are shown next to each
          name.
        </p>
        {!preview.suggested.payee && (
          <p className="text-sm text-amber-800">
            None of these headers looked familiar, so nothing has been filled in for you.
          </p>
        )}
      </div>

      <div className="space-y-4">
        <Select
          id="spend-column-payee"
          ref={firstRef}
          label="Who was paid"
          value={payee}
          onChange={(e) => setPayee(e.target.value)}
          helperText="The supplier, merchant or counter party"
        >
          <option value={NONE}>Choose a column</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Select
          id="spend-column-amount"
          label="How much"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          helperText="Not the running balance, which sits next to it in most bank exports"
        >
          <option value={NONE}>Choose a column</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>

        <Checkbox
          label="This column only ever holds money going out"
          checked={debitOnly}
          onChange={(e) => setDebitOnly(e.target.checked)}
        />

        <Select
          id="spend-column-date"
          label="When (optional)"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          helperText="Used to work out how often you pay, and what that costs over a year"
        >
          <option value={NONE}>Not in this file</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!canConfirm}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Read the file
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary">
          Back
        </button>
      </div>
    </div>
  );
}
