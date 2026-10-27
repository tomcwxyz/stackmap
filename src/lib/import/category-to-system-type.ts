import type { SystemType } from '@/lib/types';

/** Shared mapping used by both spend discovery and paste-a-list entry. */
export const CATEGORY_TO_SYSTEM_TYPE: Record<string, SystemType> = {
  CRM: 'crm',
  Finance: 'finance',
  Payment: 'finance',
  Email: 'email',
  Marketing: 'email',
  Messaging: 'messaging',
  Communication: 'messaging',
  Storage: 'document_management',
  Productivity: 'document_management',
  CMS: 'website',
  Hosting: 'website',
  Database: 'database',
  'Data Visualisation': 'database',
  'Project Management': 'database',
};
