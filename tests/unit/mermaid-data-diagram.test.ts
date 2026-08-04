import { describe, it, expect } from 'vitest';
import { generateDataFlowDiagram } from '@/lib/diagram/mermaid';
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

describe('generateDataFlowDiagram', () => {
  it('generates Mermaid syntax with data categories as edge labels', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
        { id: 's2', name: 'Email', type: 'email', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
      integrations: [
        { id: 'i1', sourceSystemId: 's1', targetSystemId: 's2', type: 'api', direction: 'one_way', frequency: 'real_time', reliability: 'reliable' },
      ],
      dataCategories: [
        { id: 'dc1', name: 'Client contacts', sensitivity: 'confidential', containsPersonalData: true, systemIds: ['s1', 's2'] },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    expect(result).toContain('graph TB');
    expect(result).toContain('s1[CRM]');
    expect(result).toContain('s2[Email]');
    expect(result).toContain('Client contacts');
  });

  it('colours systems by highest sensitivity', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
      dataCategories: [
        { id: 'dc1', name: 'Public info', sensitivity: 'public', containsPersonalData: false, systemIds: ['s1'] },
        { id: 'dc2', name: 'Client data', sensitivity: 'confidential', containsPersonalData: true, systemIds: ['s1'] },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    expect(result).toContain('class s1 confidential');
    // Should not contain 'class s1 public' — confidential wins
    expect(result).not.toContain('class s1 public');
  });

  it('falls back to integration label when no data category matches', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
        { id: 's2', name: 'Email', type: 'email', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
      integrations: [
        { id: 'i1', sourceSystemId: 's1', targetSystemId: 's2', type: 'api', direction: 'one_way', frequency: 'real_time', description: 'Sync contacts', reliability: 'reliable' },
      ],
      dataCategories: [
        // Data category only on s1, not on s2 — no match for the edge
        { id: 'dc1', name: 'Client contacts', sensitivity: 'confidential', containsPersonalData: true, systemIds: ['s1'] },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    // Falls back to the integration description
    expect(result).toContain('Sync contacts');
  });

  it('returns basic diagram with systems only when no integrations', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
        { id: 's2', name: 'Email', type: 'email', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    expect(result).toContain('graph TB');
    expect(result).toContain('s1[CRM]');
    expect(result).toContain('s2[Email]');
    expect(result).not.toContain('-->');
  });

  it('renders two-way integrations with bidirectional arrows', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
        { id: 's2', name: 'Email', type: 'email', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
      integrations: [
        { id: 'i1', sourceSystemId: 's1', targetSystemId: 's2', type: 'api', direction: 'two_way', frequency: 'real_time', reliability: 'reliable' },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    expect(result).toContain('<-->');
  });

  it('defines sensitivity class styles', () => {
    const arch: Architecture = {
      ...createBlankArchitecture(),
      systems: [
        { id: 's1', name: 'CRM', type: 'crm', hosting: 'cloud', status: 'active', functionIds: [], serviceIds: [] },
      ],
    };

    const result = generateDataFlowDiagram(arch);
    expect(result).toContain('classDef public');
    expect(result).toContain('classDef internal');
    expect(result).toContain('classDef confidential');
    expect(result).toContain('classDef restricted');
  });
});
