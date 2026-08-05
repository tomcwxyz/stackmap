# Stackmap

**Lightweight architecture mapping for social purpose organisations.**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/tests-1115%20passing-brightgreen.svg)]()
[![WCAG 2.1 AA](https://img.shields.io/badge/accessibility-WCAG%202.1%20AA-blue.svg)]()

---

## What is Stackmap?

Most charities, social enterprises, and businesses have no common model for describing their technology. Architecture knowledge lives in people's heads or in scattered spreadsheets. Commercial enterprise architecture tools exist, but they are expensive, complex, and designed for specialists — not for the operations manager at a 12-person charity who just needs to understand what software the organisation uses and how it all connects.

Stackmap is an open source tool that solves this problem. It provides a guided wizard that walks anyone with operational knowledge through mapping their organisation's technology — systems, integrations, data, and ownership — in an afternoon, with no enterprise architecture training required. The result is an immediately useful architecture map with Mermaid diagrams, cost analysis, and optional TechFreedom powered risk assessment.



## Features

- **Two wizard paths** — function-first ("what does your org do?") or service-first ("what do you deliver?"), both leading to the same architecture map
- **8 standard functions** with descriptions and typical systems (Finance, Governance, People, Fundraising, Communications, Service Delivery, Operations, Data & Reporting)
- **Sector function sets** for councils (revenues and benefits, planning, social care, waste, housing and more) and for businesses
- **14 service templates** with auto-populated tool suggestions (Advice sessions, Grant distribution, Youth programmes, and more)
- **System suggestions** tailored by organisation type and size
- **TechFreedom risk assessment** (optional) — scores systems across 5 dimensions: jurisdiction, continuity, surveillance, lock-in, and cost exposure
- **134 pre-scored known tools** with detailed pricing data for automatic cost estimation
- **Smart cost estimation** with per-seat pricing, tier selection, and penetration rates
- **Spend discovery** — import an accounting or bank export and find the tools you pay for, with what they actually cost; column detection handles the common header conventions, you can map the columns yourself when it does not, and each tool is filed under a suggested function rather than arriving unattached
- **Systems inventory** — search, filter, sort, edit and delete every system in one place after the wizard
- **Board report** — a printable one-page summary for trustees and funders
- **Several maps and snapshots** — keep a map per organisation, copy one to try a change, and restore a labelled snapshot when the change was wrong
- **External sharing** — record the funders, regulators, auditors and partners your data goes to, what goes to each and why, and whether it leaves the UK
- **Draft data protection record** — a starting point for the UK GDPR Article 30 register, built from the map and exportable as a spreadsheet
- **Live architecture map sidebar** showing your map as you build it
- **Mermaid diagram generation** for visual architecture maps
- **Cost analysis** with estimates for uncosted systems, and duplication detection across the whole map
- **Risk against importance** — the four-quadrant view of what to deal with first
- **Contract renewals** with notice-period warnings and calendar export
- **JSON, Markdown, CSV, SVG and PNG export** of your architecture
- **WCAG 2.1 AA accessible** — keyboard navigable, screen reader compatible, axe-core tested
- **Mobile responsive** design with mobile-first approach
- **Offline-first** — all data stored in localStorage, no server required; stored maps are validated and migrated on load, and unreadable data is backed up rather than discarded

## Quick Start

```bash
git clone https://github.com/dataforaction-tom/stackmap.git
cd stackmap
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Screenshots

> Screenshots coming soon. The application features a warm forest-green design with a guided wizard interface, live sidebar map, and Mermaid diagram views.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | [TypeScript](https://www.typescriptlang.org/) (strict mode) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) with custom design tokens |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) validation |
| Diagrams | [Mermaid.js](https://mermaid.js.org/) |
| Storage | localStorage (browser) |
| Testing | [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/) |
| Accessibility | [jest-axe](https://github.com/nickcolley/jest-axe) (automated) + manual keyboard testing |
| Fonts | [Source Serif 4](https://fonts.google.com/specimen/Source+Serif+4) (display) + [Figtree](https://fonts.google.com/specimen/Figtree) (body) |

## Project Structure

```
src/
├── app/                    # Next.js App Router pages and layouts
│   ├── wizard/             # Wizard flow (function-first and service-first paths)
│   ├── view/               # Systems inventory, diagram, board report, data protection record
│   └── maps/               # Several maps in one browser, and snapshots of each
├── components/
│   ├── ui/                 # Base UI components (Button, Card, Input, Select, etc.)
│   ├── wizard/             # Wizard-specific components (steps, forms, sidebar)
│   ├── techfreedom/        # Risk badge, radar chart, risk details
│   ├── import/             # Import dialog and CSV preview
│   ├── views/              # Systems table, diagram, board report, ROPA, maps
│   └── layout/             # Header, footer, storage notice
├── lib/
│   ├── types.ts            # Core TypeScript type definitions
│   ├── schema.ts           # Zod validation schemas
│   ├── version.ts          # Version constants written into stored/exported maps
│   ├── functions.ts        # Standard functions data and helpers
│   ├── function-templates.ts  # System suggestions per function/org type/size
│   ├── service-templates.ts   # Service templates with suggested tools
│   ├── sector-functions.ts    # Council and business function sets
│   ├── cost-estimates.ts      # Cost estimation with tiered pricing
│   ├── storage/            # Storage adapter, migration, workspace, localStorage backend
│   ├── import/             # CSV and JSON import
│   ├── export/             # Markdown and CSV export
│   ├── analysis/           # Risk against importance, duplication, renewals
│   ├── report/             # Board report and Article 30 record
│   ├── diagram/            # Mermaid diagram generation
│   └── techfreedom/        # Risk scoring, known tools database, API
├── hooks/                  # React hooks (useArchitecture, useWorkspace, useStorageStatus, useAppConfig)
└── styles/                 # Global CSS with design tokens

tests/
├── unit/                   # Unit tests for lib/ and hooks
├── components/             # Component tests with accessibility checks
├── e2e/                    # Playwright end-to-end tests
└── fixtures/               # Sample files the end-to-end tests upload
```

## Development

### Commands

```bash
npm run dev           # Start development server
npm run build         # Production build
npm run start         # Start production server
npm run test          # Run unit + component tests
npm run test:e2e      # Run end-to-end tests (Playwright)
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
npm run lint          # ESLint (flat config in eslint.config.mjs)
npm run typecheck     # TypeScript type checking
```

### Testing

Stackmap follows a strict TDD workflow (red, green, refactor). The test suite currently includes **1115 tests across 83 test files**.

Every component test includes an accessibility check using jest-axe:

```typescript
it('has no accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

### Code Standards

- **TypeScript**: Strict mode, no `any` types, prefer interfaces over type aliases for objects
- **React**: Functional components only, named exports (no default exports), props interfaces named `{Component}Props`
- **Styling**: Tailwind utility classes, mobile-first, CSS variables for design tokens
- **Accessibility**: WCAG 2.1 AA minimum, keyboard navigation, visible focus indicators, semantic HTML, no information conveyed by colour alone

### Verification Checklist

Before any change is considered complete:

1. `npm run lint` passes (warnings are errors)
2. `npm run typecheck` passes
3. `npm run test` passes
4. Manual keyboard navigation works
5. No axe-core accessibility violations

## Updating Data

Stackmap's suggestions, templates, and known tools are defined in TypeScript files in `src/lib/`. Here is how to update each data source.

### Known Tools Database

**File**: `src/lib/techfreedom/tools.ts`

This file contains the `KNOWN_TOOLS` array — 134 pre-scored tools with risk assessments and pricing data. Each entry is a `KnownTool` object.

To add a new tool:

```typescript
{
  slug: 'tool-slug',              // URL-safe unique identifier
  name: 'Tool Name',             // Display name
  provider: 'Provider Company',  // Who makes it
  category: 'Category',          // e.g. 'Productivity', 'Communication', 'Finance'
  score: {
    jurisdiction: 3,             // 1 (low risk) to 5 (critical) — where data is stored/processed
    continuity: 2,               // 1-5 — risk of service disappearing or changing terms
    surveillance: 3,             // 1-5 — data mining and telemetry concerns
    lockIn: 4,                   // 1-5 — how hard it is to leave
    costExposure: 3,             // 1-5 — risk of price increases
    isAutoScored: true,          // true = from database, false = user-provided
  },
  keyRisks: 'Plain-English description of the main risks',
  estimatedAnnualCost: 1200,     // Optional fallback cost estimate (for ~15 users)
  pricing: {                     // Optional detailed pricing model
    model: 'tiered',             // 'per_seat' | 'flat' | 'tiered' | 'free'
    penetrationRate: 0.8,        // 0.0-1.0 — what fraction of staff need licences
    tiers: [
      { name: 'Free', annualPerSeat: 0, maxUsers: 10, recommended: true },
      { name: 'Pro', annualPerSeat: 96, minUsers: 1 },
      { name: 'Enterprise', annualPerSeat: 180, minUsers: 50 },
    ],
  },
}
```

**Pricing model options**:
- `per_seat` — simple per-user annual cost, uses `annualPerSeat`
- `tiered` — multiple tiers with different per-seat prices, tier selected by user count
- `flat` — flat annual fee regardless of users, uses `flatAnnual`
- `free` — no cost

**Tier selection logic** (`cost-estimates.ts`): The system picks the cheapest eligible tier that fits the user count (respecting `minUsers` and `maxUsers`), preferring any tier marked `recommended: true`.

### Service Templates

**File**: `src/lib/service-templates.ts`

The `SERVICE_TEMPLATES` array contains templates shown in the service-first wizard path. Each template has a name, description, and list of suggested tool names.

To add a new template:

```typescript
{
  name: 'Employment support',
  description: 'Helping people find and maintain employment',
  suggestedTools: ['Salesforce', 'Microsoft 365', 'Zoom', 'Google Workspace'],
}
```

Tool names in `suggestedTools` should match names in the known tools database (`KNOWN_TOOLS`) where possible, so that risk scores and pricing can be looked up automatically.

### Function System Suggestions

**File**: `src/lib/function-templates.ts`

The `SUGGESTIONS` record maps each `StandardFunction` to an array of tool suggestions. Each suggestion can be filtered by organisation type and size.

To add a suggestion:

```typescript
{
  name: 'ToolName',                    // Should match KNOWN_TOOLS where possible
  description: 'Why this is relevant',
  orgTypes: ['charity', 'council'],    // Optional — only show for these org types
  excludeTypes: ['private_business'],  // Optional — hide for these org types
  sizes: ['micro', 'small'],           // Optional — only show for these sizes
}
```

If `orgTypes`, `excludeTypes`, and `sizes` are all omitted, the suggestion appears for every organisation.

### Cost Estimation

**File**: `src/lib/cost-estimates.ts`

The cost estimation system works as follows:

1. If a tool has `pricing` data, the system uses per-seat calculation with tier selection
2. The `penetrationRate` (0.0-1.0) determines what fraction of staff need licences
3. `DEFAULT_STAFF` provides fallback headcounts when the org has not specified staff numbers:
   - `micro`: 3 staff
   - `small`: 15 staff
   - `medium`: 60 staff
   - `large`: 200 staff
4. If no `pricing` data exists, the system falls back to `estimatedAnnualCost` scaled by a ratio based on 15 users as the baseline

### Standard Functions

**File**: `src/lib/functions.ts`

The `STANDARD_FUNCTIONS` array defines the 8 built-in function categories. Each has a `type` (machine key), `name` (display label), `description`, and `typicalSystems` array.

To add a new standard function:

1. Add the type to the `StandardFunction` union in `src/lib/types.ts`
2. Add the definition to `STANDARD_FUNCTIONS` in `src/lib/functions.ts`
3. Add corresponding suggestions in `src/lib/function-templates.ts`
4. Update tests

## Configuration

### TechFreedom Risk Assessment

TechFreedom is an optional feature that scores systems across 5 risk dimensions:

| Dimension | What it measures |
|-----------|-----------------|
| **Jurisdiction** | Where data is stored/processed and under which legal regime |
| **Continuity** | Risk of the service disappearing, being acquired, or changing terms |
| **Surveillance** | Extent of data mining, telemetry, and advertising profiles |
| **Lock-in** | How difficult it is to export data and migrate away |
| **Cost Exposure** | Risk of price increases, per-seat cost escalation |

Each dimension is scored 1-5 (low to critical). The feature has a **two-tier toggle**:

1. **App-level**: An administrator can enable or disable TechFreedom globally
2. **Org-level**: Individual users can opt out of TechFreedom for their architecture, even when it is enabled at the app level

### Organisation Types

Stackmap supports the following organisation types, which affect system suggestions:

- `charity` — Registered charities
- `social_enterprise` — Social enterprises and CICs
- `council` — Local councils and public sector
- `cooperative` — Cooperatives
- `private_business` — Private sector businesses
- `other` — Any other organisation type

### Organisation Sizes

Size bands determine default staff counts for cost estimation and filter system suggestions:

| Size | Staff Range | Default Staff Count |
|------|-------------|-------------------|
| Micro | 1-5 | 3 |
| Small | 6-25 | 15 |
| Medium | 26-100 | 60 |
| Large | 100+ | 200 |

## Design System

Stackmap uses a warm forest-green palette with amber accents, designed to feel trustworthy and accessible rather than corporate:

- **Primary**: Forest green (`#3f8856` / primary-500)
- **Accent**: Warm amber-orange (`#ea5f22` / accent-500)
- **Sage**: Muted green for success states (`#788866` / sage-500)
- **Surface**: Warm off-white backgrounds (`#faf8f5` / surface-50)

Typography uses **Source Serif 4** for display headings and **Figtree** for body text.

## License

[MIT](LICENSE)

## Credits

Built by [The Good Ship](https://thegoodship.org) and [tomcw.xyz](https://tomcw.xyz).


