import { z } from 'zod';

// ─── Enum-like schemas ───

export const OrganisationTypeSchema = z.enum([
  'charity',
  'social_enterprise',
  'council',
  'cooperative',
  'private_business',
  'other',
]);

export const StandardFunctionSchema = z.enum([
  'finance',
  'governance',
  'people',
  'fundraising',
  'communications',
  'service_delivery',
  'operations',
  'data_reporting',
]);

export const OrgFunctionTypeSchema = z.enum([
  'finance',
  'governance',
  'people',
  'fundraising',
  'communications',
  'service_delivery',
  'operations',
  'data_reporting',
  'custom',
]);

export const SystemTypeSchema = z.enum([
  'crm',
  'finance',
  'hr',
  'case_management',
  'website',
  'email',
  'document_management',
  'database',
  'spreadsheet',
  'messaging',
  'custom',
  'other',
]);

export const HostingSchema = z.enum(['cloud', 'on_premise', 'hybrid', 'unknown']);

export const SystemStatusSchema = z.enum(['active', 'planned', 'retiring', 'legacy']);

export const ServiceStatusSchema = z.enum(['active', 'planned', 'retiring']);

export const SensitivitySchema = z.enum(['public', 'internal', 'confidential', 'restricted']);

export const IntegrationTypeSchema = z.enum([
  'api',
  'file_transfer',
  'manual',
  'webhook',
  'database_link',
  'unknown',
]);

export const DirectionSchema = z.enum(['one_way', 'two_way']);

export const FrequencySchema = z.enum(['real_time', 'scheduled', 'on_demand', 'unknown']);

export const ReliabilitySchema = z.enum(['reliable', 'fragile', 'unknown']);

export const CostPeriodSchema = z.enum(['monthly', 'annual']);

export const CostModelSchema = z.enum(['subscription', 'perpetual', 'free', 'unknown']);

export const MappingPathSchema = z.enum(['function_first', 'service_first']);

export const ExternalPartyTypeSchema = z.enum([
  'funder',
  'regulator',
  'auditor',
  'partner',
  'supplier',
  'other',
]);

export const PartyLocationSchema = z.enum(['uk', 'eea', 'rest_of_world', 'unknown']);

export const DataFlowMethodSchema = z.enum([
  'api',
  'file_transfer',
  'portal',
  'email',
  'post',
  'manual',
  'unknown',
]);

export const DataFlowFrequencySchema = z.enum([
  'real_time',
  'scheduled',
  'on_demand',
  'annual',
  'unknown',
]);

export const LawfulBasisSchema = z.enum([
  'consent',
  'contract',
  'legal_obligation',
  'vital_interests',
  'public_task',
  'legitimate_interests',
]);

// ─── TechFreedom schemas ───

export const TechFreedomScoreSchema = z.object({
  jurisdiction: z.number().min(1).max(5),
  continuity: z.number().min(1).max(5),
  surveillance: z.number().min(1).max(5),
  lockIn: z.number().min(1).max(5),
  costExposure: z.number().min(1).max(5),
  isAutoScored: z.boolean(),
  overrides: z.array(z.string()).optional(),
});

// ─── Object schemas ───

export const OrganisationSizeSchema = z.enum(['micro', 'small', 'medium', 'large']);

export const OrganisationSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: OrganisationTypeSchema,
  size: OrganisationSizeSchema.optional(),
  staffCount: z.number().min(0).optional(),
  annualTurnover: z.number().min(0).optional(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const OrgFunctionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: OrgFunctionTypeSchema,
  description: z.string().optional(),
  isActive: z.boolean(),
});

export const ServiceSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  beneficiaries: z.string().optional(),
  status: ServiceStatusSchema,
  functionIds: z.array(z.string()),
  systemIds: z.array(z.string()).default([]),
});

export const CostSchema = z.object({
  amount: z.number().min(0),
  period: CostPeriodSchema,
  model: CostModelSchema,
});

export const SystemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: SystemTypeSchema,
  vendor: z.string().optional(),
  hosting: HostingSchema,
  status: SystemStatusSchema,
  functionIds: z.array(z.string()),
  serviceIds: z.array(z.string()),
  ownerId: z.string().optional(),
  notes: z.string().optional(),
  url: z.url().optional(),
  cost: CostSchema.optional(),
  techFreedomScore: TechFreedomScoreSchema.optional(),
  importance: z.number().min(1).max(10).optional(),
  isShadow: z.boolean().optional(),
  seats: z.number().min(0).optional(),
  // Plain calendar date, so a renewal does not shift around with time zones
  renewalDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD form')
    .optional(),
  noticePeriodDays: z.number().min(0).optional(),
});

export const DataCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  sensitivity: SensitivitySchema,
  containsPersonalData: z.boolean(),
  systemIds: z.array(z.string()),
  subjects: z.string().optional(),
  retention: z.string().optional(),
  lawfulBasis: LawfulBasisSchema.optional(),
});

export const IntegrationSchema = z.object({
  id: z.string().min(1),
  sourceSystemId: z.string().min(1),
  targetSystemId: z.string().min(1),
  type: IntegrationTypeSchema,
  direction: DirectionSchema,
  frequency: FrequencySchema,
  description: z.string().optional(),
  reliability: ReliabilitySchema,
});

export const ExternalPartySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ExternalPartyTypeSchema,
  description: z.string().optional(),
  location: PartyLocationSchema.optional(),
  contactInfo: z.string().optional(),
});

export const DataFlowSchema = z.object({
  id: z.string().min(1),
  systemId: z.string().min(1),
  partyId: z.string().min(1),
  dataCategoryIds: z.array(z.string()),
  purpose: z.string().optional(),
  method: DataFlowMethodSchema,
  frequency: DataFlowFrequencySchema,
});

export const OwnerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().optional(),
  isExternal: z.boolean(),
  contactInfo: z.string().optional(),
});

export const ArchitectureMetadataSchema = z.object({
  version: z.string().min(1),
  exportedAt: z.string().min(1),
  stackmapVersion: z.string().min(1),
  mappingPath: MappingPathSchema,
  techFreedomEnabled: z.boolean().optional().default(false),
});

export const ArchitectureSchema = z.object({
  organisation: OrganisationSchema,
  functions: z.array(OrgFunctionSchema),
  services: z.array(ServiceSchema),
  systems: z.array(SystemSchema),
  dataCategories: z.array(DataCategorySchema),
  integrations: z.array(IntegrationSchema),
  owners: z.array(OwnerSchema),
  externalParties: z.array(ExternalPartySchema),
  dataFlows: z.array(DataFlowSchema),
  metadata: ArchitectureMetadataSchema,
});

/**
 * Schema for architectures read back out of storage.
 *
 * Identical to ArchitectureSchema except that the organisation name may be
 * empty: a map is created before the user has typed one, and a half-finished
 * map must survive a page reload. Imported files still go through the strict
 * schema, where a name is required.
 */
export const StoredArchitectureSchema = ArchitectureSchema.extend({
  organisation: OrganisationSchema.extend({ name: z.string() }),
});
