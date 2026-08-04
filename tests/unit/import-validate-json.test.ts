import { describe, it, expect } from 'vitest';
import { validateArchitectureJson } from '@/lib/import/validate-json';

// Minimal valid architecture JSON for testing
function makeValidArchitecture(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Charity',
      type: 'charity',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [],
    externalParties: [],
    dataFlows: [],
    metadata: {
      version: '1.0',
      exportedAt: '2024-01-01T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
    },
    ...overrides,
  };
}

describe('validateArchitectureJson', () => {
  it('should return success for valid architecture JSON', () => {
    const raw = JSON.stringify(makeValidArchitecture());
    const result = validateArchitectureJson(raw);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.organisation.name).toBe('Test Charity');
    }
  });

  it('should return error for invalid JSON string', () => {
    const result = validateArchitectureJson('not json at all {{{');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('valid JSON');
    }
  });

  it('should return error for JSON that is not an object', () => {
    const result = validateArchitectureJson('"just a string"');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('JSON object');
    }
  });

  it('should return error for JSON array', () => {
    const result = validateArchitectureJson('[1, 2, 3]');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('JSON object');
    }
  });

  it('should return Zod errors for wrong shape', () => {
    const result = validateArchitectureJson(JSON.stringify({ foo: 'bar' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Stackmap format');
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    }
  });

  it('should strip computed fields before validation', () => {
    const arch = makeValidArchitecture();
    const withComputed = {
      ...arch,
      costSummary: { totalMonthly: 100 },
      overlaps: [{ a: 'sys-1', b: 'sys-2' }],
      riskSummary: { high: 1 },
    };
    const result = validateArchitectureJson(JSON.stringify(withComputed));
    expect(result.success).toBe(true);
  });

  it('should validate systems with all fields', () => {
    const arch = makeValidArchitecture({
      systems: [
        {
          id: 'sys-1',
          name: 'Salesforce',
          type: 'crm',
          vendor: 'Salesforce',
          hosting: 'cloud',
          status: 'active',
          functionIds: [],
          serviceIds: [],
          cost: { amount: 500, period: 'monthly', model: 'subscription' },
        },
      ],
    });
    const result = validateArchitectureJson(JSON.stringify(arch));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.systems).toHaveLength(1);
      expect(result.data.systems[0].name).toBe('Salesforce');
    }
  });

  it('should reject systems with invalid type', () => {
    const arch = makeValidArchitecture({
      systems: [
        {
          id: 'sys-1',
          name: 'Bad System',
          type: 'invalid_type',
          hosting: 'cloud',
          status: 'active',
          functionIds: [],
          serviceIds: [],
        },
      ],
    });
    const result = validateArchitectureJson(JSON.stringify(arch));
    expect(result.success).toBe(false);
  });
});
