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

export interface DataCategory {
  id: string;
  name: string;
  sensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  containsPersonalData: boolean;
  systemIds: string[];
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

export type MappingPath = 'function_first' | 'service_first';

export interface Architecture {
  organisation: Organisation;
  functions: OrgFunction[];
  services: Service[];
  systems: System[];
  dataCategories: DataCategory[];
  integrations: Integration[];
  owners: Owner[];
  metadata: {
    version: string;
    exportedAt: string;
    stackmapVersion: string;
    mappingPath: 'function_first' | 'service_first';
    techFreedomEnabled?: boolean;
  };
}
