import type { Architecture, Integration, System } from '@/lib/types';
import { annualiseCost } from '@/lib/cost-analysis';

export type ExplorerNodeKind = 'function' | 'system' | 'service' | 'data';
export type ExplorerEdgeKind = 'function' | 'service' | 'data' | 'integration';

export interface ExplorerNode {
  id: string;
  kind: ExplorerNodeKind;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  status?: System['status'];
  isShadow?: boolean;
}

export interface ExplorerEdge {
  id: string;
  source: string;
  target: string;
  kind: ExplorerEdgeKind;
  direction?: Integration['direction'];
  reliability?: Integration['reliability'];
}

export interface ExplorerOptions {
  functionId?: string;
  showFunctions?: boolean;
  showServices?: boolean;
  showData?: boolean;
  showConnections?: boolean;
}

export interface ExplorerGraph {
  nodes: ExplorerNode[];
  edges: ExplorerEdge[];
  width: number;
  height: number;
  systemCount: number;
  totalSystems: number;
}

export interface SystemConnection {
  id: string;
  name: string;
  type: Integration['type'];
  description?: string;
  reliability: Integration['reliability'];
}

export interface SystemImpact {
  system: System;
  owner?: string;
  functions: string[];
  services: string[];
  data: { name: string; personal: boolean; sensitivity: string }[];
  outgoing: SystemConnection[];
  incoming: SystemConnection[];
  recipients: string[];
  annualCost?: number;
}

/** Keeps the map grounded in explicit relationships, never inferred proximity. */
export function buildExplorerGraph(
  arch: Architecture,
  options: ExplorerOptions = {},
): ExplorerGraph {
  const {
    functionId,
    showFunctions = true,
    showServices = true,
    showData = false,
    showConnections = true,
  } = options;
  const systems = arch.systems
    .filter((s) => !functionId || s.functionIds.includes(functionId))
    .sort((a, b) => a.name.localeCompare(b.name));
  const displayedIds = new Set(systems.map((s) => s.id));

  const functions = showFunctions
    ? arch.functions
        .filter((f) => !functionId || f.id === functionId)
        .filter((f) => !functionId || systems.some((s) => s.functionIds.includes(f.id)))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const services = showServices
    ? arch.services.filter((svc) => !functionId || systems.some(
        (s) => svc.systemIds.includes(s.id) || s.serviceIds.includes(svc.id),
      )).sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const data = showData
    ? arch.dataCategories.filter((d) => !functionId ||
        d.systemIds.some((id) => displayedIds.has(id)))
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Columns move together as layers are toggled; the system column is always present.
  const columns: { kind: ExplorerNodeKind; items: { id: string; name: string }[] }[] = [];
  if (showFunctions) columns.push({ kind: 'function', items: functions });
  columns.push({ kind: 'system', items: systems });
  if (showServices) columns.push({ kind: 'service', items: services });
  if (showData) columns.push({ kind: 'data', items: data });

  const nodeWidth = 234;
  const nodeHeight = 62;
  const nodes: ExplorerNode[] = [];
  columns.forEach((col, colIndex) => {
    col.items.forEach((item, index) => {
      const system = col.kind === 'system' ? systems.find((s) => s.id === item.id) : undefined;
      nodes.push({
        id: col.kind + ':' + item.id,
        kind: col.kind,
        label: item.name,
        x: 30 + colIndex * 278,
        y: 86 + index * 83,
        width: nodeWidth,
        height: nodeHeight,
        status: system?.status,
        isShadow: system?.isShadow,
      });
    });
  });

  const present = new Set(nodes.map((n) => n.id));
  const edges: ExplorerEdge[] = [];
  const add = (edge: ExplorerEdge) => {
    if (present.has(edge.source) && present.has(edge.target)) edges.push(edge);
  };

  for (const s of systems) {
    for (const f of s.functionIds) {
      add({ id: 'fn:' + f + ':' + s.id, source: 'function:' + f,
        target: 'system:' + s.id, kind: 'function' });
    }
  }
  for (const svc of services) {
    // The architecture holds service membership on both entities.
    const ids = new Set([
      ...svc.systemIds,
      ...systems.filter((s) => s.serviceIds.includes(svc.id)).map((s) => s.id),
    ]);
    for (const id of ids) add({
      id: 'svc:' + svc.id + ':' + id, source: 'system:' + id,
      target: 'service:' + svc.id, kind: 'service',
    });
  }
  for (const category of data) {
    for (const id of category.systemIds) add({
      id: 'data:' + category.id + ':' + id, source: 'system:' + id,
      target: 'data:' + category.id, kind: 'data',
    });
  }
  if (showConnections) {
    for (const connection of arch.integrations) add({
      id: 'integration:' + connection.id,
      source: 'system:' + connection.sourceSystemId,
      target: 'system:' + connection.targetSystemId,
      kind: 'integration',
      direction: connection.direction,
      reliability: connection.reliability,
    });
  }

  return {
    nodes,
    edges,
    width: Math.max(380, 60 + columns.length * 278),
    height: Math.max(320, 130 + Math.max(...columns.map((c) => c.items.length), 0) * 83),
    systemCount: systems.length,
    totalSystems: arch.systems.length,
  };
}

/**
 * Only directly recorded impacts. A data flow is not proof that a downstream
 * service fails if this system goes offline, nor that a licence can be removed.
 */
export function inspectSystemImpact(arch: Architecture, id: string): SystemImpact | null {
  const system = arch.systems.find((s) => s.id === id);
  if (!system) return null;

  const validIds = new Set(arch.systems.map((s) => s.id));
  const services = arch.services.filter((svc) =>
    svc.systemIds.includes(id) || system.serviceIds.includes(svc.id));
  const data = arch.dataCategories.filter((dc) => dc.systemIds.includes(id));
  const outgoing: SystemConnection[] = [];
  const incoming: SystemConnection[] = [];

  for (const connection of arch.integrations) {
    const from = arch.systems.find((s) => s.id === connection.sourceSystemId);
    const to = arch.systems.find((s) => s.id === connection.targetSystemId);
    if (!from || !to) continue;
    if (from.id === id) outgoing.push({
      id: connection.id, name: to.name, type: connection.type,
      reliability: connection.reliability, description: connection.description,
    });
    if (to.id === id) incoming.push({
      id: connection.id, name: from.name, type: connection.type,
      reliability: connection.reliability, description: connection.description,
    });
    // A two-way integration has two actual flow directions, even when only
    // one source/target pair was stored.
    if (connection.direction === 'two_way') {
      if (from.id === id && to.id !== id) incoming.push({
        id: connection.id, name: to.name, type: connection.type,
        reliability: connection.reliability, description: connection.description,
      });
      if (to.id === id && from.id !== id) outgoing.push({
        id: connection.id, name: from.name, type: connection.type,
        reliability: connection.reliability, description: connection.description,
      });
    }
  }

  const partyIds = new Set(arch.externalParties.map((p) => p.id));
  const recipients = [...new Set(arch.dataFlows
    .filter((flow) => flow.systemId === id && partyIds.has(flow.partyId))
    .map((flow) => arch.externalParties.find((party) => party.id === flow.partyId)!.name))];

  return {
    system,
    owner: arch.owners.find((owner) => owner.id === system.ownerId)?.name,
    functions: arch.functions.filter((fn) => system.functionIds.includes(fn.id)).map((fn) => fn.name),
    services: services.map((svc) => svc.name),
    data: data.map((dc) => ({ name: dc.name, personal: dc.containsPersonalData, sensitivity: dc.sensitivity })),
    outgoing: outgoing.filter((item) => validIds.has(arch.systems.find((s) => s.name === item.name)?.id ?? '')),
    incoming: incoming.filter((item) => validIds.has(arch.systems.find((s) => s.name === item.name)?.id ?? '')),
    recipients,
    annualCost: system.cost ? annualiseCost(system) : undefined,
  };
}

/** Emphasis affects visuals only: it never creates or removes an edge. */
export function relatedNodeIds(graph: ExplorerGraph, systemId: string): Set<string> {
  const focus = 'system:' + systemId;
  const related = new Set([focus]);
  for (const edge of graph.edges) {
    if (edge.source === focus) related.add(edge.target);
    if (edge.target === focus) related.add(edge.source);
  }
  return related;
}
