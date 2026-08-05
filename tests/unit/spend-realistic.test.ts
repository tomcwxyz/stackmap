import { describe, it, expect } from 'vitest';
import { parseSpendCsv } from '@/lib/import/parse-spend';

/** A statement shaped like a real UK bank export, with the noise that implies. */
const BANK_EXPORT = [
  'Date,Description,Money Out,Money In',
  '05/01/2026,XERO LIMITED,33.00,',
  '05/01/2026,SP * CANVA I0F2K3,12.99,',
  '07/01/2026,GOOGLE *GSUITE_sunrise,57.60,',
  '12/01/2026,BOB THE PLUMBER,150.00,',
  '15/01/2026,GRANT FROM FUNDER,,5000.00',
  '05/02/2026,XERO LIMITED,33.00,',
  '05/02/2026,SP * CANVA Z9Y8X7,12.99,',
  '07/02/2026,GOOGLE *GSUITE_sunrise,57.60,',
  '05/03/2026,XERO LIMITED,33.00,',
  '05/03/2026,SP * CANVA M4N5P6,12.99,',
  '07/03/2026,GOOGLE *GSUITE_sunrise,57.60,',
  '20/03/2026,MAILCHIMP,15.00,',
].join('\n');

describe('a realistic bank export', () => {
  const result = parseSpendCsv(BANK_EXPORT);

  it('reads the file', () => {
    expect(result.success).toBe(true);
  });

  it('recognises the subscriptions', () => {
    if (!result.success) throw new Error('parse failed');

    expect(result.matches.map((m) => m.tool?.name).sort()).toEqual([
      'Canva',
      'Google Workspace',
      'Mailchimp',
      'Xero',
    ]);
  });

  it('groups payments that differ only by reference code', () => {
    if (!result.success) throw new Error('parse failed');

    const canva = result.matches.find((m) => m.tool?.name === 'Canva');
    expect(canva?.transactions).toBe(3);
  });

  it('works out what each costs over a year from what was paid', () => {
    if (!result.success) throw new Error('parse failed');

    const google = result.matches.find((m) => m.tool?.name === 'Google Workspace');
    expect(google?.cadence).toBe('monthly');
    expect(google?.estimatedAnnualCost).toBe(691); // 57.60 x 12, rounded
  });

  it('leaves money coming in out of it', () => {
    if (!result.success) throw new Error('parse failed');

    const all = [...result.matches, ...result.unmatched].map((m) => m.payee);
    expect(all).not.toContain('GRANT FROM FUNDER');
  });

  it('sets aside the plumber rather than guessing', () => {
    if (!result.success) throw new Error('parse failed');

    expect(result.unmatched.map((m) => m.payee)).toEqual(['BOB THE PLUMBER']);
  });

  it('does not pretend a single payment is a subscription', () => {
    if (!result.success) throw new Error('parse failed');

    const mailchimp = result.matches.find((m) => m.tool?.name === 'Mailchimp');
    expect(mailchimp?.transactions).toBe(1);
    expect(mailchimp?.estimatedAnnualCost).toBe(15);
  });
});
