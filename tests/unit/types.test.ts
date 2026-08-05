import { describe, it, expect } from 'vitest';
import type {
  Organisation,
  StandardFunction,
  OrgFunction,
  Service,
  System,
  SystemType,
  DataCategory,
  Integration,
  Owner,
  Architecture,
} from '@/lib/types';

describe('Core Types', () => {
  describe('Organisation', () => {
    it('should accept a valid organisation', () => {
      const org: Organisation = {
        id: 'org-1',
        name: 'Test Charity',
        type: 'charity',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      expect(org.id).toBe('org-1');
      expect(org.type).toBe('charity');
    });

    it('should support all organisation types', () => {
      const types: Organisation['type'][] = ['charity', 'social_enterprise', 'council', 'other'];
      expect(types).toHaveLength(4);
    });
  });

  describe('StandardFunction', () => {
    it('should include all 8 standard function types', () => {
      const functions: StandardFunction[] = [
        'finance', 'governance', 'people', 'fundraising',
        'communications', 'service_delivery', 'operations', 'data_reporting',
      ];
      expect(functions).toHaveLength(8);
    });
  });

  describe('OrgFunction', () => {
    it('should accept a standard function type', () => {
      const fn: OrgFunction = {
        id: 'fn-1',
        name: 'Finance',
        type: 'finance',
        isActive: true,
      };
      expect(fn.type).toBe('finance');
      expect(fn.description).toBeUndefined();
    });

    it('should accept custom type with optional description', () => {
      const fn: OrgFunction = {
        id: 'fn-2',
        name: 'Volunteer Management',
        type: 'custom',
        description: 'Managing volunteers',
        isActive: true,
      };
      expect(fn.type).toBe('custom');
      expect(fn.description).toBe('Managing volunteers');
    });
  });

  describe('Service', () => {
    it('should accept a valid service', () => {
      const svc: Service = {
        id: 'svc-1',
        name: 'Youth Mentoring',
        status: 'active',
        functionIds: ['fn-1', 'fn-2'],
        systemIds: [],
      };
      expect(svc.functionIds).toHaveLength(2);
    });

    it('should support all status values', () => {
      const statuses: Service['status'][] = ['active', 'planned', 'retiring'];
      expect(statuses).toHaveLength(3);
    });
  });

  describe('System', () => {
    it('should accept a valid system with all fields', () => {
      const sys: System = {
        id: 'sys-1',
        name: 'Salesforce',
        type: 'crm',
        vendor: 'Salesforce',
        hosting: 'cloud',
        status: 'active',
        functionIds: ['fn-1'],
        serviceIds: ['svc-1'],
        ownerId: 'own-1',
        notes: 'Main CRM',
        url: 'https://salesforce.com',
        cost: {
          amount: 100,
          period: 'monthly',
          model: 'subscription',
        },
      };
      expect(sys.type).toBe('crm');
      expect(sys.cost?.amount).toBe(100);
    });

    it('accepts importance and isShadow on a System', () => {
      const system: System = {
        id: 'sys-1',
        name: 'WhatsApp',
        type: 'messaging',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
        importance: 7,
        isShadow: true,
      };
      expect(system.importance).toBe(7);
      expect(system.isShadow).toBe(true);
    });

    it('should accept a minimal system', () => {
      const sys: System = {
        id: 'sys-2',
        name: 'Spreadsheet',
        type: 'spreadsheet',
        hosting: 'unknown',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      };
      expect(sys.vendor).toBeUndefined();
      expect(sys.cost).toBeUndefined();
    });
  });

  describe('SystemType', () => {
    it('should include all 12 system types', () => {
      const types: SystemType[] = [
        'crm', 'finance', 'hr', 'case_management', 'website',
        'email', 'document_management', 'database', 'spreadsheet',
        'messaging', 'custom', 'other',
      ];
      expect(types).toHaveLength(12);
    });
  });

  describe('DataCategory', () => {
    it('should accept a valid data category', () => {
      const dc: DataCategory = {
        id: 'dc-1',
        name: 'Client Records',
        sensitivity: 'confidential',
        containsPersonalData: true,
        systemIds: ['sys-1'],
      };
      expect(dc.sensitivity).toBe('confidential');
      expect(dc.containsPersonalData).toBe(true);
    });

    it('should support all sensitivity levels', () => {
      const levels: DataCategory['sensitivity'][] = ['public', 'internal', 'confidential', 'restricted'];
      expect(levels).toHaveLength(4);
    });
  });

  describe('Integration', () => {
    it('should accept a valid integration', () => {
      const intg: Integration = {
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'api',
        direction: 'one_way',
        frequency: 'real_time',
        reliability: 'reliable',
      };
      expect(intg.description).toBeUndefined();
    });

    it('should support all integration types', () => {
      const types: Integration['type'][] = [
        'api', 'file_transfer', 'manual', 'webhook', 'database_link', 'unknown',
      ];
      expect(types).toHaveLength(6);
    });
  });

  describe('Owner', () => {
    it('should accept a valid owner', () => {
      const owner: Owner = {
        id: 'own-1',
        name: 'Jane Doe',
        role: 'IT Manager',
        isExternal: false,
        contactInfo: 'jane@example.com',
      };
      expect(owner.isExternal).toBe(false);
    });

    it('should accept minimal owner', () => {
      const owner: Owner = {
        id: 'own-2',
        name: 'External Vendor',
        isExternal: true,
      };
      expect(owner.role).toBeUndefined();
    });
  });

  describe('Architecture', () => {
    it('should accept a complete architecture', () => {
      const arch: Architecture = {
        organisation: {
          id: 'org-1',
          name: 'Test Charity',
          type: 'charity',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
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
          exportedAt: '2024-01-01T00:00:00Z',
          stackmapVersion: '0.1.0',
          mappingPath: 'function_first',
        },
      };
      expect(arch.metadata.mappingPath).toBe('function_first');
      expect(arch.functions).toHaveLength(0);
    });
  });
});
