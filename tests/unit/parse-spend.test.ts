import { describe, it, expect } from 'vitest';
import {
  cleanPayee,
  parseAmount,
  inferCadence,
  annualiseSpend,
  parseSpendCsv,
  inspectSpendCsv,
} from '@/lib/import/parse-spend';

function dates(...isoDates: string[]): Date[] {
  return isoDates.map((d) => new Date(`${d}T00:00:00Z`));
}

describe('cleanPayee', () => {
  it('leaves an already clean name alone', () => {
    expect(cleanPayee('Xero')).toBe('Xero');
  });

  it('strips a card processor prefix', () => {
    expect(cleanPayee('SP * CANVA')).toBe('CANVA');
    expect(cleanPayee('PADDLE.NET* NOTION')).toBe('NOTION');
    expect(cleanPayee('PAYPAL *SLACK')).toBe('SLACK');
  });

  it('strips the merchant’s own reference after a star', () => {
    expect(cleanPayee('GOOGLE *GSUITE_stackm')).toBe('GOOGLE');
  });

  it('strips reference codes', () => {
    expect(cleanPayee('SLACK T3E4F5X')).toBe('SLACK');
    expect(cleanPayee('ADOBE 4829104')).toBe('ADOBE');
  });

  it('strips company suffixes', () => {
    expect(cleanPayee('XERO LIMITED')).toBe('XERO');
    expect(cleanPayee('Notion Labs Inc')).toBe('Notion Labs');
  });

  it('strips a .com suffix', () => {
    expect(cleanPayee('SLACK.COM')).toBe('SLACK');
  });

  it('handles a payee wrapped in several of these at once', () => {
    expect(cleanPayee('SP * CANVA I0F2K3Z LTD')).toBe('CANVA');
  });

  it('does not strip a name down to nothing', () => {
    expect(cleanPayee('LTD')).toBe('LTD');
    expect(cleanPayee('SP')).toBe('SP');
  });

  it('returns empty for empty input', () => {
    expect(cleanPayee('   ')).toBe('');
  });
});

describe('parseAmount', () => {
  it('reads a plain number', () => {
    expect(parseAmount('12.34')).toBe(12.34);
  });

  it('reads currency symbols and thousands separators', () => {
    expect(parseAmount('£1,234.56')).toBe(1234.56);
  });

  it('reads a negative', () => {
    expect(parseAmount('-45')).toBe(-45);
  });

  it('treats brackets as negative, as accounting exports do', () => {
    expect(parseAmount('(45.00)')).toBe(-45);
  });

  it('returns null for anything that is not a number', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('n/a')).toBeNull();
  });
});

describe('inferCadence', () => {
  it('spots a monthly subscription', () => {
    expect(inferCadence(dates('2026-01-05', '2026-02-04', '2026-03-06'))).toBe('monthly');
  });

  it('spots a quarterly one', () => {
    expect(inferCadence(dates('2026-01-05', '2026-04-05', '2026-07-05'))).toBe('quarterly');
  });

  it('spots an annual one', () => {
    expect(inferCadence(dates('2025-03-01', '2026-03-01'))).toBe('annual');
  });

  it('calls anything else irregular', () => {
    expect(inferCadence(dates('2026-01-05', '2026-01-09'))).toBe('irregular');
  });

  it('cannot tell from a single payment', () => {
    expect(inferCadence(dates('2026-01-05'))).toBe('irregular');
  });
});

describe('annualiseSpend', () => {
  it('multiplies a monthly payment up to a year', () => {
    expect(annualiseSpend([10, 10, 10], dates('2026-01-05', '2026-02-05', '2026-03-05'), 'monthly')).toBe(120);
  });

  it('multiplies a quarterly payment up to a year', () => {
    expect(annualiseSpend([30, 30], dates('2026-01-05', '2026-04-05'), 'quarterly')).toBe(120);
  });

  it('takes an annual payment as it is', () => {
    expect(annualiseSpend([120], dates('2026-01-05'), 'annual')).toBe(120);
  });

  it('does not inflate a short run of irregular payments', () => {
    // Two payments a week apart say nothing about a year
    expect(annualiseSpend([10, 10], dates('2026-01-05', '2026-01-12'), 'irregular')).toBe(20);
  });

  it('totals irregular payments that already span most of a year', () => {
    expect(
      annualiseSpend([10, 25, 5], dates('2025-06-01', '2025-12-01', '2026-05-01'), 'irregular'),
    ).toBe(40);
  });

  it('returns zero for nothing', () => {
    expect(annualiseSpend([], [], 'irregular')).toBe(0);
  });
});

describe('parseSpendCsv', () => {
  it('rejects a file with no payee column', () => {
    const result = parseSpendCsv('foo,bar\n1,2\n');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/payees or descriptions/i);
  });

  it('rejects a file with no amount column', () => {
    const result = parseSpendCsv('Payee\nXero\n');

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error).toMatch(/amounts/i);
  });

  it('recognises tools it knows about', () => {
    const csv = [
      'Date,Payee,Amount',
      '05/01/2026,XERO LIMITED,33.00',
      '05/02/2026,XERO LIMITED,33.00',
      '05/03/2026,XERO LIMITED,33.00',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].tool?.name).toBe('Xero');
    expect(result.matches[0].transactions).toBe(3);
    expect(result.matches[0].cadence).toBe('monthly');
    expect(result.matches[0].estimatedAnnualCost).toBe(396);
  });

  it('groups payments that differ only by reference code', () => {
    const csv = [
      'Date,Description,Amount',
      '05/01/2026,SP * CANVA I0F2K3,12.99',
      '05/02/2026,SP * CANVA Z9Y8X7,12.99',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const all = [...result.matches, ...result.unmatched];
    expect(all).toHaveLength(1);
    expect(all[0].transactions).toBe(2);
  });

  it('separates payees it does not recognise', () => {
    const csv = [
      'Date,Payee,Amount',
      '05/01/2026,XERO LIMITED,33.00',
      '05/01/2026,BOB THE PLUMBER,150.00',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches.map((m) => m.tool?.name)).toEqual(['Xero']);
    expect(result.unmatched.map((m) => m.payee)).toContain('BOB THE PLUMBER');
  });

  it('uses a debit column when there is one', () => {
    const csv = [
      'Date,Description,Debit,Credit',
      '05/01/2026,XERO LIMITED,33.00,',
      '06/01/2026,GRANT RECEIVED,,5000.00',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const all = [...result.matches, ...result.unmatched];
    expect(all).toHaveLength(1);
    expect(all[0].totalAmount).toBe(33);
  });

  it('treats negatives as the payments when a single column has both', () => {
    const csv = [
      'Date,Description,Amount',
      '05/01/2026,XERO LIMITED,-33.00',
      '06/01/2026,GRANT RECEIVED,5000.00',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    const all = [...result.matches, ...result.unmatched];
    expect(all).toHaveLength(1);
    expect(all[0].totalAmount).toBe(33);
  });

  it('treats everything as a payment when nothing is negative', () => {
    const csv = ['Payee,Amount', 'XERO LIMITED,33.00', 'SLACK,50.00'].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect([...result.matches, ...result.unmatched]).toHaveLength(2);
  });

  it('warns when there are no dates to judge frequency by', () => {
    const result = parseSpendCsv('Payee,Amount\nXERO LIMITED,33.00\n');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings.join(' ')).toMatch(/how often you pay/i);
  });

  it('warns when nothing matched', () => {
    const result = parseSpendCsv('Payee,Amount\nBOB THE PLUMBER,150.00\n');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.warnings.join(' ')).toMatch(/none of the payees matched/i);
  });

  it('puts the biggest spend first', () => {
    const csv = [
      'Payee,Amount',
      'SLACK,50.00',
      'SALESFORCE,5000.00',
      'CANVA,100.00',
    ].join('\n');

    const result = parseSpendCsv(csv);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches[0].tool?.name).toBe('Salesforce');
  });
});

describe('inspectSpendCsv', () => {
  // A real Starling export: none of the header names match the conventions
  // the importer grew up on.
  const starling = [
    'Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP),Spending Category,Notes',
    '02/05/2026,Google Cloud,Google Workspace_good-,CARD SUBSCRIPTION,-26.08,1101.78,ADMIN,',
    '07/05/2026,Supabase,SUPABASE,ONLINE PAYMENT,-25.01,482.11,ADMIN,',
    '20/05/2026,SOS - UK,INV-2026-0008,FASTER PAYMENT,4000,4099.33,REVENUE,',
  ].join('\n');

  it('reports the file’s own headers, so a person can recognise them', () => {
    const result = inspectSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.headers).toContain('Counter Party');
    expect(result.preview.headers).toContain('Spending Category');
  });

  it('shows a few rows, since a header name alone often does not say enough', () => {
    const result = inspectSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.sampleRows).toHaveLength(3);
    expect(result.preview.sampleRows[0]['Counter Party']).toBe('Google Cloud');
  });

  it('suggests the columns it recognised', () => {
    const result = inspectSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.suggested).toMatchObject({
      payee: 'Counter Party',
      amount: 'Amount (GBP)',
      date: 'Date',
    });
  });

  it('never suggests a running balance as the amount', () => {
    // It sits next to the amount and is the same shape, so partial matching
    // will take it and report an account balance as a software bill.
    const result = inspectSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.suggested.amount).not.toBe('Balance (GBP)');
  });

  it('still describes a file it cannot make sense of', () => {
    const result = inspectSpendCsv('Alpha,Beta\n1,2\n');

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.preview.headers).toEqual(['Alpha', 'Beta']);
    expect(result.preview.suggested.payee).toBeUndefined();
  });

  it('refuses a file with no rows', () => {
    const result = inspectSpendCsv('Payee,Amount\n');

    expect(result.success).toBe(false);
  });
});

describe('parseSpendCsv with a column mapping', () => {
  const starling = [
    'Date,Counter Party,Reference,Type,Amount (GBP),Balance (GBP)',
    '02/05/2026,Supabase,SUPABASE_good-,CARD SUBSCRIPTION,-26.08,1101.78',
    '02/06/2026,Supabase,SUPABASE_good-,CARD SUBSCRIPTION,-26.08,2025.86',
    '02/07/2026,Supabase,SUPABASE_good-,CARD SUBSCRIPTION,-26.08,5338.98',
  ].join('\n');

  it('reads a Starling export without being told anything', () => {
    const result = parseSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches[0].payee).toBe('Supabase');
    expect(result.matches[0].transactions).toBe(3);
  });

  it('does not mistake the running balance for the amount', () => {
    const result = parseSpendCsv(starling);

    expect(result.success).toBe(true);
    if (!result.success) return;
    // £26.08 a month, not the four-figure balance sitting next to it
    expect(result.matches[0].estimatedAnnualCost).toBe(313);
  });

  it('uses the column the user chose over the one it guessed', () => {
    const result = parseSpendCsv(starling, {
      payee: 'Reference',
      amount: 'Amount (GBP)',
      date: 'Date',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches[0].originalPayee).toBe('SUPABASE_good-');
  });

  it('treats a chosen debit column as money out, negative or not', () => {
    const csv = ['Supplier,Paid,Balance', 'XERO,33.00,500.00', 'XERO,33.00,467.00'].join('\n');

    const result = parseSpendCsv(csv, {
      payee: 'Supplier',
      amount: 'Paid',
      amountIsDebitOnly: true,
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.matches[0].totalAmount).toBe(66);
  });

  it('says so when a chosen column is not in the file', () => {
    const result = parseSpendCsv(starling, {
      payee: 'Not A Column',
      amount: 'Amount (GBP)',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error).toMatch(/no column called "Not A Column"/i);
  });
});
