import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { STACKMAP_VERSION, SCHEMA_VERSION } from '@/lib/version';

describe('version metadata', () => {
  it('matches the version declared in package.json', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'),
    ) as { version: string };
    expect(STACKMAP_VERSION).toBe(pkg.version);
  });

  it('exposes a semver schema version', () => {
    expect(SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
