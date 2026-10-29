'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useArchitecture } from '@/hooks/useArchitecture';
import type { MapActionDecision, MapActionStatus } from '@/lib/types';
import {
  applyActionDecisions,
  buildSuggestedActions,
  updateActionDecision,
  type ActionPriority,
  type ActionState,
  type SuggestedAction,
} from '@/lib/analysis/action-plan';

type ActionFilter = 'active' | 'all' | 'reviewed' | 'dismissed';
const PRIORITY_LABEL: Record<ActionPriority, string> = {
  high: 'High priority',
  medium: 'Worth reviewing',
  low: 'Complete the picture',
};
const STATUS_LABEL: Record<MapActionStatus, string> = {
  open: 'Not started',
  planned: 'Planned',
  in_progress: 'In progress',
  reviewed: 'Reviewed',
  dismissed: 'Not applicable',
};

function ActionCard({
  item,
  onChange,
}: {
  item: ActionState;
  onChange: (action: SuggestedAction, updates: Partial<Pick<MapActionDecision, 'status' | 'owner' | 'note'>>) => void;
}) {
  const { action, decision, changed, effectiveStatus } = item;
  const priorityStyle = action.priority === 'high'
    ? 'border-l-red-600'
    : action.priority === 'medium' ? 'border-l-amber-600' : 'border-l-primary-400';
  return (
    <article className={'rounded-xl border border-surface-300 border-l-4 bg-white p-4 sm:p-5 space-y-4 ' + priorityStyle}>
      <header className="flex flex-col sm:flex-row sm:justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary-600">{action.category} · {PRIORITY_LABEL[action.priority]}</p>
          <h2 className="font-display text-lg font-bold text-primary-950 mt-1 break-words">{action.title}</h2>
        </div>
        {changed && (
          <span className="self-start rounded-md border border-amber-300 bg-amber-50 px-2 py-1 text-xs text-amber-900">
            Evidence changed · review again
          </span>
        )}
      </header>
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-600">Why this has appeared</h3>
        <p className="text-sm text-primary-800 whitespace-pre-wrap break-words">{action.evidence}</p>
      </div>
      <div className="space-y-1">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-primary-600">Suggested next step</h3>
        <p className="text-sm text-primary-800">{action.nextStep}</p>
        <Link href={action.href} className="inline-block text-sm text-primary-700 underline underline-offset-2 mt-1">
          Review the map details
        </Link>
      </div>
      <div className="border-t border-surface-200 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-800">
          Progress
          <select
            aria-label={'Progress for ' + action.title}
            value={effectiveStatus}
            onChange={(event) => onChange(action, { status: event.target.value as MapActionStatus })}
            className="w-full rounded-md border border-surface-300 bg-white px-3 py-2.5 text-base text-primary-950"
          >
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-800">
          Who will follow this up?
          <input
            aria-label={'Action owner for ' + action.title}
            type="text"
            maxLength={150}
            value={decision?.owner ?? ''}
            onChange={(event) => onChange(action, { owner: event.target.value })}
            placeholder="Optional name or role"
            className="w-full rounded-md border border-surface-300 bg-white px-3 py-2.5 text-base text-primary-950"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium text-primary-800 sm:col-span-2">
          Your notes
          <textarea
            aria-label={'Notes for ' + action.title}
            rows={2}
            maxLength={2000}
            value={decision?.note ?? ''}
            onChange={(event) => onChange(action, { note: event.target.value })}
            placeholder="What was agreed, checked or decided?"
            className="w-full rounded-md border border-surface-300 bg-white px-3 py-2.5 text-base text-primary-950"
          />
        </label>
      </div>
      {(effectiveStatus === 'reviewed' || effectiveStatus === 'dismissed') && (
        <p className="text-xs text-primary-600">
          This decision records a review; it does not remove the underlying finding or confirm that the issue is fixed.
        </p>
      )}
    </article>
  );
}

export function ActionsView() {
  const { architecture, isLoading, replaceArchitecture } = useArchitecture();
  const [filter, setFilter] = useState<ActionFilter>('active');
  const [priority, setPriority] = useState<'all' | ActionPriority>('all');

  const actions = useMemo(() =>
    architecture ? buildSuggestedActions(architecture) : [],
    [architecture],
  );
  const states = useMemo(() =>
    applyActionDecisions(actions, architecture?.actionDecisions),
    [actions, architecture?.actionDecisions],
  );

  if (isLoading) {
    return <div className="max-w-5xl mx-auto px-4 py-10" role="status">Loading actions…</div>;
  }
  if (!architecture || architecture.systems.length === 0) {
    return (
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        <h1 className="font-display text-2xl font-bold text-primary-950">Your actions</h1>
        <p className="text-primary-700">Add some systems first, then StackMap can suggest things worth checking.</p>
        <Link className="btn-primary inline-block" href="/wizard">Start mapping</Link>
      </main>
    );
  }

  const active = states.filter((s) => s.effectiveStatus !== 'reviewed' &&
    s.effectiveStatus !== 'dismissed');
  const high = active.filter((s) => s.action.priority === 'high');
  const visible = states.filter((s) => {
    if (priority !== 'all' && s.action.priority !== priority) return false;
    if (filter === 'active') return s.effectiveStatus !== 'reviewed' && s.effectiveStatus !== 'dismissed';
    if (filter === 'reviewed') return s.effectiveStatus === 'reviewed';
    if (filter === 'dismissed') return s.effectiveStatus === 'dismissed';
    return true;
  });

  const handleChange = (
    action: SuggestedAction,
    changes: Partial<Pick<MapActionDecision, 'status' | 'owner' | 'note'>>,
  ) => replaceArchitecture(updateActionDecision(architecture, action, changes));

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold text-primary-950">Your actions</h1>
        <p className="text-primary-700 max-w-3xl">
          Practical questions arising from your technology map. These are suggestions based
          on what has been recorded, not a complete audit or automatic decisions.
        </p>
        <p className="text-sm text-primary-600">
          Decisions, owners and notes are saved with this map in your browser and included in map exports and snapshots.
        </p>
      </header>

      <dl className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="border border-surface-300 bg-white rounded-lg p-4">
          <dt className="text-xs text-primary-600">Still to consider</dt>
          <dd className="text-2xl font-display font-bold text-primary-950">{active.length}</dd>
        </div>
        <div className="border border-surface-300 bg-white rounded-lg p-4">
          <dt className="text-xs text-primary-600">High priority</dt>
          <dd className="text-2xl font-display font-bold text-primary-950">{high.length}</dd>
        </div>
        <div className="border border-surface-300 bg-white rounded-lg p-4 col-span-2 sm:col-span-1">
          <dt className="text-xs text-primary-600">Reviewed or not applicable</dt>
          <dd className="text-2xl font-display font-bold text-primary-950">{states.length - active.length}</dd>
        </div>
      </dl>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3">
        <label className="flex flex-col gap-1.5 text-sm text-primary-800">
          Show actions
          <select className="rounded-md border border-surface-300 bg-white p-2.5 text-base"
            value={filter} onChange={(event) => setFilter(event.target.value as ActionFilter)}>
            <option value="active">Still to consider</option>
            <option value="all">All findings</option>
            <option value="reviewed">Reviewed</option>
            <option value="dismissed">Not applicable</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5 text-sm text-primary-800">
          Priority
          <select className="rounded-md border border-surface-300 bg-white p-2.5 text-base"
            value={priority}
            onChange={(event) => setPriority(event.target.value as 'all' | ActionPriority)}>
            <option value="all">All priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
      </div>

      {visible.length > 0 ? (
        <div className="space-y-4" aria-label="Action findings">
          {visible.map((item) => <ActionCard key={item.action.id} item={item} onChange={handleChange} />)}
        </div>
      ) : (
        <section className="rounded-xl border border-surface-300 bg-white p-6 space-y-2">
          <h2 className="font-display text-lg font-semibold text-primary-950">No actions in this view</h2>
          <p className="text-sm text-primary-700">
            This may reflect your filters or the information entered so far.
            It does not establish that the whole technology estate has been checked.
          </p>
          <button type="button" className="btn-secondary text-sm"
            onClick={() => { setFilter('all'); setPriority('all'); }}>Show all findings</button>
        </section>
      )}
    </main>
  );
}
