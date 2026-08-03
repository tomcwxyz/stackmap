import { describe, it, expect } from 'vitest';
import { findAttentionPoints } from '@/lib/report/attention';
import type { Architecture, System } from '@/lib/types';

function system(overrides: Partial<System> & { id: string; name: string }): System {
  return {
    type: 'other',
    hosting: 'cloud',
    status: 'active',
    functionIds: [],
    serviceIds: [],
    ...overrides,
  };
}

function architecture(overrides: Partial<Architecture> = {}): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
      createdAt: '',
      updatedAt: '',
    },
    functions: [],
    services: [],
    systems: [],
    dataCategories: [],
    integrations: [],
    owners: [{ id: 'own-1', name: 'Priya', isExternal: false }],
    metadata: {
      version: '1.0.0',
      exportedAt: '',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
    ...overrides,
  };
}

function ids(arch: Architecture): string[] {
  return findAttentionPoints(arch).map((p) => p.id);
}

describe('findAttentionPoints', () => {
  it('finds nothing in an empty map', () => {
    expect(findAttentionPoints(architecture())).toEqual([]);
  });

  it('finds nothing when everything is owned, costed and healthy', () => {
    const arch = architecture({
      functions: [
        { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      ],
      systems: [
        system({
          id: 's1',
          name: 'Xero',
          importance: 9,
          ownerId: 'own-1',
          functionIds: ['fn-1'],
          cost: { amount: 400, period: 'annual', model: 'subscription' },
        }),
        system({
          id: 's2',
          name: 'Excel',
          importance: 5,
          ownerId: 'own-1',
          functionIds: ['fn-1'],
          cost: { amount: 0, period: 'annual', model: 'free' },
        }),
      ],
    });

    expect(findAttentionPoints(arch)).toEqual([]);
  });

  describe('ownership', () => {
    it('flags a core system with no owner', () => {
      const arch = architecture({
        systems: [
          system({ id: 's1', name: 'Salesforce', importance: 9, cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        ],
      });

      const point = findAttentionPoints(arch).find((p) => p.id === 'core-unowned');
      expect(point?.severity).toBe('high');
      expect(point?.title).toMatch(/a critical system has no named owner/i);
      expect(point?.detail).toBe('Salesforce');
    });

    it('does not flag a peripheral system with no owner', () => {
      const arch = architecture({
        systems: [
          system({ id: 's1', name: 'Canva', importance: 2, cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        ],
      });

      expect(ids(arch)).not.toContain('core-unowned');
    });

    it('pluralises when several are unowned', () => {
      const arch = architecture({
        systems: [
          system({ id: 's1', name: 'A', importance: 9, cost: { amount: 1, period: 'annual', model: 'subscription' } }),
          system({ id: 's2', name: 'B', importance: 10, cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        ],
      });

      const point = findAttentionPoints(arch).find((p) => p.id === 'core-unowned');
      expect(point?.title).toMatch(/2 critical systems have no named owner/i);
    });

    it('ignores systems that are being retired', () => {
      const arch = architecture({
        systems: [
          system({ id: 's1', name: 'Old CRM', importance: 9, status: 'retiring' }),
        ],
      });

      expect(ids(arch)).not.toContain('core-unowned');
    });
  });

  it('flags a critical tool that is informal', () => {
    const arch = architecture({
      systems: [
        system({
          id: 's1',
          name: 'WhatsApp',
          importance: 9,
          isShadow: true,
          ownerId: 'own-1',
        }),
      ],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'core-shadow');
    expect(point?.severity).toBe('high');
    expect(point?.detail).toBe('WhatsApp');
  });

  it('flags fragile connections by the systems they join', () => {
    const arch = architecture({
      systems: [
        system({ id: 's1', name: 'Xero', ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        system({ id: 's2', name: 'Excel', ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
      ],
      integrations: [
        {
          id: 'i1',
          sourceSystemId: 's1',
          targetSystemId: 's2',
          type: 'manual',
          direction: 'one_way',
          frequency: 'scheduled',
          reliability: 'fragile',
        },
      ],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'fragile-integrations');
    expect(point?.severity).toBe('high');
    expect(point?.detail).toBe('Xero → Excel');
  });

  it('flags an area resting on a single system', () => {
    const arch = architecture({
      functions: [
        { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
        { id: 'fn-2', name: 'Fundraising', type: 'fundraising', isActive: true },
      ],
      systems: [
        system({ id: 's1', name: 'Xero', functionIds: ['fn-1'], ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        system({ id: 's2', name: 'CRM A', functionIds: ['fn-2'], ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        system({ id: 's3', name: 'CRM B', functionIds: ['fn-2'], ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
      ],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'single-system-functions');
    expect(point?.detail).toBe('Finance');
  });

  it('flags personal data on an unowned system', () => {
    const arch = architecture({
      systems: [
        system({ id: 's1', name: 'Case notes sheet', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
      ],
      dataCategories: [
        {
          id: 'dc-1',
          name: 'Client records',
          sensitivity: 'restricted',
          containsPersonalData: true,
          systemIds: ['s1'],
        },
      ],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'personal-data-unowned');
    expect(point?.severity).toBe('high');
    expect(point?.detail).toBe('Case notes sheet');
  });

  it('flags legacy and retiring systems together', () => {
    const arch = architecture({
      systems: [
        system({ id: 's1', name: 'Access DB', status: 'legacy', ownerId: 'own-1', cost: { amount: 1, period: 'annual', model: 'subscription' } }),
        system({ id: 's2', name: 'Old CRM', status: 'retiring', ownerId: 'own-1' }),
      ],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'ageing-systems');
    expect(point?.severity).toBe('medium');
    expect(point?.detail).toBe('Access DB, Old CRM');
  });

  it('warns that the cost total is understated when systems are uncosted', () => {
    const arch = architecture({
      systems: [system({ id: 's1', name: 'Mystery tool', ownerId: 'own-1' })],
    });

    const point = findAttentionPoints(arch).find((p) => p.id === 'uncosted-systems');
    expect(point?.detail).toMatch(/lower than what you actually spend/i);
    expect(point?.detail).toMatch(/Mystery tool/);
  });

  it('does not count shadow tools as missing cost data', () => {
    const arch = architecture({
      systems: [system({ id: 's1', name: 'WhatsApp', isShadow: true, ownerId: 'own-1' })],
    });

    expect(ids(arch)).not.toContain('uncosted-systems');
  });

  describe('contract renewals', () => {
    /** Far enough ahead that it never lands inside the 90-day window. */
    function farFuture(): string {
      const date = new Date();
      date.setUTCFullYear(date.getUTCFullYear() + 2);
      return date.toISOString().slice(0, 10);
    }

    function daysFromNow(days: number): string {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() + days);
      return date.toISOString().slice(0, 10);
    }

    it('flags a contract whose notice deadline has already passed', () => {
      const arch = architecture({
        systems: [
          system({
            id: 's1',
            name: 'Salesforce',
            ownerId: 'own-1',
            cost: { amount: 1, period: 'annual', model: 'subscription' },
            renewalDate: daysFromNow(20),
            noticePeriodDays: 90,
          }),
        ],
      });

      const point = findAttentionPoints(arch).find((p) => p.id === 'notice-deadline-passed');
      expect(point?.severity).toBe('high');
      expect(point?.title).toMatch(/will auto-renew/i);
      expect(point?.detail).toMatch(/Salesforce/);
    });

    it('flags contracts renewing inside 90 days', () => {
      const arch = architecture({
        systems: [
          system({
            id: 's1',
            name: 'Xero',
            ownerId: 'own-1',
            cost: { amount: 1, period: 'annual', model: 'subscription' },
            renewalDate: daysFromNow(30),
          }),
        ],
      });

      const point = findAttentionPoints(arch).find((p) => p.id === 'renewing-soon');
      expect(point?.severity).toBe('medium');
      expect(point?.detail).toMatch(/Xero/);
    });

    it('does not raise a renewal that is a long way off', () => {
      const arch = architecture({
        systems: [
          system({
            id: 's1',
            name: 'Xero',
            ownerId: 'own-1',
            cost: { amount: 1, period: 'annual', model: 'subscription' },
            renewalDate: farFuture(),
          }),
        ],
      });

      expect(ids(arch)).not.toContain('renewing-soon');
    });

    it('raises a missed deadline once, not also as renewing soon', () => {
      const arch = architecture({
        systems: [
          system({
            id: 's1',
            name: 'Salesforce',
            ownerId: 'own-1',
            cost: { amount: 1, period: 'annual', model: 'subscription' },
            renewalDate: daysFromNow(20),
            noticePeriodDays: 90,
          }),
        ],
      });

      expect(ids(arch)).toContain('notice-deadline-passed');
      expect(ids(arch)).not.toContain('renewing-soon');
    });
  });

  it('puts the most serious findings first', () => {
    const arch = architecture({
      systems: [
        system({ id: 's1', name: 'Access DB', status: 'legacy', ownerId: 'own-1' }),
        system({ id: 's2', name: 'Salesforce', importance: 9 }),
      ],
    });

    const points = findAttentionPoints(arch);
    expect(points[0].severity).toBe('high');
    expect(points[points.length - 1].severity).toBe('medium');
  });
});
