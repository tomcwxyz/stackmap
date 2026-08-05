import type { StandardFunction, SystemType } from '@/lib/types';
import { getFunctionsSuggesting } from '@/lib/function-templates';
import { STANDARD_FUNCTIONS } from '@/lib/functions';

/**
 * Where a kind of system usually sits, for tools the templates say nothing
 * about.
 *
 * Coarser than the curated lists and only reached when they miss, so it aims
 * at "somewhere sensible to start" rather than "right".
 */
const TYPE_TO_FUNCTION: Partial<Record<SystemType, StandardFunction>> = {
  crm: 'fundraising',
  finance: 'finance',
  hr: 'people',
  case_management: 'service_delivery',
  website: 'communications',
  email: 'communications',
  document_management: 'operations',
  database: 'data_reporting',
  spreadsheet: 'data_reporting',
  messaging: 'operations',
};

/** How many functions a tool must span before it counts as general-purpose. */
const PAN_ORGANISATIONAL_AT = 3;

export interface FunctionSuggestion {
  /** The best guess, or undefined when there is nothing to go on. */
  suggested?: StandardFunction;
  /**
   * Every function that plausibly fits, best first. More than one is normal:
   * Slack is offered under both People and Operations, and which is right
   * depends on the organisation rather than the tool.
   */
  candidates: StandardFunction[];
}

/**
 * What part of the organisation a tool probably belongs to.
 *
 * Systems imported from spend used to arrive attached to nothing, so they sat
 * in an "Other systems" bucket and had to be assigned by hand — or, more often,
 * added a second time through the wizard. A guess the user can correct is worth
 * much more than no guess at all.
 *
 * The curated function templates are the first source, because they are the
 * same data the wizard suggests from: if the Finance step offers Xero, then
 * Xero belongs to Finance.
 */
export function suggestFunction(
  systemName: string,
  systemType: SystemType = 'other',
): FunctionSuggestion {
  const candidates = [...getFunctionsSuggesting(systemName)];
  const byType = TYPE_TO_FUNCTION[systemType];

  // When the tool's own kind agrees with one of the curated answers, that is
  // the tie-break — a payment processor listed under both Finance and
  // Fundraising is a finance system first.
  if (byType && candidates.includes(byType)) {
    return {
      suggested: byType,
      candidates: [byType, ...candidates.filter((c) => c !== byType)],
    };
  }

  // A tool offered under most of the organisation — an AI assistant, a
  // spreadsheet — is part of how the place runs rather than one specialism.
  // Without this the first authored entry wins, and "Claude: Governance" is a
  // worse opening guess than "Claude: Operations".
  if (candidates.length >= PAN_ORGANISATIONAL_AT && candidates.includes('operations')) {
    return {
      suggested: 'operations',
      candidates: ['operations', ...candidates.filter((c) => c !== 'operations')],
    };
  }

  if (candidates.length > 0) {
    return { suggested: candidates[0], candidates };
  }

  // Nothing curated: fall back to the kind of system it is
  if (byType) return { suggested: byType, candidates: [byType] };

  return { candidates: [] };
}

/** The display name a standard function is given when one has to be created. */
export function standardFunctionName(type: StandardFunction): string {
  return STANDARD_FUNCTIONS.find((fn) => fn.type === type)?.name ?? type;
}
