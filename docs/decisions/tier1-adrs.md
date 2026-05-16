# Indonesia System — Tier 1 Architecture Decision Records

**Status:** All decided  
**Date:** 2026-05-15  
**Authority:** Founder  
**These decisions are locked. Changes require a new ADR that supersedes the relevant section.**

---

## ADR-001: Multi-Tenancy Model

### Decision
Hybrid model: shared schema with RLS for standard tenants; dedicated database for enterprise tenants. A promotion path exists to move a tenant from shared to dedicated without data loss.

### Context
IS serves both Indonesian SMEs (50–500 employees) and large enterprises / government bodies (500+ employees, strict data isolation requirements). A single model cannot serve both efficiently.

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| Shared schema + RLS only | Simplest ops, cheapest infrastructure | Cannot satisfy enterprise isolation requirements; single noisy tenant affects all |
| Schema-per-tenant | True isolation | Operational complexity at scale; Postgres connection limit bottleneck with 1k+ schemas |
| **Hybrid (decided)** | Shared for SME (simple ops), dedicated for enterprise (compliance) | Slightly more complex promotion path |

### Rationale
SMEs have no isolation requirement and benefit from shared infra cost. Enterprise and government clients will contractually require dedicated databases (BPJS, OJK-regulated entities). The hybrid model serves both markets without over-engineering for the smaller case.

### Implementation Notes
- **Standard tenants:** shared Postgres database, all tables carry `tenant_id UUID NOT NULL`, RLS policy `USING (tenant_id = auth.tenant_id())` on every table. No exceptions.
- **Enterprise tenants:** separate Postgres database, same schema, separate Supabase project (self-hosted). Connection string stored per-tenant in the IS Platform routing table.
- **Promotion trigger:** > 500 employees OR explicit enterprise contract OR regulatory audit requirement.
- **Promotion process:** pg_dump → restore to dedicated DB → update routing table → verify → deprecate shared rows. Designed to run with zero downtime via dual-read window.
- **Tenant routing:** `platform.tenants` table maps `tenant_id → db_url`. The API layer resolves this on every request. Cache TTL: 5 minutes.
- **Shared DB sizing:** start with 1 RDS `db.t4g.large` per region; promote to `db.r7g.xlarge` at ~200 standard tenants.

### Consequences
- Every DB migration must be tested against both shared and dedicated schemas.
- The Schema Specialist agent must always include `tenant_id` in every new table.
- Performance benchmarks must account for RLS overhead (typically 2–5% on indexed columns).

---

## ADR-002: Hosting Region

### Decision
Primary: **AWS Jakarta (ap-southeast-3)**. Secondary option for government / BUMN clients: **Lintasarta Cloudeka** (dedicated deployment).

### Context
PDP Law (UU 27/2022) requires personal data of Indonesian data subjects to be processed and stored in Indonesia. Strategic sovereignty positioning reinforces this. Network latency to end users (Jakarta, Surabaya, Medan, Makassar) favors in-country hosting.

### Options Considered

| Option | Pros | Cons |
|---|---|---|
| Singapore (AWS/GCP) | Mature tooling, cheapest | PDP non-compliance risk; latency +15ms |
| **AWS Jakarta (decided)** | PDP compliant, all AWS services, excellent tooling, existing enterprise adoption in ID | US company (acceptable — data stays in ID) |
| Lintasarta Cloudeka only | Indonesian company, strong government procurement narrative | Less mature developer tooling; fewer managed services |
| Hybrid AWS + Lintasarta | Best of both | Operational complexity |

### Rationale
AWS Jakarta (ap-southeast-3) satisfies data residency: all data processed and stored in Indonesia. AWS is already widely used by Indonesian enterprises for procurement compliance. Lintasarta matters specifically for government/BUMN procurement rules that may specify Indonesian cloud providers — offer it as a deployment option, not the primary.

### Implementation Notes
- **Primary services:** RDS PostgreSQL (Jakarta), EKS or ECS (Jakarta), S3 (Jakarta), CloudFront with Jakarta PoP.
- **CDN:** Cloudflare (Jakarta PoP) sits in front of all public surfaces.
- **Disaster recovery:** daily automated snapshots to S3 Jakarta, point-in-time recovery enabled, 30-day retention.
- **Lintasarta option:** available as a contract add-on for government/BUMN clients. Delivered as a self-hosted stack (Docker Compose → Kubernetes) on Lintasarta Cloudeka. Documented in `ops/deployments/lintasarta/`.
- **Cross-region:** never. No data replication outside Indonesia.
- **Compliance documentation:** maintain a Data Processing Map (required under PDP law) updated every quarter.

### Consequences
- All infrastructure-as-code uses `ap-southeast-3` as the hardcoded region constant.
- External services (Resend, Sentry, PostHog, Trigger.dev) must be evaluated for data residency — use EU-hosted instances where Indonesian not available; confirm no personal data leaves.
- Application-level: `HOSTING_REGION=aws-jakarta` env var; used by observability and compliance tooling.

---

## ADR-003: Monorepo Structure

### Decision
Turborepo + pnpm workspaces. All IS apps and shared packages live in one repository.

### Context
IS will have at minimum: a web app (Next.js), a mobile app (React Native/Expo), shared TypeScript types, a shared design system package, database schema + migrations, and government API client libraries. Without a monorepo, these diverge rapidly.

### Directory Layout

```
is/                              ← root (repo name TBD after brand decision)
├── apps/
│   ├── web/                     ← Next.js 15 App Router (main product)
│   ├── mobile/                  ← React Native + Expo
│   └── roadmap/                 ← this public roadmap app (moved here)
├── packages/
│   ├── ui/                      ← shared component library (web + mobile variants)
│   ├── design-tokens/           ← Design/colors_and_type.css compiled to JS/TS
│   ├── types/                   ← shared TypeScript types (Node, Tenant, User, etc.)
│   ├── db/                      ← Drizzle schema + migrations (single source of truth)
│   ├── auth/                    ← IS-AUTH implementation (Oslo + Arctic)
│   ├── integrations/
│   │   ├── bpjs/                ← BPJS Ketenagakerjaan API client
│   │   ├── djp/                 ← DJP e-Faktur / CoreTax client
│   │   ├── privy/               ← PrivyID NIK verification + e-sign
│   │   ├── xendit/              ← Xendit payment gateway
│   │   └── peruri/              ← Peruri e-Meterai
│   └── config/                  ← shared eslint, tsconfig, tailwind base
├── ops/
│   ├── deployments/             ← Kubernetes manifests / Terraform
│   ├── migrations/              ← DB migration scripts (managed by Drizzle Kit)
│   └── scripts/                 ← maintenance, seeding, one-off scripts
├── docs/
│   ├── decisions/               ← ADRs (this folder)
│   └── specs/                   ← PRDs per module (Spec Writer agent output)
├── Design/                      ← Claude Design output (locked; do not modify in PRs)
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

### Rationale
- **Turborepo:** incremental builds, task graph, remote caching (Vercel Remote Cache). Only rebuilds what changed.
- **pnpm:** strict dependency resolution, disk-efficient, workspace protocol for internal packages.
- **Single `db/` package:** Schema Specialist agent writes here only. All apps import from `@is/db`. No schema duplication.
- **Single `integrations/` tree:** Integration Specialist agent owns these exclusively. Other agents import from `@is/integrations/*`. No app code calls government APIs directly.

### Implementation Notes
- `turbo.json` pipelines: `build → test → lint`, with `db:migrate` as a dependency of `build`.
- Internal package names: `@is/ui`, `@is/types`, `@is/db`, `@is/auth`, `@is/integrations/*`.
- `tsconfig.json` at root with path aliases; each package extends it.
- `eslint.config.js` at root with IS-specific rules (no hardcoded colors, no `any`, no direct DB calls outside `@is/db`).
- Commit scope convention: `feat(web):`, `feat(mobile):`, `fix(db):`, `feat(integrations/bpjs):`.

---

## ADR-004: Full Stack Confirmation

### Decision
The canonical technology stack for Indonesia System.

### Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Web framework** | Next.js 15 (App Router) | Already in use; SSR + API routes; Vercel-native |
| **Mobile** | React Native + Expo SDK 52+ | See ADR-007 |
| **Database** | PostgreSQL 16 via self-hosted Supabase | See below |
| **ORM** | Drizzle ORM | TypeScript-first, lightweight, zero-overhead queries, pairs with Drizzle Kit for migrations |
| **Auth implementation** | Oslo (cryptography) + Arctic (OAuth providers) | Self-built IS-AUTH per PRODUCT_CLAUDE.md; no third-party auth vendor |
| **API style** | tRPC (internal web↔api) + REST (external OAuth surface) | Type-safe internal calls; standard REST for IS-AUTH-008 OAuth resource server |
| **File storage** | AWS S3 ap-southeast-3 | Jakarta region, data residency compliant |
| **Background jobs** | Trigger.dev | Event-driven, durable, excellent DX; self-hostable when needed |
| **Cache** | Redis (self-hosted Valkey on AWS Jakarta) | Session cache, rate limiting, job queues |
| **Search** | PostgreSQL FTS → Typesense (Phase 2) | FTS sufficient for Phase 1; Typesense when typo-tolerance and faceting needed |
| **Email** | Resend + React Email | Clean DX; EU-hosted (no personal data in email logs) |
| **Monorepo** | Turborepo + pnpm | See ADR-003 |
| **CI/CD** | GitHub Actions | Standard; runs typecheck + test + build on every PR |
| **Error tracking** | Sentry (EU region) | Mature, React Native support |
| **Product analytics** | PostHog (self-hosted on AWS Jakarta) | Privacy-first; event data stays in Indonesia |
| **Observability** | OpenTelemetry → Axiom | Structured logs + traces; Axiom has no personal-data ingestion |
| **Infra-as-code** | Terraform + Terragrunt | AWS Jakarta resources; state in S3 Jakarta |

### On Supabase and Scale

**Question: Is Supabase applicable at all scales? Is it Indonesia-friendly?**

Supabase Cloud's nearest region is Singapore — not Jakarta — which creates a PDP compliance gap for a cloud-managed instance. The resolution: **self-host Supabase on AWS Jakarta**.

Self-hosted Supabase is Docker Compose (development) or Kubernetes (production). It is the same codebase as Supabase Cloud. At scale:

- **PostgreSQL itself** scales to tens of millions of rows on `db.r7g.2xlarge` with proper indexing. Thousands of IS tenants on shared schema is well within Postgres's capabilities.
- **PostgREST** (Supabase's auto-REST layer) is used internally but hidden behind tRPC; it is not the public API.
- **GoTrue** (Supabase Auth) is *not* used — IS-AUTH replaces it entirely.
- **Supabase Storage** is replaced by S3 Jakarta.
- **What we keep from Supabase:** PostgreSQL + RLS tooling + Realtime (for collaborative features, IS-CHAT). Everything else is standard AWS.

Practically: start with Supabase self-hosted for familiar DX; at ~1,000 enterprise tenants, consider migrating off Supabase scaffolding to vanilla PostgreSQL + custom connection pooler (PgBouncer). That migration is incremental, not a rewrite.

### Consequences
- No Tailwind in `apps/web/` (existing rule). `packages/ui/` uses CSS Modules + design tokens.
- React Native in `apps/mobile/` can use its own styling (StyleSheet API or NativeWind).
- tRPC routers live in `apps/web/src/server/routers/`; each module has its own router file.
- Drizzle schema lives exclusively in `packages/db/schema/`; no inline schema definitions elsewhere.

---

## ADR-005: Database Migration Tooling

### Decision
**Drizzle Kit** for all schema migrations.

### Rationale
- Drizzle ORM is the chosen ORM (ADR-004); Drizzle Kit is its first-party migration companion — no impedance mismatch.
- Schema-as-TypeScript: migrations are generated from the TypeScript schema definition. Schema Specialist agent writes schema code; `drizzle-kit generate` produces the SQL migration file.
- Migrations are plain SQL files committed to `ops/migrations/` — readable, reviewable, portable.
- `drizzle-kit push` for development (direct schema sync); `drizzle-kit migrate` for production (applies pending SQL files in order).
- Multi-tenant safety: migrations run against the shared database once; dedicated tenant databases receive the same migration via a deployment script (`ops/scripts/migrate-dedicated-tenants.ts`).

### Implementation Notes
- Migration files: `ops/migrations/YYYYMMDD_HHMMSS_<description>.sql`
- Schema Specialist agent output: TypeScript schema update in `packages/db/schema/<module>.ts` + generated migration SQL.
- Migration is a required CI step: `drizzle-kit check` runs in CI to detect schema drift.
- **Never** hand-edit a migration file after it has been committed. Create a new migration that corrects the previous one.
- Rollback strategy: forward-only migrations. Rollback = write a new migration that undoes the change. No down migrations (they create false safety).
- Dedicated tenant migration: `pnpm run db:migrate:all-tenants` iterates the platform routing table and applies pending migrations to each dedicated DB.

---

## ADR-006: Design System

### Decision
The `Design/` folder is the single source of visual truth for IS. The canonical tokens are in `Design/colors_and_type.css`. The component language uses **Inter** (UI), **JetBrains Mono** (numerals/code), and **Lucide** icons (1.5px stroke, 24×24).

### What Claude Design Shipped
The `Design/` folder contains:
- `colors_and_type.css` — full token set (colors, type scale, spacing, radius, shadow, motion)
- `assets/` — logo SVGs (wordmark, monogram, mono, on-dark variants), favicon
- `brandbook.html` — full visual language documentation
- `preview/` — component previews (buttons, badges, inputs, avatars, tables, toasts, modals, motion)
- `ui_kits/is-app/` — high-fidelity desktop app UI kit (8 screens: home, HR, Finance, Procurement, detail panel, mobile expense, empty state)

### Design Constraints (non-negotiable)
- **No gradients, no glass, no blur (except topbar scroll), no decorative patterns**
- **One icon library only:** Lucide (`currentColor`, 1.5px stroke). Never mix with other icon sets.
- **Inter everywhere** — not system font in production (system font only in the roadmap app for speed). `packages/ui/` loads Inter via Next/Font or Expo Google Fonts.
- **Density:** table rows 36px, sidebar items 32px. IS is a long-session work tool, not a marketing page.
- **No emoji in product chrome.** No exclamation marks in product UI.

### Flexibility Rules
> "Keep design flexible: easily changed and customized."

Flexibility lives in **tokens**, not in component structure. The design is flexible because:
- Swapping `--indigo: #3B4FC4` to any color instantly re-themes all interactive elements
- `--sidebar-w`, `--panel-w`, `--topbar-h` control layout dimensions globally
- Per-tenant theming (Phase 2): tenants can set `--indigo` override + `--navy` override in their workspace settings. Component code never hardcodes hex values.

**What is NOT flexible (stable contracts):**
- Component API (prop names, behavior)
- Spacing scale (4px base)
- Radius values (4 / 8 / 12px only)
- Shadow levels (sm / md / lg only)

### Implementation Notes
- `packages/design-tokens/` compiles `Design/colors_and_type.css` into a JS/TS object consumable by both web and React Native.
- `packages/ui/` web components import tokens from `@is/design-tokens`.
- `apps/mobile/` uses `@is/design-tokens` mapped to React Native StyleSheet values via a thin adapter.
- `Design/` folder is **read-only** for implementer agents. Only Claude Design modifies it. Changes flow one direction: Design → packages/design-tokens → apps.

---

## ADR-007: Mobile Strategy

### Decision
React Native + Expo SDK (latest stable) from day one. Ship to iOS App Store and Google Play via EAS (Expo Application Services).

### Context
Indonesia is mobile-first. IS-MOB (Phase 1) covers expense capture, leave requests, payslip view, and approval flows — all primary mobile use cases. React Native shares business logic with Next.js web via shared `@is/` packages, avoiding two separate implementations.

### Why React Native over PWA-only
- **Push notifications on iOS:** PWA push support on iOS Safari remains unreliable. Native push is table stakes for approval workflows.
- **Deep device integration:** camera (receipt scan), biometrics (Face ID / fingerprint for re-auth), secure storage for tokens.
- **App store presence:** Indonesian enterprise procurement often requires listing in Play Store/App Store as a trust signal.
- **Shared code:** shared `@is/types`, `@is/db` queries, and `@is/integrations` across web and mobile.

### How to Ship to App Stores

**Setup (one-time):**
1. Apple Developer Program — enroll at developer.apple.com (USD 99/year, requires D-U-N-S number for organizations)
2. Google Play Console — register at play.google.com/console (USD 25 one-time)
3. EAS CLI: `npm install -g eas-cli && eas login`
4. `eas build:configure` in `apps/mobile/` — generates `eas.json`

**Build pipeline:**
```
eas build --platform ios --profile production      # triggers cloud build, returns .ipa
eas build --platform android --profile production  # returns .aab
```

**Submission:**
```
eas submit --platform ios       # uploads to App Store Connect → TestFlight → review
eas submit --platform android   # uploads to Play Console → Internal Testing → review
```

**Review timelines (realistic):**
- iOS: 1–3 business days first submission; 24h for updates after track record established
- Android: 1–7 days first submission; often hours for updates

**Beta distribution (pre-launch):**
- iOS: TestFlight (up to 10,000 external testers, no review required for internal)
- Android: Play Console Internal Testing track (up to 100 testers, instant)
- Use these for design partner beta access before public launch

**CI/CD for mobile:**
```yaml
# .github/workflows/mobile.yml
on: push to main
steps:
  - typecheck
  - test
  - eas build --non-interactive --platform all
  - eas submit (production branch only)
```

### Implementation Notes
- Expo managed workflow for Phase 1; eject to bare workflow only if native modules require it.
- `apps/mobile/app/` uses Expo Router (file-based routing, matches Next.js conventions).
- Shared auth tokens via Expo SecureStore (keychain/keystore — never AsyncStorage for credentials).
- Offline-first for expense capture and timesheet — queue mutations with Expo SQLite, sync on reconnect.
- Minimum OS: iOS 16+, Android 12+ (API 31+).

---

## ADR-008: Pricing Model

### Decision
Four tiers: **Rintis (Free) / Tumbuh (Per Seat) / Pilih (Per Module) / Penuh (Enterprise)**. A separate government/BUMN track exists. All tiers are in Rupiah; USD pricing available for international tenants.

### Design Principles
- Free tier is a genuine on-ramp, not a nag screen. Indonesian SMEs must be able to run core operations without a credit card.
- Pricing is mix-and-match because Indonesian businesses have wildly different module needs. A trading company needs Inventory + Finance. A services firm needs HR + Projects. Forcing them to buy everything wastes money and creates sales friction.
- No seat cap at enterprise — complexity of negotiating headcount is a trust destroyer for large clients.
- All pricing is "reasonable investment, not bloated numbers" — anchored to Mekari/Jurnal market norms, not global SaaS ARPUs.

---

### Tier 1 — Rintis (Free)

**"Mulai tanpa biaya."**

| Item | Limit |
|---|---|
| Seats | 5 |
| Modules | IS-PLAT + IS-AUTH + IS-HR (max 10 employees) + IS-FIN (50 transactions/month) |
| Storage | 1 GB |
| Support | Community forum |
| Branding | IS branding on outgoing emails |
| Integrations | None (manual data entry only) |

**Purpose:** Indonesian freelancers, early-stage startups, and student/sandbox usage. Converts when headcount or transaction volume is exceeded.

---

### Tier 2 — Tumbuh (Growth) — Per Seat

**"Rp 149.000 / kursi / bulan"** (~USD 9 / seat / month)  
Annual: Rp 1.490.000 / seat / year (save ~16%)

| Item | Limit |
|---|---|
| Seats | 6–100 |
| Modules | All Phase 1 modules unlocked |
| Storage | 50 GB |
| Support | Email (48h SLA) |
| Branding | None |
| Integrations | BPJS, e-Faktur basic |

**Purpose:** SMEs 10–100 employees who need the full Phase 1 suite. Per-seat pricing aligns cost to team size.

**Overage:** seat 101+ billed at Rp 149.000/seat/month. No hard cap — never block a growing company.

---

### Tier 3 — Pilih (Select) — Per Module

**"Rp 1.200.000 / modul / bulan"** (~USD 72 / module / month)  
Annual: Rp 12.000.000 / module / year (save ~16%)

| Item | Limit |
|---|---|
| Seats | Unlimited within purchased modules |
| Modules | À la carte — any Phase 1 or Phase 2 modules |
| Storage | 200 GB |
| Support | Email + chat (24h SLA) |
| Integrations | Full government API suite |

**Purpose:** Companies that need depth in specific modules but not breadth. E.g. a 200-person logistics company that only wants IS-INV + IS-PURCH + IS-FIN. Unlimited seats makes it easy to roll out widely within the chosen modules.

**Module pricing exceptions:**
- IS-AIP (AI Platform): Rp 3.000.000/month (includes AI model costs up to a usage cap; overage billed at cost + 20%)
- IS-EXT (Workspace Extensions): Rp 2.000.000/month
- IS-CHAT-FED (Inter-Tenant Chat Federation): Rp 1.500.000/month

---

### Tier 4 — Penuh (Enterprise) — All-In

**Custom annual contract — minimum Rp 120.000.000/year** (~USD 7,200/year)

| Item | Limit |
|---|---|
| Seats | Unlimited |
| Modules | All modules (Phase 1, 2, 3 as they release) |
| Storage | 1 TB+ (negotiated) |
| Support | Dedicated CSM + 4h SLA |
| SLA | 99.9% uptime guarantee + SLA credits |
| Deployment | SaaS (Jakarta) or on-premise (Lintasarta) |
| Contract | Annual with multi-year discount |
| Billing | NPWP invoice (for PKP tax purposes) |
| Integrations | Custom integration support included |

**Purpose:** 500+ employee companies, enterprise groups, holding companies with multiple subsidiaries (each subsidiary = one tenant, consolidated billing).

---

### Government / BUMN Track

| Item | Details |
|---|---|
| Pricing | Custom; structured for LKPP e-Katalog procurement |
| Contract | Multi-year (2–5 years standard) |
| Billing | LS (Langsung) payment terms |
| Hosting | AWS Jakarta or Lintasarta (required for some ministries) |
| Compliance | SPSE-compatible, TKDN documentation provided |
| Timeline | Phase 2 — e-Katalog listing takes 6–12 months to activate |

---

### Pricing Flexibility Rules

> Pricing must be adjustable to each client without breaking the model.

The tiers above are **defaults**. Sales is authorized to deviate within these bounds:

| Parameter | Tumbuh | Pilih | Penuh |
|---|---|---|---|
| Seat price floor | Rp 99.000 | N/A | N/A |
| Module price floor | N/A | Rp 800.000 | N/A |
| Annual discount max | 20% | 20% | 30% |
| Additional seats discount | 10% at 50+ seats | N/A | N/A |
| Free trial duration | 14 days (all tiers) | 14 days | 30 days |

**Never discount below cost.** The Pilih module floor (Rp 800.000/module) covers infrastructure + support overhead.

---

### Upgrade / Downgrade Rules

- Tumbuh → Pilih: one-way (Pilih is more expensive at >16 seats/module)
- Pilih → Tumbuh: allowed; unused module access removed at next billing cycle
- Any → Penuh: welcome; prorate unused period
- Penuh → any paid tier: allowed with 60-day notice (data always exportable)
- Free → paid: instant; no sales call required up to Tumbuh 50 seats (self-serve)
- Free tier: never expires, never force-converted. IS branding on emails is the only "nudge."

---

## ADR-009: Agent-Native Architecture

**Date:** 2026-05-16

### Decision
Kantr is built agent-native from the ground up. Agents are first-class actors alongside users — not a Phase 2 feature bolted on. This is an internal architectural decision, not a brand or positioning claim. The product is still "the corporate OS for Indonesia."

### Context
Enterprise software is shifting from tools users operate to systems that do the work on users' behalf. Building agent support as a retrofit (Odoo's current path) creates brittle, inconsistent experiences. Starting native means every module is designed from day one to be driven by both humans and agents without special cases.

### What "Agent-Native" Means

**Not:** "Agentic ERP" as a marketing label — that is a 2024–2025 buzzword that will date and requires explanation.

**Yes:** Agents work. Humans review. The product does more so users do less. The architecture enforces this cleanly.

### Core Decisions

| Decision | Ruling |
|---|---|
| Agent identity | `agent_id` namespace separate from `user_id`. Every audit row records exactly one of `acted_by_user_id` OR `acted_by_agent_id`, plus `on_behalf_of_user_id` when delegated |
| Tool registry | Every IS module registers typed, permission-scoped, idempotent tools at startup. Tools are how agents act; CRUD APIs remain for UI |
| MCP protocol | IS exposes all Tool Registry entries as an MCP (Model Context Protocol) server. External agents (Claude, GPT, Gemini) drive IS via the same protocol internal agents use |
| Reasoning traces | Every agent action persists input context, tools called, reasoning steps, outcome, and cost. Queryable, shown in UI. Retention 90d default |
| Reversibility | Every agent-initiated action is reversible within a configurable window (24h default). `reverse_action_id` and `reversible_until` on every agent-touched row. Human-triggered only |
| Approval inbox | Primary Phase 1 UI primitive for agent-gated actions. Agents queue proposed actions; humans approve/reject with full context. Replaces confirmation dialogs |
| Permission scopes | Agents operate under mandates: bounded contracts with max financial impact per action, rolling 24h cap, human-approval threshold, expiration date. Cannot exceed delegating user's permissions |
| Event bus | Modules emit typed domain events; agents subscribe reactively. No polling. Backed by Valkey pub/sub with durable consumer groups |

### Module Implications

- **IS-AGENT** (new Phase 1 core): the runtime infrastructure module — tool registry, agent IAM, MCP server, reasoning store, reversibility engine, event bus. Sibling to IS-PLAT and IS-AUTH.
- **IS-AIP** moved to Phase 1: AI Platform (semantic search, translation, smart fields, agent dashboard) is foundational, not a 2026 add-on. Without it, agents have no cross-module intelligence.
- **Per-module agent catalogs**: each Phase 1 module ships with named built-in agents (e.g. IS-FIN ships with reconciliation agent, invoice-matching agent; IS-HR ships with onboarding agent, BPJS-compliance agent). These are part of the module, not optional extras.

### Moat
Indonesian-domain agents — tuned for BPJS rates, DJP CoreTax XML, e-Faktur edge cases, Dukcapil NIK validation — cannot be replicated by Western ERP vendors. This catalog is a durable competitive advantage.

### What Does Not Change
- Brand positioning: "the corporate OS for Indonesia" — unchanged
- UI language: agents are invisible infrastructure; the product says "done" not "my agent did this"
- Data residency: no agent reasoning traces or tool calls leave Indonesia

### Consequences
- Every table in every module needs agent-compatible audit columns (`acted_by_agent_id`, `reversible_until`, `reverse_action_id`)
- Schema Specialist must include these columns in every migration from v1.0 onward
- IS-AGENT must be fully operational before any other module ships agent functionality
- ADR-001 addendum: agents are tenant-scoped — no cross-tenant agent access, ever

---

## ADR-010: Agent-Era Pricing Model

**Date:** 2026-05-16  
**Supersedes:** ADR-008 (pricing structure remains; this addendum covers the agent capacity layer)

### Decision
Add an **agent capacity** dimension to the pricing model. Human seats and agent capacity are priced separately. Outcome-based pricing available for high-value automated flows.

### Context
Per-seat pricing breaks when agents do work. A team of 5 humans running 50 concurrent agent workloads pays the same as a team of 5 doing everything manually — which is wrong in both directions: undercharges for value delivered, and misaligns incentives.

### Model

| Dimension | Unit | Rintis (Free) | Tumbuh | Pilih | Penuh |
|---|---|---|---|---|---|
| Human seats | per user/month | 5 | Rp 149.000 | Unlimited | Custom |
| Agent slots | concurrent agents | 1 (built-in only) | 3 | 10 per module | Custom |
| Outcome fees | per qualified event | — | — | Optional add-on | Negotiated |

**Agent slot:** one slot = one concurrently running autonomous agent. Built-in module agents (reconciliation, onboarding, etc.) consume slots from the tenant's pool. Custom agents (configured by the tenant) consume additional slots.

**Outcome fee examples** (optional, for Pilih and Penuh):
- Per invoice auto-reconciled: Rp 500
- Per BPJS filing prepared and submitted: Rp 2.000
- Per payroll run closed without human intervention: Rp 5.000

Outcome fees are opt-in — tenants choose the flows they want outcome-priced. All flows work without outcome pricing; the fee is for premium SLA guarantees on those flows.

### Rationale
- Human seats still matter: humans review, approve, configure. Not eliminated.
- Agent slots reflect infrastructure cost honestly: more concurrent agents = more compute, more LLM tokens, more event bus load.
- Outcome fees align IS revenue with customer value — the better the agent, the more IS earns. Incentive is correct.
- Free tier gets 1 slot (built-in agents only) — agents are a differentiator visible from day one, not a paid-only wall.

### Consequences
- Billing system must track agent slot utilization in real time
- Mandate system (IS-AGENT-002) enforces slot limits — agents cannot spawn beyond tenant's pool
- Outcome fee tracking requires reliable event attribution (which run caused which outcome)

---

## Open Items (not yet decided, require follow-up)

| Item | Owner | Deadline |
|---|---|---|
| ~~Brand name~~ | ~~Founder~~ | **Decided: Kantr** |
| Exact v1.0 module scope (which Phase 1 modules ship at launch vs. trickle) | Founder + first design partners | Week 2 |
| Design partner pipeline (3–5 confirmed companies) | Founder | Week 1 |
| PT entity confirmation + NPWP | Legal | Before design partner contracts |
| Apple Developer Program enrollment | Founder | Week 2 |
| BPJS API access application | BD | Start immediately — 3–6 month lead time |
| DJP CoreTax / PajakExpress partnership | BD | Start immediately |
| Per-module built-in agent catalog (which agents ship with each Phase 1 module) | Founder + Spec Writer agent | Before v1.0 spec freeze |
