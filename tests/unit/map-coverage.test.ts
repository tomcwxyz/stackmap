import { describe, expect, it } from 'vitest';
import { assessMapCoverage } from '@/lib/analysis/map-coverage';
import type { Architecture, System } from '@/lib/types';

function system(overrides: Partial<System> = {}): System {
  return {
    id: 'system-1', name: 'Example', type: 'other', hosting: 'unknown',
    status: 'active', functionIds: [], serviceIds: [], ...overrides,
  };
}

function architecture(overrides: Partial<Architecture> = {}): Architecture {
  return {
    organisation: { id: 'org-1', name: 'Example', type: 'charity', createdAt: '', updatedAt: '' },
    systems: [], functions: [], services: [], dataCategories: [], integrations: [],
    owners: [], externalParties: [], dataFlows: [],
    metadata: { version: '1', exportedAt: '', stackmapVersion: '0.3.0', mappingPath: 'function_first' },
    ...overrides,
  };
}

describe('assessMapCoverage', () => {
  it('does not award an empty map a perfect score', () => {
    const coverage = assessMapCoverage(architecture());
    expect(coverage.total).toBe(0);
    expect(coverage.missing).toBe(0);
  });

  it('does not confuse unknown information with a low risk', () => {
    const coverage = assessMapCoverage(architecture({
      systems: [system()],
      metadata: { version: '1', exportedAt: '', stackmapVersion: '0.3.0', mappingPath: 'function_first', techFreedomEnabled: true },
    }));
    expect(coverage.recorded).toBe(0);
    expect(coverage.missing).toBe(6);
    expect(coverage.checks.find((check) => check.id === 'risk')?.recorded).toBe(0);
  });

  it('counts present information, including an explicitly free system', () => {
    const coverage = assessMapCoverage(architecture({
      owners: [{ id: 'owner-1', name: 'Sam', isExternal: false }],
      functions: [{ id: 'function-1', name: 'Operations', type: 'operations', isActive: true }],
      systems: [system({
        hosting: 'cloud', ownerId: 'owner-1', functionIds: ['function-1'], importance: 8,
        cost: { amount: 0, period: 'annual', model: 'free', source: 'user' },
      })],
    }));
    expect(coverage.recorded).toBe(5);
    expect(coverage.missing).toBe(0);
  });

  it('does not count stale references or pricing estimates as confirmed details', () => {
    const coverage = assessMapCoverage(architecture({
      systems: [system({
        ownerId: 'removed-owner', functionIds: ['removed-function'],
        cost: { amount: 600, period: 'annual', model: 'subscription', source: 'estimate' },
      })],
    }));
    expect(coverage.checks.find((check) => check.id === 'owner')?.recorded).toBe(0);
    expect(coverage.checks.find((check) => check.id === 'function')?.recorded).toBe(0);
    expect(coverage.checks.find((check) => check.id === 'cost')?.recorded).toBe(0);
  });

  it('does not demand complete records for planned or retiring systems', () => {
    const coverage = assessMapCoverage(architecture({
      systems: [system({ status: 'planned' }), system({ id: 'retired', status: 'retiring' })],
    }));
    expect(coverage.total).toBe(0);
  });

  it('checks personal-data records and connection reliability when they exist', () => {
    const coverage = assessMapCoverage(architecture({
      systems: [system()],
      integrations: [{
        id: 'i1', sourceSystemId: 'system-1', targetSystemId: 'missing',
        type: 'manual', direction: 'one_way', frequency: 'unknown', reliability: 'unknown',
      }],
      dataCategories: [{
        id: 'd1', name: 'Client records', sensitivity: 'confidential',
        containsPersonalData: true, systemIds: ['system-1'],
      }],
    }));
    expect(coverage.checks.find((c) => c.id === 'connections')?.recorded).toBe(0);
    expect(coverage.checks.find((c) => c.id === 'personal-data')?.recorded).toBe(0);
  });
});
