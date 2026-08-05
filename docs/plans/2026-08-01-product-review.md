# Stackmap product & code review — 1 August 2026

Reviewed at commit `8f2438f` (v0.3.0 line). Covers feature gaps, improvements to
what already exists, and new feature proposals. File references are to source as
reviewed.

---

## 1. Overall assessment

Stackmap does the hard part well. The wizard genuinely gets a non-technical person
from nothing to a structured architecture map, the two paths work, the known-tools
database (134 tools) is a real asset, and the cost estimation model (per-seat,
tiered, penetration rates) is more thoughtful than most commercial tools manage.
The design and copy are distinctive and the accessibility discipline is visible in
the test suite.

The weaknesses cluster in three places:

1. **The map is fragile and write-once.** Everything lives in one localStorage key
   with no validation, no backup, no file save, and no way to edit an entity once
   you have passed its wizard step. A user who spends an afternoon on this can lose
   it by clearing their browser, and has no obvious way to keep it current.
2. **Analysis stops one step short of advice.** Stackmap now collects importance,
   risk, cost, ownership and integrations — but never crosses them. The insight
   ("your most critical system has no owner and a manual integration feeding it")
   is one join away and currently unwritten.
3. **The data model is ahead of the UI.** Several typed and validated fields are
   never captured or never used: system status, system URL, system notes, owner
   contact, integration reliability, organisation turnover. Features that depend on
   them (status styling in diagrams, the "retiring" contextual tip) are unreachable.

Everything below is ordered roughly by value-per-effort within each section.

---

## 2. Gaps that risk user trust

### 2.1 A user can lose their whole map with no warning (highest severity)

- Storage is a single localStorage key (`src/lib/storage/local.ts:4`). There is no
  export prompt, no "last backed up" indicator, and no reminder that clearing
  browser data destroys the map. The landing page markets this as a feature
  ("Your data never leaves your browser") without naming the trade-off.
- `load()` casts blindly: `return parsed as Architecture` (`local.ts:44`). A map
  saved by an older version, hand-edited, or partially written will pass through
  unvalidated and crash the first component that reads `arch.services.length`.
  `ArchitectureSchema` already exists and is used for JSON import — it should also
  gate `load()`, with a small migration function for older shapes.
- Saves are fire-and-forget inside an effect (`src/hooks/useArchitecture.ts:140`).
  `localStorage.setItem` throws on quota exceeded; here that surfaces as an
  unhandled rejection and silent data loss. Needs a catch and a visible "couldn't
  save" state.
- Every keystroke-level change rewrites the entire architecture JSON. Debounce
  (~500ms) and it becomes free.
- No cross-tab sync: two open tabs will fight, last write wins.

**Suggested fix set:** validate + migrate on load, catch save failures and surface
them, debounce writes, add an autosave/"backed up" indicator, and prompt for a JSON
download at the end of the wizard (not just offer one).

### 2.2 Two wizard steps silently discard work

The Data and Integrations steps hold everything in local component state and only
commit on **Continue** (`src/components/wizard/data-form.tsx:103`,
`src/components/wizard/integration-matrix.tsx:93`). The stepper explicitly invites
free navigation, so clicking another step after adding five data categories throws
them away with no prompt.

Worse, `handleContinue` deletes and recreates every existing record on each visit,
so IDs churn on every pass through the step.

The Systems and Importance steps already write through immediately. Make these two
match — it removes the destroy/recreate loop as well.

### 2.3 No way to keep the map — or more than one

- No "Save to file" / "Open file". The `StorageAdapter` interface
  (`src/lib/storage/adapter.ts`) is already the right seam: a File System Access
  API adapter would let an organisation keep the map in SharePoint/Drive alongside
  its other governance documents, which is where this artefact actually belongs.
- No multi-map support. A consultant, infrastructure body, or council mapping
  several entities has to export, clear, and re-import each time. A simple named-map
  list in localStorage plus a switcher would unblock the entire "supporting
  multiple organisations" use case.
- No versioning or diff. The obvious repeat use ("re-map in six months, see what
  changed") is unsupported. Snapshots plus a change summary — systems added,
  removed, cost delta, risk delta — turn a one-off exercise into an annual habit.

---

## 3. The map is write-once

### 3.1 There is no inventory / table view

Once you leave the Systems step, the only way to change a system is to navigate
back to the step that created it. The review page is read-only, and the diagram and
risk views only offer "Edit your map" links back into the wizard.

A single sortable, filterable, editable systems table would be the most-used screen
in the product: name, type, function, owner, cost, importance, risk, status, with
inline edit and delete. The README already claims it exists ("diagram, table, and
analysis views") — this is the biggest gap between the described product and the
built one.

### 3.2 Fields captured by the model but never by the UI

| Field | Status |
|---|---|
| `System.status` | **Never settable.** Every code path hardcodes `'active'` (`function-systems.tsx:262`, `service-systems.tsx:221`, `importance-step.tsx:97`). Only CSV import can set it. This makes the planned/retiring/legacy styling in `mermaid.ts:149-151`, the mini-map status dots, and the "you marked a system as retiring" tip unreachable in normal use. |
| `System.url` | Never captured anywhere. |
| `System.notes` | Only captured for shadow tools. |
| `Owner.contactInfo` | Never captured. Owner records are name/role/external only, which limits the "who do I call" value of the map. |
| `Integration.reliability` | Hardcoded `'unknown'` (`integration-matrix.tsx:108`). The tips copy calls manual integrations "the highest-risk areas" — so the one field that would capture "this breaks monthly" is never asked. |
| `Organisation.annualTurnover` | Collected on the first screen and used nowhere. Tech spend as a percentage of turnover is a benchmark trustees immediately understand. |

Each of these is a small form change with disproportionate payoff, because the
downstream rendering already exists.

### 3.3 Risk scores can only come from the database

The "Risk assessment" wizard step (`src/app/wizard/techfreedom/page.tsx`) is a
yes/no toggle and an explainer. There is no scoring UI anywhere: a system that
doesn't match one of the 134 known tools gets no `techFreedomScore` at all, and the
user cannot supply one. `TechFreedomScore.overrides` and `isAutoScored: false` are
rendered (`techfreedom-view.tsx:408`, `risk-details.tsx:35`) but nothing ever writes
them.

For a small charity, the unmatched tools are exactly the interesting ones — the
bespoke case management system, the local supplier's portal, the Access/Excel thing
someone built in 2014. Add a five-slider manual scoring panel per unscored system,
with the dimension descriptions from `RISK_DIMENSIONS` as help text, and mark the
result `isAutoScored: false`.

---

## 4. Analysis stops short of advice

### 4.1 Risk × importance is the missing artefact

Importance (bullseye) and risk (radar + heatmap) are presented separately and never
crossed. The four-quadrant matrix — **critical and high-risk** in the top right — is
the single most actionable output this dataset supports, and it needs no new data.
Recommend it as a first-class review section and export.

### 4.2 Single points of failure

Everything needed is already stored. Worth flagging automatically:

- Core systems (importance ≥ 8) with **no owner**, or with an **external** owner.
- Functions supported by exactly **one** system.
- Manual or fragile integrations that **feed a core system**.
- Systems holding **restricted or personal data** that are also high lock-in.
- Shadow tools scored core — already flagged in the review
  (`review-summary.tsx:571`), which proves the pattern works. Generalise it.

### 4.3 Overlap detection is too narrow

`findSystemOverlaps` (`src/lib/cost-analysis.ts:77`) only compares `SystemType`
within a single function. It therefore misses the most common real duplication:
two CRMs in different functions, three video-conferencing tools across the org, both
Google Workspace and Microsoft 365. The known-tools `category` field is a much finer
taxonomy than the 12 `SystemType` values — use it, and compare org-wide as well as
per-function. Adding the combined annual cost of each overlap makes it a
consolidation business case rather than an observation.

### 4.4 Cost analysis under-delivers

- `calculateCostSummary` only counts systems with an explicit `cost`, so the
  headline total silently understates the stack; `uncostCount` is reported in small
  print. Show an estimated range for uncosted systems using `estimateToolCost`,
  clearly marked as estimated.
- The diagram view says "Total annual cost … across N systems"
  (`diagram-view.tsx:143`) where N is *systems with cost data*, not systems. Reads
  as a total for the whole stack.
- `totalMonthly` is computed and never displayed.
- No cost per staff member, no cost as % of turnover, no per-function cost against
  a sector benchmark.
- No renewal/contract data at all (see §6.3).

---

## 5. Outputs and sharing

1. **No print or PDF output, and no print stylesheet.** The stated purpose is
   "export everything to share with your board or funders", and the current answer
   is a JSON file, a Markdown file, a CSV and a PNG. A print-optimised board report
   — cover, headline numbers, diagram, top risks, cost table, actions — is probably
   the highest-value single addition in this section, and it is achievable with CSS
   alone.
2. **No share link.** State compressed into a URL fragment (lz-string) would give a
   read-only shareable map with no backend and no hosting change — well suited to a
   static Cloudflare Pages deployment. Worth a plain warning that the link contains
   the data.
3. **PNG export is brittle.** `mermaid-renderer.tsx:54` serialises the SVG into a
   canvas, but Mermaid is initialised with `htmlLabels: true`, so labels render as
   `foreignObject` — which canvas will not rasterise reliably. Expect blank or
   text-free PNGs. Add **SVG export** (a direct blob download, always correct), and
   either switch to `htmlLabels: false` for export or inline styles first.
4. **The diagram has no text alternative.** A `dangerouslySetInnerHTML` SVG with no
   accessible equivalent is the one visible hole in an otherwise strong WCAG story.
   A collapsible "described as a table" beneath the diagram fixes it and doubles as
   the inventory view.
5. **CSV export is systems-only.** No integrations, owners, data categories, or
   services sheets. Round-tripping is therefore lossy for everything except JSON.
6. **Markdown export omits notes and URLs** even where captured.

---

## 6. Import

1. **Merging the same file twice duplicates everything.**
   `mergeCsvIntoArchitecture` (`csv-to-architecture.ts:124`) creates a new system
   for every row with no name matching against existing systems. Merge should
   match on normalised name and update rather than append, with a preview of
   "3 new, 12 updated, 2 unchanged".
2. **No CSV template download and no column-mapping step.** The parser has a good
   alias table (`parse-csv.ts:23-90`) but users have to guess. Offer a template
   download in the dialog and a mapping screen for unmatched columns.
3. **CSV import covers systems only.** Integrations and owners are common in
   existing spreadsheets and cannot be brought in.
4. **No paste-a-list quick add.** For most small organisations the fastest possible
   onboarding is a textarea: paste 20 tool names, match against the known-tools
   database, confirm. This would cut the wizard's slowest step dramatically and is a
   modest amount of code given `findMatchingTool` already exists.
5. **Accounting-export import** would be a genuinely novel entry point — see §7.2.

---

## 7. New feature proposals

Ranked by value to the stated audience.

### 7.1 Board-ready report (print/PDF)

Covered in §5.1. The organisations Stackmap targets need an artefact to take to a
trustee meeting or a funder. Currently they get a JSON file. This converts the tool
from "useful exercise" to "produces the thing I was asked for".

### 7.2 Discover your stack from spend

Import a bank or accounting export (Xero/QuickBooks CSV), match payee names against
the 134-tool database, and propose systems with real costs attached. This inverts
the hardest part of the wizard — remembering what you use — and gives cost data that
is accurate rather than estimated. It plays directly to the "you don't know what you
have" positioning, and it is entirely client-side, so the privacy promise holds.
Strongest differentiator on this list.

### 7.3 GDPR Record of Processing Activities (Article 30) starter

Stackmap already captures data categories, sensitivity, personal-data flags, the
systems holding them, hosting, jurisdiction risk, and owners. That is most of an
Article 30 record. Generating a starter ROPA — clearly labelled as a draft for
review — produces a compliance artefact small charities genuinely need and usually
lack. Requires adding: processor vs controller, retention period, lawful basis, and
third parties the data flows to (§7.4).

### 7.4 External parties and outbound data flows

The model stops at the organisation boundary. Charities routinely send data to
funders, regulators (Charity Commission), auditors, umbrella bodies, and partner
delivery organisations. An `ExternalParty` entity plus system→party flows would
capture the reporting obligations that dominate small-charity data work, feed the
ROPA, and make the diagram tell a more complete story.

### 7.5 Contracts and renewal calendar

Add `seats`, `renewalDate`, `contractEnd`, and `noticePeriod` to `System`. Then:
a renewal timeline in the review, "£X of contracts renew in the next 90 days", and
an `.ics` export. This is the feature most likely to make someone open Stackmap a
second time, and it makes the cost model accurate rather than estimated.

### 7.6 "What breaks if we drop this?" impact view

Select a system and see the functions, services, data categories, and integrations
that depend on it, plus the annual cost released. Uses only existing data and
supports the decision the tool implicitly promises to help with.

### 7.7 Council / LGR templates

The docs name local government reorganisation as a target use case, but the eight
standard functions are charity-shaped. A council function set (revenues and
benefits, planning, adult social care, waste, housing, elections) plus council-typical
systems would make the LGR pitch real. Same for a small-business set, since the
landing page now addresses businesses too.

### 7.8 Anonymous benchmarking

"Organisations your size typically run 12–18 systems at £X per head." Even a static,
manually curated benchmark table shipped in the repo would add interpretive value to
every number in the review, with no backend and no data collection.

### 7.9 Guided review reminders

A "review in 6 months" `.ics` download, plus a returning-user prompt showing what has
gone stale. Cheap; drives the repeat use that §2.3 versioning would then make
valuable.

### 7.10 Smaller improvements worth batching

- Typeahead/combobox search across all 134 known tools, with category and provider
  shown — currently discovery is limited to per-function suggestions plus an
  on-blur exact-ish match.
- Undo (toast with "undo") on system and function deletion.
- Dark mode — the docs site has it, the app doesn't.
- Multi-currency, or at least make GBP a configuration rather than a hardcoded `£`
  (`cost-analysis.ts:112`, `mermaid.ts:46`, CSV header).
- Plausible custom events at each wizard step to find where people abandon —
  analytics is installed (`layout.tsx:81`) but records only pageviews.
- Progress/completeness score ("your map is 70% complete — 4 systems have no
  owner") to drive the wizard to completion.

---

## 8. Code quality, security, and repo hygiene

### 8.1 Security: HTML injection through diagram labels

`MermaidRenderer` initialises with `securityLevel: 'loose'` and `htmlLabels: true`
(`mermaid-renderer.tsx:21-30`) and injects the result with
`dangerouslySetInnerHTML`. `sanitiseLabel` (`mermaid.ts:9`) strips brackets, quotes,
semicolons and ampersands but **not** `<` or `>`. A system named
`<img src=x onerror=…>` — plausible via a shared JSON or CSV import from a colleague
or consultant — executes in the user's browser against a store containing personal
data. Fix: strip `<`/`>` in `sanitiseLabel`, set `securityLevel: 'strict'`, and
consider `htmlLabels: false` (which also fixes PNG export, §5.3).

### 8.2 CI does not run the tests — and the suite is currently red

`.github/workflows/deploy.yml` builds and deploys on push to `main`. There is no
lint, typecheck, or test step, and no workflow on pull requests — despite a strict
TDD workflow and 665 tests across 58 files.

That has already cost something. Running the suite on this commit:

```
Test Files  1 failed | 57 passed (58)
     Tests  1 failed | 664 passed (665)

FAIL tests/unit/cost-estimates.test.ts > selectTier > picks the recommended tier when eligible
  expected 'Pro' to be 'Free'
```

The test encodes the old "prefer the `recommended` tier" rule; `selectTier` now
prefers the cheapest *paid* tier for orgs above three staff
(`cost-estimates.ts:103`). The behaviour change looks deliberate and the test was
not updated — exactly what a CI job would have caught. `npm run typecheck` is clean.

`npm run lint` cannot pass either: there is no ESLint configuration in the repo, so
`next lint` drops into its interactive setup prompt and hangs. The README's
verification checklist ("`npm run lint` passes") is currently impossible to satisfy.
Add a config, fix or update the failing test, then wire lint + typecheck + test into
a pull-request workflow.

### 8.3 No end-to-end tests

The riskiest behaviour — full wizard traversal, back-navigation, hydration,
persistence across reloads — is exactly what unit and component tests can't cover,
and several of the bugs in §2 and §3 live there. The README claims a `tests/e2e/`
Playwright directory that does not exist.

### 8.4 Dead code and dependencies

- `sql.js` is a dependency and is imported nowhere. Remove it.
- `fetchKnownTools` (`src/lib/techfreedom/api.ts`) is exported but never called; all
  consumers import `KNOWN_TOOLS` directly. As written, it would also *downgrade*
  data quality if wired up — the API mapping drops `pricing`, `estimatedAnnualCost`
  and `category`, so cost estimation would regress for 24 hours per cache fill, and
  the payload isn't validated (missing fields become `NaN` scores). Either delete
  it or fix the mapping and merge API data over the embedded records.
- `typescript`, `@types/*` sit in `dependencies` rather than `devDependencies`.

### 8.5 Version metadata drift

`package.json` says `0.1.0`; the changelog is at `0.3.0`. `stackmapVersion` is
hardcoded to `'0.1.0'` in `useArchitecture.ts:98` and `'0.3.0'` in
`csv-to-architecture.ts:90`, and `metadata.version` is `'1.0.0'` in one place and
`'1'` in the other. Exported files therefore misreport their provenance, which
matters as soon as schema migration exists. Derive both from a single constant.

### 8.6 Accessibility detail

The risk table sorts via `onClick` on a bare `<th>` (`techfreedom-view.tsx:~290`)
with `cursor-pointer` and `aria-sort`, but no button and no key handler — not
keyboard operable. jest-axe won't flag it. Wrap the header content in a `<button>`.

### 8.7 Mermaid subgraph identifiers

`subgraph ${fnLabel}` (`mermaid.ts:73`) uses the sanitised function name as both id
and title. Two functions with the same name collide, and a custom function named
`end`, `graph`, or `class` will break the diagram. Emit a stable synthetic id with a
quoted title.

### 8.8 Documentation is behind the product

The README states 27 known tools (actual: 134), 335 tests across 30 files (actual:
665 across 58), 10 service templates (actual: 14), a `tests/e2e/` directory and an
`app/techfreedom/` route that don't exist, and a table view that was never built.
`mkdocs.yml` still points `site_url` at github.io and `repo_url` at
`dataforaction-tom/stackmap` while the app ships as stackmap.org. Worth a pass —
the README is the front door for contributors.

---

## 9. Suggested sequencing

**Next release — trust and durability.** Validate and migrate on load; handle save
failures; fix draft loss on the Data and Integrations steps; fix the mermaid
injection; add the CI test job; correct the README and version metadata; remove
`sql.js`.

**Then — make the map editable and shareable.** Systems inventory table with inline
edit and delete; system status, URL and notes fields; integration reliability;
manual TechFreedom scoring; print/PDF board report; SVG export; fix CSV merge
duplication.

**Then — make it say something.** Risk × importance matrix; single-points-of-failure
panel; org-wide overlap detection with combined costs; estimated costs folded into
the headline; contracts and renewal calendar.

**Then — new ground.** Spend-based stack discovery; external parties and ROPA;
multi-map and versioning; council templates.
