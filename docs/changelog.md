# Changelog

All notable changes to Stackmap will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Three worked examples, and clearing one part at a time** — the wizard could show you what tools a small charity might have, but never what a finished map looks like, which is the thing that decides whether this is worth an afternoon. Three complete organisations are now offered on the first step and on Your maps: an advice charity mapped function-first, a social enterprise mapped service-first, and a district council with its own sector functions. Each has costs, owners, data, connections, who the data goes to — and the things nobody got round to, because a map with no loose ends is not a map of anywhere real. An example opens as a map of its own, so nothing you have made is touched, and it can be deleted when it has done its job. To make one your own, or to start again on a single step, "Or clear one part at a time" empties one section — systems, functions, services, data, connections, owners or sharing — saying first what else goes with it, rather than making you choose between editing row by row and clearing the lot.
- **Seven more tools recognised** — Google Cloud, Neon, Firecrawl, Ollama Cloud, OpenCode, DigitalOcean and Resend, with the domain-style names they bill under (`NEON.TECH`, `FIRECRAWL.DEV`) and Google Cloud's `GCP` shorthand. Hosted Ollama is kept separate from the version that runs on your own machine, because they give very different answers on jurisdiction and surveillance. A tool whose category the wizard has no system type for — AI, Events, Design — is now filed under a sensible function instead of arriving unattached.
- **Imported tools are filed where they belong** — spend imports used to leave every system attached to nothing, so they collected in an "Other systems" bucket and most people ended up adding the same tool a second time through the wizard. Each row in the preview now carries the part of the organisation it will sit under, worked out from the same lists the wizard suggests from, and changeable from a dropdown that puts the likely answers first. Where a tool needs a function your map does not have, Stackmap names it before importing and adds it. "Not sure yet" leaves a tool unfiled.
- **Spend imports understand more bank exports, and ask when they cannot** — column detection now recognises Starling's "Counter Party" and several other conventions, and never mistakes a running balance for the transaction amount. Where the headers are genuinely unfamiliar, Stackmap asks which column holds who was paid, how much and when, rather than refusing the file; each column is listed with real values from your file so you can tell them apart. If detection guessed wrong, the preview offers a way to correct it and re-read without picking the file again.
- **Several maps in one browser, and snapshots** — a new "Your maps" page keeps more than one map, so an advisor working with several organisations no longer has to clear one to start the next, and anyone can copy a map to try a change without risking the real one. Switching, renaming, copying and deleting are all there, and the last map cannot be deleted by accident. Snapshots save the map as it is under a label you choose; restoring one snapshots what was there first, so the wrong restore costs nothing. The last ten snapshots of each map are kept. Your existing map becomes the first in the list without being moved or rewritten.
- **A draft data protection record** — if any of your data holds personal data, Stackmap now drafts the record of processing activities that UK GDPR Article 30 asks for, at `/view/ropa`. It fills in what it can from your map — what data you hold, which systems hold it, how those are hosted, who it goes to and why, and whether it leaves the UK — and asks you for the three things a map cannot know: who the data is about, your lawful basis, and how long you keep it. Each entry says what it is still missing rather than guessing, and the whole thing exports as a spreadsheet with Article 30 headings. It is a draft to check and sign off, not a finished compliance document.
- **Who sees your data** — the data step now asks who outside the organisation your data goes to: funders, regulators, auditors, delivery partners and suppliers, with roughly where they are. For each thing you share you can record which system it comes from, who gets it, how it gets there, how often and why. Sending personal data outside the UK is flagged, because that needs its own safeguards.
- **Find your tools from what you pay for** — import a transaction export from your accounting software or online banking, and Stackmap picks out the payees that look like software, groups repeat payments, works out what each costs over a year and adds them to your map with real figures rather than estimates. Payees it does not recognise are listed separately for you to tick if they belong. The file is read in your browser and never uploaded.
- **Functions for councils and businesses** — a council picking its organisation type is now offered Revenues & Benefits, Planning & Building Control, Adult Social Care, Children's Services, Waste & Environment, Housing, Customer Services and Elections, each with the systems typically behind it. Businesses get Sales, Customer Support, Product & Delivery and Legal & Compliance. Charities and social enterprises see the standard set as before.
- **What to deal with first** — your systems crossed against how much you depend on them and how risky they are, as four groups with "critical and exposed" first. Shown in the review, the board report and the Markdown export.
- **Contract renewals** — record when a contract renews, how many licences you pay for and how much notice the supplier needs. The review and board report show what renews next and flag any notice deadline that has already passed, and you can download the dates as a calendar file.
- **Your systems** — a new view listing every system with search, filters and sortable columns, where you can edit or delete anything without walking back through the wizard. This is also the only place several details can be set at all: status (active, planned, retiring, legacy), web address, notes, owner and importance.
- **Score your own tools** — systems that are not in the known tools database can now be given TechFreedom risk scores by hand, instead of being left unassessed.
- **Board report** — a printable one-page summary at `/view/report`: headline numbers, what needs attention, the systems you could not operate without, where the money goes, possible duplication and a risk summary. Print it or save it as a PDF for a trustee meeting.
- **How well does it work?** — the integrations step now asks whether each connection is reliable or fragile, and fragile ones are flagged in the review and the board report.
- **SVG export** of diagrams alongside PNG, which stays sharp at any size.

### Fixed

- **Switching map no longer risks overwriting the map you switch to** — storage worked out which map to write to at the moment of writing, not when the map was opened. Anything the page you were leaving still had in hand — an edit made in the last half-second, the flush on the way out — therefore landed on the map you had just switched to, replacing it with the contents of the one you left. A map is now written back to where it was read from.
- **Revisiting the functions step no longer detaches every tool from its function** — that step deleted every function and recreated it, which handed each one a new identifier and silently orphaned everything filed under it. Walking back through it, changing nothing, dropped the whole map into "Other systems". It now keeps functions you have not changed, removes only what you deselected and adds only what is new. Removing a function or a service also tidies up the references to it, rather than leaving systems pointing at something that no longer exists.
- **A system can be moved between functions after it exists** — the diagram has always grouped systems into the functions you defined, but only the wizard's systems step could set which function a system belongs to. Anything added another way, including everything imported from spend before that import learned to file things, stayed loose on the diagram with no way to attach it short of walking the wizard again. Your systems now has a "What it is used for" picker on every system.
- **Owners are clearly optional** — the owners step listed every system without one in an amber warning saying they "need" an owner, which read as a requirement even though it never blocked anything. It now says which systems have no owner yet, in plain type rather than a warning colour, and says outright that you can carry on and come back to it. Plenty of small organisations have no single answer, and nobody should be stuck at that step.
- **A vendor's name is no longer read as one of its products** — an "AMAZON" line on a statement was matched to Amazon Web Services, so roughly £400 a year of shopping arrived on the map ticked, costed and risk-scored as a cloud hosting bill. A bare brand now matches nothing and is listed for you to identify, unless that vendor sells only one thing Stackmap knows about. Matching is also anchored to whole words, so "Xerox" is no longer read as Xero, "Canvas Credit Union" as Canva, or "Zoominfo" as Zoom.
- **Statement shorthand is understood** — tools rarely bill under their own name, so Google Workspace bills as `GSUITE` and Microsoft 365 as `OFFICE 365`. Those codes are now recognised, and matching sees the full descriptor rather than only the tidied-up payee, which recovers products the tidying used to throw away.
- **Imported spend now replaces the figures Stackmap guessed** — costs record where they came from, so real money from your bank replaces an estimate and refreshes an earlier import, but never overwrites a figure you typed in yourself. Previously this was inferred from the pricing model, which meant wizard estimates were treated as your own and left in place, while a figure you typed and left as "unknown" was overwritten.
- **Two payment streams to one supplier no longer lose half the money** — payees that clean differently but name the same tool are combined before being added, instead of the first creating the system and the second quietly doing nothing.
- **The Spend format is only offered where it works** — opening the import dialog from the wizard's first page offered it without anywhere to send the result, so confirming a selection did nothing.
- **Your map survives a bad save** — if the browser refuses to store your map (usually because storage is full), Stackmap now tells you and prompts you to export, instead of failing silently.
- **Maps written by older versions load properly** — stored maps are checked and brought up to date on load, filling in fields that did not exist when the map was saved.
- **Damaged maps are no longer lost** — a map that cannot be read is kept as a backup in your browser rather than deleted, and individual entries that cannot be repaired are dropped with a count shown rather than taking the whole map with them.
- **The Data and Integrations steps no longer discard your work** — entries are saved as you add them, so leaving the step through the stepper (rather than the Continue button) keeps them.
- **Diagram labels cannot inject markup** — system and function names taken from imported files are stripped of angle brackets, and diagrams now render with strict security settings.
- **Functions with the same name get their own diagram groups** instead of being merged together.
- **Version numbers agree** — exported and stored maps now carry a single, correct version rather than three different ones.
- **A step no longer looks empty after a reload** — wizard steps read your saved map before drawing their forms, instead of drawing an empty one over data that was already there.
- **Clicking "Add system" works first time** — showing the estimated cost when you left the name field used to nudge the button out from under the pointer, so the click missed.
- **A change made just before closing the tab is still saved** — pending writes are flushed when the page goes away, not only when the app closes normally.
- **Importing the same spreadsheet twice no longer doubles your map** — rows are matched to systems you already have by name and update them instead, filling in blanks without overwriting anything you typed. The preview says how many rows are new and how many will be updated.

### Changed

- **Duplication is now spotted across the whole map**, not one function at a time, so two CRMs in different departments are finally visible. Each group shows what the tools cost together and roughly what consolidating could free up.
- **The cost total no longer stops at what you typed in** — systems with no cost recorded are priced from the known tools database where possible, shown separately from the recorded figure, with anything that still could not be priced called out.
- Saving to the browser is debounced, so typing no longer rewrites the whole map on every keystroke.

### Internal

- ESLint configuration added, so `npm run lint` runs; a CI workflow now runs lint, typecheck and tests on every push and pull request.
- Removed the unused `sql.js` dependency.
- Diagram output is now checked against the real Mermaid parser in tests.
- End-to-end tests cover the wizard in a real browser: full traversal, revisiting a step, reloading mid-flow, editing from the inventory and clearing the map. They run in CI.
- Lint runs with warnings treated as errors; the effect-related warnings that were previously downgraded have been fixed at source, and app config now uses `useSyncExternalStore` (which also keeps two open tabs in step).

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
