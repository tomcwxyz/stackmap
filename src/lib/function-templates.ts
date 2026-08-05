import type { StandardFunction } from './types';

export interface FunctionSystemSuggestion {
  name: string;        // tool name — should match KNOWN_TOOLS where possible
  description: string; // brief context for why this is suggested
}

type OrgType = 'charity' | 'social_enterprise' | 'council' | 'cooperative' | 'private_business' | 'other';
type OrgSize = 'micro' | 'small' | 'medium' | 'large';

// ─── Suggestion data keyed by function type ───

interface SuggestionEntry {
  name: string;
  description: string;
  orgTypes?: OrgType[];   // if set, only show for these org types
  excludeTypes?: OrgType[]; // if set, hide for these org types
  sizes?: OrgSize[];       // if set, only show for these sizes
}

const SUGGESTIONS: Record<StandardFunction, SuggestionEntry[]> = {
  finance: [
    { name: 'Xero', description: 'Cloud accounting popular with small orgs' },
    { name: 'QuickBooks', description: 'Widely used accounting software' },
    { name: 'Sage', description: 'Common in larger charities', orgTypes: ['charity'] },
    { name: 'FreeAgent', description: 'Free for NatWest customers', sizes: ['micro', 'small'] },
    { name: 'Wave', description: 'Free accounting for micro orgs', sizes: ['micro'] },
    { name: 'Coconut', description: 'Simple bookkeeping for small orgs', sizes: ['micro', 'small'] },
    { name: 'Sage Intacct', description: 'Enterprise financial management', sizes: ['large'], orgTypes: ['council', 'charity'] },
    { name: 'SAP', description: 'Enterprise financial management', orgTypes: ['council'] },
    { name: 'Unit4', description: 'Public sector financial software', orgTypes: ['council'] },
    { name: 'Stripe', description: 'Online payment processing', orgTypes: ['social_enterprise', 'cooperative', 'private_business'] },
    { name: 'GoCardless', description: 'Direct debit for recurring payments' },
    { name: 'PayPal', description: 'Online payments and donations' },
    { name: 'Google Sheets', description: 'Spreadsheet-based bookkeeping', sizes: ['micro'] },
    { name: 'Excel', description: 'Spreadsheet tracking and budgets' },
  ],

  governance: [
    { name: 'Google Workspace', description: 'Docs and Drive for policy documents' },
    { name: 'Microsoft 365', description: 'SharePoint and OneDrive for governance docs' },
    { name: 'Notion', description: 'Wiki-style knowledge base for policies' },
    { name: 'Nextcloud', description: 'Self-hosted document storage (privacy-first)', orgTypes: ['cooperative'] },
    { name: 'Charity Commission portal', description: 'Regulatory filing for charities', orgTypes: ['charity'] },
    { name: 'Modern.gov', description: 'Council meeting and decision management', orgTypes: ['council'] },
    { name: 'ChatGPT', description: 'AI assistant for policy drafting and review' },
    { name: 'Claude', description: 'AI assistant for document review' },
  ],

  people: [
    { name: 'BreatheHR', description: 'HR management for SMEs' },
    { name: 'CharlieHR', description: 'Simple HR for small teams', sizes: ['micro', 'small'] },
    { name: 'iTrent', description: 'Public sector HR and payroll', orgTypes: ['council'] },
    { name: 'ResourceLink', description: 'Council HR and workforce management', orgTypes: ['council'] },
    { name: 'Microsoft Dynamics 365', description: 'Enterprise HR module', sizes: ['large'] },
    { name: 'Google Sheets', description: 'Lightweight people tracking', sizes: ['micro'] },
    { name: 'Slack', description: 'Team communication and culture', sizes: ['micro', 'small'] },
    { name: 'Microsoft Teams', description: 'Team communication', sizes: ['medium', 'large'] },
  ],

  fundraising: [
    { name: 'Salesforce', description: 'CRM with NPSP for nonprofits', orgTypes: ['charity'] },
    { name: 'Donorfy', description: 'UK-built donor management', orgTypes: ['charity'] },
    { name: 'Beacon', description: 'Modern fundraising CRM', orgTypes: ['charity'] },
    { name: 'CiviCRM', description: 'Free open-source CRM for nonprofits', orgTypes: ['charity', 'cooperative'] },
    { name: 'JustGiving', description: 'Online fundraising platform', orgTypes: ['charity'] },
    { name: 'GiveWP', description: 'WordPress donation plugin', orgTypes: ['charity'] },
    { name: 'GoCardless', description: 'Direct debit for recurring donations', orgTypes: ['charity'] },
    { name: 'Stripe', description: 'Payment processing for donations', orgTypes: ['charity'] },
    { name: 'HubSpot', description: 'CRM and marketing automation', orgTypes: ['social_enterprise', 'private_business'] },
    { name: 'Mailchimp', description: 'Email campaigns for fundraising' },
    { name: 'Brevo', description: 'EU-based email marketing (GDPR-friendly)' },
    { name: 'Airtable', description: 'Track grants and applications' },
    { name: 'Google Sheets', description: 'Track income and grant applications', sizes: ['micro', 'small'] },
  ],

  communications: [
    { name: 'Mailchimp', description: 'Email marketing and newsletters' },
    { name: 'Brevo', description: 'EU-based email marketing alternative' },
    { name: 'Listmonk', description: 'Free self-hosted email (privacy-first)', orgTypes: ['cooperative'] },
    { name: 'Canva', description: 'Design tool for social and print' },
    { name: 'Penpot', description: 'Free open-source design tool', orgTypes: ['cooperative'] },
    { name: 'WordPress', description: 'Website content management' },
    { name: 'Squarespace', description: 'Website builder for non-technical teams' },
    { name: 'Instagram', description: 'Visual social media platform' },
    { name: 'Meta/Facebook', description: 'Social media and community engagement' },
    { name: 'LinkedIn', description: 'Professional networking and updates' },
    { name: 'YouTube', description: 'Video content and comms' },
    { name: 'TikTok', description: 'Short-form video for younger audiences' },
    { name: 'Mastodon', description: 'Decentralised social media (privacy-first)', orgTypes: ['cooperative'] },
    { name: 'Bluesky', description: 'Decentralised Twitter alternative' },
    { name: 'Buffer', description: 'Social media scheduling' },
    { name: 'Hootsuite', description: 'Social media management at scale', sizes: ['medium', 'large'] },
    { name: 'ChatGPT', description: 'AI for drafting comms and social posts' },
    { name: 'Claude', description: 'AI for writing and content creation' },
    { name: 'Grammarly', description: 'AI writing assistant' },
    { name: 'GovDelivery', description: 'Government digital communications', orgTypes: ['council'] },
  ],

  service_delivery: [
    { name: 'Lamplight', description: 'Case management for charities', orgTypes: ['charity'] },
    { name: 'Salesforce', description: 'Flexible CRM for service tracking', orgTypes: ['charity', 'social_enterprise'] },
    { name: 'CiviCRM', description: 'Free open-source case management', orgTypes: ['charity', 'cooperative'] },
    { name: 'Inform', description: 'Outcomes and case recording', orgTypes: ['charity'] },
    { name: 'Microsoft Dynamics 365', description: 'Enterprise service management', sizes: ['large'] },
    { name: 'Airtable', description: 'Flexible database for service data' },
    { name: 'Baserow', description: 'EU open-source Airtable alternative', orgTypes: ['cooperative'] },
    { name: 'Notion', description: 'Flexible workspace for service coordination' },
    { name: 'Trello', description: 'Task and workflow management' },
    { name: 'Zoom', description: 'Video calls for remote service delivery' },
    { name: 'Whereby', description: 'EU-based video calls (privacy-friendly)' },
    { name: 'WhatsApp', description: 'Client messaging (widely used but Meta-owned)' },
    { name: 'Signal', description: 'Secure messaging for sensitive services' },
    { name: 'QGIS', description: 'Mapping service areas and catchments', orgTypes: ['council', 'charity'] },
    { name: 'Felt', description: 'Collaborative mapping for service planning' },
    { name: 'Firmstep', description: 'Council digital service delivery', orgTypes: ['council'] },
    { name: 'Jadu', description: 'Council web and forms platform', orgTypes: ['council'] },
  ],

  operations: [
    { name: 'Microsoft 365', description: 'Productivity and collaboration suite' },
    { name: 'Google Workspace', description: 'Cloud-based productivity tools' },
    { name: 'LibreOffice', description: 'Free open-source office suite', orgTypes: ['cooperative'] },
    { name: 'OnlyOffice', description: 'EU-based collaborative office suite', orgTypes: ['cooperative'] },
    { name: 'Zoho Workplace', description: 'Affordable M365/Google alternative' },
    { name: 'Slack', description: 'Team messaging', sizes: ['micro', 'small'] },
    { name: 'Microsoft Teams', description: 'Team communication', sizes: ['medium', 'large'] },
    { name: 'Element', description: 'Encrypted team messaging (Matrix)', orgTypes: ['cooperative'] },
    { name: 'Trello', description: 'Simple project boards', sizes: ['micro', 'small'] },
    { name: 'Asana', description: 'Project management at scale', sizes: ['medium', 'large'] },
    { name: 'OpenProject', description: 'EU open-source project management', orgTypes: ['cooperative', 'council'] },
    { name: 'Basecamp', description: 'Simple project management (flat pricing)' },
    { name: 'Monday.com', description: 'Visual project management' },
    { name: 'Todoist', description: 'Simple task management', sizes: ['micro', 'small'] },
    { name: 'Nextcloud', description: 'Self-hosted files and collaboration', orgTypes: ['cooperative'] },
    { name: 'Zapier', description: 'Automate workflows between tools' },
    { name: 'Make', description: 'EU-based workflow automation' },
    { name: 'ChatGPT', description: 'AI assistant for everyday tasks' },
    { name: 'Claude', description: 'AI assistant for writing and analysis' },
    { name: 'Microsoft Copilot', description: 'AI embedded in M365', sizes: ['medium', 'large'] },
    { name: 'Ollama', description: 'Run AI locally on your own hardware (privacy-first)', orgTypes: ['cooperative'] },
  ],

  data_reporting: [
    { name: 'Google Sheets', description: 'Collaborative spreadsheets for data' },
    { name: 'Excel', description: 'Spreadsheet analysis and reporting' },
    { name: 'Power BI', description: 'Business intelligence dashboards', sizes: ['medium', 'large'] },
    { name: 'Tableau', description: 'Data visualisation platform', sizes: ['large'] },
    { name: 'Looker Studio', description: 'Free Google-based dashboards' },
    { name: 'Metabase', description: 'Open-source BI for non-technical users' },
    { name: 'Evidence', description: 'Open-source code-first reporting' },
    { name: 'Notion', description: 'Databases and reporting views' },
    { name: 'Airtable', description: 'Flexible data tracking and views' },
    { name: 'Baserow', description: 'EU open-source data management', orgTypes: ['cooperative'] },
    { name: 'NocoDB', description: 'Free open-source spreadsheet-database' },
    { name: 'Supabase', description: 'Open-source database with dashboards' },
    { name: 'ArcGIS Online', description: 'Geospatial data and mapping', orgTypes: ['council'] },
    { name: 'QGIS', description: 'Free GIS for spatial analysis', orgTypes: ['council', 'charity'] },
    { name: 'Felt', description: 'Collaborative map-based reporting' },
    { name: 'Impact reporting spreadsheet', description: 'Template for funder reports', orgTypes: ['charity'] },
    { name: 'ChatGPT', description: 'AI for data analysis and report writing' },
    { name: 'Claude', description: 'AI for interpreting data and drafting reports' },
  ],
};

/**
 * Returns suggested systems for a given function type, filtered by org type and size.
 */
export function getSuggestedSystems(
  functionType: StandardFunction,
  orgType: OrgType,
  orgSize?: OrgSize,
): FunctionSystemSuggestion[] {
  const entries = SUGGESTIONS[functionType];
  if (!entries) return [];

  return entries
    .filter((entry) => {
      // Filter by org type
      if (entry.orgTypes && !entry.orgTypes.includes(orgType)) return false;
      if (entry.excludeTypes && entry.excludeTypes.includes(orgType)) return false;

      // Filter by size (if size specified and entry has size restriction)
      if (entry.sizes && orgSize && !entry.sizes.includes(orgSize)) return false;

      return true;
    })
    .map(({ name, description }) => ({ name, description }));
}

/**
 * Which functions suggest a given tool, best first.
 *
 * The inverse of the suggestion lists above, built once. A tool can belong to
 * several — Slack is offered under both People and Operations — so this
 * returns all of them rather than picking, and leaves the choosing to whoever
 * has more context.
 */
const SUGGESTED_BY = new Map<string, StandardFunction[]>();

for (const [functionType, entries] of Object.entries(SUGGESTIONS) as [
  StandardFunction,
  SuggestionEntry[],
][]) {
  for (const entry of entries) {
    const key = entry.name.trim().toLowerCase();
    const current = SUGGESTED_BY.get(key) ?? [];
    if (!current.includes(functionType)) current.push(functionType);
    SUGGESTED_BY.set(key, current);
  }
}

export function getFunctionsSuggesting(systemName: string): StandardFunction[] {
  return SUGGESTED_BY.get(systemName.trim().toLowerCase()) ?? [];
}

