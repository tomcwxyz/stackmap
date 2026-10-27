import { describe, expect, it } from 'vitest';
import type { Architecture, System } from '@/lib/types';
import { buildExplorerGraph, inspectSystemImpact, relatedNodeIds } from '@/lib/analysis/architecture-explorer';

const system = (id: string, overrides: Partial<System> = {}): System => ({
  id, name: id, type: 'other', status: 'active', hosting: 'cloud',
  functionIds: [], serviceIds: [], ...overrides,
});
function example(): Architecture {
  return {
    organisation: { id: 'org', name: 'Example', type: 'charity', createdAt: '', updatedAt: '' },
    functions: [{ id: 'finance', name: 'Finance', type: 'finance', isActive: true }],
    services: [
      { id: 'advice', name: 'Advice', status: 'active', functionIds: [], systemIds: ['a'] },
      { id: 'other', name: 'Other', status: 'active', functionIds: [], systemIds: ['c'] },
    ],
    systems: [
      system('a', {
        name: 'Source', functionIds: ['finance'], ownerId: 'owner',
        cost: { amount: 12, period: 'monthly', model: 'subscription' },
      }),
      system('b', { name: 'Consumer', serviceIds: ['advice'] }),
      system('c', { name: 'Separate' }),
    ],
    owners: [{ id: 'owner', name: 'Alex', isExternal: false }],
    integrations: [
      { id: 'one', sourceSystemId: 'a', targetSystemId: 'b', direction: 'one_way',
        type: 'api', reliability: 'fragile', frequency: 'scheduled' },
      { id: 'both', sourceSystemId: 'b', targetSystemId: 'c', direction: 'two_way',
        type: 'webhook', reliability: 'unknown', frequency: 'real_time' },
      { id: 'dangling', sourceSystemId: 'missing', targetSystemId: 'a',
        direction: 'one_way', type: 'manual', frequency: 'unknown', reliability: 'unknown' },
    ],
    dataCategories: [{ id: 'clients', name: 'Client details', sensitivity: 'restricted',
      containsPersonalData: true, systemIds: ['a', 'b'] }],
    externalParties: [{ id: 'funder', name: 'Funder', type: 'funder' }],
    dataFlows: [{ id: 'flow', systemId: 'a', partyId: 'funder', dataCategoryIds: ['clients'],
      method: 'portal', frequency: 'annual' }],
    metadata: { version: '1', exportedAt: '', stackmapVersion: '0.3',
      mappingPath: 'function_first', techFreedomEnabled: false },
  };
}

describe('architecture explorer', () => {
  it('has exactly the recorded links, including service links held on either side', () => {
    const graph = buildExplorerGraph(example(), { showData: true });
    expect(graph.systemCount).toBe(3);
    expect(graph.edges.filter((edge) => edge.kind === 'integration')).toHaveLength(2);
    expect(graph.edges.filter((edge) => edge.kind === 'service')).toHaveLength(3);
    expect(graph.edges.filter((edge) => edge.kind === 'data')).toHaveLength(2);
    expect(graph.edges.filter((edge) => edge.kind === 'function')).toHaveLength(1);
  });

  it('does not infer a connection simply because systems share a function or service', () => {
    const arch = example();
    arch.integrations = [];
    const graph = buildExplorerGraph(arch);
    expect(graph.edges.some((edge) => edge.kind === 'integration')).toBe(false);
  });

  it('does not let filtering introduce phantom systems or dangling lines', () => {
    const graph = buildExplorerGraph(example(), { functionId: 'finance', showData: true });
    expect(graph.systemCount).toBe(1);
    expect(graph.totalSystems).toBe(3);
    expect(graph.edges.filter((edge) => edge.kind === 'integration')).toHaveLength(0);
    expect(graph.edges.every((edge) =>
      graph.nodes.some((node) => node.id === edge.source) &&
      graph.nodes.some((node) => node.id === edge.target))).toBe(true);
  });

  it('reports directly recorded service, data, ownership, costs and external sharing', () => {
    const impact = inspectSystemImpact(example(), 'a');
    expect(impact?.owner).toBe('Alex');
    expect(impact?.services).toEqual(['Advice']);
    expect(impact?.functions).toEqual(['Finance']);
    expect(impact?.data).toEqual([{ name: 'Client details', personal: true, sensitivity: 'restricted' }]);
    expect(impact?.recipients).toEqual(['Funder']);
    expect(impact?.annualCost).toBe(144);
    expect(impact?.outgoing.map((c) => c.name)).toEqual(['Consumer']);
    expect(impact?.incoming).toEqual([]);
  });

  it('interprets two-way integrations in both directions, not as confirmed outages', () => {
    const impact = inspectSystemImpact(example(), 'c');
    expect(impact?.incoming.map((c) => c.name)).toEqual(['Consumer']);
    expect(impact?.outgoing.map((c) => c.name)).toEqual(['Consumer']);
    expect(inspectSystemImpact(example(), 'not-found')).toBeNull();
  });

  it('highlights only actual neighbours of a system', () => {
    const graph = buildExplorerGraph(example(), { showData: true });
    const related = relatedNodeIds(graph, 'a');
    expect(related).toContain('system:b');
    expect(related).toContain('service:advice');
    expect(related).not.toContain('system:c');
  });
});
