import type { Architecture } from '@/lib/types';
import { buildRiversideAdvice } from './riverside-advice';
import { buildGreenFutures } from './green-futures';
import { buildNorthfieldCouncil } from './northfield-council';

export interface ExampleMap {
  id: string;
  /** What the example organisation is called, and what the map is named. */
  name: string;
  /** Who this one is for, in one line. */
  summary: string;
  /** What it is worth opening this one to see. */
  highlights: string[];
  build: () => Architecture;
}

/**
 * Finished maps to look at before building your own.
 *
 * The suggestion lists show what a tool for a small charity might contain; they
 * do not show what a finished map looks like, which is the thing that makes it
 * obvious whether any of this is worth an afternoon. These are complete —
 * costs, owners, integrations, data, sharing — and deliberately imperfect,
 * because a tidy map demonstrates the views working and nothing else.
 */
export const EXAMPLE_MAPS: ExampleMap[] = [
  {
    id: 'riverside-advice',
    name: 'Riverside Advice',
    summary: 'A nine-person advice charity',
    highlights: [
      'Two CRMs nobody has reconciled',
      'A contract whose notice period has already run out',
      'Client data in a spreadsheet nobody signed off',
    ],
    build: buildRiversideAdvice,
  },
  {
    id: 'green-futures',
    name: 'Green Futures CIC',
    summary: 'A 38-person social enterprise, mapped by service',
    highlights: [
      'Built service-first rather than function-first',
      'Two teams paying for two project trackers',
      'A system inherited from a merger, still being paid for',
    ],
    build: buildGreenFutures,
  },
  {
    id: 'northfield-council',
    name: 'Northfield Borough Council',
    summary: 'A district council back office',
    highlights: [
      'Council function set rather than the charity one',
      'Statutory systems that cannot simply be swapped',
      'A land charges register one officer understands',
    ],
    build: buildNorthfieldCouncil,
  },
];

export function findExample(id: string): ExampleMap | undefined {
  return EXAMPLE_MAPS.find((example) => example.id === id);
}

/** Builds the example's map, or null when the id is not one we know. */
export function buildExample(id: string): Architecture | null {
  return findExample(id)?.build() ?? null;
}
