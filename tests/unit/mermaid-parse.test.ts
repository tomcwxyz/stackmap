import { describe, it, expect, beforeAll } from 'vitest';
import mermaid from 'mermaid';
import {
  generateMermaidDiagram,
  generateSystemDiagram,
  generateFunctionDiagram,
  generateServiceDiagram,
  generateDataFlowDiagram,
} from '@/lib/diagram/mermaid';
import type { Architecture } from '@/lib/types';

/**
 * Diagram syntax is assembled by string concatenation, so a malformed label or
 * identifier only shows up as a rendering failure in the browser. These tests
 * run the real Mermaid parser over the output instead.
 */

function architecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    functions: [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'fn-2', name: 'Data & reporting', type: 'data_reporting', isActive: true },
    ],
    services: [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: ['fn-1'],
        systemIds: ['sys-1'],
      },
    ],
    systems: [
      {
        id: 'sys-1',
        name: 'Xero (Accounting)',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: ['svc-1'],
        ownerId: 'own-1',
        cost: { amount: 400, period: 'annual', model: 'subscription' },
      },
      {
        id: 'sys-2',
        name: 'Excel; the "real" CRM',
        type: 'spreadsheet',
        hosting: 'cloud',
        status: 'retiring',
        functionIds: ['fn-2'],
        serviceIds: [],
      },
    ],
    dataCategories: [
      {
        id: 'dc-1',
        name: 'Client records',
        sensitivity: 'restricted',
        containsPersonalData: true,
        systemIds: ['sys-1', 'sys-2'],
      },
    ],
    integrations: [
      {
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'manual',
        direction: 'two_way',
        frequency: 'scheduled',
        description: 'Sarah exports it on Tuesdays',
        reliability: 'fragile',
      },
    ],
    owners: [{ id: 'own-1', name: "Sarah O'Brien", isExternal: false }],
    metadata: {
      version: '1.0.0',
      exportedAt: '2026-01-01T00:00:00Z',
      stackmapVersion: '0.3.0',
      mappingPath: 'function_first',
      techFreedomEnabled: false,
    },
  };
}

const GENERATORS = [
  ['full', generateMermaidDiagram],
  ['systems', generateSystemDiagram],
  ['functions', generateFunctionDiagram],
  ['services', generateServiceDiagram],
  ['data flow', generateDataFlowDiagram],
] as const;

describe('generated Mermaid syntax parses', () => {
  beforeAll(() => {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      flowchart: { htmlLabels: false },
    });
  });

  it.each(GENERATORS)('%s diagram is valid', async (_name, generate) => {
    await expect(mermaid.parse(generate(architecture()))).resolves.toBeTruthy();
  });

  it.each(GENERATORS)('%s diagram survives awkward names', async (_name, generate) => {
    const arch = architecture();
    arch.functions[0].name = 'end';
    arch.functions[1].name = 'end';
    arch.systems[0].name = '<script>alert(1)</script>';
    arch.systems[1].name = '{}';
    arch.services[0].name = 'graph';

    await expect(mermaid.parse(generate(arch))).resolves.toBeTruthy();
  });
});
