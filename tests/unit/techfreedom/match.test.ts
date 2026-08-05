import { describe, it, expect } from 'vitest';
import { findMatchingTool } from '@/lib/techfreedom/match';
import { KNOWN_TOOLS } from '@/lib/techfreedom/tools';

describe('KNOWN_TOOLS', () => {
  it('has at least 20 tools', () => {
    expect(KNOWN_TOOLS.length).toBeGreaterThanOrEqual(20);
  });

  it('each tool has required fields', () => {
    for (const tool of KNOWN_TOOLS) {
      expect(tool.slug).toBeTruthy();
      expect(tool.name).toBeTruthy();
      expect(tool.provider).toBeTruthy();
      expect(tool.score.jurisdiction).toBeGreaterThanOrEqual(1);
      expect(tool.score.jurisdiction).toBeLessThanOrEqual(5);
    }
  });

  it('each tool has scores in valid 1-5 range for all dimensions', () => {
    const dimensions = [
      'jurisdiction',
      'continuity',
      'surveillance',
      'lockIn',
      'costExposure',
    ] as const;
    for (const tool of KNOWN_TOOLS) {
      for (const dim of dimensions) {
        expect(tool.score[dim]).toBeGreaterThanOrEqual(1);
        expect(tool.score[dim]).toBeLessThanOrEqual(5);
      }
    }
  });

  it('each tool has a non-empty keyRisks string', () => {
    for (const tool of KNOWN_TOOLS) {
      expect(tool.keyRisks).toBeTruthy();
    }
  });

  it('each tool has a non-empty category', () => {
    for (const tool of KNOWN_TOOLS) {
      expect(tool.category).toBeTruthy();
    }
  });

  it('has unique slugs', () => {
    const slugs = KNOWN_TOOLS.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});

describe('findMatchingTool', () => {
  it('matches exact name case-insensitively', () => {
    const match = findMatchingTool('xero', KNOWN_TOOLS);
    expect(match).not.toBeNull();
    expect(match!.name).toBe('Xero');
  });

  it('matches partial name', () => {
    const match = findMatchingTool('Microsoft 365', KNOWN_TOOLS);
    expect(match).not.toBeNull();
    expect(match!.slug).toBe('microsoft-365');
  });

  it('matches by provider', () => {
    const match = findMatchingTool('Google Sheets', KNOWN_TOOLS);
    expect(match).not.toBeNull();
  });

  it('returns null for unknown tool', () => {
    expect(findMatchingTool('Totally Unknown App XYZ', KNOWN_TOOLS)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(findMatchingTool('', KNOWN_TOOLS)).toBeNull();
  });

  it('returns null for very short input', () => {
    expect(findMatchingTool('ab', KNOWN_TOOLS)).toBeNull();
  });

  it('matches common abbreviations', () => {
    const match = findMatchingTool('Salesforce', KNOWN_TOOLS);
    expect(match).not.toBeNull();
    expect(match!.slug).toBe('salesforce');
  });

  it('matches slug format input', () => {
    const match = findMatchingTool('proton-mail', KNOWN_TOOLS);
    expect(match).not.toBeNull();
    expect(match!.slug).toBe('proton-mail');
  });

  it('matches when query contains tool name', () => {
    const match = findMatchingTool('we use Slack for comms', KNOWN_TOOLS);
    expect(match).not.toBeNull();
    expect(match!.slug).toBe('slack');
  });
});

describe('findMatchingTool refusing a bad guess', () => {
  // An imported tool arrives ticked, costed and risk-scored, so a wrong match
  // is far more expensive than no match: the payee is simply listed for the
  // user to identify instead.

  describe('a vendor brand on its own', () => {
    it('does not read "Amazon" as Amazon Web Services', () => {
      // Roughly £400 a year of shopping used to arrive as a cloud hosting bill
      expect(findMatchingTool('Amazon', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Amazon Marketplace', KNOWN_TOOLS)).toBeNull();
    });

    it('does not pick one product for a vendor that sells many', () => {
      expect(findMatchingTool('Google', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Microsoft', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Meta', KNOWN_TOOLS)).toBeNull();
    });

    it('still names the product when the vendor sells only one', () => {
      expect(findMatchingTool('Anthropic', KNOWN_TOOLS)?.name).toBe('Claude');
      expect(findMatchingTool('Automattic', KNOWN_TOOLS)?.name).toBe('WordPress');
    });

    it('still matches the vendor when the full product is named', () => {
      expect(findMatchingTool('Amazon Web Services', KNOWN_TOOLS)?.name).toBe(
        'Amazon Web Services',
      );
      expect(findMatchingTool('AWS', KNOWN_TOOLS)?.name).toBe('Amazon Web Services');
    });
  });

  describe('a name that merely contains a tool name', () => {
    it('does not read "Xerox" as Xero', () => {
      expect(findMatchingTool('Xerox', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Xerox Ltd', KNOWN_TOOLS)).toBeNull();
    });

    it('does not match on a fragment of a longer word', () => {
      expect(findMatchingTool('Slackline Adventures', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Canvas Credit Union', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Zoominfo', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Boxpark', KNOWN_TOOLS)).toBeNull();
      expect(findMatchingTool('Stripey Co', KNOWN_TOOLS)).toBeNull();
    });

    it('still matches a tool named as a whole word in a longer text', () => {
      expect(findMatchingTool('we use Slack for comms', KNOWN_TOOLS)?.slug).toBe('slack');
    });
  });

  describe('statement shorthand', () => {
    it('reads the code a vendor bills under', () => {
      // Google Workspace has never appeared on a statement as "Google Workspace"
      expect(findMatchingTool('GOOGLE *GSUITE_sunrise', KNOWN_TOOLS)?.name).toBe(
        'Google Workspace',
      );
      expect(findMatchingTool('OFFICE 365', KNOWN_TOOLS)?.name).toBe('Microsoft 365');
    });
  });

  describe('part of a product name', () => {
    it('still resolves a distinctive product word', () => {
      expect(findMatchingTool('Teams', KNOWN_TOOLS)?.name).toBe('Microsoft Teams');
      expect(findMatchingTool('Sheets', KNOWN_TOOLS)?.name).toBe('Google Sheets');
    });
  });
});
