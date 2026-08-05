import type { Organisation } from './types';

export interface SectorSystemSuggestion {
  name: string;
  description: string;
}

export interface SectorFunction {
  name: string;
  description: string;
  suggestedSystems: SectorSystemSuggestion[];
}

type OrgType = Organisation['type'];

/**
 * Functions that only make sense for particular kinds of organisation.
 *
 * The eight standard functions are charity-shaped. A council does not think in
 * terms of "fundraising", and a software business does not have "service
 * delivery" in the sense meant here. These are offered alongside the standard
 * set when the organisation type matches, and added as custom functions — so
 * the shared data model stays as it is, and a charity never sees them.
 */
export const SECTOR_FUNCTIONS: Partial<Record<OrgType, SectorFunction[]>> = {
  council: [
    {
      name: 'Revenues & Benefits',
      description: 'Council tax, business rates, housing benefit and council tax support',
      suggestedSystems: [
        { name: 'Capita Academy', description: 'Revenues and benefits processing' },
        { name: 'Civica OPENRevenues', description: 'Revenues and benefits processing' },
        { name: 'NEC Revenues & Benefits', description: 'Revenues and benefits processing' },
        { name: 'Allpay', description: 'Payment collection' },
      ],
    },
    {
      name: 'Planning & Building Control',
      description: 'Planning applications, enforcement, building regulations and land charges',
      suggestedSystems: [
        { name: 'IDOX Uniform', description: 'Planning and building control back office' },
        { name: 'Arcus Global', description: 'Cloud planning and regulatory services' },
        { name: 'Planning Portal', description: 'National application submission' },
        { name: 'QGIS', description: 'Mapping and spatial analysis' },
      ],
    },
    {
      name: 'Adult Social Care',
      description: 'Assessments, care packages, safeguarding and provider payments',
      suggestedSystems: [
        { name: 'Mosaic', description: 'Social care case management' },
        { name: 'Liquidlogic', description: 'Social care case management' },
        { name: 'Controcc', description: 'Care provider finance and brokerage' },
      ],
    },
    {
      name: "Children's Services",
      description: 'Early help, safeguarding, looked-after children and education',
      suggestedSystems: [
        { name: 'Liquidlogic', description: "Children's social care case management" },
        { name: 'Mosaic', description: "Children's social care case management" },
        { name: 'Capita ONE', description: 'Education management' },
      ],
    },
    {
      name: 'Waste & Environment',
      description: 'Refuse and recycling collection, street cleansing and environmental health',
      suggestedSystems: [
        { name: 'Bartec Collective', description: 'In-cab waste collection' },
        { name: 'Whitespace', description: 'Waste management' },
        { name: 'Echo', description: 'Waste and environmental services' },
      ],
    },
    {
      name: 'Housing',
      description: 'Housing register, allocations, homelessness and repairs',
      suggestedSystems: [
        { name: 'Northgate Housing', description: 'Housing management' },
        { name: 'Civica Cx', description: 'Housing management' },
        { name: 'Locata', description: 'Choice-based lettings' },
      ],
    },
    {
      name: 'Customer Services',
      description: 'Contact centre, self-service, complaints and enquiries',
      suggestedSystems: [
        { name: 'Granicus', description: 'Digital services and forms' },
        { name: 'Netcall Liberty', description: 'Contact centre and case handling' },
        { name: 'Jadu', description: 'Website and digital forms' },
        { name: 'GOV.UK Notify', description: 'Text and email notifications' },
      ],
    },
    {
      name: 'Elections & Registration',
      description: 'Electoral register, polls, and registration of births, deaths and marriages',
      suggestedSystems: [
        { name: 'Democracy Counts', description: 'Electoral management' },
        { name: 'Idox Elections', description: 'Electoral management' },
      ],
    },
  ],

  private_business: [
    {
      name: 'Sales',
      description: 'Pipeline, quotes, contracts and account management',
      suggestedSystems: [
        { name: 'HubSpot', description: 'CRM and sales pipeline' },
        { name: 'Salesforce', description: 'CRM and sales pipeline' },
        { name: 'Pipedrive', description: 'Lightweight sales pipeline' },
      ],
    },
    {
      name: 'Customer Support',
      description: 'Tickets, help documentation and service levels',
      suggestedSystems: [
        { name: 'Zendesk', description: 'Support ticketing' },
        { name: 'Freshdesk', description: 'Support ticketing' },
        { name: 'Intercom', description: 'Support chat and messaging' },
      ],
    },
    {
      name: 'Product & Delivery',
      description: 'Building and shipping what the business sells',
      suggestedSystems: [
        { name: 'GitHub', description: 'Source control and review' },
        { name: 'Jira', description: 'Work tracking' },
        { name: 'Linear', description: 'Work tracking' },
        { name: 'Figma', description: 'Design' },
      ],
    },
    {
      name: 'Legal & Compliance',
      description: 'Contracts, insurance, data protection and regulatory obligations',
      suggestedSystems: [
        { name: 'DocuSign', description: 'Contract signing' },
        { name: 'Google Workspace', description: 'Document storage' },
      ],
    },
  ],
};

/** Extra functions worth offering an organisation of this type. */
export function getSectorFunctions(orgType: OrgType): SectorFunction[] {
  return SECTOR_FUNCTIONS[orgType] ?? [];
}

/**
 * Suggested systems for a sector function, looked up by name.
 *
 * Sector functions are stored as custom functions, so there is no type to key
 * on — the name is what carries through.
 */
export function getSectorSuggestions(
  functionName: string,
  orgType: OrgType,
): SectorSystemSuggestion[] {
  const target = functionName.trim().toLowerCase();
  const match = getSectorFunctions(orgType).find(
    (fn) => fn.name.toLowerCase() === target,
  );
  return match?.suggestedSystems ?? [];
}
