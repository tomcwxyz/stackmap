import { describe, it, expect } from 'vitest';
import {
  OrganisationSchema,
  OrgFunctionSchema,
  ServiceSchema,
  SystemSchema,
  DataCategorySchema,
  IntegrationSchema,
  OwnerSchema,
  ArchitectureSchema,
  CostSchema,
} from '@/lib/schema';

describe('Zod Schemas', () => {
  describe('OrganisationSchema', () => {
    it('should validate a correct organisation', () => {
      const result = OrganisationSchema.safeParse({
        id: 'org-1',
        name: 'Test Charity',
        type: 'charity',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('should reject an organisation with empty name', () => {
      const result = OrganisationSchema.safeParse({
        id: 'org-1',
        name: '',
        type: 'charity',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject an organisation with invalid type', () => {
      const result = OrganisationSchema.safeParse({
        id: 'org-1',
        name: 'Test',
        type: 'invalid_type',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const result = OrganisationSchema.safeParse({
        id: 'org-1',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OrgFunctionSchema', () => {
    it('should validate a standard function', () => {
      const result = OrgFunctionSchema.safeParse({
        id: 'fn-1',
        name: 'Finance',
        type: 'finance',
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate a custom function with description', () => {
      const result = OrgFunctionSchema.safeParse({
        id: 'fn-2',
        name: 'Volunteer Mgmt',
        type: 'custom',
        description: 'Custom function',
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid function type', () => {
      const result = OrgFunctionSchema.safeParse({
        id: 'fn-1',
        name: 'Bad',
        type: 'nonexistent',
        isActive: true,
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = OrgFunctionSchema.safeParse({
        id: 'fn-1',
        name: '',
        type: 'finance',
        isActive: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ServiceSchema', () => {
    it('should validate a correct service', () => {
      const result = ServiceSchema.safeParse({
        id: 'svc-1',
        name: 'Youth Mentoring',
        status: 'active',
        functionIds: ['fn-1'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional description', () => {
      const result = ServiceSchema.safeParse({
        id: 'svc-1',
        name: 'Service',
        description: 'A description',
        status: 'planned',
        functionIds: [],
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('A description');
      }
    });

    it('should reject invalid status', () => {
      const result = ServiceSchema.safeParse({
        id: 'svc-1',
        name: 'Bad',
        status: 'deleted',
        functionIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('CostSchema', () => {
    it('should validate a correct cost', () => {
      const result = CostSchema.safeParse({
        amount: 99.99,
        period: 'monthly',
        model: 'subscription',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative cost amount', () => {
      const result = CostSchema.safeParse({
        amount: -10,
        period: 'annual',
        model: 'subscription',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid period', () => {
      const result = CostSchema.safeParse({
        amount: 50,
        period: 'weekly',
        model: 'free',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('SystemSchema', () => {
    it('should validate a full system', () => {
      const result = SystemSchema.safeParse({
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
      });
      expect(result.success).toBe(true);
    });

    it('should validate a minimal system', () => {
      const result = SystemSchema.safeParse({
        id: 'sys-1',
        name: 'Spreadsheet',
        type: 'spreadsheet',
        hosting: 'unknown',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid system type', () => {
      const result = SystemSchema.safeParse({
        id: 'sys-1',
        name: 'Bad',
        type: 'invalid',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid URL', () => {
      const result = SystemSchema.safeParse({
        id: 'sys-1',
        name: 'Bad',
        type: 'crm',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
        url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty name', () => {
      const result = SystemSchema.safeParse({
        id: 'sys-1',
        name: '',
        type: 'crm',
        hosting: 'cloud',
        status: 'active',
        functionIds: [],
        serviceIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('DataCategorySchema', () => {
    it('should validate a correct data category', () => {
      const result = DataCategorySchema.safeParse({
        id: 'dc-1',
        name: 'Client Records',
        sensitivity: 'confidential',
        containsPersonalData: true,
        systemIds: ['sys-1'],
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid sensitivity', () => {
      const result = DataCategorySchema.safeParse({
        id: 'dc-1',
        name: 'Bad',
        sensitivity: 'top_secret',
        containsPersonalData: false,
        systemIds: [],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('IntegrationSchema', () => {
    it('should validate a correct integration', () => {
      const result = IntegrationSchema.safeParse({
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'api',
        direction: 'one_way',
        frequency: 'real_time',
        reliability: 'reliable',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional description', () => {
      const result = IntegrationSchema.safeParse({
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'manual',
        direction: 'two_way',
        frequency: 'on_demand',
        description: 'Manual data sync',
        reliability: 'fragile',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid direction', () => {
      const result = IntegrationSchema.safeParse({
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'api',
        direction: 'multi_way',
        frequency: 'real_time',
        reliability: 'unknown',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid reliability', () => {
      const result = IntegrationSchema.safeParse({
        id: 'int-1',
        sourceSystemId: 'sys-1',
        targetSystemId: 'sys-2',
        type: 'api',
        direction: 'one_way',
        frequency: 'real_time',
        reliability: 'perfect',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('OwnerSchema', () => {
    it('should validate a full owner', () => {
      const result = OwnerSchema.safeParse({
        id: 'own-1',
        name: 'Jane Doe',
        role: 'IT Manager',
        isExternal: false,
        contactInfo: 'jane@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should validate a minimal owner', () => {
      const result = OwnerSchema.safeParse({
        id: 'own-1',
        name: 'Vendor',
        isExternal: true,
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = OwnerSchema.safeParse({
        id: 'own-1',
        name: '',
        isExternal: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ArchitectureSchema', () => {
    it('should validate a complete architecture', () => {
      const result = ArchitectureSchema.safeParse({
        organisation: {
          id: 'org-1',
          name: 'Test Charity',
          type: 'charity',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        functions: [
          { id: 'fn-1', name: 'Finance', type: 'finance', isActive: true },
        ],
        services: [
          { id: 'svc-1', name: 'Youth Mentoring', status: 'active', functionIds: ['fn-1'] },
        ],
        systems: [
          {
            id: 'sys-1',
            name: 'Xero',
            type: 'finance',
            hosting: 'cloud',
            status: 'active',
            functionIds: ['fn-1'],
            serviceIds: ['svc-1'],
          },
        ],
        dataCategories: [
          {
            id: 'dc-1',
            name: 'Financial Data',
            sensitivity: 'confidential',
            containsPersonalData: false,
            systemIds: ['sys-1'],
          },
        ],
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
      });
      expect(result.success).toBe(true);
    });

    it('should validate with empty arrays', () => {
      const result = ArchitectureSchema.safeParse({
        organisation: {
          id: 'org-1',
          name: 'Empty Org',
          type: 'other',
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
          mappingPath: 'service_first',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid mapping path', () => {
      const result = ArchitectureSchema.safeParse({
        organisation: {
          id: 'org-1',
          name: 'Test',
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
          mappingPath: 'random_path',
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
