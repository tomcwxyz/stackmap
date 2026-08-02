import { describe, it, expect } from 'vitest';
import { csvRowsToArchitecture } from '@/lib/import/csv-to-architecture';
import { SCHEMA_VERSION, STACKMAP_VERSION } from '@/lib/version';
import type { CsvSystemRow } from '@/lib/import';

describe('csvRowsToArchitecture', () => {
  it('creates systems with correct fields from rows', () => {
    const rows: CsvSystemRow[] = [
      {
        name: 'Xero',
        vendor: 'Xero',
        matchedType: 'finance',
        matchedFunction: 'finance',
        cost: 400,
        costPeriod: 'annual',
        completeness: 'full',
      },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.systems.length).toBe(1);
    expect(arch.systems[0].name).toBe('Xero');
    expect(arch.systems[0].type).toBe('finance');
    expect(arch.systems[0].vendor).toBe('Xero');
    expect(arch.systems[0].cost?.amount).toBe(400);
    expect(arch.systems[0].cost?.period).toBe('annual');
    expect(arch.systems[0].cost?.model).toBe('subscription');
  });

  it('deduplicates functions for same StandardFunction', () => {
    const rows: CsvSystemRow[] = [
      {
        name: 'Xero',
        matchedType: 'finance',
        matchedFunction: 'finance',
        completeness: 'partial',
      },
      {
        name: 'QuickBooks',
        matchedType: 'finance',
        matchedFunction: 'finance',
        completeness: 'partial',
      },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.functions.length).toBe(1);
    expect(arch.functions[0].name).toBe('Finance');
    expect(arch.systems[0].functionIds[0]).toBe(arch.functions[0].id);
    expect(arch.systems[1].functionIds[0]).toBe(arch.functions[0].id);
  });

  it('leaves systems unassigned when no function matched', () => {
    const rows: CsvSystemRow[] = [
      { name: 'Random', matchedType: 'other', completeness: 'minimal' },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.systems[0].functionIds).toEqual([]);
    expect(arch.functions.length).toBe(0);
  });

  it('uses sensible defaults for missing fields', () => {
    const rows: CsvSystemRow[] = [
      { name: 'Mystery', matchedType: 'other', completeness: 'minimal' },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.systems[0].status).toBe('active');
    expect(arch.systems[0].hosting).toBe('unknown');
    expect(arch.systems[0].cost).toBeUndefined();
  });

  it('populates organisation metadata correctly', () => {
    const rows: CsvSystemRow[] = [
      { name: 'Slack', matchedType: 'messaging', completeness: 'minimal' },
    ];
    const arch = csvRowsToArchitecture(rows, 'My Charity', 'charity');
    expect(arch.organisation.name).toBe('My Charity');
    expect(arch.organisation.type).toBe('charity');
    expect(arch.metadata.version).toBe(SCHEMA_VERSION);
    expect(arch.metadata.stackmapVersion).toBe(STACKMAP_VERSION);
    expect(arch.metadata.mappingPath).toBe('function_first');
    expect(arch.services).toEqual([]);
    expect(arch.dataCategories).toEqual([]);
    expect(arch.integrations).toEqual([]);
    expect(arch.owners).toEqual([]);
  });

  it('creates distinct functions for different StandardFunctions', () => {
    const rows: CsvSystemRow[] = [
      {
        name: 'Xero',
        matchedType: 'finance',
        matchedFunction: 'finance',
        completeness: 'partial',
      },
      {
        name: 'Slack',
        matchedType: 'messaging',
        matchedFunction: 'communications',
        completeness: 'partial',
      },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.functions.length).toBe(2);
    const fnNames = arch.functions.map((f) => f.name).sort();
    expect(fnNames).toEqual(['Communications', 'Finance']);
  });

  it('auto-scores known tools via TechFreedom matching', () => {
    const rows: CsvSystemRow[] = [
      {
        name: 'Salesforce',
        vendor: 'Salesforce',
        matchedType: 'crm',
        completeness: 'partial',
      },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.systems[0].techFreedomScore).toBeDefined();
    expect(arch.systems[0].techFreedomScore?.isAutoScored).toBe(true);
  });

  it('sets monthly cost period when specified', () => {
    const rows: CsvSystemRow[] = [
      {
        name: 'Slack',
        matchedType: 'messaging',
        cost: 50,
        costPeriod: 'monthly',
        completeness: 'partial',
      },
    ];
    const arch = csvRowsToArchitecture(rows, 'Test Org', 'charity');
    expect(arch.systems[0].cost?.period).toBe('monthly');
  });
});
