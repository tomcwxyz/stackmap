import { describe, it, expect } from 'vitest';
import { suggestFunction, standardFunctionName } from '@/lib/import/suggest-function';

describe('suggestFunction', () => {
  it('files a tool where the wizard already suggests it', () => {
    // The Finance step offers Xero, so Xero belongs to Finance
    expect(suggestFunction('Xero', 'finance').suggested).toBe('finance');
    expect(suggestFunction('BreatheHR', 'hr').suggested).toBe('people');
    expect(suggestFunction('Mailchimp', 'email').suggested).toBe('communications');
  });

  it('matches whatever case the name arrives in', () => {
    expect(suggestFunction('xero', 'finance').suggested).toBe('finance');
    expect(suggestFunction('  XERO  ', 'finance').suggested).toBe('finance');
  });

  it('offers every function a tool could belong to', () => {
    // Slack is suggested under both People and Operations, and which is right
    // depends on the organisation rather than the tool
    const { candidates } = suggestFunction('Slack', 'messaging');

    expect(candidates).toContain('people');
    expect(candidates).toContain('operations');
  });

  it('breaks a tie with the kind of system it is', () => {
    // Stripe is offered under Finance and Fundraising; it is a payment
    // processor, so Finance wins
    expect(suggestFunction('Stripe', 'finance').suggested).toBe('finance');
  });

  it('puts the chosen one first, so a list reads sensibly', () => {
    const { suggested, candidates } = suggestFunction('Stripe', 'finance');

    expect(candidates[0]).toBe(suggested);
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('falls back to the kind of system for a tool it has never heard of', () => {
    expect(suggestFunction('Fictional Ledger App', 'finance').suggested).toBe('finance');
    expect(suggestFunction('Some Case Tool', 'case_management').suggested).toBe(
      'service_delivery',
    );
    expect(suggestFunction('Unknown DB', 'database').suggested).toBe('data_reporting');
  });

  it('suggests nothing for something it cannot place at all', () => {
    const { suggested, candidates } = suggestFunction('Bob the Plumber', 'other');

    expect(suggested).toBeUndefined();
    expect(candidates).toEqual([]);
  });

  it('defaults the system type rather than requiring one', () => {
    expect(suggestFunction('Xero').suggested).toBe('finance');
  });
});

describe('standardFunctionName', () => {
  it('gives the name a person would recognise', () => {
    expect(standardFunctionName('finance')).toBe('Finance');
    expect(standardFunctionName('service_delivery')).toBe('Service Delivery');
  });
});

describe('tools used across the whole organisation', () => {
  it('treats a tool offered everywhere as part of how the place runs', () => {
    // Claude is suggested under Governance, Communications, Operations and
    // Data & Reporting. The first authored entry would be Governance, which
    // is a specialism — Operations is the better opening guess.
    expect(suggestFunction('Claude', 'other').suggested).toBe('operations');
    expect(suggestFunction('ChatGPT', 'other').suggested).toBe('operations');
  });

  it('still lets the kind of system win when it says something', () => {
    // Google Sheets spans four functions, but a spreadsheet is a spreadsheet
    expect(suggestFunction('Google Sheets', 'spreadsheet').suggested).toBe('data_reporting');
  });

  it('leaves a two-function tool on its curated order', () => {
    expect(suggestFunction('Slack', 'other').suggested).toBe('people');
  });
});

describe('categories the wizard has no system type for', () => {
  it('files an AI tool under how the organisation runs', () => {
    // There is no "AI" system type, so without the category these arrived
    // filed under nothing — the bucket this exists to empty
    expect(suggestFunction('Firecrawl', 'other', 'AI').suggested).toBe('operations');
  });

  it('files a ticketing platform under fundraising', () => {
    expect(suggestFunction('Eventbrite', 'other', 'Events').suggested).toBe('fundraising');
  });

  it('prefers what the templates say over the category', () => {
    // Xero's category is Finance and so is its curated function, but the
    // curated answer should be the one doing the work
    const { candidates } = suggestFunction('Xero', 'finance', 'Finance');
    expect(candidates.length).toBeGreaterThan(0);
  });

  it('suggests nothing for a category it has no view on', () => {
    expect(suggestFunction('Some Tool', 'other', 'Nonsense').suggested).toBeUndefined();
  });
});

describe('infrastructure and transactional email', () => {
  it('files DigitalOcean under how the organisation runs', () => {
    // Hosting would otherwise read as a website, and so Communications
    expect(suggestFunction('DigitalOcean', 'website', 'Hosting').suggested).toBe('operations');
  });

  it('files Resend under communications', () => {
    expect(suggestFunction('Resend', 'email', 'Email').suggested).toBe('communications');
  });
});
