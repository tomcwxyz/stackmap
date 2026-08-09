import { describe, it, expect } from 'vitest';
import { EXAMPLE_MAPS, buildExample, findExample } from '@/lib/examples';
import { ArchitectureSchema } from '@/lib/schema';
import { buildRopa } from '@/lib/report/ropa';
import { findDuplication } from '@/lib/analysis/duplication';
import { findRenewals } from '@/lib/analysis/renewals';
import { generateMermaidDiagram } from '@/lib/diagram/mermaid';

describe('example maps', () => {
  it('offers more than one, so the shape of an organisation is not fixed', () => {
    expect(EXAMPLE_MAPS.length).toBeGreaterThanOrEqual(3);
  });

  it('has a unique id for each', () => {
    const ids = EXAMPLE_MAPS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('returns nothing for an id it does not know', () => {
    expect(buildExample('not-an-example')).toBeNull();
    expect(findExample('not-an-example')).toBeUndefined();
  });

  describe.each(EXAMPLE_MAPS)('$name', (example) => {
    const arch = example.build();

    it('is a valid map, so it loads like any other', () => {
      const result = ArchitectureSchema.safeParse(arch);
      expect(result.success).toBe(true);
    });

    it('names the organisation', () => {
      expect(arch.organisation.name).toBe(example.name);
    });

    it('is worth looking at — enough systems to fill the views', () => {
      expect(arch.systems.length).toBeGreaterThanOrEqual(10);
      expect(arch.functions.length).toBeGreaterThanOrEqual(4);
    });

    it('files every system under a function', () => {
      // An example that lands in "Other systems" would teach the wrong lesson
      const functionIds = new Set(arch.functions.map((f) => f.id));
      for (const system of arch.systems) {
        expect(system.functionIds.length).toBeGreaterThan(0);
        for (const id of system.functionIds) {
          expect(functionIds.has(id)).toBe(true);
        }
      }
    });

    it('points every reference at something that exists', () => {
      const systemIds = new Set(arch.systems.map((s) => s.id));
      const ownerIds = new Set(arch.owners.map((o) => o.id));
      const serviceIds = new Set(arch.services.map((s) => s.id));
      const partyIds = new Set(arch.externalParties.map((p) => p.id));
      const categoryIds = new Set(arch.dataCategories.map((d) => d.id));

      for (const system of arch.systems) {
        if (system.ownerId) expect(ownerIds.has(system.ownerId)).toBe(true);
        for (const id of system.serviceIds) expect(serviceIds.has(id)).toBe(true);
      }
      for (const integration of arch.integrations) {
        expect(systemIds.has(integration.sourceSystemId)).toBe(true);
        expect(systemIds.has(integration.targetSystemId)).toBe(true);
      }
      for (const category of arch.dataCategories) {
        for (const id of category.systemIds) expect(systemIds.has(id)).toBe(true);
      }
      for (const flow of arch.dataFlows) {
        expect(systemIds.has(flow.systemId)).toBe(true);
        expect(partyIds.has(flow.partyId)).toBe(true);
        for (const id of flow.dataCategoryIds) expect(categoryIds.has(id)).toBe(true);
      }
      for (const service of arch.services) {
        for (const id of service.systemIds) expect(systemIds.has(id)).toBe(true);
      }
    });

    it('has costs and importance, so the analysis views say something', () => {
      expect(arch.systems.some((s) => s.cost)).toBe(true);
      expect(arch.systems.some((s) => s.importance !== undefined)).toBe(true);
    });

    it('has personal data, so the data protection record is not empty', () => {
      const report = buildRopa(arch);
      expect(report.entries.length).toBeGreaterThan(0);
    });

    it('leaves something unfinished, because real maps are', () => {
      // A tidy example demonstrates the views working and nothing else
      const report = buildRopa(arch);
      expect(report.entries.some((e) => e.missing.length > 0)).toBe(true);
    });

    it('draws as a diagram without falling over', () => {
      const diagram = generateMermaidDiagram(arch);
      expect(diagram).toContain('graph TB');
      expect(diagram.split('\n').length).toBeGreaterThan(10);
    });

    it('has a contract renewal coming up', () => {
      expect(findRenewals(arch.systems).upcoming.length).toBeGreaterThan(0);
    });
  });

  describe('what each one is there to show', () => {
    it('Riverside has two tools doing the same job', () => {
      const arch = buildExample('riverside-advice')!;
      expect(findDuplication(arch.systems, arch.functions).length).toBeGreaterThan(0);
    });

    it('Green Futures is mapped by service', () => {
      const arch = buildExample('green-futures')!;
      expect(arch.metadata.mappingPath).toBe('service_first');
      expect(arch.services.length).toBeGreaterThan(0);
    });

    it('Northfield uses the council function set', () => {
      const arch = buildExample('northfield-council')!;
      expect(arch.organisation.type).toBe('council');
      expect(arch.functions.some((f) => f.name === 'Revenues & Benefits')).toBe(true);
    });

    it('somewhere shows data leaving the UK', () => {
      const anyInternational = EXAMPLE_MAPS.some((example) =>
        buildRopa(example.build()).entries.some((e) => e.hasInternationalTransfer),
      );
      expect(anyInternational).toBe(true);
    });

    it('somewhere shows a tool nobody agreed to', () => {
      const anyShadow = EXAMPLE_MAPS.some((example) =>
        example.build().systems.some((s) => s.isShadow),
      );
      expect(anyShadow).toBe(true);
    });

    it('somewhere shows a connection that keeps breaking', () => {
      const anyFragile = EXAMPLE_MAPS.some((example) =>
        example.build().integrations.some((i) => i.reliability === 'fragile'),
      );
      expect(anyFragile).toBe(true);
    });
  });
});
