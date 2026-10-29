'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Architecture } from '@/lib/types';
import { formatCurrency } from '@/lib/cost-analysis';
import { riskLevel, totalScore } from '@/lib/techfreedom/risk';
import { useCompactMapLayout } from '@/hooks/useCompactMapLayout';
import { MobileSystemList } from './mobile-system-list';
import {
  buildExplorerGraph,
  inspectSystemImpact,
  relatedNodeIds,
  type ExplorerEdge,
  type ExplorerNode,
} from '@/lib/analysis/architecture-explorer';

interface ArchitectureExplorerProps {
  architecture: Architecture;
}

type LayerName = 'functions' | 'services' | 'data' | 'connections';

const EDGE_COLOURS: Record<ExplorerEdge['kind'], string> = {
  function: '#82968e',
  service: '#d09540',
  data: '#8978aa',
  integration: '#326d53',
};

function connectionPath(source: ExplorerNode, target: ExplorerNode, kind: ExplorerEdge['kind']): string {
  if (kind === 'integration') {
    // Both systems sit in the same column. Route their recorded link to the
    // right-hand gutter rather than drawing over intervening system cards.
    const startX = source.x + source.width;
    const startY = source.y + source.height / 2;
    const endY = target.y + target.height / 2;
    const bend = startX + 30 + Math.min(64, Math.abs(endY - startY) / 5);
    return 'M ' + startX + ' ' + startY + ' C ' + bend + ' ' + startY +
      ', ' + bend + ' ' + endY + ', ' + startX + ' ' + endY;
  }
  const forward = target.x > source.x;
  const fromX = forward ? source.x + source.width : source.x;
  const toX = forward ? target.x : target.x + target.width;
  const mid = (fromX + toX) / 2;
  return 'M ' + fromX + ' ' + (source.y + source.height / 2) +
    ' C ' + mid + ' ' + (source.y + source.height / 2) +
    ', ' + mid + ' ' + (target.y + target.height / 2) +
    ', ' + toX + ' ' + (target.y + target.height / 2);
}

function LayerCheckbox({
  label, checked, onChange,
}: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-primary-800 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 accent-primary-700"
      />
      {label}
    </label>
  );
}

function ItemNames({ names, empty }: { names: string[]; empty: string }) {
  if (names.length === 0) return <p className="text-sm text-primary-500">{empty}</p>;
  return (
    <ul className="text-sm text-primary-800 space-y-1 list-disc list-inside">
      {names.map((name, index) => <li key={index}>{name}</li>)}
    </ul>
  );
}

function ImpactDetails({ architecture, systemId }: { architecture: Architecture; systemId: string }) {
  const impact = inspectSystemImpact(architecture, systemId);
  if (!impact) return null;
  const { system, owner, functions, services, data, outgoing, incoming, recipients, annualCost } = impact;
  const risk = system.techFreedomScore;
  return (
    <aside className="bg-white border border-surface-300 rounded-xl p-5 space-y-5" aria-label="Selected system details">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Selected system</p>
        <h3 className="font-display text-xl font-bold text-primary-950">{system.name}</h3>
        <p className="text-sm text-primary-700">
          {system.status === 'legacy' ? 'Legacy' :
            system.status === 'retiring' ? 'Retiring' :
            system.status === 'planned' ? 'Planned' : 'Active'} · {owner ?? 'No named owner'}
        </p>
      </div>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-primary-600">Annual cost</dt>
          <dd className="font-semibold text-primary-900">
            {annualCost === undefined ? 'Not recorded' : formatCurrency(annualCost)}
          </dd>
          {system.cost?.source === 'estimate' &&
            <dd className="text-xs text-primary-600">Estimate only</dd>}
        </div>
        <div>
          <dt className="text-primary-600">TechFreedom risk</dt>
          <dd className="font-semibold text-primary-900">
            {risk ? riskLevel(totalScore(risk)) + (risk.isAutoScored ? ' (catalogue)' : ' (manual)') : 'Not assessed'}
          </dd>
        </div>
      </dl>

      <section aria-labelledby="impact-heading" className="border-t border-surface-200 pt-4 space-y-3">
        <h4 id="impact-heading" className="font-display text-lg font-semibold text-primary-900">
          What if this system were unavailable?
        </h4>
        <p className="text-sm text-primary-700">
          These are <strong>recorded direct relationships to investigate</strong>, not confirmed
          service failures or an estimate of savings. The map cannot yet show unrecorded dependencies.
        </p>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">Services using it</h5>
          <ItemNames names={services} empty="No service links recorded." />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">Organisational functions</h5>
          <ItemNames names={functions} empty="No functions linked." />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">Systems receiving from it</h5>
          <ItemNames
            names={outgoing.map((c) => c.name + (c.reliability === 'fragile' ? ' · fragile connection' : ''))}
            empty="No outgoing connections recorded."
          />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">Systems supplying it</h5>
          <ItemNames
            names={incoming.map((c) => c.name + (c.reliability === 'fragile' ? ' · fragile connection' : ''))}
            empty="No incoming connections recorded."
          />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">Data recorded here</h5>
          <ItemNames
            names={data.map((item) => item.name + (item.personal ? ' · personal data' : ''))}
            empty="No data categories linked."
          />
        </div>
        <div>
          <h5 className="text-sm font-semibold text-primary-900 mb-1">External recipients</h5>
          <ItemNames names={recipients} empty="No outward sharing recorded." />
        </div>
      </section>
      {system.notes && (
        <div className="border-t border-surface-200 pt-3 space-y-1">
          <h5 className="text-sm font-semibold text-primary-900">Notes</h5>
          <p className="text-sm text-primary-700 whitespace-pre-wrap">{system.notes}</p>
        </div>
      )}
      <Link className="inline-block text-sm text-primary-700 underline underline-offset-2" href="/view/systems">
        Edit in your systems
      </Link>
    </aside>
  );
}

function InteractiveGraph({
  graph, selectedId, onSelect, compact = false,
}: {
  graph: ReturnType<typeof buildExplorerGraph>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  compact?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!compact || !scrollRef.current) return;
    // Start by showing the system column, rather than a cut-off function card.
    const firstSystem = graph.nodes.find((node) => node.kind === 'system');
    scrollRef.current.scrollLeft = Math.max(0, (firstSystem?.x ?? 0) - 20);
    scrollRef.current.scrollTop = 0;
  }, [compact, graph]);
  const nodeIndex = useMemo(
    () => new Map(graph.nodes.map((node) => [node.id, node])),
    [graph.nodes],
  );
  const related = useMemo(
    () => selectedId ? relatedNodeIds(graph, selectedId) : null,
    [graph, selectedId],
  );
  return (
    <div
      ref={scrollRef}
      className={
        'w-full min-w-0 overflow-auto border border-surface-300 rounded-xl bg-surface-50 ' +
        (compact ? 'max-h-[65vh] overscroll-contain' : '')
      }
      role="region"
      aria-label="Interactive architecture map"
      tabIndex={0}
    >
      <div
        className="relative"
        style={{ width: graph.width, height: graph.height, minHeight: 320 }}
      >
        <svg
          viewBox={'0 0 ' + graph.width + ' ' + graph.height}
          width={graph.width}
          height={graph.height}
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
        >
          <defs>
            <marker id="stackmap-one-way-arrow" viewBox="0 0 10 10"
              refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#326d53" />
            </marker>
          </defs>
          {graph.edges.map((edge) => {
            const source = nodeIndex.get(edge.source);
            const target = nodeIndex.get(edge.target);
            if (!source || !target) return null;
            const active = !related || (edge.source === 'system:' + selectedId ||
              edge.target === 'system:' + selectedId);
            return (
              <path
                key={edge.id}
                d={connectionPath(source, target, edge.kind)}
                fill="none"
                stroke={EDGE_COLOURS[edge.kind]}
                strokeWidth={edge.kind === 'integration' ? 2.5 : 1.5}
                strokeDasharray={edge.kind === 'integration' ? undefined : '5 5'}
                markerEnd={edge.kind === 'integration' ? 'url(#stackmap-one-way-arrow)' : undefined}
                markerStart={edge.kind === 'integration' && edge.direction === 'two_way'
                  ? 'url(#stackmap-one-way-arrow)' : undefined}
                opacity={active ? 0.85 : 0.09}
              />
            );
          })}
        </svg>
        {graph.nodes.map((node) => {
          const isSystem = node.kind === 'system';
          const id = node.id.slice(node.kind.length + 1);
          const selected = isSystem && selectedId === id;
          const dimmed = related && !related.has(node.id);
          const classes = selected
            ? 'bg-primary-800 text-white border-primary-900 shadow-md'
            : isSystem
              ? 'bg-white text-primary-950 border-primary-400 hover:border-primary-700'
              : node.kind === 'service'
                ? 'bg-amber-50 text-amber-950 border-amber-400'
                : node.kind === 'data'
                  ? 'bg-violet-50 text-violet-950 border-violet-300'
                  : 'bg-surface-100 text-primary-800 border-surface-300';
          const content = (
            <>
              <span className="block text-[10px] uppercase tracking-wide opacity-70">
                {node.kind}{node.isShadow ? ' · informal' : ''}
              </span>
              <span className="block text-sm font-semibold leading-snug break-words line-clamp-2">
                {node.label}
              </span>
              {node.status && node.status !== 'active' && (
                <span className="block text-[11px] opacity-75">{node.status}</span>
              )}
            </>
          );
          const sharedClass = 'absolute box-border rounded-lg border-2 px-3 py-2 text-left overflow-hidden transition-opacity ' +
            (node.status === 'retiring' ? 'border-dashed ' : '') +
            (dimmed ? 'opacity-25 ' : '') + classes;
          const style = {
            left: node.x, top: node.y, width: node.width, height: node.height,
          };
          return isSystem ? (
            <button
              key={node.id}
              type="button"
              style={style}
              className={sharedClass + ' focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'}
              aria-pressed={selected}
              aria-label={'Inspect ' + node.label}
              title={node.label}
              onClick={() => onSelect(id)}
            >
              {content}
            </button>
          ) : (
            <div key={node.id} style={style} className={sharedClass} title={node.label}>
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ArchitectureExplorer({ architecture }: ArchitectureExplorerProps) {
  const compact = useCompactMapLayout();
  const [mobileMode, setMobileMode] = useState<'browse' | 'network'>('browse');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [functionId, setFunctionId] = useState('');
  const [layers, setLayers] = useState({
    functions: true, services: true, data: false, connections: true,
  });
  const graph = useMemo(
    () => buildExplorerGraph(architecture, {
      functionId: functionId || undefined,
      showFunctions: layers.functions,
      showServices: layers.services,
      showData: layers.data,
      showConnections: layers.connections,
    }),
    [architecture, functionId, layers],
  );
  const visibleSystems = useMemo(() => {
    const included = new Set(graph.nodes
      .filter((node) => node.kind === 'system')
      .map((node) => node.id.slice('system:'.length)));
    return architecture.systems
      .filter((system) => included.has(system.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [architecture.systems, graph.nodes]);
  const setLayer = (layer: LayerName, value: boolean) => {
    setLayers((prev) => ({ ...prev, [layer]: value }));
  };

  // Selection remains valid even when a layer is hidden; filters explicitly
  // reset it, so the side panel never silently refers to a filtered-out node.
  return (
    <div className="space-y-4">
      <div className="bg-white border border-surface-200 rounded-xl p-4 space-y-4">
        <div className="flex flex-wrap justify-between items-start gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold text-primary-950">Explore connections</h2>
            <p className="text-sm text-primary-700 mt-1">
              Select any system to explore what is recorded about its relationships and possible impact.
            </p>
          </div>
          {selectedId && (
            <button className="btn-secondary text-sm px-3 py-1.5" type="button"
              onClick={() => setSelectedId(null)}>
              Clear selection
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3 items-end">
          <label className="text-sm text-primary-800 flex flex-col gap-1">
            Organisational area
            <select
              className="border border-surface-300 rounded-md bg-white p-2 text-primary-900"
              value={functionId}
              onChange={(event) => {
                setFunctionId(event.target.value);
                setSelectedId(null);
              }}
            >
              <option value="">All areas</option>
              {architecture.functions.map((fn) => (
                <option value={fn.id} key={fn.id}>{fn.name}</option>
              ))}
            </select>
          </label>
          {compact ? (
            <details className="w-full border-t border-surface-200 pt-2">
              <summary className="cursor-pointer text-sm font-semibold text-primary-800">
                Map layers and connections
              </summary>
              <fieldset className="mt-3 flex flex-wrap gap-x-5 gap-y-3">
                <legend className="sr-only">Show links to</legend>
                <LayerCheckbox label="Functions" checked={layers.functions}
                  onChange={(checked) => setLayer('functions', checked)} />
                <LayerCheckbox label="Services" checked={layers.services}
                  onChange={(checked) => setLayer('services', checked)} />
                <LayerCheckbox label="Data" checked={layers.data}
                  onChange={(checked) => setLayer('data', checked)} />
                <LayerCheckbox label="Connections" checked={layers.connections}
                  onChange={(checked) => setLayer('connections', checked)} />
              </fieldset>
            </details>
          ) : (
            <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
              <legend className="text-xs font-medium text-primary-700 mb-1">Show links to</legend>
              <LayerCheckbox label="Functions" checked={layers.functions}
                onChange={(checked) => setLayer('functions', checked)} />
              <LayerCheckbox label="Services" checked={layers.services}
                onChange={(checked) => setLayer('services', checked)} />
              <LayerCheckbox label="Data" checked={layers.data}
                onChange={(checked) => setLayer('data', checked)} />
              <LayerCheckbox label="Connections" checked={layers.connections}
                onChange={(checked) => setLayer('connections', checked)} />
            </fieldset>
          )>
        </div>
        <p className="text-xs text-primary-600">
          Showing {graph.systemCount} of {graph.totalSystems} systems.
          {compact
            ? ' Select a system to investigate its recorded relationships.'
            : ' Solid arrows show recorded system integrations; dashed lines show associations. Shared areas do not imply direct integrations.'}
        </p>
      </div>

      {graph.systemCount === 0 ? (
        <div className="border border-surface-300 rounded-xl bg-white p-8">
          <p className="text-primary-700">No systems belong to this area yet. Choose another area or add systems.</p>
        </div>
      ) : compact ? (
        <div className="space-y-3" data-testid="mobile-architecture-explorer">
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="Mobile map view">
            <button
              type="button"
              aria-pressed={mobileMode === 'browse'}
              className={mobileMode === 'browse' ? 'btn-primary text-sm py-2.5' : 'btn-secondary text-sm py-2.5'}
              onClick={() => { setMobileMode('browse'); setSelectedId(null); }}
            >
              Browse systems
            </button>
            <button
              type="button"
              aria-pressed={mobileMode === 'network'}
              className={mobileMode === 'network' ? 'btn-primary text-sm py-2.5' : 'btn-secondary text-sm py-2.5'}
              onClick={() => { setMobileMode('network'); setSelectedId(null); }}
            >
              Full network
            </button>
          </div>
          {selectedId ? (
            <div className="space-y-3">
              <button type="button" className="btn-secondary text-sm px-3 py-2"
                onClick={() => setSelectedId(null)}>
                ← Back to {mobileMode === 'browse' ? 'systems' : 'network'}
              </button>
              <ImpactDetails architecture={architecture} systemId={selectedId} />
            </div>
          ) : mobileMode === 'browse' ? (
            <MobileSystemList
              architecture={architecture}
              systems={visibleSystems}
              onInspect={setSelectedId}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-primary-700">
                Swipe horizontally to see other layers, and vertically to explore more systems.
                Select a system for a focused view.
              </p>
              <InteractiveGraph
                graph={graph}
                compact
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start">
          <InteractiveGraph
            graph={graph}
            selectedId={selectedId}
            onSelect={(id) => setSelectedId((current) => current === id ? null : id)}
          />
          {selectedId ? (
            <ImpactDetails architecture={architecture} systemId={selectedId} />
          ) : (
            <div className="bg-white border border-surface-300 rounded-xl p-5 space-y-3">
              <h3 className="font-display text-lg font-semibold text-primary-950">Start with a system</h3>
              <p className="text-sm text-primary-700">
                Pick a system on the map to see the services, data flows,
                connected tools and external recipients recorded for it.
              </p>
              <p className="text-sm text-primary-600">
                The map reflects what people entered — missing connections are not evidence
                that a system operates independently.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
