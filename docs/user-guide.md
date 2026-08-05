# User Guide

This guide walks you through using Stackmap to map your organisation's technology architecture.

---

## 1. Getting Started

### What you need

- A modern web browser (Chrome, Firefox, Safari, or Edge)
- About 30-60 minutes, depending on the size of your organisation
- Knowledge of what software your organisation uses and how systems connect

Stackmap runs entirely in your browser. Your data is stored in your browser's local storage and never leaves your device.

### Creating your organisation profile

When you first open Stackmap, you will be asked to set up your organisation:

- **Name** — Your organisation's name
- **Type** — Charity, social enterprise, council, cooperative, private business, or other
- **Size** — Micro (1-5 staff), small (6-25), medium (26-100), or large (100+)
- **Staff count** (optional) — Your full-time equivalent headcount, used for more accurate cost estimates
- **Annual turnover** (optional) — In GBP

Your organisation type and size affect which system suggestions you see later in the wizard.

---

## 2. Choosing Your Path

Stackmap offers two ways to map your architecture. Both paths lead to the same result — choose whichever feels more natural.

### Function-first: "Start with what we do"

Best for organisations that:

- Do not think in terms of "services"
- Want a more structured approach
- Prefer to start with familiar categories like Finance, People, and Communications

You begin by selecting which organisational functions apply to you, then add the systems used for each function.

### Service-first: "Start with what we deliver"

Best for organisations that:

- Have clearly defined services they deliver
- Think in terms of what they provide to users, clients, or beneficiaries
- Want to map technology around their delivery model

You begin by listing your services, then add the systems that support them.

!!! tip "Not sure which to choose?"
    If your organisation is small and does not have clearly defined services, start with **function-first**. The standard functions (Finance, Governance, People, etc.) give you a solid scaffold to work from.

---

## 3. Function-First Wizard

### Step 1: Select your functions

You will see a list of 8 standard organisational functions:

| Function | Description |
|----------|-------------|
| **Finance** | Financial management, accounting, budgeting, and reporting |
| **Governance** | Board management, compliance, policies, and organisational oversight |
| **People** | HR, recruitment, payroll, volunteering, and staff management |
| **Fundraising** | Donor management, grant applications, campaigns, and income tracking |
| **Communications** | External communications, marketing, social media, and website management |
| **Service Delivery** | Delivery of core services, programmes, and activities to beneficiaries |
| **Operations** | Day-to-day operations, facilities, logistics, and procurement |
| **Data & Reporting** | Impact measurement, data collection, analysis, and funder reporting |

Select all the functions that apply to your organisation. You can also add custom functions if your work does not fit neatly into these categories.

!!! tip
    Most organisations will select at least Finance, People, Communications, and Operations. Do not overthink it — you can always come back and adjust.

### Step 2: Add systems for each function

For each function you selected, you will be asked: "What software do you use for [Function]?"

Stackmap suggests tools based on your organisation type and size. For example, a small charity selecting Finance might see suggestions for Xero, QuickBooks, and FreeAgent.

For each system you add, you can provide:

- **Name** — The name of the software (e.g., "Xero", "Google Sheets")
- **Type** — CRM, finance, HR, case management, spreadsheet, etc.
- **Vendor** — Who makes it
- **Hosting** — Cloud, on-premise, hybrid, or "don't know"
- **Status** — Active, planned, retiring, or legacy
- **Cost** — Amount, period (monthly/annual), and pricing model

A system can support multiple functions. If you have already added a system for a previous function, you will be able to link it rather than entering it again.

### Step 3: TechFreedom risk assessment

If TechFreedom is enabled, the wizard includes a dedicated risk assessment step. Each system you have added is scored across five dimensions: jurisdiction, continuity, surveillance, lock-in, and cost exposure. Known tools are pre-scored automatically — you can review and override any score.

See [TechFreedom Risk Assessment](#10-techfreedom-risk-assessment) for full details.

### Step 4: Services (optional)

You will be asked: "Do you want to map specific services within these functions?"

This step is optional. If your organisation thinks in terms of services (e.g., "Advice sessions", "Youth programmes"), you can add them here and link them to the functions and systems you have already mapped. Each service now includes a **beneficiaries** field where you can describe who the service is for.

If this is not relevant to your organisation, skip this step.

---

## 4. Service-First Wizard

### Step 1: List your services

Add each service your organisation delivers:

- **Name** — What the service is called (e.g., "Employment support", "Community meals")
- **Description** — A brief description of what the service involves
- **Status** — Active, planned, or retiring

Stackmap provides 10 service templates you can use as starting points:

- Advice sessions
- Grant distribution
- Housing repairs
- Youth programmes
- Training courses
- Community events
- Counselling
- Food bank
- Advocacy & campaigns
- Volunteer coordination

Selecting a template auto-populates suggested tools for that service type.

### Step 2: Add systems

For each service, add the software used to deliver it. As with the function-first path, you can provide details about type, vendor, hosting, status, and cost.

### Step 3: Tag functions

Tag each system with the organisational functions it supports. This categorises your systems for analysis and helps identify which functions are well-served and which have gaps.

---

## 5. Adding Systems

Whether you are on the function-first or service-first path, adding systems works the same way.

### Suggested tools

Stackmap shows tool suggestions based on your organisation type, size, and the function or service you are mapping. Suggestions are drawn from a database of tools commonly used in the sector.

If a suggested tool has data in the known tools database, Stackmap can automatically provide:

- Cost estimates with per-seat pricing
- TechFreedom risk scores (if enabled)
- Provider and category information

### Manual entry

You can always add any system manually. Enter the name and fill in whatever details you know. Fields you leave blank can be completed later.

### Cost information

For each system, you can record:

- **Amount** — How much it costs
- **Period** — Monthly or annual
- **Model** — Subscription, perpetual licence, free, or unknown

If a tool is in the known tools database with pricing data, Stackmap will estimate costs automatically based on your organisation's staff count.

---

## 6. Data Categories

After adding systems, you will map the data your systems hold.

### Adding data categories

For each system, tag the types of data it holds. Common categories include:

- Client records
- Financial transactions
- Case notes
- Staff records
- Donor information
- Contact details

### Sensitivity levels

Each data category has a sensitivity level:

| Level | Meaning |
|-------|---------|
| **Public** | Information that is or could be publicly available |
| **Internal** | Internal working information, not for public release |
| **Confidential** | Sensitive information requiring controlled access |
| **Restricted** | Highly sensitive data (safeguarding, health, legal) |

### Personal data flag

You can mark whether a data category contains personal data. This is useful for understanding your data protection obligations and GDPR exposure.

---

## 7. Integrations

The integrations step captures how your systems connect to each other.

### Connection types

For each pair of connected systems, record:

| Type | Description |
|------|-------------|
| **API** | Automated connection via programming interface |
| **File transfer** | Scheduled or manual file exchange (CSV, Excel, etc.) |
| **Manual** | Someone copies data between systems by hand |
| **Webhook** | Automated trigger-based notifications |
| **Database link** | Direct database connection |
| **Unknown** | You know they connect, but not how |

### Direction

- **One-way** — Data flows from system A to system B only
- **Two-way** — Data flows in both directions

### Frequency

- **Real-time** — Immediate, as changes happen
- **Scheduled** — Regular intervals (daily, weekly, etc.)
- **On-demand** — When someone triggers it
- **Unknown** — Not sure how often

!!! note "Integration honesty"
    Most small organisations do not have APIs — they have "Sarah exports it on Tuesdays." Stackmap is designed to capture this reality honestly. Selecting "Manual" as the integration type is completely valid and helps identify where automation might add value later.

---

## 8. Owners

Assign ownership for each system:

- **Name** — The person or role responsible (e.g., "Finance Manager", "CEO", "External IT support")
- **Role** — Their position
- **External** — Whether they are outside your organisation (e.g., outsourced IT provider)
- **Contact info** — Optional contact details

Ownership mapping helps with:

- Understanding who to ask about a system
- Identifying single points of failure (one person responsible for everything)
- Planning handovers and succession

---

## 9. Review and Export

The final step shows a summary of your complete architecture map.

### What you see

- **Organisation overview** — Your org details and the mapping path you chose
- **Functions and services** — What your organisation does
- **Systems** — All the software you use, with cost and risk information
- **Data categories** — What data you hold and its sensitivity
- **Integrations** — How systems connect
- **Owners** — Who is responsible

### Architecture diagram

Stackmap generates a Mermaid diagram showing your systems and their relationships. This can be embedded in documents, wikis, or GitHub README files.

You can switch between two diagram modes:

- **Architecture view** — shows systems grouped by function, with status indicators and service tags
- **Data flow view** — shows how data moves between systems, colour-coded by sensitivity level (public, internal, confidential, restricted)

### JSON export

Export your complete architecture as a JSON file. This produces a structured document containing all entities, relationships, and metadata. The JSON format can be:

- Shared with colleagues
- Imported back into Stackmap (see [Importing Data](#14-importing-data))
- Stored in version control
- Used for sector-wide aggregation

---

## 10. TechFreedom Risk Assessment

TechFreedom is an optional feature that assesses the risk profile of your technology stack across five dimensions.

### What is TechFreedom?

TechFreedom scores each system in your architecture on a 1-5 scale across five risk dimensions:

| Dimension | What it measures | Example risk |
|-----------|-----------------|-------------|
| **Jurisdiction** | Where data is stored and under which legal regime | US-based service subject to CLOUD Act |
| **Continuity** | Risk of the service disappearing or changing terms | Startup with uncertain funding |
| **Surveillance** | Extent of data mining and telemetry | Advertising-funded platform profiling users |
| **Lock-in** | How difficult it is to export data and switch | Proprietary format with no export |
| **Cost exposure** | Risk of price increases | History of above-inflation price rises |

Scores range from 1 (low risk) to 5 (critical risk).

### How to enable TechFreedom

TechFreedom has a two-tier toggle:

1. **App-level** — Controls whether TechFreedom is available at all. This is a global setting.
2. **Organisation-level** — Even when enabled globally, individual organisations can opt out of risk assessment for their architecture.

### Reading the results

#### Risk badges

Each system shows a risk badge with an overall risk level:

- **Low** — Score 1-2, minimal concerns
- **Moderate** — Score 2-3, some areas to watch
- **High** — Score 3-4, significant concerns in one or more areas
- **Critical** — Score 4-5, serious risks that need attention

#### Heatmap table

The TechFreedom analysis view shows a heatmap table with all your systems and their scores across the five dimensions. This makes it easy to spot patterns — for example, if all your systems score high on jurisdiction risk because they are US-based.

#### Radar chart

The radar chart shows the aggregate risk profile of your entire stack across all five dimensions. This gives a quick visual overview of where your organisation's technology risk is concentrated.

### Pre-scored tools

Stackmap includes a database of over 130 commonly used tools with pre-scored risk assessments, covering:

- **AI tools** — ChatGPT, Claude, Microsoft Copilot, Gemini, plus privacy-focused alternatives like Ollama, LM Studio, Mistral, and other local models
- **Productivity** — Microsoft 365, Google Workspace, LibreOffice, OnlyOffice
- **CRM** — Salesforce, HubSpot, CiviCRM, Lamplight, Dynamics 365, Donorfy, Beacon
- **Finance** — Xero, QuickBooks, Sage, FreeAgent, Wave
- **Communication** — Slack, Zoom, Teams, Element/Matrix, Whereby, BigBlueButton
- **Social media** — LinkedIn, Meta, Instagram, YouTube, TikTok, Mastodon, Bluesky
- **Databases** — Google Sheets, Excel, Access, Notion, Airtable, Baserow, NocoDB
- **Data visualisation** — Power BI, Tableau, Looker Studio, Metabase
- **Geospatial** — QGIS, ArcGIS, Google Maps, Mapbox, Felt
- **Hosting** — AWS, Azure, Cloudflare, Netlify, Vercel
- **Payment** — Stripe, GoCardless, PayPal, JustGiving
- **And more** — project management, marketing, events, design, storage, messaging

When you add a system that matches a known tool, risk scores are populated automatically. You can override any score if you disagree with the assessment.

Each tool in the database includes risk assessments, pricing data (where available), and a description of key risks relevant to social purpose organisations.

---

## 11. Cost Overview

Stackmap estimates the annual cost of your technology stack based on the systems you have mapped.

### How costs are estimated

1. **Known tools with pricing data** — If a system matches a tool in the database with detailed pricing, Stackmap calculates cost based on:
   - Your staff count (or default for your size band)
   - The tool's penetration rate (what fraction of staff need licences)
   - The most appropriate pricing tier for your user count
2. **Known tools with base cost only** — Scaled from a baseline of approximately 15 users
3. **Manual entry** — If you entered cost data for a system, that amount is used directly

### Understanding the breakdown

Each system's cost estimate shows:

- **Annual total** — Estimated yearly cost
- **Per seat** — Cost per user per year (if applicable)
- **Seats** — Number of licences estimated
- **Tier** — Which pricing tier was selected
- **Breakdown** — Human-readable explanation of how the cost was calculated

### Size bands and defaults

If you have not specified your staff count, Stackmap uses defaults:

| Size | Default staff |
|------|--------------|
| Micro | 3 |
| Small | 15 |
| Medium | 60 |
| Large | 200 |

---

## 12. Live Map Sidebar

As you work through the wizard, a live sidebar shows your architecture map building up in real time.

### How it works

The sidebar displays a simplified Mermaid diagram that updates automatically as you add functions, systems, services, and integrations. It provides a visual confirmation that your data is being captured correctly.

### What the map shows

- **Systems** display status indicators (active, planned, retiring, legacy) with colour coding
- **Personal data** — systems holding personal data show a shield icon
- **Shared systems** — systems used by more than one function appear in a dedicated row with dots indicating which functions they belong to
- **Services** appear as amber tags alongside their systems

### Tips

- The sidebar is visible on larger screens. On mobile devices, you can toggle it.
- Use it to spot gaps — if a function shows no systems, you may have missed something.
- The sidebar provides contextual guidance based on the current wizard step.

---

## 13. Starting Over

### Navigating between steps

The stepper at the top of the wizard is fully interactive. You can click any completed step to jump back and edit your data. Your entries are preserved — going back shows what you previously entered, and you can make changes without losing work in later steps.

On mobile, use the left and right arrows to navigate between steps.

### Clearing data

To start completely fresh, go to the path selection page (the first step). If you have existing data, you will see a banner offering to "Start fresh." Click it, then confirm. This removes all data from your browser's local storage and cannot be undone.

### Cost overview and overlap detection

The review step includes a cost overview showing:

- **Total annual cost** of your technology stack
- **Breakdown by function** — which areas cost the most
- **Most expensive systems** — your top 3 by annual cost
- **Potential overlaps** — where you have multiple systems of the same type under one function (e.g. two CRM systems in Fundraising), suggesting consolidation opportunities

Cost data is included in the JSON export.

!!! warning
    Clearing data is permanent. If you want to keep a copy, export your architecture as JSON before clearing.

---

## 14. Importing Data

If you already have information about your technology in a spreadsheet or a previously exported Stackmap file, you can import it instead of entering everything manually.

### How to import

The import button is available on the landing page and throughout the wizard. Click it to open the import dialog, where you can:

1. **Choose your format** — CSV (from a spreadsheet) or JSON (from a previous Stackmap export)
2. **Upload your file** — drag and drop or browse to select
3. **Preview and check** — for CSV files, a preview table shows your data with completeness indicators highlighting any missing fields

### Import modes

- **Fresh import** — replaces any existing data with the imported architecture
- **Merge** — adds imported systems and data into your current architecture, without overwriting what you have already mapped

### Auto-scoring

When you import systems that match known tools in Stackmap's database, TechFreedom risk scores and cost estimates are filled in automatically. You can review and adjust these after import.

### CSV format

Your CSV should include columns for system name, type, vendor, and any other details you have. Stackmap is flexible about column names — it will match common variations like "System", "Tool", "Software" for the system name column.

### Tips

- Export your current architecture as JSON before importing, so you have a backup
- The merge mode is useful for adding new systems discovered during a review without losing existing work
- After import, walk through the wizard to fill in any gaps the import could not cover (integrations, data categories, owners)

---

## 15. Editing Your Systems

The wizard captures each system once, on the step where you added it. Afterwards,
**Your systems** (in the top navigation, or from the review and diagram pages) is
where you change anything.

The table lists every system you have mapped, including shadow tools. You can:

- **Search** by name, supplier or notes
- **Filter** by function or status
- **Sort** by any column — click a column heading, click again to reverse it
- **Edit** a system, which opens a form covering every field
- **Delete** a system, with a confirmation step

### Details only available here

Some fields are not asked for during the wizard and can only be set from this form:

- **Status** — active, planned, retiring, or legacy. Retiring and legacy systems are
  drawn differently in the diagrams, so this is worth setting for anything on its
  way out.
- **Web address** — where you log in.
- **Notes** — contract quirks, who set it up, what breaks.
- **What it is used for** — which functions this system belongs to. The diagrams
  group systems by function, so a system with none is drawn on its own. This is
  the only place to change it once a system exists, which matters for anything
  that arrived from a spend import or a spreadsheet rather than the wizard.
- **Owner**, **importance** and **cost** can also be corrected here rather than
  going back through the wizard.

### Scoring a system yourself

If risk assessment is switched on, systems that match Stackmap's known tools
database are scored automatically. Anything else — a bespoke system, a local
supplier's portal, a spreadsheet someone built years ago — starts unscored.

Open the system for editing and choose **Score this system** to set all five
dimensions yourself. Scores you set or adjust by hand are marked as manually
assessed rather than automatic, so you can tell the two apart later.

---

## 16. The Board Report

**Board report** turns your map into a one-page summary meant to be read by people
who did not build it — trustees, a funder, a senior management team.

It covers:

- **Headline numbers** — systems, recorded annual cost, areas covered, named owners
- **What needs attention** — critical systems with no owner, critical work happening
  on informal tools, fragile connections, areas resting on a single system,
  personal data on unowned systems, legacy systems, and missing cost data
- **Systems you could not operate without** — everything scored 8 or above, with
  owner, cost and whether it holds personal data
- **Where the money goes** — cost by area
- **Possible duplication** — where consolidation might save money
- **Technology risk** — a plain-English summary, if risk assessment is on

Use **Print or save as PDF** to produce a copy for a meeting. The page is styled for
print: site navigation and buttons are dropped, and sections avoid breaking across
pages.

!!! note
    The report describes what you entered. If systems have no cost recorded, the
    total will understate what you actually spend — the report says so where that
    applies.

---

## 17. Contracts and Renewals

For each system you can record, from **Your systems**:

- **Licences** — how many seats you pay for
- **Renews on** — the date the contract next renews or auto-renews
- **Notice period** — how many days of warning the supplier needs

Once any renewal dates are set, the review step and the board report show a
**What renews next** section: everything in date order, what each costs, and the
last day you could give notice.

### Notice deadlines

If a contract renews on 1 October and the supplier needs 90 days' notice, the last
useful day to act is 3 July. Once that day passes, the renewal is flagged in red
and appears in the board report under things needing attention — the contract will
roll over whether or not anyone intended it to.

### Adding renewals to your calendar

**Add to calendar** on the review step downloads an `.ics` file with one all-day
event per renewal, including the notice deadline in the event description. Open it
in Outlook, Google Calendar or Apple Calendar to import the dates.

---

## 18. What to Deal With First

If risk assessment is switched on and you have scored importance, the review step
and board report show your systems in four groups:

- **Critical and exposed** — you depend on these and they carry real risk. Start here.
- **Critical and solid** — you depend on these but they look sound. Keep them that way.
- **Exposed but not critical** — risky tools you could live without. Often the easiest wins.
- **Low priority** — neither critical nor especially risky.

A system needs both an importance score and a risk score to appear. Anything missing
one is counted underneath rather than being silently left out.

### Duplication

**Potential overlaps** compares systems across your whole map rather than one area
at a time, so two CRMs in different departments show up as one finding. Where costs
are recorded, it shows what the group costs together and roughly what moving to a
single tool could free up — a crude figure that ignores migration effort, so treat
it as the ceiling rather than a forecast.

Grouping follows the system type you chose. If you want two tools compared, give
them the same type.

---

## 19. Finding Your Tools From What You Pay For

Remembering every tool the organisation uses is the hardest part of mapping. Your
bank statement already knows.

Choose **Import**, then **Spend**, and upload a transaction export from your
accounting software (Xero, QuickBooks) or online banking. Stackmap reads it in your
browser — the file is never uploaded anywhere.

### What it does

- Finds the payee, amount and date columns, whatever they are called — Starling's
  "Counter Party", Xero's "Contact" and most banks' "Description" are all understood
- Ignores money coming in, so grants and donations are not mistaken for costs
- Cleans up payee text: `SP * CANVA I0F2K3` and `GOOGLE *GSUITE_yourorg` become
  Canva and Google Workspace
- Groups repeat payments to the same place, even when the reference code differs
  every month
- Works out how often you pay — monthly, quarterly, yearly — and what that comes to
  over a year

### What it will not guess

A payee that names only a vendor — `AMAZON`, `GOOGLE`, `MICROSOFT` — is left
unrecognised, because the brand says nothing about which of their products the
payment was for. It appears in the list below for you to tick and name if it is
software. Where a vendor sells only one thing Stackmap knows about, such as
Anthropic, the product is named as usual.

Statement shorthand is understood: `GOOGLE *GSUITE_yourorg` is recognised as
Google Workspace even though the words "Google Workspace" never appear.

### What you confirm

Nothing is added until you tick it. Tools Stackmap recognises are ticked for you.
Payees it does not recognise are listed separately and left unticked — some will be
software it has not heard of, most will be rent, salaries and suppliers.

### Where each tool ends up

Every row has a **Belongs to** column: the part of the organisation the tool will be
filed under. Stackmap fills it in from the same lists the wizard suggests from — if
the Finance step offers Xero, then Xero is Finance — and falls back to the kind of
system it is when a tool is not on those lists.

Change any of them from the dropdown. The likely answers are listed first, then the
rest, and **Not sure yet** leaves a tool unfiled if you would rather decide later.

If a tool needs a function your map does not have yet, Stackmap says so before you
import — *Finance, Operations will be added to your map* — and adds it. This is what
stops imported tools sitting in an "Other systems" bucket, which used to mean adding
the same tool a second time through the wizard.

!!! note
    A tool used right across the organisation, such as an AI assistant or a
    spreadsheet, is filed under Operations. Any single answer there is a guess —
    the dropdown lists everywhere it might plausibly belong.

### Costs

Systems added this way carry the cost you actually paid, which is better than any
estimate. If a system is already on your map, importing spend fills in a cost that
was missing but never overwrites a figure you typed in yourself.

### If it reads the wrong columns

There are as many header conventions as there are banks, so no list covers all of
them. Two things follow from that:

- **If nothing looks familiar, Stackmap asks** rather than refusing the file. You
  pick which column holds who was paid, how much, and when.
- **If it guessed and got it wrong,** choose *Reading the wrong columns? Choose them
  yourself* on the preview. What it detected is filled in ready to correct, and the
  file is re-read without you having to pick it again.

Each column is listed with a couple of real values from your file next to it, since
a header name on its own often does not tell you which one you want.

Two things are worth knowing when picking by hand:

- **The amount is not the balance.** Most bank exports put a running balance right
  next to the amount and it looks identical. Stackmap will never suggest a balance
  column, but you can pick one by mistake.
- **Tick "only ever money going out"** if your file has separate "Money out" and
  "Money in" columns. Otherwise Stackmap treats negative amounts as spending.

!!! tip
    A full year of transactions gives the best results. A shorter export still
    works, but Stackmap will not guess an annual figure from a fortnight of data —
    it reports what was actually spent.

---

## 20. Councils and Businesses

The eight standard functions are shaped around charities. If you set your
organisation type to **Council** or **Private business**, the functions step
offers a second set underneath, headed "Also common for organisations like yours".

**Councils** are offered Revenues & Benefits, Planning & Building Control, Adult
Social Care, Children's Services, Waste & Environment, Housing, Customer Services,
and Elections & Registration — each with the systems councils typically run behind
them, so the systems step has somewhere to start.

**Businesses** are offered Sales, Customer Support, Product & Delivery, and Legal &
Compliance.

You can mix these with the standard functions freely, and add your own on top. If
your organisation type is charity or social enterprise, nothing changes — the
standard eight already fit.

!!! note
    Sector functions are stored as custom functions, so exports and diagrams treat
    them exactly like any function you name yourself.

---

## 21. Who Sees Your Data

The map stops at your own systems, but most of what a small organisation does
with its data involves somebody else — reporting to a funder, filing with a
regulator, handing a spreadsheet to an auditor. The data step asks about that
once you have added at least one data category.

### Adding someone you share with

Give each one a name, say what they are to you (funder, regulator, auditor,
delivery partner, supplier or other) and say roughly where they are: UK, Europe,
outside Europe, or "don't know". Location matters because sending personal data
out of the UK needs its own safeguards, and it is the one thing people forget.

### Recording what goes to them

For each thing you share, record:

| Field | Why it is asked |
|-------|-----------------|
| **From which system** | Ties the sharing to something already on your map |
| **To whom** | One of the parties you added above |
| **How does it get there** | Their portal, email, a file, an API, post, or someone typing it in |
| **How often** | Once a year, on a schedule, when asked, or continuously |
| **Why do they need it** | The first thing a regulator asks |
| **Which data** | The categories you have already listed |

Removing a party also removes anything recorded as going to them, since sharing
with somebody who is no longer on the list means nothing.

---

## 22. The Data Protection Record

If any of your data categories is marked as containing personal data, Stackmap
can draft a **record of processing activities** — the register UK GDPR Article 30
requires most organisations to keep. Find it at `/view/ropa`, or from the
"Data protection record" button at the end of the wizard.

### What it fills in for you

Most of Article 30 is already on your map. The record takes:

- **What data you hold** — your personal-data categories
- **Which systems hold it** — from the systems each category is assigned to
- **How it is hosted** — cloud, on-premise or hybrid, as a rough note on security
- **Who it goes to and why** — from the sharing you recorded in the data step
- **Whether it leaves the UK** — flagged when any recipient is outside the UK

### What it asks you for

Three things the map cannot know, asked here rather than in the wizard so they
only cost you time if you actually want the record:

- **Who is it about** — people you support, staff, donors, and so on
- **Lawful basis** — one of the six in Article 6: consent, contract, legal
  obligation, vital interests, public task, or legitimate interests
- **How long you keep it** — in plain words, such as "7 years after last contact"

Each entry says what it is still missing rather than guessing, and the header
counts how many are outstanding.

### Exporting it

**Export as CSV** produces a spreadsheet with Article 30 headings, which is how
most organisations keep theirs, and what an ICO request will expect.

!!! warning
    This is a draft, not a finished record. Stackmap fills in what it can from
    your map; the gaps, the wording and the accuracy are yours. Check every line
    and have someone accountable sign it off. An Article 30 record is a legal
    responsibility, not a tool's output.

---

## 23. Several Maps, and Snapshots

Everything Stackmap stores lives in your browser, and until now that meant one
map. **Your maps** in the header (or `/maps`) lets you keep several, and keep
snapshots of the one you are working on.

### Why you might want more than one

- **You advise more than one organisation.** Previously you had to clear the map
  between them. Now each has its own, and switching does not touch the others.
- **You want to ask "what if".** Copy the map, change the copy, and compare —
  without putting the map that describes what is actually there at risk.

### Working with maps

| Action | What happens |
|--------|--------------|
| **Add** | A blank map under a name you choose. You stay on the map you were on |
| **Or copy _name_** | A duplicate of the current map, so the original is untouched |
| **Switch to this** | Makes that map the one everything else reads, then opens your systems |
| **Rename** | Changes the name only; the map itself is unaffected |
| **Delete** | Removes the map and its snapshots, after asking. The last map cannot be deleted |

Your first map is the one you already had — nothing is moved or rewritten when
the list is created, so if you never make a second map, nothing changes for you.

### Snapshots

A snapshot is the map exactly as it is at that moment, saved under a label. Take
one before a big change and you can put it back if the change was wrong.

- The last **ten** snapshots of each map are kept; older ones are dropped rather
  than filling up the browser's storage.
- **Restore** puts a snapshot back over the map — and snapshots what was there
  first, labelled "Before restoring", so restoring the wrong one costs nothing.
- Snapshots belong to a map. Deleting a map deletes them with it.

!!! warning
    Snapshots are stored in the same browser as the map, so they protect against
    a bad edit — not against a lost laptop or a cleared browser. Export as JSON
    for anything you cannot afford to lose.
