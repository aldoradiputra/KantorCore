# CLAUDE.md — Indonesia System (Product)

This file is the source of truth for Claude Code when working on the **Indonesia System** product codebase.

---

## What This Is

**Indonesia System** is a national corporate OS for Indonesia — simpler than Odoo, powerful enough to replace SAP, natively integrated with Indonesian government infrastructure (BPJS, CoreTax DJP, Dukcapil via PrivyID, QRIS via payment gateway).

Target market: Indonesian mid-market companies (50–500 employees). B2B SaaS + on-premise.
Business model: flat-fee service tiers (not feature-gated). Unlimited users per tier.
Language: Bahasa Indonesia primary, English secondary (i18next, ID/EN from day one).

---

## Monorepo Structure

```
indonesia-system/          ← root (Turborepo + npm workspaces)
  apps/
    web/                   ← React 19 + Vite SPA (frontend)
    api/                   ← Hono + Node.js (backend)
  packages/
    db/                    ← Drizzle ORM schema + migrations
    ui/                    ← Shared component library (Shadcn/ui + custom tokens)
    config/                ← Shared tsconfig, eslint, prettier configs
  docker/
    Dockerfile.api
    Dockerfile.web
    docker-compose.yml     ← local dev stack
  .kamal/                  ← Kamal deploy config
```

---

## Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React 19 + Vite + TypeScript | No Next.js — SPA with TanStack Router |
| Backend | Hono + Node.js + TypeScript | Lightweight, fast, great TS support |
| Database | PostgreSQL | One DB per company (tenant isolation) |
| ORM | Drizzle ORM | SQL-close, excellent multi-tenant connection model |
| Auth | better-auth | Self-built; covers TOTP, passkeys, SAML/OIDC, sessions |
| State | TanStack Query (server) + Zustand (client) | |
| UI | Shadcn/ui + Radix primitives | Restyled with IS design tokens, no Tailwind in logic |
| Styling | CSS Modules + design tokens | No Tailwind |
| i18n | i18next + react-i18next | ID/EN, ID default |
| Dev DB | Supabase (local CLI) | Supabase CLI for local dev; production = self-hosted PG |
| Deploy | Kamal + Docker | On-premise first; cloud staging on a VPS |
| CI/CD | GitHub Actions | Lint → test → build → push image → Kamal deploy |
| Monorepo | Turborepo + npm workspaces | |

---

## Multi-Tenancy

- **One PostgreSQL database per company** — hard tenant isolation
- Each company DB is created on signup; connection string stored in a central `registry` DB
- API resolves tenant from subdomain (`acme.indonesiasystem.id`) or JWT claim
- Drizzle connects to the correct DB per request via connection pool map
- Central `registry` DB: companies, subscription tiers, feature flags, billing

### DB naming convention
```
is_tenant_{company_slug}   ← e.g., is_tenant_acmecorp
is_registry                ← central registry
```

---

## Authentication (self-built, no third-party vendor)

Built with **better-auth**. No Fazpass, no Auth0, no Clerk.

### Phase 1 (v1.0)
- Email + password (bcrypt, min 12 chars)
- TOTP / Authenticator app MFA (Google Authenticator, Authy)
- RBAC — roles, groups, module-level and record-level permissions per company
- Session management — concurrent sessions, forced logout, remember-me
- Auth audit log — immutable per-user login/permission event log

### Phase 2 (v2.0)
- Passkeys / WebAuthn (FIDO2)
- SAML 2.0 / OIDC — SSO with Google Workspace, Azure AD / Entra ID, Okta
- API keys + OAuth 2.0 for third-party integrations

### No SMS OTP
SMS OTP is a security anti-pattern (SIM swap). TOTP and passkeys are the MFA strategy.

---

## Platform Core Architecture

**Platform Core is built before any domain module.** Every feature in every module is implemented as a chain through these 8 primitives.

### Core Mental Model

```
  User UI / API / Agent / Workflow
           │
           ▼
     Tool Registry ◄── Permission Fabric
           │
           ▼
     Domain Logic
           │
           ├──► DB (Drizzle, multi-tenant)
           └──► Event Bus ──► Audit Log
                         ──► Workflow Engine
                         ──► Real-time clients
                         ──► Webhooks / Connectors
                         ──► AI Agents
```

Every action — whether triggered by a human in the UI, an API call, a scheduled workflow, or an AI agent — flows through the Tool Registry. The Tool Registry checks permissions, executes domain logic, emits a domain event, and returns a typed result. The event fan-out handles everything else asynchronously.

### The 8 Primitives

#### 1. Event Bus + Outbox (IS-PLAT-EVT)
- Postgres transactional outbox guarantees zero event loss even if the message broker is temporarily unavailable
- Events fan out to: Audit Log writer, Workflow trigger evaluator, Real-time hub broadcaster, Webhook dispatcher, AI agent notifier
- Every event envelope: `{ tenant_id, actor_id, actor_type, event_type, payload, correlation_id, causation_id, timestamp }`
- `correlation_id` tracks an entire user session or API request chain; `causation_id` points to the parent event that caused this one
- Broker: NATS or Redis Streams (swap without changing producers/consumers)

#### 2. Tool Registry (IS-PLAT-TOOL)
- Every capability in the system is a **named, typed, versioned tool**: `hr.employee.create`, `finance.invoice.approve`, `workflow.run`
- Tools are the single entry point for all callers — UI buttons, REST endpoints, workflow steps, AI agents all invoke the same tool
- Tool manifest is machine-readable (JSON Schema): enables self-documenting API, AI agent function calling, and no-code builder action pickers
- The executor pattern: validate input schema → check permissions → run handler → emit event → return typed result
- Registering a new feature = writing a tool handler; the platform handles the rest

#### 3. Audit Log (IS-PLAT-AUD)
- Append-only table; never updated or deleted
- Columns: `id, tenant_id, actor_id, actor_type (user|service|agent|workflow), tool_name, intent, input_snapshot, before_state, after_state, source (ui|api|workflow|agent), timestamp, correlation_id`
- Query API supports: filter by actor, resource type, time range, action type; returns structured diffs
- Powers: compliance reports, breach detection anomaly baseline, "who changed this?" UX in every record detail view
- UU PDP requires immutable audit log for personal data processing — this is that log

#### 4. Schema Extensibility (IS-PLAT-SCH)
- Architecture: Drizzle-managed kernel columns (typed, indexed, migrated) + `custom_fields JSONB` overlay column
- Field definitions stored in a `schema_registry` table (per-tenant): `{ id, entity_type, field_key, field_type, label_id, validation, options }`
- No DB migration required when a company adds a custom field — just a row insert in `schema_registry`
- Frontend reads field definitions and renders forms dynamically; validation rules colocated with definition
- Custom views (saved column sets, filters, sorts) also stored in schema registry — same pattern

#### 5. Workflow Engine (IS-PLAT-WF, moved to Phase 1)
- **First-class versioned objects**, not config stored in random tables
- Trigger types: domain event (e.g. `invoice.approved`), schedule (cron), manual, API call, AI agent
- Step types: Tool Registry call, condition branch, wait-for-event, human approval gate, sub-workflow, loop
- Each workflow run stored as a state machine with full step history — resumable after crash or timeout
- Moved to Phase 1 because approval flows (PO, leave, expense) are required in v1.0 domain modules
- AI agents in Phase 2+ are implemented as workflow steps that call the AI Platform tool

#### 6. Real-time Layer (IS-PLAT-RT)
- Hono WebSocket server; clients authenticate with the same JWT as REST calls
- Clients subscribe to tenant-scoped channels (e.g. `tenant:acmecorp:finance:invoices`)
- Events fan in from the Event Bus consumer; only events the connected user has permission to see are forwarded
- Presence tracking: which users are viewing which record IDs — surfaces "3 people are editing this PO" in the UI
- Powers: live dashboard charts, notification bell, collaborative editing indicators, approval status updates

#### 7. Permission Fabric (IS-PLAT-PERM)
- Subjects are not just users: **users, service accounts, workflow automation actors, AI agents, external integrations** — all are first-class permission subjects with scoped tokens
- Permission model: RBAC (roles → permissions) + ABAC (attribute conditions: department, ownership, status)
- Enforced exclusively inside the Tool Registry executor — not scattered across handlers
- Record-level and field-level scopes; field-level masking for PII (e.g. salary visible only to HR and Finance roles)
- Every permission check decision is logged: `{ subject_id, subject_type, tool, resource_id, decision, rule_matched, timestamp }` — enables who-can-do-what compliance reports

#### 8. Data Lineage + Consent Capture (IS-PLAT-DLP)
- PII field catalog: mark any schema field with `{ pii: true, category: 'health'|'salary'|'identity'|'contact', retention_days }`
- Consent records: `{ subject_id, purpose, granted_at, withdrawn_at, legal_basis }`
- Retention worker: scheduled job scans for expired PII records and purges or pseudonymises them per retention policy
- DSAR handler: on request, aggregates all personal data for a subject across all tables, returns as structured JSON within 14-day SLA
- Drives encryption-at-rest decisions: PII fields use application-level envelope encryption with per-tenant keys

#### 9. Organization Structure (IS-PLAT-ORG)
- Multi-company and multi-branch hierarchy lives entirely within the tenant database — the `is_registry` DB only knows about the tenant (billing unit), not internal structure
- Three tables: `organizations` (the holding group) → `companies` (legal entities, each with NPWP + NIB + default CoA) → `branches` (physical locations or cost centers, each with address + cost center code)
- **Every record on every model carries `company_id` (required) and `branch_id` (optional)** as kernel fields — set automatically by the Tool Registry from the caller's context
- Permission Fabric enforces cross-company isolation via ABAC condition `company_id = caller.company_id`; users with cross-company roles (e.g. group CFO) are granted explicit multi-company scope
- Event Bus envelope includes `company_id` + `branch_id` — workflows, real-time channels, and audit log entries are all correctly scoped
- Finance module: Chart of Accounts, e-Faktur NPWP binding, and BPJS contributions are per-`company_id`
- Must be the **first** app built within Platform Core — HR, Finance, and Auth all depend on company/branch context

```
Tenant  (is_tenant_acmecorp — one PG database, one billing unit)
  └── Organization: Acme Group
        ├── Company: PT Acme Indonesia  (NPWP: 01.xxx)
        │     ├── Branch: Jakarta HQ
        │     └── Branch: Surabaya
        └── Company: PT Acme Logistik  (NPWP: 02.xxx)
              └── Branch: Cikarang Warehouse
```

---

## Design System

CSS variables (IS design tokens — same as roadmap app):
```css
--navy:         #1A2B5A   /* Core/brand */
--indigo:       #3B4FC4   /* Phase 1 / primary action */
--indigo-light: #E8EBFA
--teal:         #0F7B6C   /* Phase 2 / success */
--teal-light:   #E0F4F1
--amber:        #B35A00   /* Phase 3 / warning */
--amber-light:  #FEF3E2
--slate:        #4A4A5A   /* Body text */
--muted:        #6B7280
--border:       #E5E7EB
--bg:           #F8F9FB
--white:        #FFFFFF
```

UI components from Shadcn/ui with above tokens overriding Tailwind CSS variables.
Odoo-like layout: left sidebar navigation, content area, detail panel.
Indonesian UX conventions: Rupiah formatting (Rp 1.000.000), tanggal DD/MM/YYYY, NIK masking.

---

## Government & Compliance Integrations

### NIK Verification (Employee Onboarding)
- Partner: **PrivyID** API (not direct Dukcapil — requires OJK license we don't hold)
- PrivyID covers: NIK match/no-match + certified e-sign (TTE Tersertifikasi)
- Sandbox: sign up at privy.id for sandbox API keys

### E-Sign & E-Meterai
- E-sign: **PrivyID** (same partnership as NIK)
- E-Meterai (mandatory on contracts >IDR 5 million): **Peruri Digital Security** API
- ERP vendor does NOT need to become a PSrE — just API-integrate

### Tax (CoreTax DJP)
- Build against **Pajakku** or **PajakExpress** PJAP API
- Covers: e-Faktur, e-Bupot Unifikasi, e-Billing
- SPT Tahunan: manual portal for now (no direct API)

### QRIS / Payments
- Payment gateway: **Xendit** or **DOKU** (SNAP-compliant, multi-bank)
- Use Dynamic QRIS MPM per AR invoice (IDR 10M cap per transaction)
- BI-FAST for larger B2B transfers
- No Bank Indonesia license needed — operate under gateway's PJP license

### BPJS
- BPJS Ketenagakerjaan + BPJS Kesehatan APIs via bilateral PKS agreement
- Required for payroll compliance module

### Banking (Phase 2)
- BCA developer.bca.co.id + Mandiri developer.bankmandiri.co.id
- Use cases: balance inquiry for cash dashboard, account validation before payroll disbursement
- Requires bilateral cooperation agreements (months-long process)

---

## Regulatory Compliance

### PSE Registration (Permenkomdigi 5/2025)
- Register as Domestic Private PSE via OSS RBA (oss.go.id) before public launch
- Fast (<24 hours), free, required for any SaaS serving Indonesian users
- Aim for ISO 27001 to get 5-year certificate

### UU PDP (UU No. 27/2022) — ACTIVE since Oct 2024
- Appoint a DPO before processing employee data at scale
- Trigger met: large-scale sensitive personal data (health/salary/employment)
- Technical requirements: encryption at rest + in transit, RBAC, audit logging, breach detection (<14 days notification), consent management, DSAR response capability
- Data residency: use AWS ap-southeast-3 Jakarta or GCP asia-southeast2 to eliminate risk
- Sanctions: up to 2% annual revenue
- **Platform Core primitives (Audit Log, Permission Fabric, Data Lineage) are specifically designed to satisfy these requirements**

### PSrE / E-Sign
- Do NOT become a PSrE — partner with PrivyID and Peruri
- Certified TTE (TTE Tersertifikasi) required for legally binding documents

---

## Phase 1 — v1.0 Build Order

Build order is dependency-driven. **Platform Core is built first** — everything else depends on it.

1. **Platform Core** (IS-PLAT) — Build in this sub-order: Organization Structure first (company/branch context everything depends on), then Permission Fabric, Tool Registry, Event Bus + Outbox, Audit Log, Real-time Layer, Schema Extensibility, Connector Framework + Job Queue. Nothing else starts until this layer is stable.
2. **Authentication** (IS-AUTH) — Login, TOTP MFA, RBAC, session management. Requires Permission Fabric.
3. **HR & Employees** (IS-HR) — Employee records, org chart, NIK onboarding via PrivyID. First user-visible value.
4. **Finance — Accounting** (IS-FIN) — COA, journal entries, AR/AP. Unlocks QRIS invoicing.
5. **Workflow Engine** (IS-WF) — Approval flows (PO, leave, expense) required by Finance, HR, Procurement. Moved from Phase 2 to Phase 1.
6. **Procurement** (IS-PROC) — PO flow with approval workflow. Depends on Finance + Workflow.
7. **Sales & CRM** (IS-SALES, IS-CRM) — Pipeline, quotations, SO. Depends on Finance.
8. **Inventory** (IS-INV) — Stock management. Depends on Procurement + Sales.
9. **Projects** (IS-PROJ) — Project tracking. Relatively standalone.
10. **Documents** (IS-DOCS-STORE) — File storage. Relatively standalone.
11. **Chat / Messaging** (IS-CHAT) — Internal comms. Standalone.
12. **Mobile PWA** (IS-MOB) — PWA shell, offline mode, push notifications. Requires real-time layer.

All Phase 1 modules ship in v1.0. Timeline target: 12 months to v1.0.

---

## Phase 2 & 3 Highlights

### Phase 2 (v2.0)
- **Conversational** (IS-CONV) — WhatsApp Business approvals and NL agent using Tool Registry
- **Compliance Automation** (IS-COMP) — DPO dashboard, breach detection, tax deadline calendar
- **AI Platform** (IS-AI) — AI agent orchestration as a thin layer on Tool Registry + Event Bus
- Email, meetings, omnichannel customer comms
- Manufacturing, helpdesk, knowledge base, fleet, field service
- Passkeys / WebAuthn, SAML SSO

### Phase 3 (v3.0)
- **Marketplace** (IS-MKT) — Plugin SDK + App Store for third-party extensions
- **Studio** (IS-STUDIO) — No-code/low-code app builder using Tool Registry action picker
- AI-native marketing, B2B network, public sector modules, IoT, PLM

---

## Feature Code Reference

All features follow the IS-{MODULE}-{APP}-{SEQ} format, defined in the public roadmap (`is-roadmap` repo, `data/features.json`). Use these codes in commit messages, PR titles, and issue references.

Examples:
- `IS-PLAT-TOOL-001` — Tool Definitions
- `IS-AUTH-001` — Login & Session
- `IS-HR-EMP-001` — Employee Record
- `IS-FIN-AR-001` — AR Invoice

---

## Environment Variables

```bash
# API
DATABASE_REGISTRY_URL=postgresql://...    # Central registry DB
JWT_SECRET=...
BETTER_AUTH_SECRET=...

# Integrations
PRIVY_API_KEY=...                         # PrivyID (NIK + e-sign)
PRIVY_API_SECRET=...
PERURI_API_KEY=...                        # E-Meterai
XENDIT_SECRET_KEY=...                     # QRIS / payments
PAJAKKU_API_KEY=...                       # CoreTax / e-Faktur

# BPJS (Phase 1 HR)
BPJS_TK_APP_ID=...
BPJS_KES_CONSUMER_KEY=...

# Web
VITE_API_URL=http://localhost:3000
```

Never commit `.env`. All secrets via environment (Kamal secrets for production).

---

## Commands

```bash
# Root
npm install               # Install all workspaces
npm run dev               # Start all apps (Turborepo)
npm run build             # Build all
npm run lint              # Lint all
npm run typecheck         # TS check all

# apps/api
npm run dev               # Hono dev server (port 3000)
npm run migrate           # Drizzle migrate

# apps/web
npm run dev               # Vite dev server (port 5173)

# Local Supabase (dev DB)
supabase start            # Start local PG + Studio
supabase db push          # Apply migrations to local
supabase db reset         # Reset local DB

# Deploy (production)
kamal deploy              # Build + push + deploy via Kamal
kamal app logs            # Tail production logs
```

---

## Deployment

**Development:** Local Docker Compose (Postgres + API + Web)
**Staging:** Single VPS (DO/Hetzner), Kamal deploy, domain: staging.indonesiasystem.id
**Production (on-premise):** Customer's own server, Kamal + Docker, customer provides domain
**Production (cloud):** Same infrastructure, Kamal-managed, AWS Jakarta / GCP asia-southeast2

Kamal handles: image build, push to registry, rolling deploy, health checks, SSL via Let's Encrypt.

---

## Architectural Decisions

Decisions we've made and the reasoning, so they don't get relitigated.

### No "Commons" / shared capability layer between Platform Core and modules

**Date:** 2026-05-07

**Context:** Odoo couples capability and surface — to track stock you must install Inventory; to log approvals you must install the approval workflow module. This creates friction for customers with simple needs. We considered a "Commons" layer below modules holding shared primitives (`commons.stock`, `commons.approval`, etc.) so any module could use them without installing the full app.

**Decision:** Don't build Commons. Each module that needs a "lite" version of an adjacent capability builds it inside itself, gated by a setting.

Example: Sales gets a `Stock tracking: [Off | Simple | Full (requires Inventory)]` setting. "Simple" is a `qty_on_hand` column on product + one Tool Registry action, living entirely inside Sales. When the customer later installs Inventory, a one-time migration imports the data.

**Why not Commons:**
- Designing stable cross-module APIs before we understand the domain is a premature abstraction.
- Any change to a `commons.*` signature would be a breaking change across multiple modules — API governance tax we can't afford pre-v1.0.
- Isolated mess inside one module is recoverable; mess in a shared layer breaks everything that depends on it.

**Rule for the future:** extract a shared primitive only after we see the same pattern appear in **3+ modules organically**. Not before. Revisit this decision after v1.0 ships.

**Implication for pricing:** the value of paid modules (Inventory, CRM, Documents) is *advanced* features (multi-warehouse, lots, valuation; lifecycle, opportunities; folders, versioning, e-sign), not the basic capability. The basic capability ships with whatever module the customer is paying for.

### Verticalization strategy: general + hyperlocal + configurable vertical modes

**Date:** 2026-05-08

**Context:** Indonesian mid-market clusters in a few specific industries (plantation/agriculture, FMCG distribution, labor-intensive manufacturing, F&B chains). Hot mid-market features include multi-entity consolidation accounting, iPaaS for legacy systems, sales-commission engines connecting to payroll/accounting, and yield-based payroll for plantations. We considered going wide with separate vertical apps (Odoo's path) vs. staying purely horizontal.

**Decision:** Build a horizontal core with Indonesian compliance baked in, plus 2–3 named **vertical modes** delivered as configuration presets — not separate apps.

A "vertical mode" is a named bundle of feature-flag defaults and module presets. It is *not* a new module tree. Example: enabling **Plantation mode** sets `Payroll.primary_unit = kg-yield`, exposes harvest-tracking fields on Inventory, and unlocks estate-management presets in HR.

**Initial vertical modes (Phase 2+):**
1. **Distribution / FMCG** — multi-warehouse, route planning, tiered sales commission
2. **Plantation / Agriculture** — yield-based payroll, harvest tracking, estate management
3. **Labor-intensive manufacturing** — piece-rate payroll, shift scheduling, quality checkpoints

**Why not mass verticalization:**
- Each vertical app demands its own domain experts, sales motion, onboarding, and test surface — N×M maintenance compound.
- Quality dilutes fast. 40 mediocre modules is worse than 12 excellent ones.
- Customers in holding companies span verticals; a single horizontal core with mode toggles fits their structure better than buying multiple verticalized SKUs.

**Why not pure horizontal:**
- Indonesia's mid-market concentration in a few industries is a real opportunity — owning plantation payroll + compliance is a defensible wedge.
- Generic ERPs lose to specialists in regulated/operational verticals; configurable modes let us compete without forking.

**Mapping the four hot features:**
| Feature | Where it lives |
|---|---|
| Multi-entity / consolidation accounting | Phase 1 Accounting (horizontal core, not optional) |
| iPaaS / legacy connectors | Extension of Tool Registry (IS-PLAT-TOOL) — Phase 1/2 |
| Sales-commission engine (Sales → Payroll → Accounting) | Phase 2 cross-module workflow under Sales + Payroll |
| Yield-based payroll | Phase 2 Payroll feature: configurable `primary_unit` (hours / days / kg-yield / piece-rate / trip) |

**Rule for the future:** a feature only earns "vertical mode" status when ≥3 customers in that industry pay for it and ≥1 specialized module is required. Otherwise it stays a per-module setting.

### Distribution model: internal-centric, no partner ecosystem

**Date:** 2026-05-10

**Context:** Considered two distribution strategies: (1) internal-centric — strong internal dev, delivery, and sales teams own all customer touchpoints; (2) partner-centric — regional/industry partners build packs, implement, and sell. SAP, Salesforce, and Dynamics all leaned heavily on partners. Evaluated trade-offs.

**Decision:** Internal-centric distribution, permanently. No partner-built modules, no plugin marketplace.

**Trade-off table:**

| | Internal-centric (chosen) | Partner-centric (rejected) |
|---|---|---|
| Quality | End-to-end ownership; single brand standard across every customer | Variable; partner quality directly impacts brand |
| Compliance liability | Owned entirely — but fully controlled | Distributed across partners; messy in regulated workflows |
| Customer relationship | Direct — full context, faster iteration | Mediated — slower feedback loop |
| Margin | High per-customer | Lower (partner takes cut) |
| Geographic expansion | Bound by internal hiring rate | Faster but with quality risk |
| Moat | Strong — integration depth competitors can't replicate easily | Weaker — partners can switch ERPs |

**Why not partner-centric:** quality dilutes fast across a partner network. An implementation partner's mistake in an Indonesian payroll run is a brand failure, not a partner failure. In regulated domains (tax, BPJS, e-Faktur) the liability and brand risk outweigh the distribution speed.

**On app marketplace:** three things are often conflated under "marketplace" — separate verdicts:

| What | Decision | Reason |
|---|---|---|
| **Plugin marketplace** (third-party code extensions) | No — indefinitely | Inconsistent with internal-centric strategy. Security review burden. Unclear monetization. Liability tail in regulated workflows. |
| **Module catalog** (in-app UI to enable/disable first-party modules) | Yes — ships with v1.0 | This is just product discoverability, not a marketplace. Customers toggle modules on/off. |
| **Configuration template sharing** (customers share COA / workflow templates) | Defer to Phase 3+, evaluate then | Low risk (configuration, not code). No obvious value before customer base reaches critical mass. |

**Geographic expansion model:** each new country (SG, MY, PH) requires hiring local domain experts and legal advisors internally — not partnering with local consultancies. Expansion pace is bound by hiring, not by partner pipeline. This is the Workday model, not the SAP/Salesforce model.

**Implication for localization packs:** the `LocalizationPack` interface is an internal engineering contract — it exists for code organization and parallel team workflows, not for adversarial isolation. Security boundary is TypeScript module visibility + code review, not worker-level sandboxing (overkill without external contributors).

---

### Pricing model: unlimited-user, revenue + headcount tiers per industry

**Date:** 2026-05-10

**Context:** Standard B2B SaaS pricing (Odoo, SAP, Dynamics, Salesforce) is per-user, which creates friction as companies scale, incentivizes minimizing user count, and doesn't reflect actual value delivered. Indonesian mid-market companies span a wide range of financial scale within the same headcount band depending on industry.

**Decision:** Unlimited-user pricing, tiered by **revenue band × headcount band × industry**, country-adjusted. One contract covers the entire company; every employee can be a user.

**Why this model:**
- Removes user-count friction — every employee onboards without incremental cost negotiation
- Captures value proportional to company scale, not user licenses
- Per-industry calibration reflects real purchasing power (a 100-person plantation has very different revenue and pricing tolerance than a 100-person SaaS company)
- Country-adjusted pricing respects local purchasing power parity (Indonesia vs. Singapore vs. Malaysia)

**The "reasonable" constraint is a hard product principle:**
Pricing must always stay within a defined band (target: X% of customer's trailing-12-month revenue, or Y% of total payroll cost). Even if the tier formula would suggest a higher number, the cap holds. This is the brand promise: never punishing customers for growing.

**Architectural implications (non-negotiable from v1.0):**

| Implication | Detail |
|---|---|
| Headcount as billing input | HR module active-employee count feeds billing tier. Accuracy is now revenue-critical, not just operational. |
| Revenue as billing input | Accounting module trailing-12-month revenue (per PSAK 72 measure) feeds billing tier. Accounting module correctness is revenue-critical. |
| Annual true-up, not real-time | Tier snapshots at contract anniversary, not at every employee hire. Growth mid-cycle is tracked but not billed until renewal. |
| Industry as immutable tenant attribute | Set at signup. Determines tier table, default module presets, vertical modes available. Changing industry = re-pricing event, not a casual setting. |
| Multi-entity = consolidated tier | A holding with 5 subsidiaries is one customer relationship: consolidated revenue + headcount. If entities span countries, pricing is per-entity then aggregated to one invoice. |
| Vertical modes are tier-gated | Horizontal core (HR, Finance, Inventory, etc.) included at every tier. Vertical modes (Plantation, Distribution, Manufacturing presets) gated to higher tiers — this is the primary value-capture lever for specialized customers. |

**What "country-adjusted" means in practice:**
- Indonesia: base pricing (local currency, local purchasing power)
- Singapore: ~2–2.5× Indonesia base (higher wages, higher software spend norms)
- Malaysia: ~1.3–1.5× Indonesia base
- Tier labels and thresholds differ by country (a "mid-market" company is defined differently per market)

---

### Localization architecture: locale-agnostic core + country packs

**Date:** 2026-05-10

**Context:** Indonesia is the launchpad, but the long-term plan is regional/international growth (SG, MY, PH, VN). Distribution is internal-only — no partner ecosystem (see Distribution decision). If Indonesian compliance leaks into the core (PPh 21 hardcoded into payroll, Rupiah assumed in Money, Bahasa strings inline), internationalization later costs 3× more and risks regression of a working compliance surface. We studied SAP, Salesforce, and Dynamics.

**What the big three do:**
| Vendor | Pattern |
|---|---|
| **SAP** | "Country Versions" — 50+ pre-built localizations as add-ons to S/4HANA. Internal Globalization Services team owns top markets; partners handle long tail. |
| **Salesforce** | Locale-agnostic core. AppExchange hosts country compliance apps. User locale = profile setting. Compliance is buyer-assembled — too fragmented for mid-market. |
| **Dynamics 365** | "Localization Portal" — 40+ packs in two tiers: Microsoft-owned (top markets), partner-built (long tail). Feature flags per tenant. Closest to our model. |

**The pattern all three agree on:**
1. Core is locale-agnostic — never assumes a country
2. Country packs are first-class — versioned and released independently from core
3. Multi-entity multinational: one tenant, multiple legal entities, each with its own locale stack
4. User locale ≠ entity locale — display preference is separate from legal entity compliance setting
5. Translation ≠ compliance — language strings and tax rules ship and version independently
6. Reference data as seedable templates — COA, tax codes are not baked into migrations
7. Per-country versioning — when ID tax law changes, only `l10n-id` ships an update

**Decision:** Locale-agnostic core + `LocalizationPack` contract. Indonesia ships as `l10n-id` at v1.0. All future country packs built by internal teams follow the same contract.

**`LocalizationPack` interface contract:**

```ts
// packages/core/src/localization/pack-contract.ts

interface LocalizationPack {
  // Identity
  readonly id:        `l10n-${Lowercase<CountryCode>}`;
  readonly version:   string;            // semver
  readonly country:   CountryCode;       // ISO 3166-1 alpha-2
  readonly languages: LanguageCode[];    // primary first; e.g. ["id", "en"]
  readonly currency:  CurrencyCode;      // ISO 4217; e.g. "IDR"
  readonly timeZones: TimeZoneId[];      // ID has three: WIB, WITA, WIT

  // Defaults applied when an entity is created with this country
  readonly fiscalYearDefault:  FiscalYearConfig;
  readonly numberFormatDefault: NumberFormatConfig;
  readonly dateFormatDefault:   DateFormatConfig;

  // Registration — pack adds capabilities; never modifies existing ones
  registerTaxRules(registry: TaxRuleRegistry): void;
  registerCOATemplates(registry: COATemplateRegistry): void;
  registerReportTemplates(registry: ReportTemplateRegistry): void;
  registerBankConnectors(registry: BankConnectorRegistry): void;
  registerGovConnectors(registry: GovConnectorRegistry): void;
  registerFormatters(registry: FormatterRegistry): void;
  registerTranslations(registry: I18nRegistry): void;
  registerVerticalPresets?(registry: VerticalPresetRegistry): void;

  onLoad?(ctx: PackContext): Promise<void>;
}
```

Forbidden in any `l10n-*` package (enforced by code review + CI lint rules):
- Cannot import from `packages/core/internal/*` — only public contract types
- Cannot register Tool Registry actions (domain modules own those)
- Cannot modify another pack's registered rules
- Cannot add database migrations (use core's schema extensibility)
- Cannot mutate core domain models (Employee, Invoice, Account, etc.)
- All registered items must include `effective_from` / `effective_to`

**Tax rule with versioning (the most fragile concern in localization):**

```ts
interface TaxRule {
  code:           string;          // "ID.PPh21.TER"
  jurisdiction:   CountryCode;
  category:       "income" | "vat" | "withholding" | "social";
  effective_from: Date;
  effective_to:   Date | null;     // null = currently active
  applies_to(ctx: TaxContext): boolean;
  compute(ctx: TaxContext): TaxResult;
}
// Deprecation = register a new version with effective_from set to changeover date
// Never UPDATE an existing rule row — always INSERT a new version
```

**Package layout:**
```
packages/
  core/                          # universal, locale-agnostic
    domain/
      money.ts                   # currency-aware Money (no IDR default, explicit currency arg)
      period.ts                  # fiscal period — per-entity config, not global
      tax-engine/                # TaxRule registry interface; no rules live here
      chart-of-accounts/         # template-driven; no Indonesian COA seeded
      employee/, invoice/, ...
  l10n-id/                       # Indonesia — ships with v1.0
    manifest.ts
    tax/                         # PPh 21 TER, BPJS (Kesehatan + Ketenagakerjaan), PPN
    accounting/                  # PSAK COA template, dual-book depreciation
    reporting/                   # SPT formats, e-Faktur / NSFP, CoreTax DJP connector
    banking/                     # BCA, Mandiri, BRI, BNI
    formatters/                  # Rupiah (Rp 1.500.000), NIK mask, ID date
    translations/id.json
  l10n-sg/                       # Singapore — Phase 2
  l10n-my/                       # Malaysia — Phase 2
  l10n-ph/                       # Philippines — Phase 2+
```

**Known complexity and risk areas in `l10n-id`:**

| Risk | Detail | Mitigation |
|---|---|---|
| Number formatting | ID uses `.` thousands / `,` decimal (Rp 1.500.000,00). Inconsistent in practice. | Store raw numeric in DB; locale formatting only at render layer, never in business logic |
| Fiscal year | Not always Jan–Dec (holding companies with UK parents use Apr–Mar) | Fiscal year is per-entity setting; period boundaries use entity's configured timezone |
| FX rate snapshot | ID companies may invoice in USD but report in IDR. Rate at report time ≠ rate at transaction time → P&L changes retroactively | `Money` stores `{ amount, currency, fx_rate_to_reporting, fx_rate_snapshot_date }` — immutable after transaction confirmation |
| Tax rule versioning | PPh 21 changed to TER method Jan 2024; PTKP changes periodically; BPJS rates vary by risk class | Append-only TaxRule rows with `effective_from` / `effective_to`; historical payroll re-runs always resolve the correct version |
| e-Faktur / NSFP fragility | NSFP quota is per-NPWP, pre-allocated from DJP; CoreTax API has documented downtime | NSFP buffer pool with alert at 20% remaining; invoice enters "pending submission" state on DJP outage; retry worker handles async submission |
| Regulatory string freeze | SPT / e-Faktur field labels are legally mandated wording — translators must not touch them | Mark regulatory strings `{ frozen: true }` in i18n catalog; CI fails if frozen string is modified |
| COA template updates | Customer customizes PSAK COA; a future PSAK change cannot auto-apply without overwriting their work | COA template is a one-time seed, never auto-updated; PSAK changes ship as documented migration guidance, not automatic schema changes |
| Multi-timezone within ID | Jakarta (WIB, UTC+7), Makassar (WITA, UTC+8), Jayapura (WIT, UTC+9) — period-end-of-day differs | All timestamps stored as UTC; period boundaries defined by entity's configured timezone |

**Core invariants (enforced at code review + CI lint):**
- No `IDR` literal in `packages/core/`
- No `pph21`, `bpjs`, `nik`, `npwp` symbol in `packages/core/`
- No Indonesian-language string inline in any component
- All currency math via `Money` value object with explicit currency argument
- All user-facing strings via i18n keys (even in Phase 1 ID-only release)
- Fiscal year config per entity, not global

**Multi-entity multinational (required from v1.0):**
A holding with PT Subsidiary (ID, IDR, Bahasa) + Pte Ltd (SG, SGD, English) runs in one tenant. Each entity resolves its own `LocalizationPack`. Consolidation rolls up to parent in chosen reporting currency using snapshotted FX rates.

**Why not "ID-only now, refactor later":**
Refactoring country assumptions out of mature payroll/accounting code = months of work + regression risk on a working compliance surface. The architectural cost of doing it right on day one is ~10% extra design effort; the cost of doing it at Series A is 3×.

### AI agent governance: delegated agents vs. autonomous agents

**Date:** 2026-05-10

**Context:** The Tool Registry establishes that all mutations flow through typed tools, called by UI, API, workflows, or AI agents. We initially modeled a single `ai_agent` actor type for all agent actions. After deeper review, two categorically different operating modes emerged — delegated (human in the loop in real time) and autonomous (scheduled/event-triggered with no real-time human). Flattening them into one actor type is a compliance failure: blast radius, rollback semantics, approval flows, and audit surfaces are all different.

**Decision:** Two separate actor types + a Mandate system for autonomous agents.

```ts
type Actor =
  | { type: "user";     id: UserId }
  | { type: "system";   subsystem: string }
  | { type: "workflow"; id: WorkflowId; stepId: string }
  | { type: "api_key";  keyId: string; label: string }

  // Delegated: user invokes agent in real time; human is in the loop throughout
  | { type: "ai_agent";
      agentId:    AgentId;
      sessionId:  SessionId;     // groups all events from one session; rollback unit
      onBehalfOf: UserId;        // required — no autonomous mutations on this type
      toolCallId: string;
      model:      ModelVersion;
      promptHash: string;        // sha256 of user prompt — privacy-preserving audit trail
    }

  // Autonomous: scheduled / event-triggered; no real-time human oversight
  | { type: "autonomous_agent";
      agentId:       AgentId;
      mandateId:     MandateId;  // references the pre-approved Mandate
      mandateVersion: number;    // pinned at run start — mandate changes don't affect running jobs
      runId:         RunId;      // groups all events from one execution run; rollback unit
      toolCallId:    string;
      model:         ModelVersion; // pinned per mandate
      triggeredBy:   "schedule" | "event" | "webhook";
      triggerRef:    string;     // hashed reference to triggering source
    }
```

**The Mandate — pre-approved policy for autonomous agents:**

```ts
interface Mandate {
  id:             MandateId;
  version:        number;             // monotonic; immutable after creation
  agentId:        AgentId;
  name:           string;             // "Nightly AP Reconciliation"
  description:    string;

  // 4-eyes authorization — configuredBy and approvedBy must be different users
  configuredBy:   UserId;
  configuredAt:   Date;
  approvedBy:     UserId;
  approvedAt:     Date;

  // Scope — principle of least privilege
  scope:          PermissionScope[];  // exactly what tools this agent may call
  entityScope:    EntityId[];         // which legal entities it may touch

  // Hard limits — enforced by Tool Registry, not by agent code
  maxFinancialImpactPerRun:      Money;  // single execution ceiling
  maxFinancialImpactRolling24h:  Money;  // anti-fragmentation ceiling
  humanApprovalAbove:            Money;  // pause-and-request-approval gate

  // Trigger
  trigger:
    | { kind: "schedule"; cron: string; timezone: TimeZoneId }
    | { kind: "event";    eventType: string; filter?: EventFilter }
    | { kind: "webhook";  secret: WebhookSecret };

  modelPin:      ModelVersion;    // exact version; upgrade = new mandate version + re-approval
  alertChannel:  NotificationChannel; // non-nullable; receives failure + approval-needed alerts
  expiresAt:     Date;            // default 1 year, max 2 years; must be actively renewed
  status:        "active" | "paused" | "expired" | "revoked";
  supersededBy?: MandateId;       // set when a new version replaces this
}
```

**The Mutation Gate — enforced at Tool Registry, not at agent runtime:**

The agent calls `tools.invoke(toolName, args)`. The registry checks actor type, sees `autonomous_agent`, resolves the mandate, and runs the gate before any mutation is allowed. The agent code cannot bypass or inspect the limits.

```
Gate checks (in order):
1. mandate.scope includes this tool?                  → reject: out_of_scope
2. mutation.entityId in mandate.entityScope?          → reject: out_of_entity
3. runImpact + mutation.financialImpact > perRunCap?  → reject: run_cap_exceeded
4. rolling24h + mutation.financialImpact > 24h cap?   → reject: daily_cap_exceeded
5. mutation.financialImpact > humanApprovalAbove?     → pause: require_human_approval
6. All checks pass                                    → approve
```

**Audit log split:**

| View | Shows |
|---|---|
| User activity feed | Human actions + `ai_agent` delegated actions on behalf of that user |
| System automation log | `autonomous_agent` runs, grouped by mandate + runId |
| Compliance export (SOC 2 / ISO 27001) | All actor types, tagged, exportable by date range |

Every UI surface that shows event history must visually distinguish all three categories (human / delegated agent / autonomous agent) with distinct icons and labels.

**Rollback semantics:**
- Delegated session rollback: all events where `actor.sessionId === X`
- Autonomous run rollback: all events where `actor.runId === X`
- Both must be supported from v1.0 — bulk reversal of agent mistakes is not rare

**Key risks and mitigations:**

| Risk | Mitigation |
|---|---|
| Mandate scope creep over time | Every edit creates a new version; old version preserved; diff visible in audit |
| Fragmentation (split large mutation into many small ones to stay under cap) | Rolling 24h cap in addition to per-run cap |
| Silent failure goes unnoticed until month-end | `alertChannel` mandatory; RunCompleted event emitted on success AND failure |
| Model upgrade silently changes autonomous behavior | Model pinned per mandate; upgrade = new version + 4-eyes re-approval |
| Compromised agent code self-elevates permissions | Limits enforced at Tool Registry layer; agent code never sees or controls the limits |

**Why not treat both as the same actor type:**
- Blast radius is categorically different: a delegated session affects one user interaction; an autonomous run can touch the entire company's financials before anyone notices
- Approval model is different: delegated = real-time human sees each action; autonomous = pre-approved mandate policy
- Rollback surfaces are different: delegated shows in the user's activity feed; autonomous shows in the system automation log
- Compliance requirement: SOC 2 and ISO 27001 auditors specifically ask "what actions were automated vs. human-initiated?"

**Implication for IS-PLAT-AUDIT and IS-PLAT-PERM:** both must implement the full actor model (all 6 types) and Mandate evaluation from v1.0. Autonomous agents without Mandate governance must be blocked at the infrastructure level.

---

## What NOT to Build (avoid redundancy with ecosystem)

| Area | Don't build | Use instead |
|---|---|---|
| NIK chip reading | Private NFC chip read not supported | PrivyID OCR + verification API |
| IKD QR scan | Blocked for private apps | Wait for Dukcapil SDK (2026+) |
| QRIS infrastructure | Requires BI PJP license | Xendit / DOKU as acquirer |
| Payment rail | Requires BI licensing | BI-FAST via bank API or Xendit |
| CA / certificate authority | PSrE requires BSSN accreditation | PrivyID (e-sign), Peruri (e-Meterai) |
| SMS OTP | Security anti-pattern | TOTP / passkeys instead |
| Tax engine (core) | DJP handles rules | Pajakku/PajakExpress API for filing |
| Message broker infrastructure | Operational complexity | NATS JetServer or Redis Streams (managed) |
| AI model hosting | Requires GPU infra + ops | Anthropic API / OpenAI API via AI Platform connector |

---

## Sister Products (same PT entity, separate repos)

- **is-roadmap** — Public product roadmap (this planning tool, Vercel)
- **Supapark** — (separate product, separate repo)
- **Jurna** — (separate product, separate repo)
