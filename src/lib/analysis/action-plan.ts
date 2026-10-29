import type { Architecture, MapActionDecision, MapActionStatus } from '@/lib/types';
import { assessMapCoverage } from '@/lib/analysis/map-coverage';
import { assessSystemReviews } from '@/lib/analysis/evidence-freshness';
import { buildRiskImportanceMatrix } from '@/lib/analysis/risk-importance';
import { findDuplication } from '@/lib/analysis/duplication';
import { findRenewals } from '@/lib/analysis/renewals';
import { findAttentionPoints, type AttentionPoint } from '@/lib/report/attention';

export type ActionPriority = 'high' | 'medium' | 'low';
export type ActionCategory = 'Risk' | 'Governance' | 'Data' | 'Contracts' | 'Efficiency' | 'Completeness';
export interface SuggestedAction {
  id: string;
  evidenceKey: string;
  priority: ActionPriority;
  category: ActionCategory;
  title: string;
  evidence: string;
  nextStep: string;
  href: string;
}

export interface ActionState {
  action: SuggestedAction;
  decision?: MapActionDecision;
  /** An old acknowledgement must not conceal new evidence. */
  changed: boolean;
  effectiveStatus: MapActionStatus;
}

const attentionAdvice: Record<string, {
  category: ActionCategory;
  step: string;
  href: 'systems' | 'integrations' | 'owners' | 'review';
}> = {
  'core-unowned': {
    category: 'Governance',
    step: 'Agree a responsible person for each critical tool and record the owner against the system.',
    href: 'systems',
  },
  'core-shadow': {
    category: 'Risk',
    step: 'Discuss how these informal tools are used, who supports them and whether they should be formally adopted or replaced.',
    href: 'systems',
  },
  'fragile-integrations': {
    category: 'Risk',
    step: 'Check the recorded connection with the people who use it and agree a recovery or improvement approach.',
    href: 'integrations',
  },
  'single-system-functions': {
    category: 'Risk',
    step: 'Confirm whether these areas really depend on one tool and document practical alternatives or continuity arrangements.',
    href: 'review',
  },
  'personal-data-unowned': {
    category: 'Data',
    step: 'Name who is accountable for the tool and confirm who can access the personal information recorded there.',
    href: 'systems',
  },
  'notice-deadline-passed': {
    category: 'Contracts',
    step: 'Check the contract terms with the supplier. The recorded notice deadline has passed, but renewal is not certain until confirmed.',
    href: 'systems',
  },
  'renewing-soon': {
    category: 'Contracts',
    step: 'Confirm notice requirements, current usage and whether the organisation intends to renew.',
    href: 'systems',
  },
  'ageing-systems': {
    category: 'Risk',
    step: 'Check who still uses these tools, what depends on them and whether there is a supported replacement plan.',
    href: 'systems',
  },
  'uncosted-systems': {
    category: 'Completeness',
    step: 'Ask finance or the system owner to confirm actual costs, including whether the tool is free.',
    href: 'systems',
  },
};

function hrefFor(arch: Architecture, where: 'systems' | 'integrations' | 'owners' | 'review'): string {
  if (where === 'systems') return '/view/systems';
  const path = arch.metadata.mappingPath === 'service_first' ? 'services' : 'functions';
  return '/wizard/' + path + '/' + (where === 'review' ? 'review' : where);
}

function evidenceKey(id: string, title: string, evidence: string): string {
  // Deliberately transparent and auditable, rather than a claimed probability.
  return JSON.stringify([id, title, evidence]);
}

const order: Record<ActionPriority, number> = { high: 0, medium: 1, low: 2 };

function attentionAction(arch: Architecture, point: AttentionPoint): SuggestedAction {
  const advice = attentionAdvice[point.id];
  return {
    id: 'attention:' + point.id,
    evidenceKey: evidenceKey(point.id, point.title, point.detail),
    priority: point.severity,
    category: advice?.category ?? 'Risk',
    title: point.title,
    evidence: point.detail,
    nextStep: advice?.step ?? 'Review the recorded information with the people responsible.',
    href: hrefFor(arch, advice?.href ?? 'review'),
  };
}

/**
 * Derive suggestions from recorded evidence, not model-generated certainty.
 * The generated list is never persisted: only explicit human decisions are.
 */
export function buildSuggestedActions(arch: Architecture, at: Date = new Date()): SuggestedAction[] {
  if (arch.systems.length === 0) return [];
  const actions: SuggestedAction[] = findAttentionPoints(arch).map((p) => attentionAction(arch, p));

  const coveragePriority: Record<string, ActionPriority> = {
    owner: 'medium', importance: 'medium', cost: 'low',
    hosting: 'low', function: 'medium', risk: 'medium',
    connections: 'medium', 'personal-data': 'high',
  };
  for (const check of assessMapCoverage(arch).checks) {
    const missing = check.total - check.recorded;
    if (missing === 0) continue;
    // A map's fields being filled in cannot prove that it is accurate.
    const evidence = String(missing) + ' of ' + check.total +
      ' applicable records missing: ' + check.label + '. ' +
      (check.examples.length ? 'For example: ' + check.examples.join(', ') : '');
    actions.push({
      id: 'coverage:' + check.id,
      evidenceKey: evidenceKey('coverage:' + check.id, check.label, evidence),
      category: check.id === 'personal-data' ? 'Data' : 'Completeness',
      priority: coveragePriority[check.id] ?? 'low',
      title: 'Complete ' + check.label.toLocaleLowerCase('en-GB'),
      evidence,
      nextStep: 'Check these records with the relevant staff and add the missing information. An entry is not independent verification.',
      href: check.href,
    });
  }

  const freshness = assessSystemReviews(arch, at);
  if (freshness.due.length || freshness.notChecked.length) {
    const affected = [...freshness.notChecked, ...freshness.due]
      .sort((a, b) => a.name.localeCompare(b.name));
    const evidence = freshness.notChecked.length + ' records not checked; ' +
      freshness.due.length + ' need a new check (last checked 180+ days ago). ' +
      'Affected: ' + affected.map((system) => system.name).join(', ');
    actions.push({
      id: 'review:system-records',
      evidenceKey: evidenceKey('review:system-records', 'Review dates', evidence),
      priority: 'medium',
      category: 'Governance',
      title: 'Check the accuracy of system records',
      evidence,
      nextStep: 'Ask the relevant staff to review each system, name the evidence source and confirm the record. Existing content and catalogue scores have not been independently verified.',
      href: '/view/systems',
    });
  }

  if (arch.metadata.techFreedomEnabled) {
    for (const plotted of buildRiskImportanceMatrix(arch.systems).byQuadrant.act_first) {
      const { system, importance, riskTotal } = plotted;
      const evidence = system.name + ': importance ' + importance + '/10, catalogue or user risk total ' +
        riskTotal + '. Scores describe exposure, not a confirmed failure.';
      actions.push({
        id: 'exposed:' + system.id,
        evidenceKey: evidenceKey('exposed:' + system.id, 'Critical and exposed', evidence),
        category: 'Risk',
        priority: 'high',
        title: 'Review critical and exposed system: ' + system.name,
        evidence,
        nextStep: 'Verify the risk assessment against your actual configuration and agree a proportionate resilience or exit plan.',
        href: '/view/techfreedom',
      });
    }
  }

  for (const group of findDuplication(arch.systems, arch.functions)) {
    const evidence = group.systems.map((s) => s.name).sort().join(', ') +
      '. Shared category: ' + group.label + '. Similar categories do not prove interchangeable functions.';
    actions.push({
      id: 'overlap:' + group.key,
      evidenceKey: evidenceKey('overlap:' + group.key, group.label, evidence),
      category: 'Efficiency',
      priority: 'medium',
      title: 'Check potential overlap: ' + group.label,
      evidence,
      nextStep: 'Ask users whether these tools genuinely do the same work before considering consolidation. Do not treat possible savings as guaranteed.',
      href: '/view/systems',
    });
  }

  const overdue = findRenewals(arch.systems, { from: at }).overdue;
  if (overdue.length) {
    const evidence = overdue.map((r) => r.system.name + ' (' + r.date + ')').join(', ');
    actions.push({
      id: 'contracts:outdated-renewals',
      evidenceKey: evidenceKey('contracts:outdated-renewals', 'Outdated contract dates', evidence),
      priority: 'medium',
      category: 'Contracts',
      title: 'Confirm expired renewal dates',
      evidence,
      nextStep: 'Check whether these contracts renewed, ended or changed terms; update the dates in your inventory.',
      href: '/view/systems',
    });
  }

  return actions.sort((a, b) =>
    order[a.priority] - order[b.priority] ||
    a.category.localeCompare(b.category) ||
    a.title.localeCompare(b.title));
}

/** A reviewed or dismissed item becomes open again when its evidence changes. */
export function applyActionDecisions(
  actions: SuggestedAction[],
  decisions: MapActionDecision[] = [],
): ActionState[] {
  const decisionById = new Map(decisions.map((d) => [d.id, d]));
  return actions.map((action) => {
    const decision = decisionById.get(action.id);
    const changed = Boolean(decision && decision.evidenceKey !== action.evidenceKey);
    return {
      action, decision, changed,
      effectiveStatus: !decision || changed ? 'open' : decision.status,
    };
  });
}

/** Decisions live in the map, so switching maps and exporting JSON include them. */
export function updateActionDecision(
  arch: Architecture,
  action: SuggestedAction,
  patch: Partial<Pick<MapActionDecision, 'status' | 'owner' | 'note'>>,
  at: Date = new Date(),
): Architecture {
  const old = arch.actionDecisions?.find((d) => d.id === action.id);
  const matched = old?.evidenceKey === action.evidenceKey;
  const updated: MapActionDecision = {
    id: action.id,
    evidenceKey: action.evidenceKey,
    status: patch.status ?? (matched ? old?.status : undefined) ?? 'open',
    owner: patch.owner ?? old?.owner,
    note: patch.note ?? old?.note,
    updatedAt: at.toISOString(),
  };
  return {
    ...arch,
    actionDecisions: [
      ...(arch.actionDecisions ?? []).filter((d) => d.id !== action.id),
      updated,
    ],
  };
}
