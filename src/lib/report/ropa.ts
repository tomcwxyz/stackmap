import type { Architecture, DataCategory, LawfulBasis } from '@/lib/types';

/** ICO wording for each Article 6 basis. */
export const LAWFUL_BASIS_LABELS: Record<LawfulBasis, string> = {
  consent: 'Consent',
  contract: 'Contract',
  legal_obligation: 'Legal obligation',
  vital_interests: 'Vital interests',
  public_task: 'Public task',
  legitimate_interests: 'Legitimate interests',
};

export interface RopaRecipient {
  name: string;
  /** Whether the data leaves the UK, which needs its own safeguards. */
  outsideUk: boolean;
  purpose?: string;
}

export interface RopaEntry {
  /** The data category this record is about. */
  categoryId: string;
  category: string;
  /** Who the data is about. */
  subjects?: string;
  sensitivity: DataCategory['sensitivity'];
  lawfulBasis?: LawfulBasis;
  retention?: string;
  /** Systems the data sits in. */
  systems: string[];
  /** Where those systems are hosted, as a rough security measure note. */
  hosting: string[];
  recipients: RopaRecipient[];
  /** True when any recipient is outside the UK. */
  hasInternationalTransfer: boolean;
  /** What the record still needs before it is worth anything. */
  missing: string[];
}

export interface RopaReport {
  organisation: string;
  generatedAt: string;
  entries: RopaEntry[];
  /** Personal-data categories with nothing missing. */
  completeCount: number;
}

const HOSTING_LABELS: Record<string, string> = {
  cloud: 'Cloud',
  on_premise: 'On-premise',
  hybrid: 'Hybrid',
  unknown: 'Unknown',
};

/**
 * A starter record of processing activities, from what the map already knows.
 *
 * Only personal data is included: Article 30 is about personal data, and a
 * record padded with financial ledgers and website content is harder to use,
 * not more complete.
 *
 * This is a draft to check and finish, never a finished compliance document —
 * the gaps are reported rather than filled with plausible guesses.
 */
export function buildRopa(arch: Architecture, now: Date = new Date()): RopaReport {
  const personalData = arch.dataCategories.filter((dc) => dc.containsPersonalData);

  const entries: RopaEntry[] = personalData.map((category) => {
    const systems = category.systemIds
      .map((id) => arch.systems.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const flows = arch.dataFlows.filter((flow) =>
      flow.dataCategoryIds.includes(category.id),
    );

    const recipients: RopaRecipient[] = flows
      .map((flow): RopaRecipient | null => {
        const party = arch.externalParties.find((p) => p.id === flow.partyId);
        if (!party) return null;
        return {
          name: party.name,
          outsideUk: party.location === 'eea' || party.location === 'rest_of_world',
          purpose: flow.purpose,
        };
      })
      .filter((r): r is RopaRecipient => r !== null);

    const missing: string[] = [];
    if (!category.subjects) missing.push('who the data is about');
    if (!category.lawfulBasis) missing.push('lawful basis');
    if (!category.retention) missing.push('how long it is kept');
    if (systems.length === 0) missing.push('which system holds it');

    return {
      categoryId: category.id,
      category: category.name,
      subjects: category.subjects,
      sensitivity: category.sensitivity,
      lawfulBasis: category.lawfulBasis,
      retention: category.retention,
      systems: systems.map((s) => s.name),
      hosting: [...new Set(systems.map((s) => HOSTING_LABELS[s.hosting] ?? s.hosting))],
      recipients,
      hasInternationalTransfer: recipients.some((r) => r.outsideUk),
      missing,
    };
  });

  return {
    organisation: arch.organisation.name,
    generatedAt: now.toISOString(),
    entries,
    completeCount: entries.filter((e) => e.missing.length === 0).length,
  };
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** The record as a spreadsheet, which is how most organisations keep theirs. */
export function generateRopaCsv(report: RopaReport): string {
  const headers = [
    'Processing activity',
    'Data subjects',
    'Categories of personal data',
    'Lawful basis',
    'Retention period',
    'Systems',
    'Hosting',
    'Recipients',
    'Purpose of sharing',
    'Transfers outside the UK',
    'Still to complete',
  ];

  const rows = report.entries.map((entry) => [
    entry.category,
    entry.subjects ?? '',
    entry.category,
    entry.lawfulBasis ? LAWFUL_BASIS_LABELS[entry.lawfulBasis] : '',
    entry.retention ?? '',
    entry.systems.join('; '),
    entry.hosting.join('; '),
    entry.recipients.map((r) => r.name).join('; '),
    entry.recipients.map((r) => r.purpose).filter(Boolean).join('; '),
    entry.hasInternationalTransfer ? 'Yes' : 'No',
    entry.missing.join('; '),
  ]);

  return [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\n');
}
