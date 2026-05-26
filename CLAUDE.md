# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

This repo (`kantr`) is the **KantorCore monorepo** — a Turborepo + pnpm workspaces monorepo containing the full Indonesia System product platform plus supporting apps.

**Indonesia System** is a national corporate OS for Indonesia — simpler than Odoo, powerful enough to replace SAP, natively integrated with Indonesian government infrastructure (BPJS, Ketenagakerjaan, CoreTax DJP, Dukcapil via PrivyID, QRIS).

## Commands

```bash
# Per-app dev servers
pnpm dev:web          # apps/web — KantorCore main app
pnpm dev:roadmap      # apps/roadmap — public product roadmap
pnpm dev:marketing    # apps/marketing — marketing site

# Build
pnpm build:web
pnpm build:roadmap
pnpm build:marketing

# Database (Drizzle via packages/db)
pnpm db:generate      # generate migration files
pnpm db:migrate       # run migrations
pnpm db:push          # push schema to DB (dev)
pnpm db:studio        # open Drizzle Studio

# Auth package
pnpm auth:build
pnpm auth:check

# Run all (Turborepo)
pnpm dev              # all apps in parallel
pnpm build            # all apps
pnpm typecheck        # all apps + packages
```

Package manager: **pnpm@10.33.0** (Node >=18 required). Never use `npm` or `yarn` in this repo.

## Monorepo Structure

```
kantr/                         ← root (Turborepo + pnpm workspaces)
  apps/
    web/                       ← KantorCore main app (Next.js 15 App Router)
    roadmap/                   ← Public product roadmap (Next.js 15 App Router)
    marketing/                 ← Marketing site (Next.js 15 App Router)
    docs/                      ← Deprecated (docs.kantorcore.com removed May 2026)
  packages/
    auth/          @kantorcore/auth           # better-auth: password hashing, sessions, cookies
    db/            @kantorcore/db             # Drizzle ORM schema + Supabase client + migrations
    design-tokens/ @kantorcore/design-tokens  # Locked color/type/spacing/motion tokens
    types/         @kantorcore/types          # Shared TypeScript types across all apps
    ui/            @kantorcore/ui             # Shared React components (token-driven)
```

### Monorepo rules
- **No cross-app imports** — `apps/web` must not import from `apps/roadmap` or vice versa
- **Shared code belongs in `packages/`** — if two apps need the same thing, extract it
- **Internal packages use `@kantorcore/*` namespace** — always reference by package name, not relative path
- **`apps/docs` is deprecated** — do not add features there; roadmap content stands alone
- **`apps/roadmap` is purely static** — no auth, no DB; `data/features.json` is its only data source

## Architecture

**Tech stack**: Next.js 15 App Router · Supabase (Postgres) · Drizzle ORM · better-auth · Vercel · Turborepo + pnpm

### apps/web — KantorCore main application

Next.js 15 App Router. Authenticated multi-tenant SaaS app. Uses `@kantorcore/auth`, `@kantorcore/db`, `@kantorcore/ui`, `@kantorcore/types`.

Key route groups under `apps/web/app/`:
- `hr/`, `pay/`, `fin/`, `inv/`, `sales/`, `crm/`, `proj/` — domain modules (Phase 1)
- `chat/`, `doc/`, `kms/` — collaboration modules
- `aip/`, `agent/` — AI Platform and Agent Runtime
- `settings/`, `portal/`, `approvals/` — platform cross-cuts
- `api/` — Next.js Route Handlers (server-side only; never expose secrets to client)

### apps/roadmap — Public product roadmap

No database. `data/features.json` is the single source of truth for all nodes (v0.9, 654 nodes). Deployed separately on Vercel.

```
apps/roadmap/
  app/
    layout.tsx                # Root layout
    globals.css               # CSS variables + resets + map animations
    page.tsx                  # Main shell — renders RoadmapApp
    locale-context.ts         # Locale helpers (en/id)
    components/
      RoadmapApp.tsx          # Top-level state, view toggle (List/Map)
      TopNav.tsx              # Logo + search trigger + locale + version
      MapView.tsx             # SVG map: pannable, zoomable, expandable nodes
      ListView.tsx            # Grouped list view by phase
      DetailPanel.tsx         # Right-side node detail slide-in panel
      SearchModal.tsx         # Keyboard-triggered (⌘K) search overlay
      SearchFilterBar.tsx     # Filter controls
  data/
    features.json             # All roadmap nodes
```

### `features.json` node schema

```json
{
  "id": "hr",
  "label": "HR & Employees",
  "description": "...",
  "type": "module",        // "root" | "module" | "app" | "feature" | "infrastructure"
  "status": "planned",     // "planned" | "in-progress" | "done"
  "phase": 1,              // 0 = core/root, 1–3 = phases
  "parent": "core",        // id of parent node (absent on root)
  "code": "IS-HR",         // module code (present on most nodes)
  "milestone": "v1.0",     // target release milestone
  "x": -420,               // optional canvas position hint (not used by dynamic layout)
  "y": -220
}
```

### Phase color coding (CSS variables in `globals.css`):
- Phase 0 / root → `--navy` `#1A2B5A`
- Phase 1 → `--indigo` `#3B4FC4`
- Phase 2 → `--teal` `#0F7B6C`
- Phase 3 → `--amber` `#B35A00`

### Map view layout (MapView.tsx)

- Pure SVG, no canvas library
- Pan: mouse drag; Zoom: scroll wheel
- Nodes placed in phase rings (dynamic radii); modules on rings, apps/features fan outward on expand
- **Dynamic ring radii**: when a module in phase P is expanded, rings P+1 and P+2 push outward to prevent child nodes from overlapping the next ring
- **Slot-based collision avoidance**: each module owns 360°/N of its ring's angular slot; its child fan is capped at ~92% of that slot, and the fan radius auto-grows so children always have a minimum pixel spacing — no overlap with sibling-module children
- **Hover focus (1s delay)**: hovering a node for 1 second dims all unrelated nodes (opacity 0.1); related = the hovered node + **all ancestors up to root** + **all descendants recursively**
- **Moving dash animation**: edges along the full ancestry/descendant chain get `stroke-dasharray: 5 5` + `dashFlow` keyframe animation, so you can trace the complete connection chain
- **Multi-line labels**: long labels word-wrap to 2 lines; box heights grow dynamically per node based on line count
- **Smooth position transitions**: nodes use CSS `transform: translate(Xpx, Ypx)` with `transition: transform 0.45s` so expanding/collapsing smoothly redistributes the layout

## Styling Rules

- Use CSS Modules or inline styles only — **no Tailwind**
- All design tokens are CSS variables in `globals.css` — use them, don't hardcode colors
- Font: system-ui / -apple-system stack (no external fonts)
- `html, body` are `overflow: hidden` — the map canvas takes full viewport

## Deployment

Vercel (auto-detects Next.js). Push to GitHub → connect repo in Vercel → add env var → deploy.

## Strategic Context

See `PRODUCT_CLAUDE.md` for all architectural decisions. Key ones relevant to the roadmap app:

- **features.json is append-only** during planning — never delete a committed node; deprecate by setting `status: "deprecated"` instead
- **Phase assignments**: Phase 1 = v1.0 launch; Phase 2 = v2.0; Phase 3 = v3.0+
- **IS-AIP (AI Platform)** is Phase 1 (moved from Phase 2) — AI search, translation, smart fields, and agent dashboard are foundational, not add-ons
- **IS-AGENT (Agent Runtime)** is Phase 1 core — tool registry, agent IAM, MCP server, reasoning store, reversibility engine. Must ship before any module ships agent functionality
- **No plugin marketplace** — IS-MKT Phase 3 Plugin SDK was removed; replaced by IS-TPL (Configuration Template Library)
- **IS-CHAT-FED** (Phase 2) — Matrix-protocol inter-tenant chat federation

## Roadmap module inventory (v0.9)

| Code | Name | Phase |
|---|---|---|
| IS-PLAT | Platform Core | 1 |
| IS-AUTH | Authentication | 1 |
| IS-HR | HR & Employees | 1 |
| IS-PAY | Payroll | 1 |
| IS-FIN | Finance & Accounting | 1 |
| IS-INV | Inventory | 1 |
| IS-PURCH | Purchasing | 1 |
| IS-SALES | Sales | 1 |
| IS-CRM | CRM | 1 |
| IS-PROJ | Projects | 1 |
| IS-TIME | Timesheets | 1 |
| IS-EXP | Expenses | 1 |
| IS-CHAT | Chat & Notifications | 1 |
| IS-MOB | Mobile PWA | 1 |
| IS-L10N | Localization (l10n-id) | 1 |
| IS-EMAIL | Email & Workspace | 2 |
| IS-MTG | Meetings | 2 |
| IS-OMNI | Omnichannel | 2 |
| IS-MFG | Manufacturing | 2 |
| IS-HD | Help Desk | 2 |
| IS-KMS | Knowledge Management | 2 |
| IS-PLAN | Planning & Forecasting | 2 |
| IS-FLEET | Fleet | 2 |
| IS-EVT | Events | 2 |
| IS-SRV | Field Service | 2 |
| IS-SUB | Subscriptions | 2 |
| IS-OKR | OKR & Goals | 2 |
| IS-DOCS | Document Management | 2 |
| IS-CONV | Conversational | 2 |
| IS-COMP | Compliance Automation | 2 |
| IS-MAINT | Maintenance | 2 |
| IS-PORTAL | Customer/Vendor Portal | 2 |
| IS-AGENT | Agent Runtime Platform | 1 |
| IS-FLOW | Workflow Automation (no-code, deterministic) | 1 |
| IS-AIP | AI Platform | 1 |
| IS-TEL | Telephony (Telkom SIP Trunk, softphone, PBX) | 1 |
| IS-MIG | Migration & Data Import (Accurate, Zahir, Excel) | 1 |
| IS-CHAT-FED | Inter-Tenant Chat Federation | 2 |
| IS-PUB | Publishing | 3 |
| IS-B2B | B2B Commerce | 3 |
| IS-ECOM | E-commerce | 3 |
| IS-STU | Student & Education | 3 |
| IS-IOT | IoT | 3 |
| IS-FS | Financial Services | 3 |
| IS-PLM | Product Lifecycle | 3 |
| IS-LMS | Learning Management | 3 |
| IS-IND | Industry Verticals | 3 |
| IS-TPL | Configuration Template Library | 3 |
| IS-EXT | Workspace Extensions (tenant-scoped mini apps) | 3 |

## Nice-to-haves (post-MVP)

- Minimap for canvas orientation
- Filter by phase or status in map view
- URL hash deep-linking to a specific node
- Admin page (password-protected) to edit `features.json` via UI
- Expand-all / collapse-all shortcuts
