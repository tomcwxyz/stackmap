# Stackmap

**Lightweight architecture mapping for social purpose organisations.**

## What is Stackmap?

Stackmap is an open source tool that helps charities, social enterprises, and local councils map their technology architecture. It provides a guided wizard that walks anyone with operational knowledge through documenting their systems, integrations, data, and ownership — without requiring enterprise architecture expertise.

The result is an immediately useful architecture map with visual diagrams, cost analysis, and optional risk assessment.

## Who is it for?

- **Small charities and social enterprises** — No IT team, technology decisions made by the CEO or operations lead, systems accumulated over years with no single view of the whole picture.
- **Medium VCSE organisations** — May have a part-time IT person or outsourced support, want to understand their stack before making changes or investments.
- **Local councils** — Digital teams who want a lightweight tool for local government reorganisation (LGR) planning, or who want to pilot architecture mapping before committing to enterprise tooling.

## Why Stackmap?

Commercial enterprise architecture tools (ArchiMate, TOGAF-based platforms) are expensive, complex, and designed for specialists. Most social purpose organisations do not have — and do not need — those tools. They need something that:

- One person can complete in an afternoon
- Requires no enterprise architecture training
- Produces a useful artefact immediately
- Is open source with zero vendor lock-in

Stackmap was built because I often find organisations struggle to do this in an easy and consistent way. 

## Key Features

- **Two wizard paths** — start with organisational functions ("what we do") or services ("what we deliver")
- **Smart suggestions** — system recommendations tailored to your organisation type and size
- **14 service templates** with auto-populated tools
- **Import from CSV or JSON** — bring in existing data from spreadsheets or previous exports, with merge support
- **TechFreedom risk assessment** — integrated wizard step scoring systems across jurisdiction, continuity, surveillance, lock-in, and cost exposure
- **Cost estimation** with per-seat pricing and tier selection
- **Architecture and data flow diagrams** — visual maps with status indicators, personal data flags, and sensitivity colouring
- **Systems inventory** — edit or delete any system after the wizard, in one searchable table
- **Board report** — a printable summary for trustees and funders
- **JSON, Markdown, CSV, SVG and PNG export** of your complete architecture
- **Fully accessible** — WCAG 2.1 AA, keyboard navigable, screen reader compatible

## Quick Start

```bash
git clone https://github.com/dataforaction-tom/stackmap.git
cd stackmap
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and follow the guided wizard to start mapping your architecture.

For a detailed walkthrough, see the [User Guide](user-guide.md).
