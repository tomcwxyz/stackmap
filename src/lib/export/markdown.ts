import type { Architecture, System } from '@/lib/types';
import { annualiseCost, calculateCostSummary, formatCurrency } from '@/lib/cost-analysis';
import { totalScore, riskLevel } from '@/lib/techfreedom/risk';

// ─── Helpers ───

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatType(type: string): string {
  return type
    .split('_')
    .map(capitalize)
    .join(' ');
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ─── Main export ───

export function generateMarkdownExport(arch: Architecture): string {
  const lines: string[] = [];
  const { organisation, functions, services, systems, dataCategories, integrations, owners, metadata } = arch;
  const techFreedomEnabled = metadata.techFreedomEnabled === true;

  // Header
  lines.push(`# Technology Architecture Map: ${organisation.name || 'Unnamed Organisation'}`);
  lines.push('');
  lines.push(`**Organisation:** ${organisation.name || 'Not set'}`);

  const metaLine: string[] = [];
  metaLine.push(`**Type:** ${formatType(organisation.type)}`);
  if (organisation.size) metaLine.push(`**Size:** ${capitalize(organisation.size)}`);
  if (organisation.staffCount != null && organisation.staffCount > 0) {
    metaLine.push(`**Staff:** ${organisation.staffCount}`);
  }
  lines.push(metaLine.join('  '));

  const dateLine: string[] = [];
  dateLine.push(`**Mapped on:** ${formatDate(metadata.exportedAt)}`);
  dateLine.push(`**Path:** ${metadata.mappingPath === 'service_first' ? 'service-first' : 'function-first'}`);
  lines.push(dateLine.join('  '));

  lines.push('');
  lines.push('---');
  lines.push('');

  // Functions
  if (functions.length > 0) {
    lines.push('## Functions');
    lines.push('');
    lines.push('| Function | Systems | Status |');
    lines.push('|----------|---------|--------|');
    for (const fn of functions) {
      const fnSystems = systems.filter((s) => s.functionIds.includes(fn.id));
      const sysNames = fnSystems.length > 0 ? fnSystems.map((s) => s.name).join(', ') : '\u2014';
      lines.push(`| ${fn.name} | ${sysNames} | ${fn.isActive ? 'Active' : 'Inactive'} |`);
    }
    lines.push('');
  }

  // Systems
  if (systems.length > 0) {
    lines.push('## Systems');
    lines.push('');
    lines.push('| System | Type | Hosting | Owner | Annual Cost |');
    lines.push('|--------|------|---------|-------|-------------|');
    for (const sys of systems) {
      const ownerObj = sys.ownerId ? owners.find((o) => o.id === sys.ownerId) : undefined;
      const ownerStr = ownerObj ? ownerObj.name : '\u2014';
      const annual = annualiseCost(sys);
      const costStr = sys.cost
        ? sys.cost.model === 'free'
          ? 'Free'
          : formatCurrency(annual)
        : '\u2014';
      lines.push(`| ${sys.name} | ${formatType(sys.type)} | ${formatType(sys.hosting)} | ${ownerStr} | ${costStr} |`);
    }
    lines.push('');
  }

  // Services
  if (services.length > 0) {
    lines.push('## Services');
    lines.push('');
    lines.push('| Service | Status | Functions | Systems |');
    lines.push('|---------|--------|-----------|---------|');
    for (const svc of services) {
      const svcFunctions = svc.functionIds
        .map((fId) => functions.find((f) => f.id === fId)?.name)
        .filter(Boolean)
        .join(', ') || '\u2014';
      const svcSystems = svc.systemIds
        .map((sId) => systems.find((s) => s.id === sId)?.name)
        .filter(Boolean)
        .join(', ') || '\u2014';
      lines.push(`| ${svc.name} | ${capitalize(svc.status)} | ${svcFunctions} | ${svcSystems} |`);
    }
    lines.push('');
  }

  // Data Categories
  if (dataCategories.length > 0) {
    lines.push('## Data Categories');
    lines.push('');
    lines.push('| Category | Sensitivity | Personal Data | Systems |');
    lines.push('|----------|-------------|---------------|---------|');
    for (const dc of dataCategories) {
      const dcSystems = dc.systemIds
        .map((sId) => systems.find((s) => s.id === sId)?.name)
        .filter(Boolean)
        .join(', ') || '\u2014';
      lines.push(`| ${dc.name} | ${capitalize(dc.sensitivity)} | ${dc.containsPersonalData ? 'Yes' : 'No'} | ${dcSystems} |`);
    }
    lines.push('');
  }

  // Integrations
  if (integrations.length > 0) {
    lines.push('## Integrations');
    lines.push('');
    lines.push('| From | To | Type | Direction | Frequency | Reliability |');
    lines.push('|------|-----|------|-----------|-----------|-------------|');
    for (const intg of integrations) {
      const source = systems.find((s) => s.id === intg.sourceSystemId)?.name ?? 'Unknown';
      const target = systems.find((s) => s.id === intg.targetSystemId)?.name ?? 'Unknown';
      const dir = intg.direction === 'two_way' ? 'Two-way' : 'One-way';
      lines.push(
        `| ${source} | ${target} | ${formatType(intg.type)} | ${dir} | ${formatType(intg.frequency)} | ${formatType(intg.reliability ?? 'unknown')} |`,
      );
    }
    lines.push('');
  }

  // Owners
  if (owners.length > 0) {
    lines.push('## Owners');
    lines.push('');
    lines.push('| Owner | Role | External | Systems |');
    lines.push('|-------|------|----------|---------|');
    for (const owner of owners) {
      const ownedSystems = systems
        .filter((s) => s.ownerId === owner.id)
        .map((s) => s.name)
        .join(', ') || '\u2014';
      lines.push(`| ${owner.name} | ${owner.role || '\u2014'} | ${owner.isExternal ? 'Yes' : 'No'} | ${ownedSystems} |`);
    }
    lines.push('');
  }

  // Cost Summary
  const costSummary = calculateCostSummary(systems, functions);
  if (costSummary.systemCount > 0) {
    lines.push('## Cost Summary');
    lines.push('');
    lines.push(`- **Total annual cost:** ${formatCurrency(costSummary.totalAnnual)}`);
    if (costSummary.mostExpensive.length > 0) {
      const top = costSummary.mostExpensive[0];
      lines.push(`- **Most expensive:** ${top.name} (${formatCurrency(top.annualCost)}/yr)`);
    }
    if (costSummary.freeCount > 0) {
      lines.push(`- **Free tools:** ${costSummary.freeCount}`);
    }
    lines.push('');
  }

  // Importance
  const importanceSystems = systems
    .filter((s) => s.importance != null && !s.isShadow)
    .sort((a, b) => (b.importance ?? 0) - (a.importance ?? 0));
  if (importanceSystems.length > 0) {
    lines.push('## Importance');
    lines.push('');
    lines.push('| System | Score | Tier |');
    lines.push('|--------|-------|------|');
    for (const sys of importanceSystems) {
      const score = sys.importance!;
      const tier = score >= 8 ? 'Core' : score >= 4 ? 'Important' : 'Peripheral';
      lines.push(`| ${sys.name} | ${score}/10 | ${tier} |`);
    }
    lines.push('');
  }

  // Shadow & Informal Tools
  const shadowSystems = systems.filter((s) => s.isShadow === true);
  if (shadowSystems.length > 0) {
    lines.push('## Shadow & Informal Tools');
    lines.push('');
    lines.push('| Tool | Type | Importance |');
    lines.push('|------|------|------------|');
    for (const sys of shadowSystems) {
      const impStr = sys.importance != null ? `${sys.importance}/10` : 'Unscored';
      lines.push(`| ${sys.name} | ${formatType(sys.type)} | ${impStr} |`);
    }
    lines.push('');
  }

  // Risk Summary (TechFreedom)
  if (techFreedomEnabled) {
    const scoredSystems = systems.filter((s) => s.techFreedomScore !== undefined);
    if (scoredSystems.length > 0) {
      lines.push('## Risk Summary (TechFreedom)');
      lines.push('');
      lines.push('| System | Jurisdiction | Continuity | Surveillance | Lock-in | Cost | Total | Risk |');
      lines.push('|--------|-------------|------------|-------------|---------|------|-------|------|');
      for (const sys of scoredSystems) {
        const score = sys.techFreedomScore!;
        const total = totalScore(score);
        const level = riskLevel(total);
        lines.push(
          `| ${sys.name} | ${score.jurisdiction} | ${score.continuity} | ${score.surveillance} | ${score.lockIn} | ${score.costExposure} | ${total} | ${capitalize(level)} |`,
        );
      }
      lines.push('');
    }
  }

  // Footer
  lines.push('---');
  lines.push('');
  lines.push(`*Generated by [Stackmap](https://stackmap.org) on ${formatDate(metadata.exportedAt)}*`);
  lines.push('');

  return lines.join('\n');
}
