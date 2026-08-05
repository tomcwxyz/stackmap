export interface TechFreedomScore {
  jurisdiction: number;
  continuity: number;
  surveillance: number;
  lockIn: number;
  costExposure: number;
  isAutoScored: boolean;
  overrides?: string[];
}

export type RiskDimensionKey =
  | 'jurisdiction'
  | 'continuity'
  | 'surveillance'
  | 'lockIn'
  | 'costExposure';

export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

export interface RiskDimension {
  key: RiskDimensionKey;
  label: string;
  description: string;
}

export interface PricingTier {
  name: string;
  maxUsers?: number;
  annualPerSeat: number;
  recommended?: boolean;
  minUsers?: number;
}

export interface ToolPricing {
  model: 'per_seat' | 'flat' | 'tiered' | 'free';
  annualPerSeat?: number;
  penetrationRate?: number;
  tiers?: PricingTier[];
  flatAnnual?: number;
  notes?: string;
}

export interface KnownTool {
  slug: string;
  name: string;
  provider: string;
  /**
   * Other names this tool goes by, chiefly the codes that appear on bank
   * statements: Google Workspace bills as "GSUITE", Microsoft 365 as "O365".
   * The descriptor rarely spells out the product name.
   */
  aliases?: string[];
  category: string;
  score: TechFreedomScore;
  keyRisks: string;
  estimatedAnnualCost?: number;
  pricing?: ToolPricing;
}

export interface AggregateRisk {
  averages: Record<RiskDimensionKey, number>;
  averageTotal: number;
  worstDimension: RiskDimensionKey;
  mostCriticalSystem: string;
  systemCount: number;
  countByLevel: Record<RiskLevel, number>;
}

export interface AppConfig {
  techFreedomAvailable: boolean;
}
