import { describe, it, expect } from 'vitest';
import { generateMarkdownExport } from '@/lib/export/markdown';
import type { Architecture } from '@/lib/types';

// ─── Test helpers ───

function createBlankArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
      size: 'small',
      staffCount: 10,
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z',
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
      version: '1.0.0',
      exportedAt: '2025-06-15T00:00:00Z',
      stackmapVersion: '0.1.0',
      mappingPath: 'function_first',
    },
  };
}

function createPopulatedArchitecture(): Architecture {
  return {
    ...createBlankArchitecture(),
    functions: [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'fn-2', name: 'Operations', type: 'operations', isActive: true },
    ],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
        ownerId: 'own-1',
        cost: { amount: 30, period: 'monthly', model: 'subscription' },
      },
      {
        id: 'sys-2',
        name: 'Salesforce',
        type: 'crm',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-2'],
        serviceIds: [],
        cost: { amount: 3000, period: 'annual', model: 'subscription' },
      },
      {
        id: 'sys-3',
        name: 'Slack',
        type: 'messaging',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-2'],
        serviceIds: [],
        cost: { amount: 0, period: 'annual', model: 'free' },
      },
    ],
    owners: [
      { id: 'own-1', name: 'Sarah Jones', role: 'Finance Manager', isExternal: false },
    ],
    integrations: [
      {
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'api',
        direction: 'one_way',
        frequency: 'scheduled',
        reliability: 'reliable',
      },
    ],
    dataCategories: [
      {
        id: 'dc-1',
        name: 'Client Records',
        sensitivity: 'confidential',
        containsPersonalData: true,
        systemIds: ['sys-2'],
      },
    ],
    services: [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: ['fn-2'],
        systemIds: ['sys-2'],
      },
    ],
  };
}

// ─── Tests ───

describe('generateMarkdownExport', () => {
  it('generates valid markdown with org name in title', () => {
    const arch = createBlankArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('# Technology Architecture Map: Test Org');
    expect(result).toContain('**Organisation:** Test Org');
  });

  it('includes systems table with columns', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Systems');
    expect(result).toContain('| System | Type | Hosting | Owner | Annual Cost |');
    expect(result).toContain('| Xero |');
    expect(result).toContain('| Salesforce |');
    expect(result).toContain('Sarah Jones');
  });

  it('includes cost summary when cost data present', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Cost Summary');
    expect(result).toContain('**Total annual cost:**');
  });

  it('includes functions table', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Functions');
    expect(result).toContain('| Finance |');
  });

  it('includes services table', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Services');
    expect(result).toContain('| Advice sessions |');
  });

  it('includes integrations table', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Integrations');
    expect(result).toContain('| Xero | Salesforce |');
  });

  it('includes data categories table', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Data Categories');
    expect(result).toContain('| Client Records |');
  });

  it('includes owners table', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Owners');
    expect(result).toContain('| Sarah Jones |');
  });

  it('includes risk summary when techFreedom is enabled', () => {
    const arch = createPopulatedArchitecture();
    arch.metadata.techFreedomEnabled = true;
    arch.systems[1].techFreedomScore = {
      jurisdiction: 4,
      continuity: 2,
      surveillance: 3,
      lockIn: 5,
      costExposure: 5,
      isAutoScored: false,
    };
    const result = generateMarkdownExport(arch);
    expect(result).toContain('## Risk Summary (TechFreedom)');
    expect(result).toContain('| Salesforce |');
    expect(result).toContain('| 19 |');
  });

  it('excludes risk summary when techFreedom is disabled', () => {
    const arch = createPopulatedArchitecture();
    arch.metadata.techFreedomEnabled = false;
    const result = generateMarkdownExport(arch);
    expect(result).not.toContain('## Risk Summary (TechFreedom)');
  });

  it('includes footer with Stackmap link', () => {
    const arch = createBlankArchitecture();
    const result = generateMarkdownExport(arch);
    expect(result).toContain('Generated by [Stackmap](https://stackmap.org)');
  });

  it('shows free systems as Free in cost column', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMarkdownExport(arch);
    // Slack is free
    expect(result).toContain('Free');
  });

  it('includes importance tier table in markdown export', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[0].importance = 9; // Xero -> Core
    arch.systems[1].importance = 5; // Salesforce -> Important
    const md = generateMarkdownExport(arch);
    expect(md).toContain('## Importance');
    expect(md).toContain('| System | Score | Tier |');
    expect(md).toContain('| Xero | 9/10 | Core |');
    expect(md).toContain('| Salesforce | 5/10 | Important |');
  });

  it('sorts importance table by score descending', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[0].importance = 5; // Xero
    arch.systems[1].importance = 9; // Salesforce
    const md = generateMarkdownExport(arch);
    const xeroIdx = md.indexOf('| Xero | 5/10');
    const sfIdx = md.indexOf('| Salesforce | 9/10');
    expect(sfIdx).toBeLessThan(xeroIdx);
  });

  it('derives correct importance tiers', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[0].importance = 8; // Core
    arch.systems[1].importance = 4; // Important
    arch.systems[2].importance = 2; // Peripheral (Slack)
    const md = generateMarkdownExport(arch);
    expect(md).toContain('| Xero | 8/10 | Core |');
    expect(md).toContain('| Salesforce | 4/10 | Important |');
    expect(md).toContain('| Slack | 2/10 | Peripheral |');
  });

  it('excludes importance section when no systems have importance', () => {
    const arch = createPopulatedArchitecture();
    const md = generateMarkdownExport(arch);
    expect(md).not.toContain('## Importance');
  });

  it('excludes shadow systems from importance table', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[0].importance = 9;
    arch.systems[1].importance = 3;
    arch.systems[1].isShadow = true;
    const md = generateMarkdownExport(arch);
    const importanceSection = md.split('## Importance')[1]?.split('##')[0] ?? '';
    expect(importanceSection).toContain('Xero');
    expect(importanceSection).not.toContain('Salesforce');
  });

  it('includes shadow tools table for shadow systems', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[2].isShadow = true; // Slack
    arch.systems[2].importance = 3;
    const md = generateMarkdownExport(arch);
    expect(md).toContain('## Shadow & Informal Tools');
    expect(md).toContain('| Tool | Type | Importance |');
    expect(md).toContain('| Slack | Messaging | 3/10 |');
  });

  it('shows Unscored for shadow tools without importance', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[2].isShadow = true; // Slack
    const md = generateMarkdownExport(arch);
    expect(md).toContain('## Shadow & Informal Tools');
    expect(md).toContain('| Slack | Messaging | Unscored |');
  });

  it('excludes shadow tools section when no shadow systems', () => {
    const arch = createPopulatedArchitecture();
    const md = generateMarkdownExport(arch);
    expect(md).not.toContain('## Shadow & Informal Tools');
  });

  it('handles empty architecture gracefully', () => {
    const arch = createBlankArchitecture();
    const result = generateMarkdownExport(arch);
    // Should not contain section headers for empty collections
    expect(result).not.toContain('## Systems');
    expect(result).not.toContain('## Functions');
    expect(result).not.toContain('## Services');
    // But should still have the header
    expect(result).toContain('# Technology Architecture Map');
  });
});
