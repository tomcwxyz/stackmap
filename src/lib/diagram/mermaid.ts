import type { Architecture, System } from '@/lib/types';

// ─── Label sanitisation ───

/**
 * Sanitise a string for use as a Mermaid node label.
 *
 * Mermaid is sensitive to parentheses, quotes, semicolons, curly braces, etc.
 * Angle brackets are stripped as well: labels come from user data, including
 * imported files that may have been written by someone else, and the rendered
 * SVG is injected into the page.
 */
export function sanitiseLabel(label: string): string {
  return label
    .replace(/[(){}[\]"';#&<>]/g, '')
    .replace(/'/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Mermaid cannot render an empty label, so fall back to a readable placeholder. */
function labelOr(label: string, fallback: string): string {
  return label.length > 0 ? label : fallback;
}

/**
 * Open a subgraph with a synthetic id and a quoted title.
 *
 * Using the display name as the identifier meant two functions with the same
 * name collided, and a function called `end` or `graph` broke the diagram.
 */
function openSubgraph(id: string, title: string): string {
  return `  subgraph ${id}["${labelOr(title, 'Untitled')}"]`;
}

// ─── Integration type labels ───

const INTEGRATION_TYPE_LABELS: Record<string, string> = {
  api: 'API',
  file_transfer: 'File transfer',
  manual: 'Manual',
  webhook: 'Webhook',
  database_link: 'DB link',
  unknown: 'Integration',
};

function integrationLabel(description?: string, type?: string): string {
  if (description) return sanitiseLabel(description);
  return INTEGRATION_TYPE_LABELS[type ?? 'unknown'] ?? 'Integration';
}

// ─── Cost formatting for diagram labels ───

function annualiseCost(system: System): number | null {
  if (!system.cost) return null;
  if (system.cost.model === 'free') return 0;
  if (system.cost.period === 'monthly') return system.cost.amount * 12;
  return system.cost.amount;
}

function systemLabel(system: System, _owners?: Architecture['owners']): string {
  let label = labelOr(sanitiseLabel(system.name), 'Unnamed system');
  const annual = annualiseCost(system);
  if (annual !== null && annual > 0) {
    label = `${label} - £${annual.toLocaleString('en-GB')}/yr`;
  }
  return label;
}

function ownerName(ownerId: string | undefined, owners: Architecture['owners']): string | null {
  if (!ownerId) return null;
  const owner = owners.find((o) => o.id === ownerId);
  return owner ? sanitiseLabel(owner.name) : null;
}

// ─── Main diagram: functions as subgraphs, systems as nodes, integrations as edges ───

export function generateMermaidDiagram(arch: Architecture): string {
  const systems = arch.systems.filter((s) => !s.isShadow);
  const lines: string[] = ['graph TB'];

  const systemIdToFunctions = new Map<string, string[]>();
  for (const sys of systems) {
    systemIdToFunctions.set(sys.id, sys.functionIds);
  }

  // Build function subgraphs
  const systemsPlaced = new Set<string>();

  for (const [index, fn] of arch.functions.entries()) {
    lines.push(openSubgraph(`fn_${index}`, sanitiseLabel(fn.name)));

    const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
    for (const sys of fnSystems) {
      const sysLabel = systemLabel(sys, arch.owners);
      lines.push(`    ${sys.id}[${sysLabel}]`);
      systemsPlaced.add(sys.id);
    }

    lines.push('  end');
  }

  // Orphan systems (no function assignment)
  const orphans = systems.filter((s) => !systemsPlaced.has(s.id));
  if (orphans.length > 0) {
    for (const sys of orphans) {
      const sysLabel = systemLabel(sys, arch.owners);
      lines.push(`  ${sys.id}[${sysLabel}]`);
    }
  }

  // Services subgraph
  if (arch.services.length > 0) {
    lines.push(openSubgraph('services', 'Services'));
    for (const svc of arch.services) {
      lines.push(`    ${svc.id}[${labelOr(sanitiseLabel(svc.name), 'Unnamed service')}]`);
    }
    lines.push('  end');

    // Service-to-system edges (dashed)
    for (const svc of arch.services) {
      for (const sysId of svc.systemIds) {
        lines.push(`  ${svc.id} -.-> ${sysId}`);
      }
    }
  }

  // Owner annotations
  for (const sys of systems) {
    const name = ownerName(sys.ownerId, arch.owners);
    if (name) {
      const ownNodeId = `${sys.id}_owner`;
      lines.push(`  ${ownNodeId}[/${name}/]`);
      lines.push(`  ${sys.id} -.- ${ownNodeId}`);
    }
  }

  // Data category annotations
  const systemDataCategories = new Map<string, string[]>();
  for (const dc of arch.dataCategories) {
    for (const sysId of dc.systemIds) {
      const existing = systemDataCategories.get(sysId) ?? [];
      existing.push(sanitiseLabel(dc.name));
      systemDataCategories.set(sysId, existing);
    }
  }

  for (const [sysId, categories] of systemDataCategories) {
    // Mermaid doesn't have native annotations, so we use a note-style node
    const noteId = `${sysId}_data`;
    const noteLabel = categories.join(', ');
    lines.push(`  ${noteId}[/${noteLabel}/]`);
    lines.push(`  ${sysId} -.- ${noteId}`);
  }

  // Integrations as edges
  for (const intg of arch.integrations) {
    const label = integrationLabel(intg.description, intg.type);
    if (intg.direction === 'two_way') {
      lines.push(`  ${intg.sourceSystemId} <-->|${label}| ${intg.targetSystemId}`);
    } else {
      lines.push(`  ${intg.sourceSystemId} -->|${label}| ${intg.targetSystemId}`);
    }
  }

  // Status styling
  lines.push('  classDef planned stroke-dasharray:5 5,opacity:0.7');
  lines.push('  classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
  lines.push('  classDef legacy fill:#d1d5db,opacity:0.6');

  for (const sys of systems) {
    if (sys.status !== 'active') {
      lines.push(`  class ${sys.id} ${sys.status}`);
    }
  }

  return lines.join('\n');
}

// ─── System diagram: flat nodes + integration edges (no function grouping) ───

export function generateSystemDiagram(arch: Architecture): string {
  const systems = arch.systems.filter((s) => !s.isShadow);
  const lines: string[] = ['graph TB'];

  // All systems as flat nodes
  for (const sys of systems) {
    const sysLabel = labelOr(sanitiseLabel(sys.name), 'Unnamed system');
    lines.push(`  ${sys.id}[${sysLabel}]`);
  }

  // Integrations as edges
  for (const intg of arch.integrations) {
    const label = integrationLabel(intg.description, intg.type);
    if (intg.direction === 'two_way') {
      lines.push(`  ${intg.sourceSystemId} <-->|${label}| ${intg.targetSystemId}`);
    } else {
      lines.push(`  ${intg.sourceSystemId} -->|${label}| ${intg.targetSystemId}`);
    }
  }

  // Status styling
  lines.push('  classDef planned stroke-dasharray:5 5,opacity:0.7');
  lines.push('  classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
  lines.push('  classDef legacy fill:#d1d5db,opacity:0.6');

  for (const sys of systems) {
    if (sys.status !== 'active') {
      lines.push(`  class ${sys.id} ${sys.status}`);
    }
  }

  return lines.join('\n');
}

// ─── Function diagram: functions as subgraphs with systems, no integration edges ───

export function generateFunctionDiagram(arch: Architecture): string {
  const systems = arch.systems.filter((s) => !s.isShadow);
  const lines: string[] = ['graph TB'];

  const systemsPlaced = new Set<string>();

  for (const [index, fn] of arch.functions.entries()) {
    lines.push(openSubgraph(`fn_${index}`, sanitiseLabel(fn.name)));

    const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
    for (const sys of fnSystems) {
      const sysLabel = labelOr(sanitiseLabel(sys.name), 'Unnamed system');
      lines.push(`    ${sys.id}[${sysLabel}]`);
      systemsPlaced.add(sys.id);
    }

    lines.push('  end');
  }

  // Orphan systems
  const orphans = systems.filter((s) => !systemsPlaced.has(s.id));
  for (const sys of orphans) {
    const sysLabel = labelOr(sanitiseLabel(sys.name), 'Unnamed system');
    lines.push(`  ${sys.id}[${sysLabel}]`);
  }

  // Status styling
  lines.push('  classDef planned stroke-dasharray:5 5,opacity:0.7');
  lines.push('  classDef retiring stroke-dasharray:5 5,fill:#e5e7eb,opacity:0.5');
  lines.push('  classDef legacy fill:#d1d5db,opacity:0.6');

  for (const sys of systems) {
    if (sys.status !== 'active') {
      lines.push(`  class ${sys.id} ${sys.status}`);
    }
  }

  return lines.join('\n');
}

// ─── Data flow diagram: systems coloured by sensitivity, edges labelled with data categories ───

export function generateDataFlowDiagram(arch: Architecture): string {
  const systems = arch.systems.filter((s) => !s.isShadow);
  const lines: string[] = ['graph TB'];

  // Systems as nodes
  for (const sys of systems) {
    lines.push(`  ${sys.id}[${labelOr(sanitiseLabel(sys.name), 'Unnamed system')}]`);
  }

  // Style classes for sensitivity
  lines.push('  classDef public fill:#dcfce7,stroke:#16a34a');
  lines.push('  classDef internal fill:#dbeafe,stroke:#2563eb');
  lines.push('  classDef confidential fill:#ffedd5,stroke:#ea580c');
  lines.push('  classDef restricted fill:#fecaca,stroke:#dc2626');

  // Build map of integration edges to data categories
  const edgeData = new Map<string, string[]>();
  for (const dc of arch.dataCategories) {
    for (const intg of arch.integrations) {
      if (dc.systemIds.includes(intg.sourceSystemId) && dc.systemIds.includes(intg.targetSystemId)) {
        const edgeKey = `${intg.sourceSystemId}-${intg.targetSystemId}`;
        const existing = edgeData.get(edgeKey) ?? [];
        existing.push(sanitiseLabel(dc.name));
        edgeData.set(edgeKey, existing);
      }
    }
  }

  // Render edges with data category labels
  for (const intg of arch.integrations) {
    const edgeKey = `${intg.sourceSystemId}-${intg.targetSystemId}`;
    const categories = edgeData.get(edgeKey);
    const label = categories ? categories.join(', ') : integrationLabel(intg.description, intg.type);

    if (intg.direction === 'two_way') {
      lines.push(`  ${intg.sourceSystemId} <-->|${label}| ${intg.targetSystemId}`);
    } else {
      lines.push(`  ${intg.sourceSystemId} -->|${label}| ${intg.targetSystemId}`);
    }
  }

  // Apply sensitivity classes to systems based on highest-sensitivity data they hold
  const systemSensitivity = new Map<string, string>();
  const sensitivityOrder = ['public', 'internal', 'confidential', 'restricted'];
  for (const dc of arch.dataCategories) {
    for (const sysId of dc.systemIds) {
      const current = systemSensitivity.get(sysId);
      if (!current || sensitivityOrder.indexOf(dc.sensitivity) > sensitivityOrder.indexOf(current)) {
        systemSensitivity.set(sysId, dc.sensitivity);
      }
    }
  }
  for (const [sysId, sensitivity] of systemSensitivity) {
    lines.push(`  class ${sysId} ${sensitivity}`);
  }

  return lines.join('\n');
}

// ─── Service diagram: services as subgraphs with their systems ───

export function generateServiceDiagram(arch: Architecture): string {
  const systems = arch.systems.filter((s) => !s.isShadow);
  const lines: string[] = ['graph TB'];

  const systemsPlaced = new Set<string>();

  for (const [index, svc] of arch.services.entries()) {
    lines.push(openSubgraph(`svc_${index}`, sanitiseLabel(svc.name)));

    const svcSystems = systems.filter((s) => svc.systemIds.includes(s.id));
    for (const sys of svcSystems) {
      const sysLabel = systemLabel(sys, arch.owners);
      lines.push(`    ${sys.id}[${sysLabel}]`);
      systemsPlaced.add(sys.id);
    }

    lines.push('  end');
  }

  // Systems not linked to any service
  const orphans = systems.filter((s) => !systemsPlaced.has(s.id));
  if (orphans.length > 0) {
    lines.push(openSubgraph('other_systems', 'Other'));
    for (const sys of orphans) {
      const sysLabel = systemLabel(sys, arch.owners);
      lines.push(`    ${sys.id}[${sysLabel}]`);
    }
    lines.push('  end');
  }

  // Integrations as edges
  for (const intg of arch.integrations) {
    const label = integrationLabel(intg.description, intg.type);
    if (intg.direction === 'two_way') {
      lines.push(`  ${intg.sourceSystemId} <-->|${label}| ${intg.targetSystemId}`);
    } else {
      lines.push(`  ${intg.sourceSystemId} -->|${label}| ${intg.targetSystemId}`);
    }
  }

  return lines.join('\n');
}
