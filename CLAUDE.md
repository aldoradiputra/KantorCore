# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A **public product roadmap** for **Indonesia System** — a long-term vision for a national corporate OS for Indonesia (simpler than Odoo, powerful enough to replace SAP, natively integrated with Indonesian government infrastructure like BPJS, Ketenagakerjaan, taxation, and national identifiers).

The roadmap app is standalone — separate from sister products Supapark, Jurna, and a planned B2B Marketplace (separate brand, same PT entity).

## Commands

```bash
npm run dev      # Start dev server (Next.js 15 App Router)
npm run build    # Production build
npm run start    # Start production server
```

No test runner or linter is configured yet.

## Architecture

**Next.js 15 App Router** deployed on Vercel. No database — `data/features.json` is the single source of truth for all nodes.

### Current project structure (fully built):

```
app/
  layout.tsx                  # Root layout
  globals.css                 # CSS variables + resets + map animations
  page.tsx                    # Main shell — renders RoadmapApp
  types.ts                    # Node type definition
  locale-context.ts           # Locale helpers
  docs-content.ts             # Static docs content
  api/
    chat/
      route.ts                # Claude API proxy (ANTHROPIC_API_KEY, streaming)
  components/
    RoadmapApp.tsx            # Top-level state, view routing (Map/List/Docs/Learn)
    TopNav.tsx                # Navigation bar with view toggle + search trigger
    MapView.tsx               # SVG map: pannable, zoomable, expandable nodes
    ListView.tsx              # Grouped list view by phase
    DetailPanel.tsx           # Right-side node detail slide-in panel
    ChatPanel.tsx             # Collapsible AI chat panel
    SearchModal.tsx           # Keyboard-triggered search overlay
    SearchFilterBar.tsx       # Filter controls
    DocsView.tsx              # Docs view shell
    DocSidebar.tsx            # Docs navigation sidebar
    DocContent.tsx            # Rendered doc content
    LearnView.tsx             # Learn view
data/
  features.json               # All roadmap nodes (v0.9, 480 nodes)
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

### `/api/chat` system prompt:

```
You are the AI assistant for Indonesia System's public product roadmap.
Indonesia System is a long-term vision for a national corporate operating system for Indonesia —
simpler than Odoo, powerful enough to replace SAP, natively integrated with Indonesian
government infrastructure (BPJS, Ketenagakerjaan, taxation, national identifiers).

You have access to the full feature list and roadmap. Answer questions about features,
phases, status, and product direction. Be concise and helpful.
Keep responses short — this is a chat panel, not a document.
```

## Styling Rules

- Use CSS Modules or inline styles only — **no Tailwind**
- All design tokens are CSS variables in `globals.css` — use them, don't hardcode colors
- Font: system-ui / -apple-system stack (no external fonts)
- `html, body` are `overflow: hidden` — the map canvas takes full viewport

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...   # Set in Vercel dashboard, never commit
```

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
| IS-AIP | AI Platform | 1 |
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
