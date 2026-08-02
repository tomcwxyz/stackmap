# Changelog

All notable changes to Stackmap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Your systems** — a new view listing every system with search, filters and sortable columns, where you can edit or delete anything without walking back through the wizard. This is also the only place several details can be set at all: status (active, planned, retiring, legacy), web address, notes, owner and importance.
- **Score your own tools** — systems that are not in the known tools database can now be given TechFreedom risk scores by hand, instead of being left unassessed.
- **Board report** — a printable one-page summary at `/view/report`: headline numbers, what needs attention, the systems you could not operate without, where the money goes, possible duplication and a risk summary. Print it or save it as a PDF for a trustee meeting.
- **How well does it work?** — the integrations step now asks whether each connection is reliable or fragile, and fragile ones are flagged in the review and the board report.
- **SVG export** of diagrams alongside PNG, which stays sharp at any size.

### Fixed

- **Your map survives a bad save** — if the browser refuses to store your map (usually because storage is full), Stackmap now tells you and prompts you to export, instead of failing silently.
- **Maps written by older versions load properly** — stored maps are checked and brought up to date on load, filling in fields that did not exist when the map was saved.
- **Damaged maps are no longer lost** — a map that cannot be read is kept as a backup in your browser rather than deleted, and individual entries that cannot be repaired are dropped with a count shown rather than taking the whole map with them.
- **The Data and Integrations steps no longer discard your work** — entries are saved as you add them, so leaving the step through the stepper (rather than the Continue button) keeps them.
- **Diagram labels cannot inject markup** — system and function names taken from imported files are stripped of angle brackets, and diagrams now render with strict security settings.
- **Functions with the same name get their own diagram groups** instead of being merged together.
- **Version numbers agree** — exported and stored maps now carry a single, correct version rather than three different ones.
- **Importing the same spreadsheet twice no longer doubles your map** — rows are matched to systems you already have by name and update them instead, filling in blanks without overwriting anything you typed. The preview says how many rows are new and how many will be updated.

### Changed

- Saving to the browser is debounced, so typing no longer rewrites the whole map on every keystroke.

### Internal

- ESLint configuration added, so `npm run lint` runs; a CI workflow now runs lint, typecheck and tests on every push and pull request.
- Removed the unused `sql.js` dependency.
- Diagram output is now checked against the real Mermaid parser in tests.

## [0.3.0] - 2026-04-01

### Added

- **Import your existing data** — bring in architecture data from CSV or JSON files, either as a fresh map or merged into your current work. A CSV preview table shows completeness indicators before you commit, and auto-scoring fills in TechFreedom risk scores for known tools.
- **TechFreedom step in the wizard** — risk assessment is now a dedicated wizard step rather than a separate view, so you can review and adjust scores as part of the mapping flow. Path selection now routes through the TechFreedom step.
- **TechFreedom programme call-to-action** — the risk assessment and review steps now link to the TechFreedom programme for organisations that want support acting on their results.
- **Data flow diagrams** — a new diagram mode shows how data moves between systems, colour-coded by sensitivity level.
- **Data categories in review** — the review summary now includes a section showing what data each system holds, with sensitivity levels.
- **Beneficiaries field** — services now capture who they serve, making the service description richer.
- **Shared systems view** — the mini-map highlights systems used across multiple functions, displayed in a separate row with function dots.
- **Personal data indicators** — systems holding personal data show a shield icon in the mini-map.
- **Status indicators in diagrams** — systems show their status (active, planned, retiring, legacy) visually in both the mini-map and Mermaid diagrams, with status-based styling.
- **Services shown in mini-map** — services now appear as amber tags alongside their systems.
- **Contextual tips** — new guidance appears when you flag personal data or mark a system as retiring.
- **Persistent import button** — available throughout the wizard, not just on the landing page.
- **Open Graph image** — link previews now show a branded card image on LinkedIn, Twitter, Slack, and other platforms.
- **Favicon, sitemap, robots.txt, and llms.txt** — improved discoverability and SEO.

### Changed

- **Service form simplified** — clearer language for non-technical users, with references to beneficiaries rather than abstract "users."
- **Stepper layout compacted** — now fits 9 steps cleanly on screen.
- **Landing page refined** — removed quotation section, cleaner layout.

### Fixed

- **Blank Open Graph image** — the preview image when sharing links was showing as a white rectangle; now renders correctly.
- **Static export build** — removed useSearchParams dependency that was breaking Cloudflare Pages builds.
- **Type errors in test mocks** — fixed missing systemIds and SystemType properties.

## [0.2.0] - 2026-03-27

### Added

- **134 known tools** across 19 categories — massively expanded from the original 27, now covering AI (including local/privacy-focused models like Ollama, Mistral, LM Studio), databases, data visualisation, geospatial, payment processors, website builders, hosting, and more
- **Cost analysis in review** — total annual cost, breakdown by function, top 3 most expensive systems, and count of free/uncosted tools
- **Overlap detection** — warns when you have multiple systems of the same type under one function, suggesting consolidation opportunities
- **Clickable stepper** — completed wizard steps are now clickable links, so you can jump back to any section to edit
- **Mobile stepper navigation** — left/right arrows for moving between steps on small screens
- **Form hydration** — going back to a previous wizard step now shows your existing data, not a blank form
- **Clear and start fresh** — the path selection page detects existing data and offers to clear it with confirmation
- **Organisation types** expanded to include co-operatives and private businesses
- **TechFreedom acknowledgement** — credit to TechFreedom programme in the review summary and footer
- **Documentation link** in the footer
- **Cost data included in JSON export** — export now includes a costSummary object
- **Cost column in TechFreedom risk table** — see cost alongside risk for each system

### Changed

- **Landing page redesigned** — replaced generic AI-style layout with distinctive design: leading question headline, real GDS sector stat, staggered "how it works" steps, asymmetric layout
- **Smart cost estimation** — replaced simple size multipliers with realistic per-seat pricing, tiered pricing selection, and penetration rates (e.g. not everyone needs a Salesforce licence)
- **Wizard navigation is now non-linear** — users can step forward and back freely, editing at any stage
- **Sidebar redesigned** — now an expanding overlay panel (480px) instead of a cramped fixed sidebar, with floating pill on mobile
- **Footer updated** — built by The Good Ship and tomcw.xyz, MIT licence, TechFreedom credit, docs link
- **480 tests** across 42 test files (up from 335/30)

### Fixed

- **Duplicate systems bug** — going through the wizard twice no longer creates duplicate functions and systems
- **State not persisting to diagram view** — architecture now auto-saves to localStorage on every change
- **Service-first path** now fully functional (was "coming soon")

## [0.1.0] - 2026-03-27

### Added

- **Two wizard paths**: function-first ("start with what we do") and service-first ("start with what we deliver"), both producing the same architecture map
- **8 standard organisational functions**: Finance, Governance, People, Fundraising, Communications, Service Delivery, Operations, Data & Reporting
- **10 service templates** with auto-populated tool suggestions: Advice sessions, Grant distribution, Housing repairs, Youth programmes, Training courses, Community events, Counselling, Food bank, Advocacy & campaigns, Volunteer coordination
- **System suggestions** tailored by organisation type and size
- **TechFreedom risk assessment** with 5 dimensions: jurisdiction, continuity, surveillance, lock-in, and cost exposure
- **Smart cost estimation** with per-seat pricing, tiered pricing selection, penetration rates, and automatic tier matching
- **Live architecture map sidebar** that updates in real-time as you build your map
- **Mermaid diagram generation** for visual architecture maps
- **TechFreedom analysis view** with heatmap table and radar chart
- **Data categories** with sensitivity levels and personal data flags
- **Integration mapping** with connection types, direction, and frequency
- **Owner assignment** for each system
- **Review summary step** with complete architecture overview
- **JSON export** of the full architecture document
- **localStorage persistence** with auto-save
- **WCAG 2.1 AA accessibility** throughout
- **Cloudflare Pages deployment** with GitHub Actions CI/CD
