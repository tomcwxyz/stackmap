// ─── Core domain types for Stackmap ───

// ─── TechFreedom types ───

export interface TechFreedomScore {
  jurisdiction: number;
  continuity: number;
  surveillance: number;
  lockIn: number;
  costExposure: number;
  isAutoScored: boolean;
  overrides?: string[];
}

export type RiskDimensionKey = 'jurisdiction' | 'continuity' | 'surveillance' | 'lockIn' | 'costExposure';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface AppConfig {
  techFreedomAvailable: boolean;
}

export interface Organisation {
  id: string;
  name: string;
  type: 'charity' | 'social_enterprise' | 'council' | 'cooperative' | 'private_business' | 'other';
  size?: 'micro' | 'small' | 'medium' | 'large';  // micro: 1-5, small: 6-25, medium: 26-100, large: 100+
  staffCount?: number;  // FTE staff
  annualTurnover?: number;  // in GBP
  createdAt: string;
  updatedAt: string;
}

export type StandardFunction =
  | 'finance'
  | 'governance'
  | 'people'
  | 'fundraising'
  | 'communications'
  | 'service_delivery'
  | 'operations'
  | 'data_reporting';

export interface OrgFunction {
  id: string;
  name: string;
  type: StandardFunction | 'custom';
  description?: string;
  isActive: boolean;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  beneficiaries?: string;
  status: 'active' | 'planned' | 'retiring';
  functionIds: string[];
  systemIds: string[];
}

export type SystemType =
  | 'crm'
  | 'finance'
  | 'hr'
  | 'case_management'
  | 'website'
  | 'email'
  | 'document_management'
  | 'database'
  | 'spreadsheet'
  | 'messaging'
  | 'custom'
  | 'other';

export interface System {
  id: string;
  name: string;
  type: SystemType;
  vendor?: string;
  hosting: 'cloud' | 'on_premise' | 'hybrid' | 'unknown';
  status: 'active' | 'planned' | 'retiring' | 'legacy';
  functionIds: string[];
  serviceIds: string[];
  ownerId?: string;
  notes?: string;
  url?: string;
  cost?: {
    amount: number;
    period: 'monthly' | 'annual';
    model: 'subscription' | 'perpetual' | 'free' | 'unknown';
  };
  techFreedomScore?: TechFreedomScore;
  importance?: number;
  isShadow?: boolean;
  /** Licences paid for, where the tool is charged per seat. */
  seats?: number;
  /** When the contract next renews or auto-renews, as YYYY-MM-DD. */
  renewalDate?: string;
  /** How much warning the supplier needs before you can leave, in days. */
  noticePeriodDays?: number;
}

/** Article 6 lawful bases, in the wording the ICO uses. */
export type LawfulBasis =
  | 'consent'
  | 'contract'
  | 'legal_obligation'
  | 'vital_interests'
  | 'public_task'
  | 'legitimate_interests';

export interface DataCategory {
  id: string;
  name: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  containsPersonalData: boolean;
  systemIds: string[];
  /** Who the data is about — "clients", "staff", "donors". */
  subjects?: string;
  /** How long it is kept, in the organisation's own words. */
  retention?: string;
  /** Why the organisation is allowed to hold it. */
  lawfulBasis?: LawfulBasis;
}

export interface Integration {
  id: string;
  sourceSystemId: string;
  targetSystemId: string;
  type: 'api' | 'file_transfer' | 'manual' | 'webhook' | 'database_link' | 'unknown';
  direction: 'one_way' | 'two_way';
  frequency: 'real_time' | 'scheduled' | 'on_demand' | 'unknown';
  description?: string;
  reliability: 'reliable' | 'fragile' | 'unknown';
}

export interface Owner {
  id: string;
  name: string;
  role?: string;
  isExternal: boolean;
  contactInfo?: string;
}

export type ExternalPartyType =
  | 'funder'
  | 'regulator'
  | 'auditor'
  | 'partner'
  | 'supplier'
  | 'other';

/** Where a party holds data, which is what matters for a transfer. */
export type PartyLocation = 'uk' | 'eea' | 'rest_of_world' | 'unknown';

/**
 * Someone outside the organisation that data goes to.
 *
 * Funders, regulators, auditors and delivery partners are where most of a small
 * charity's reporting obligations live, and the map stopped at the organisation
 * boundary without them.
 */
export interface ExternalParty {
  id: string;
  name: string;
  type: ExternalPartyType;
  description?: string;
  location?: PartyLocation;
  contactInfo?: string;
}

export type DataFlowMethod =
  | 'api'
  | 'file_transfer'
  | 'portal'
  | 'email'
  | 'post'
  | 'manual'
  | 'unknown';

export type DataFlowFrequency =
  | 'real_time'
  | 'scheduled'
  | 'on_demand'
  | 'annual'
  | 'unknown';

/** Data leaving a system for someone outside the organisation. */
export interface DataFlow {
  id: string;
  systemId: string;
  partyId: string;
  dataCategoryIds: string[];
  /** Why the data is shared — the question a regulator asks first. */
  purpose?: string;
  method: DataFlowMethod;
  frequency: DataFlowFrequency;
}

export type MappingPath = 'function_first' | 'service_first';

export interface Architecture {
  organisation: Organisation;
  functions: OrgFunction[];
  services: Service[];
  systems: System[];
  dataCategories: DataCategory[];
  integrations: Integration[];
  owners: Owner[];
  externalParties: ExternalParty[];
  dataFlows: DataFlow[];
  metadata: {
    version: string;
    exportedAt: string;
    stackmapVersion: string;
    mappingPath: 'function_first' | 'service_first';
    techFreedomEnabled?: boolean;
  };
}
