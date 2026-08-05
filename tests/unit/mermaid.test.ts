import { describe, it, expect } from 'vitest';
import {
  generateMermaidDiagram,
  generateSystemDiagram,
  generateFunctionDiagram,
  generateDataFlowDiagram,
  generateServiceDiagram,
  sanitiseLabel,
} from '@/lib/diagram/mermaid';
import type { Architecture } from '@/lib/types';

// ─── Test helpers ───

function createBlankArchitecture(): Architecture {
  return {
    organisation: {
      id: 'org-1',
      name: 'Test Org',
      type: 'charity',
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
      exportedAt: '2025-01-01T00:00:00Z',
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
      },
      {
        id: 'sys-2',
        name: 'Excel Spreadsheet',
        type: 'spreadsheet',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
      },
      {
        id: 'sys-3',
        name: 'Microsoft 365',
        type: 'email',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-2'],
        serviceIds: [],
      },
    ],
    dataCategories: [
      {
        id: 'dc-1',
        name: 'Financial Records',
        sensitivity: 'confidential',
        containsPersonalData: false,
        systemIds: ['sys-1'],
      },
    ],
    integrations: [
      {
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'file_transfer',
        direction: 'one_way',
        frequency: 'scheduled',
        description: 'CSV export',
        reliability: 'reliable',
      },
      {
        id: 'int-2',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-3',
        type: 'api',
        direction: 'two_way',
        frequency: 'real_time',
        description: 'API sync',
        reliability: 'reliable',
      },
    ],
  };
}

// ─── sanitiseLabel ───

describe('sanitiseLabel', () => {
  it('removes parentheses', () => {
    expect(sanitiseLabel('System (v2)')).toBe('System v2');
  });

  it('removes quotes', () => {
    expect(sanitiseLabel('The "Best" System')).toBe('The Best System');
  });

  it('removes single quotes', () => {
    expect(sanitiseLabel("It's a system")).toBe('Its a system');
  });

  it('removes semicolons', () => {
    expect(sanitiseLabel('Node; label')).toBe('Node label');
  });

  it('removes curly braces', () => {
    expect(sanitiseLabel('System {internal}')).toBe('System internal');
  });

  it('handles strings with multiple special characters', () => {
    expect(sanitiseLabel('Xero (Finance) "Pro"')).toBe('Xero Finance Pro');
  });

  it('trims whitespace', () => {
    expect(sanitiseLabel('  System  ')).toBe('System');
  });

  it('collapses multiple spaces', () => {
    expect(sanitiseLabel('Hello   World')).toBe('Hello World');
  });

  it('removes angle brackets so markup cannot reach the rendered SVG', () => {
    expect(sanitiseLabel('<img src=x onerror=alert(1)>')).toBe('img src=x onerror=alert1');
    expect(sanitiseLabel('<script>alert(1)</script>')).toBe('scriptalert1/script');
  });
});

// ─── Subgraph identifiers ───

describe('subgraph identifiers', () => {
  it('gives each function its own id even when names repeat', () => {
    const arch = createBlankArchitecture();
    arch.functions = [
      { id: 'fn-1', name: 'Advice', type: 'custom', isActive: true },
      { id: 'fn-2', name: 'Advice', type: 'custom', isActive: true },
    ];

    const result = generateMermaidDiagram(arch);

    expect(result).toContain('subgraph fn_0["Advice"]');
    expect(result).toContain('subgraph fn_1["Advice"]');
  });

  it('does not use a reserved word as a subgraph id', () => {
    const arch = createBlankArchitecture();
    arch.functions = [{ id: 'fn-1', name: 'end', type: 'custom', isActive: true }];

    const result = generateMermaidDiagram(arch);

    expect(result).toContain('subgraph fn_0["end"]');
    expect(result).not.toContain('subgraph end');
  });

  it('falls back to a placeholder when a name sanitises away entirely', () => {
    const arch = createBlankArchitecture();
    arch.functions = [{ id: 'fn-1', name: '{}', type: 'custom', isActive: true }];
    arch.systems = [
      {
        id: 'sys-1',
        name: '<>',
        type: 'other',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
      },
    ];

    const result = generateMermaidDiagram(arch);

    expect(result).toContain('subgraph fn_0["Untitled"]');
    expect(result).toContain('sys-1[Unnamed system]');
  });
});

// ─── generateMermaidDiagram ───

describe('generateMermaidDiagram', () => {
  it('produces valid minimal diagram for empty architecture', () => {
    const arch = createBlankArchitecture();
    const result = generateMermaidDiagram(arch);
    expect(result).toContain('graph TB');
    // Should be valid Mermaid (no syntax errors) — at least starts correctly
    expect(result.trim().startsWith('graph TB')).toBe(true);
  });

  it('places systems in correct function subgraphs', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMermaidDiagram(arch);

    // Finance subgraph should contain Xero and Excel
    expect(result).toContain('["Finance"]');
    expect(result).toContain('["Operations"]');

    // Check systems appear as nodes
    expect(result).toMatch(/sys-1\[.*Xero.*\]/);
    expect(result).toMatch(/sys-2\[.*Excel Spreadsheet.*\]/);
    expect(result).toMatch(/sys-3\[.*Microsoft 365.*\]/);
  });

  it('renders integrations as edges with labels', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMermaidDiagram(arch);

    // One-way integration: source --> target
    expect(result).toContain('sys-1 -->');
    expect(result).toContain('CSV export');

    // Two-way integration: source <--> target
    expect(result).toContain('sys-1 <-->');
    expect(result).toContain('API sync');
  });

  it('represents one-way direction with single arrow', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMermaidDiagram(arch);

    // The CSV export integration is one_way
    const csvLine = result.split('\n').find((l) => l.includes('CSV export'));
    expect(csvLine).toBeDefined();
    expect(csvLine).toContain('-->');
    expect(csvLine).not.toContain('<-->');
  });

  it('represents two-way direction with bidirectional arrow', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMermaidDiagram(arch);

    // The API sync integration is two_way
    const apiLine = result.split('\n').find((l) => l.includes('API sync'));
    expect(apiLine).toBeDefined();
    expect(apiLine).toContain('<-->');
  });

  it('sanitises special characters in system names', () => {
    const arch = createBlankArchitecture();
    arch.functions = [{ id: 'fn-1', name: 'Finance (Core)', type: 'finance', isActive: true }];
    arch.systems = [
      {
        id: 'sys-1',
        name: 'Xero "Accounting"',
        type: 'finance',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: [],
      },
    ];
    const result = generateMermaidDiagram(arch);
    // Should not contain raw quotes or parentheses in labels
    expect(result).not.toContain('"Accounting"');
    expect(result).not.toContain('(Core)');
    expect(result).toContain('Xero Accounting');
    expect(result).toContain('Finance Core');
  });

  it('includes data category annotations on systems', () => {
    const arch = createPopulatedArchitecture();
    const result = generateMermaidDiagram(arch);

    // Xero (sys-1) has Financial Records data category
    // Should appear as annotation/note
    expect(result).toContain('Financial Records');
  });

  it('handles systems with multiple function assignments', () => {
    const arch = createBlankArchitecture();
    arch.functions = [
      { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
      { id: 'fn-2', name: 'Operations', type: 'operations', isActive: true },
    ];
    arch.systems = [
      {
        id: 'sys-1',
        name: 'Shared System',
        type: 'other',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1', 'fn-2'],
        serviceIds: [],
      },
    ];
    const result = generateMermaidDiagram(arch);
    // System should appear in both subgraphs (referenced)
    // At minimum it should appear in the first function's subgraph
    expect(result).toContain('sys-1');
  });

  it('handles systems with no function assignment', () => {
    const arch = createBlankArchitecture();
    arch.systems = [
      {
        id: 'sys-1',
        name: 'Orphan System',
        type: 'other',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      },
    ];
    const result = generateMermaidDiagram(arch);
    // Orphan systems should still appear
    expect(result).toContain('sys-1');
    expect(result).toContain('Orphan System');
  });
});

// ─── generateSystemDiagram ───

describe('generateSystemDiagram', () => {
  it('produces valid diagram for empty architecture', () => {
    const arch = createBlankArchitecture();
    const result = generateSystemDiagram(arch);
    expect(result).toContain('graph TB');
  });

  it('shows systems as nodes and integrations as edges', () => {
    const arch = createPopulatedArchitecture();
    const result = generateSystemDiagram(arch);

    // Systems as nodes (flat, no subgraphs required)
    expect(result).toMatch(/sys-1\[.*Xero.*\]/);
    expect(result).toMatch(/sys-2\[.*Excel Spreadsheet.*\]/);
    expect(result).toMatch(/sys-3\[.*Microsoft 365.*\]/);

    // Edges
    expect(result).toContain('-->');
  });

  it('does not include function subgraphs', () => {
    const arch = createPopulatedArchitecture();
    const result = generateSystemDiagram(arch);
    expect(result).not.toContain('subgraph');
  });
});

// ─── generateFunctionDiagram ───

describe('generateFunctionDiagram', () => {
  it('produces valid diagram for empty architecture', () => {
    const arch = createBlankArchitecture();
    const result = generateFunctionDiagram(arch);
    expect(result).toContain('graph TB');
  });

  it('shows functions as subgraphs with systems inside', () => {
    const arch = createPopulatedArchitecture();
    const result = generateFunctionDiagram(arch);

    expect(result).toContain('["Finance"]');
    expect(result).toContain('["Operations"]');
    expect(result).toMatch(/sys-1\[.*Xero.*\]/);
  });

  it('does not include integration edges', () => {
    const arch = createPopulatedArchitecture();
    const result = generateFunctionDiagram(arch);
    // Function diagram focuses on grouping, not connections
    expect(result).not.toContain('-->');
    expect(result).not.toContain('<-->');
  });
});

// ─── Services in diagrams ───

describe('generateMermaidDiagram — services', () => {
  it('renders services as a subgraph when present', () => {
    const arch = createPopulatedArchitecture();
    arch.services = [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: ['fn-1'],
        systemIds: ['sys-1', 'sys-3'],
      },
    ];
    const result = generateMermaidDiagram(arch);
    expect(result).toContain('["Services"]');
    expect(result).toContain('svc-1[Advice sessions]');
    // Dashed arrows from service to systems
    expect(result).toContain('svc-1 -.-> sys-1');
    expect(result).toContain('svc-1 -.-> sys-3');
  });

  it('renders owner annotations for systems with an owner', () => {
    const arch = createPopulatedArchitecture();
    arch.owners = [
      { id: 'own-1', name: 'Sarah Jones', role: 'Finance Manager', isExternal: false },
    ];
    arch.systems[0].ownerId = 'own-1';
    const result = generateMermaidDiagram(arch);
    expect(result).toContain('sys-1_owner[/Sarah Jones/]');
    expect(result).toContain('sys-1 -.- sys-1_owner');
  });

  it('includes cost in system labels when cost data exists', () => {
    const arch = createPopulatedArchitecture();
    arch.systems[0].cost = { amount: 30, period: 'monthly', model: 'subscription' };
    const result = generateMermaidDiagram(arch);
    // £30/month = £360/yr
    expect(result).toMatch(/sys-1\[Xero - £360\/yr\]/);
  });
});

// ─── generateServiceDiagram ───

describe('generateServiceDiagram', () => {
  it('produces valid diagram for empty architecture', () => {
    const arch = createBlankArchitecture();
    const result = generateServiceDiagram(arch);
    expect(result).toContain('graph TB');
  });

  it('groups systems under service subgraphs', () => {
    const arch = createPopulatedArchitecture();
    arch.services = [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: [],
        systemIds: ['sys-1', 'sys-2'],
      },
    ];
    const result = generateServiceDiagram(arch);
    expect(result).toContain('["Advice sessions"]');
    expect(result).toMatch(/sys-1\[.*Xero.*\]/);
    expect(result).toMatch(/sys-2\[.*Excel Spreadsheet.*\]/);
  });

  it('places unlinked systems in Other subgraph', () => {
    const arch = createPopulatedArchitecture();
    arch.services = [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: [],
        systemIds: ['sys-1'],
      },
    ];
    const result = generateServiceDiagram(arch);
    expect(result).toContain('["Other"]');
    // sys-2 and sys-3 not linked to any service
    expect(result).toMatch(/sys-2\[.*Excel Spreadsheet.*\]/);
    expect(result).toMatch(/sys-3\[.*Microsoft 365.*\]/);
  });
});

// ─── Shadow system exclusion ───

describe('shadow system exclusion', () => {
  function createArchWithShadow(): Architecture {
    const arch = createPopulatedArchitecture();
    arch.systems.push({
      id: 'sys-shadow',
      name: 'Personal Trello',
      type: 'other',
      hosting: 'cloud',
      status: 'active',
      functionIds: ['fn-1'],
      serviceIds: [],
      isShadow: true,
    });
    return arch;
  }

  it('excludes shadow systems from main diagram', () => {
    const arch = createArchWithShadow();
    const result = generateMermaidDiagram(arch);
    expect(result).not.toContain('Personal Trello');
    expect(result).not.toContain('sys-shadow');
    // Non-shadow systems still present
    expect(result).toContain('Xero');
  });

  it('excludes shadow systems from system diagram', () => {
    const arch = createArchWithShadow();
    const result = generateSystemDiagram(arch);
    expect(result).not.toContain('Personal Trello');
    expect(result).not.toContain('sys-shadow');
    expect(result).toContain('Xero');
  });

  it('excludes shadow systems from function diagram', () => {
    const arch = createArchWithShadow();
    const result = generateFunctionDiagram(arch);
    expect(result).not.toContain('Personal Trello');
    expect(result).not.toContain('sys-shadow');
    expect(result).toContain('Xero');
  });

  it('excludes shadow systems from data flow diagram', () => {
    const arch = createArchWithShadow();
    const result = generateDataFlowDiagram(arch);
    expect(result).not.toContain('Personal Trello');
    expect(result).not.toContain('sys-shadow');
    expect(result).toContain('Xero');
  });

  it('excludes shadow systems from service diagram', () => {
    const arch = createArchWithShadow();
    arch.services = [
      {
        id: 'svc-1',
        name: 'Advice sessions',
        status: 'active',
        functionIds: [],
        systemIds: ['sys-1', 'sys-shadow'],
      },
    ];
    const result = generateServiceDiagram(arch);
    expect(result).not.toContain('Personal Trello');
    expect(result).not.toContain('sys-shadow');
    expect(result).toContain('Xero');
  });
});
