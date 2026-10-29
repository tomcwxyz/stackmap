import { readFileSync } from 'node:fs';

function summarise(path, scope) {
  const audit = JSON.parse(readFileSync(path, 'utf8'));
  console.log('\\n==== ' + scope + ' AUDIT ====\\n');
  console.log('Counts: ' + JSON.stringify(audit.metadata?.vulnerabilities ?? {}));
  const bySeverity = { critical: 0, high: 1, moderate: 2, low: 3, info: 4 };
  const entries = Object.entries(audit.vulnerabilities ?? {})
    .sort(([nameA, a], [nameB, b]) =>
      (bySeverity[a.severity] ?? 9) - (bySeverity[b.severity] ?? 9) ||
      nameA.localeCompare(nameB));

  for (const [name, finding] of entries) {
    const via = (finding.via ?? []).map(entry => typeof entry === 'string'
      ? { inheritedThrough: entry }
      : { name: entry.name, title: entry.title, url: entry.url, range: entry.range, source: entry.source });
    console.log(JSON.stringify({
      package: name,
      severity: finding.severity,
      direct: finding.isDirect,
      installedRange: finding.range,
      via,
      fixAvailable: finding.fixAvailable,
      nodes: finding.nodes,
    }));
  }
  console.log('==== END ' + scope + ' ====\\n');
}

summarise(process.argv[2], 'FULL');
summarise(process.argv[3], 'PRODUCTION');
