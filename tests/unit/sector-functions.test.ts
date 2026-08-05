import { describe, it, expect } from 'vitest';
import {
  SECTOR_FUNCTIONS,
  getSectorFunctions,
  getSectorSuggestions,
} from '@/lib/sector-functions';

describe('getSectorFunctions', () => {
  it('offers council functions to a council', () => {
    const names = getSectorFunctions('council').map((fn) => fn.name);

    expect(names).toContain('Revenues & Benefits');
    expect(names).toContain('Planning & Building Control');
    expect(names).toContain('Adult Social Care');
  });

  it('offers business functions to a business', () => {
    const names = getSectorFunctions('private_business').map((fn) => fn.name);

    expect(names).toContain('Sales');
    expect(names).toContain('Customer Support');
  });

  it('offers nothing extra to a charity, whose functions are the standard set', () => {
    expect(getSectorFunctions('charity')).toEqual([]);
    expect(getSectorFunctions('social_enterprise')).toEqual([]);
  });

  it('does not mix one sector’s functions into another', () => {
    const council = getSectorFunctions('council').map((fn) => fn.name);
    expect(council).not.toContain('Sales');
  });
});

describe('getSectorSuggestions', () => {
  it('suggests systems for a sector function', () => {
    const suggestions = getSectorSuggestions('Revenues & Benefits', 'council');

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.map((s) => s.name)).toContain('Capita Academy');
  });

  it('matches the function name regardless of case', () => {
    expect(getSectorSuggestions('adult social care', 'council')).not.toEqual([]);
  });

  it('returns nothing for a function this sector does not have', () => {
    expect(getSectorSuggestions('Sales', 'council')).toEqual([]);
  });

  it('returns nothing for a name the user made up', () => {
    expect(getSectorSuggestions('Something bespoke', 'council')).toEqual([]);
  });
});

describe('the sector data itself', () => {
  const all = Object.values(SECTOR_FUNCTIONS).flat();

  it('gives every function a description', () => {
    for (const fn of all) {
      expect(fn.description.length).toBeGreaterThan(0);
    }
  });

  it('gives every function at least one suggested system', () => {
    for (const fn of all) {
      expect(fn.suggestedSystems.length).toBeGreaterThan(0);
    }
  });

  it('describes every suggested system', () => {
    for (const fn of all) {
      for (const system of fn.suggestedSystems) {
        expect(system.name.length).toBeGreaterThan(0);
        expect(system.description.length).toBeGreaterThan(0);
      }
    }
  });

  it('does not repeat a function name within a sector', () => {
    for (const functions of Object.values(SECTOR_FUNCTIONS)) {
      const names = functions.map((fn) => fn.name);
      expect(new Set(names).size).toBe(names.length);
    }
  });
});
