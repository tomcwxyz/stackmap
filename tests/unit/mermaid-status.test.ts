import { describe, it, expect } from 'vitest';
import {
  generateMermaidDiagram,
  generateSystemDiagram,
  generateFunctionDiagram,
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

function archWithStatus(status: 'active' | 'planned' | 'retiring' | 'legacy'): Architecture {
  return {
    ...createBlankArchitecture(),
    functions: [{ id: 'fn-1', name: 'Finance', type: 'finance' as const, isActive: true }],
    systems: [
      {
        id: 's1',
        name: 'Test System',
        type: 'finance' as const,
        hosting: 'cloud' as const,
        status,
        functionIds: ['fn-1'],
        serviceIds: [],
      },
    ],
  };
}

describe('Mermaid status styling', () => {
  describe('generateMermaidDiagram', () => {
    it('always includes status classDef definitions', () => {
      const arch = archWithStatus('active');
      const result = generateMermaidDiagram(arch);
      expect(result).toContain('classDef planned stroke-dasharray:5 5,opacity:0.7');
      expect(result).toContain('classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
      expect(result).toContain('classDef legacy fill:#d1d5db,opacity:0.6');
    });

    it('applies planned class to planned systems', () => {
      const arch = archWithStatus('planned');
      const result = generateMermaidDiagram(arch);
      expect(result).toContain('class s1 planned');
    });

    it('applies retiring class to retiring systems', () => {
      const arch = archWithStatus('retiring');
      const result = generateMermaidDiagram(arch);
      expect(result).toContain('class s1 retiring');
    });

    it('applies legacy class to legacy systems', () => {
      const arch = archWithStatus('legacy');
      const result = generateMermaidDiagram(arch);
      expect(result).toContain('class s1 legacy');
    });

    it('does not apply class to active systems', () => {
      const arch = archWithStatus('active');
      const result = generateMermaidDiagram(arch);
      expect(result).toContain('classDef planned');
      expect(result).not.toContain('class s1');
    });
  });

  describe('generateSystemDiagram', () => {
    it('always includes status classDef definitions', () => {
      const arch = archWithStatus('active');
      const result = generateSystemDiagram(arch);
      expect(result).toContain('classDef planned stroke-dasharray:5 5,opacity:0.7');
      expect(result).toContain('classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
      expect(result).toContain('classDef legacy fill:#d1d5db,opacity:0.6');
    });

    it('applies status classes to non-active systems', () => {
      const arch = archWithStatus('retiring');
      const result = generateSystemDiagram(arch);
      expect(result).toContain('classDef retiring');
      expect(result).toContain('class s1 retiring');
    });
  });

  describe('generateFunctionDiagram', () => {
    it('always includes status classDef definitions', () => {
      const arch = archWithStatus('active');
      const result = generateFunctionDiagram(arch);
      expect(result).toContain('classDef planned stroke-dasharray:5 5,opacity:0.7');
      expect(result).toContain('classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
      expect(result).toContain('classDef legacy fill:#d1d5db,opacity:0.6');
    });

    it('applies status classes to non-active systems', () => {
      const arch = archWithStatus('legacy');
      const result = generateFunctionDiagram(arch);
      expect(result).toContain('class s1 legacy');
    });

    it('does not apply class to active systems', () => {
      const arch = archWithStatus('active');
      const result = generateFunctionDiagram(arch);
      expect(result).not.toContain('class s1');
    });
  });
});
