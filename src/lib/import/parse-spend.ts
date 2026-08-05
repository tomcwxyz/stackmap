import Papa from 'papaparse';
import type { KnownTool } from '@/lib/techfreedom/types';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';

export type SpendCadence = 'monthly' | 'quarterly' | 'annual' | 'irregular';

export interface SpendMatch {
  /** Cleaned payee, used for display and grouping. */
  payee: string;
  /** The payee text as it appeared in the file, for recognition. */
  originalPayee: string;
  /** The known tool this looks like, when one was recognised. */
  tool?: KnownTool;
  transactions: number;
  totalAmount: number;
  firstDate?: string;
  lastDate?: string;
  cadence: SpendCadence;
  /** What this looks like to cost over a year. */
  estimatedAnnualCost: number;
}

export type SpendParseResult =
  | { success: true; matches: SpendMatch[]; unmatched: SpendMatch[]; warnings: string[] }
  | { success: false; error: string };

// ─── Column detection ───

const PAYEE_COLUMNS = [
  'payee',
  'contact',
  'supplier',
  'vendor',
  'merchant',
  'description',
  'narrative',
  'details',
  'particulars',
  'transaction description',
  'name',
];

const AMOUNT_COLUMNS = ['amount', 'value', 'total', 'transaction amount'];

/** Columns that only ever hold money going out. */
const DEBIT_COLUMNS = ['debit', 'money out', 'paid out', 'withdrawal', 'withdrawn', 'spent', 'out'];

const DATE_COLUMNS = ['date', 'transaction date', 'posted date', 'posted', 'when'];

function findColumn(headers: string[], candidates: string[]): string | undefined {
  const normalised = headers.map((h) => ({ raw: h, key: h.trim().toLowerCase() }));

  // Prefer an exact header match before falling back to a partial one
  for (const candidate of candidates) {
    const exact = normalised.find((h) => h.key === candidate);
    if (exact) return exact.raw;
  }
  for (const candidate of candidates) {
    const partial = normalised.find((h) => h.key.includes(candidate));
    if (partial) return partial.raw;
  }
  return undefined;
}

// ─── Payee cleaning ───

/**
 * Card and bank descriptors that sit in front of the actual merchant, e.g.
 * "SP * CANVA" or "PADDLE.NET* NOTION".
 */
const PROCESSOR_PREFIXES = [
  'sp',
  'sq',
  'sumup',
  'paypal',
  'pp',
  'paddle.net',
  'paddle',
  'fs',
  'gumroad',
  'stripe',
  'chargebee',
  'recurly',
  'wise',
  'dd',
  'direct debit',
];

/** Company suffixes that add nothing when matching a product name. */
const COMPANY_SUFFIXES = [
  'ltd',
  'limited',
  'llc',
  'inc',
  'incorporated',
  'plc',
  'gmbh',
  'bv',
  'pte',
  'co',
  'corp',
  'corporation',
  'sarl',
  'ug',
  'ab',
  'as',
];

/**
 * Reduce a bank or accounting payee to something recognisable.
 *
 * Real statements read like "GOOGLE *GSUITE_stackm" or "SP * CANVA I0F2K3
 * LONDON". The merchant is in there, wrapped in processor prefixes, reference
 * codes and locations that stop any name match working.
 */
export function cleanPayee(raw: string): string {
  let value = raw.trim();
  if (value.length === 0) return '';

  // "GOOGLE *GSUITE" — the star separates merchant from their own reference
  value = value.replace(/\*/g, ' * ');

  let tokens = value
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Drop a leading processor descriptor, with or without its star
  while (tokens.length > 1) {
    const first = tokens[0].toLowerCase().replace(/[^a-z.]/g, '');
    if (PROCESSOR_PREFIXES.includes(first)) {
      tokens.shift();
      if (tokens[0] === '*') tokens.shift();
      continue;
    }
    break;
  }

  // A star after the merchant introduces their own reference, as in
  // "GOOGLE *GSUITE_stackm" — everything from there on is noise
  const starIndex = tokens.indexOf('*');
  if (starIndex > 0) {
    tokens = tokens.slice(0, starIndex);
  } else {
    tokens = tokens.filter((t) => t !== '*');
  }

  // Reference codes: mixed letters and digits, or long digit runs
  tokens = tokens.filter((token) => {
    const bare = token.replace(/[^a-z0-9]/gi, '');
    if (bare.length === 0) return false;
    const hasDigit = /\d/.test(bare);
    const hasLetter = /[a-z]/i.test(bare);
    if (hasDigit && hasLetter && bare.length >= 5) return false;
    if (hasDigit && !hasLetter && bare.length >= 4) return false;
    return true;
  });

  // Trailing company suffixes
  while (tokens.length > 1) {
    const last = tokens[tokens.length - 1].toLowerCase().replace(/[^a-z]/g, '');
    if (COMPANY_SUFFIXES.includes(last)) {
      tokens.pop();
      continue;
    }
    break;
  }

  return tokens
    .join(' ')
    .replace(/\.com\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Amount parsing ───

/** Handles "£1,234.56", "(12.34)" for negatives, and plain numbers. */
export function parseAmount(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return null;

  const isBracketed = /^\(.*\)$/.test(trimmed);
  const cleaned = trimmed.replace(/[()£$€,\s]/g, '');
  if (cleaned.length === 0) return null;

  const parsed = Number(cleaned);
  if (isNaN(parsed)) return null;

  return isBracketed ? -Math.abs(parsed) : parsed;
}

// ─── Dates and cadence ───

function parseDate(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Prefer UK day-first, which is what UK bank exports use
  const ukMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
    const date = new Date(Date.UTC(fullYear, Number(month) - 1, Number(day)));
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(trimmed);
  return isNaN(date.getTime()) ? null : date;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function medianGapDays(dates: Date[]): number | null {
  if (dates.length < 2) return null;

  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const gaps: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i].getTime() - sorted[i - 1].getTime()) / MS_PER_DAY);
  }
  gaps.sort((a, b) => a - b);

  const middle = Math.floor(gaps.length / 2);
  return gaps.length % 2 === 0 ? (gaps[middle - 1] + gaps[middle]) / 2 : gaps[middle];
}

export function inferCadence(dates: Date[]): SpendCadence {
  const gap = medianGapDays(dates);
  if (gap === null) return 'irregular';
  if (gap >= 25 && gap <= 35) return 'monthly';
  if (gap >= 80 && gap <= 100) return 'quarterly';
  if (gap >= 350 && gap <= 380) return 'annual';
  return 'irregular';
}

/**
 * What a run of payments looks like over a year.
 *
 * Regular payments are multiplied up from their average. Irregular ones are
 * only extrapolated when the file covers most of a year — a fortnight of
 * transactions says nothing reliable about an annual bill.
 */
export function annualiseSpend(
  amounts: number[],
  dates: Date[],
  cadence: SpendCadence,
): number {
  if (amounts.length === 0) return 0;

  const total = amounts.reduce((sum, a) => sum + a, 0);
  const mean = total / amounts.length;

  if (cadence === 'monthly') return Math.round(mean * 12);
  if (cadence === 'quarterly') return Math.round(mean * 4);
  if (cadence === 'annual') return Math.round(mean);

  if (dates.length >= 2) {
    const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
    const spanDays =
      (sorted[sorted.length - 1].getTime() - sorted[0].getTime()) / MS_PER_DAY;
    if (spanDays >= 300) return Math.round(total);
  }

  // Too little to go on — report what was actually spent
  return Math.round(total);
}

// ─── Main parser ───

interface Group {
  originalPayee: string;
  amounts: number[];
  dates: Date[];
}

export function parseSpendCsv(text: string): SpendParseResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const rows = parsed.data.filter((row) => Object.keys(row).length > 0);
  if (rows.length === 0) {
    return { success: false, error: 'That file has no rows in it.' };
  }

  const headers = Object.keys(rows[0]);
  const payeeColumn = findColumn(headers, PAYEE_COLUMNS);
  if (!payeeColumn) {
    return {
      success: false,
      error:
        'No column of payees or descriptions found. Expected a column such as Payee, Contact, Supplier or Description.',
    };
  }

  const debitColumn = findColumn(headers, DEBIT_COLUMNS);
  const amountColumn = debitColumn ?? findColumn(headers, AMOUNT_COLUMNS);
  if (!amountColumn) {
    return {
      success: false,
      error: 'No column of amounts found. Expected a column such as Amount, Debit or Money out.',
    };
  }

  const dateColumn = findColumn(headers, DATE_COLUMNS);
  const warnings: string[] = [];
  if (!dateColumn) {
    warnings.push('No date column found, so how often you pay could not be worked out.');
  }

  // Read every row first: whether negatives mean spending depends on the file
  const raw = rows
    .map((row) => ({
      payee: (row[payeeColumn] ?? '').trim(),
      amount: parseAmount(row[amountColumn] ?? ''),
      date: dateColumn ? parseDate(row[dateColumn] ?? '') : null,
    }))
    .filter((row) => row.payee.length > 0 && row.amount !== null) as {
    payee: string;
    amount: number;
    date: Date | null;
  }[];

  if (raw.length === 0) {
    return { success: false, error: 'No rows with both a payee and an amount were found.' };
  }

  // A single amount column may use negatives for money leaving the account. If
  // any row is negative, those are the payments; otherwise every row is one.
  const hasNegatives = !debitColumn && raw.some((row) => row.amount < 0);
  const payments = raw
    .filter((row) => (hasNegatives ? row.amount < 0 : row.amount > 0))
    .map((row) => ({ ...row, amount: Math.abs(row.amount) }));

  if (payments.length === 0) {
    return { success: false, error: 'No payments were found in that file.' };
  }

  const groups = new Map<string, Group>();
  for (const payment of payments) {
    const cleaned = cleanPayee(payment.payee);
    const key = (cleaned || payment.payee).toLowerCase();

    const group = groups.get(key) ?? {
      originalPayee: payment.payee,
      amounts: [],
      dates: [],
    };
    group.amounts.push(payment.amount);
    if (payment.date) group.dates.push(payment.date);
    groups.set(key, group);
  }

  const matches: SpendMatch[] = [];
  const unmatched: SpendMatch[] = [];

  for (const [key, group] of groups) {
    const payee = cleanPayee(group.originalPayee) || group.originalPayee;
    const cadence = inferCadence(group.dates);
    const sortedDates = [...group.dates].sort((a, b) => a.getTime() - b.getTime());

    const match: SpendMatch = {
      payee,
      originalPayee: group.originalPayee,
      tool: findMatchingTool(payee, KNOWN_TOOLS) ?? undefined,
      transactions: group.amounts.length,
      totalAmount: Math.round(group.amounts.reduce((sum, a) => sum + a, 0) * 100) / 100,
      firstDate: sortedDates[0]?.toISOString().slice(0, 10),
      lastDate: sortedDates[sortedDates.length - 1]?.toISOString().slice(0, 10),
      cadence,
      estimatedAnnualCost: annualiseSpend(group.amounts, group.dates, cadence),
    };

    if (match.tool) {
      matches.push(match);
    } else {
      unmatched.push(match);
    }

    // Key is only used for grouping
    void key;
  }

  // Biggest spend first, since that is what anyone wants to see
  matches.sort((a, b) => b.estimatedAnnualCost - a.estimatedAnnualCost);
  unmatched.sort((a, b) => b.estimatedAnnualCost - a.estimatedAnnualCost);

  if (matches.length === 0) {
    warnings.push('None of the payees matched a tool Stackmap knows about.');
  }

  return { success: true, matches, unmatched, warnings };
}
