export type Block =
  | { type: 'h2';      text: string }
  | { type: 'h3';      text: string }
  | { type: 'p';       text: string }
  | { type: 'ul';      items: string[] }
  | { type: 'callout'; variant: 'info' | 'warning' | 'tip'; title?: string; text: string }
  | { type: 'code';    lang?: string; text: string }
  | { type: 'table';   headers: string[]; rows: string[][] }
  | { type: 'divider' }

export type DocPage = {
  id: string
  title: string
  breadcrumb?: string
  phase?: number
  code?: string
  milestone?: string
  intro: string
  blocks: Block[]
}

const PAGES: DocPage[] = [

  // ─── Getting started ────────────────────────────────────────────────────────
  {
    id: 'getting-started',
    title: 'Getting started',
    intro: 'Everything you need to understand Indonesia System in 5 minutes — what it is, who it is for, and how the platform is structured.',
    blocks: [
      { type: 'h2', text: 'What is Indonesia System?' },
      { type: 'p',  text: 'Indonesia System (IS) is a national corporate operating system for Indonesian companies. It replaces a fragmented stack of HR tools, accounting software, and spreadsheets with one coherent platform — natively connected to BPJS, CoreTax DJP, PrivyID (NIK verification), and QRIS payments.' },
      { type: 'p',  text: 'The positioning: simpler than Odoo, powerful enough to replace SAP, and built from the ground up for Indonesian regulatory requirements.' },
      { type: 'h2', text: 'Who is it for?' },
      { type: 'table',
        headers: ['Audience', 'Primary use'],
        rows: [
          ['Operations managers', 'Procurement, inventory, project tracking'],
          ['Finance leads',       'Accounting, AR/AP, QRIS invoicing, e-Faktur'],
          ['HR directors',        'Employee records, NIK onboarding, payroll, BPJS'],
          ['CEOs',                'Dashboard overview, approvals, compliance posture'],
          ['IT / developers',     'Platform Core, integrations, Studio (Phase 3)'],
        ],
      },
      { type: 'h2', text: 'Business model' },
      { type: 'ul', items: [
        'Flat-fee service tiers — not feature-gated. You get all modules on your tier.',
        'Unlimited users per tier.',
        'Available as B2B SaaS (cloud) or on-premise (Kamal + Docker on customer server).',
        'Language: Bahasa Indonesia primary, English secondary (ID/EN from day one).',
      ]},
      { type: 'h2', text: 'How to read these docs' },
      { type: 'p',  text: 'Use the sidebar to navigate by module or concept. The Ask Claude panel on the right can answer any question across the full docs and feature list. Phase 1 modules ship in v1.0; Phase 2 in v2.0; Phase 3 in v3.0.' },
      { type: 'callout', variant: 'info', title: 'Feature codes',
        text: 'Every feature has an IS-{MODULE}-{APP}-{SEQ} code used in commit messages, PR titles, and issue references. For example: IS-AUTH-001 (Login & Session), IS-HR-EMP-001 (Employee Record), IS-FIN-AR-001 (AR Invoice).' },
    ],
  },

  // ─── Concepts: Architecture overview ─────────────────────────────────────
  {
    id: 'concepts-architecture',
    title: 'Architecture overview',
    breadcrumb: 'Concepts',
    intro: 'Every action in Indonesia System flows through a single stack — from the user interface down to the database and back out through the event bus. Understanding this flow is the key to understanding the whole system.',
    blocks: [
      { type: 'h2', text: 'The core mental model' },
      { type: 'p',  text: 'Every capability — whether triggered by a human in the UI, an API call, a scheduled workflow, or an AI agent — goes through the Tool Registry. The Tool Registry checks permissions, executes domain logic, writes to the database, emits a domain event, and returns a typed result. Everything else (audit log, workflows, real-time updates, webhooks, AI agents) happens asynchronously as fan-out from that event.' },
      { type: 'code', text:
`  User UI / API / Agent / Workflow
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
                         ──► AI Agents` },
      { type: 'h2', text: 'Why this matters' },
      { type: 'ul', items: [
        'A UI button, a REST call, a workflow step, and an AI agent all call the same tool — permissions are enforced once, audit is written once.',
        'Adding a new feature = writing a tool handler. The platform handles routing, permissions, events, and audit automatically.',
        'Switching from a human-triggered action to an AI-triggered one requires no code changes — just a new caller type.',
      ]},
      { type: 'h2', text: 'Tech stack at a glance' },
      { type: 'table',
        headers: ['Layer', 'Choice', 'Notes'],
        rows: [
          ['Frontend',  'React 19 + Vite + TypeScript',    'SPA with TanStack Router — no Next.js'],
          ['Backend',   'Hono + Node.js + TypeScript',      'Lightweight, fast, great TS support'],
          ['Database',  'PostgreSQL',                        'One DB per tenant; Drizzle ORM'],
          ['Auth',      'better-auth (self-built)',           'TOTP, passkeys, SAML/OIDC, sessions'],
          ['Charts',    'Apache ECharts',                    'Canvas, 60fps, JSON-configured widgets'],
          ['Deploy',    'Kamal + Docker',                    'On-premise first; cloud on AWS Jakarta'],
        ],
      },
    ],
  },

  // ─── Concepts: Tenant hierarchy ───────────────────────────────────────────
  {
    id: 'concepts-tenant',
    title: 'Tenant hierarchy',
    breadcrumb: 'Concepts',
    intro: 'How data is organized from the platform level down to individual field values — and where company and branch identity lives.',
    blocks: [
      { type: 'h2', text: 'The full hierarchy' },
      { type: 'code', text:
`Platform (IS)
  └── Tenant  (one PG database — the billing unit)
        └── Organization  (the holding/group entity)
              └── Company  (legal entity — NPWP, NIB, default CoA)
                    └── Branch / Business Unit  (location, cost center)
                          └── Module  (functional domain: HR, Finance…)
                                └── App  (sub-area: Employees, AR, Invoices…)
                                      └── Model  (data entity: Employee, Invoice…)
                                            ├── Kernel fields  (Drizzle, typed, migrated)
                                            └── Custom fields  (JSONB overlay, no migration)
                                                  └── Records  (rows of actual data)` },
      { type: 'h2', text: 'Tenant vs Company vs Branch' },
      { type: 'table',
        headers: ['Concept', 'What it represents', 'Where stored'],
        rows: [
          ['Tenant',       'The billing unit — one paying customer group, one PG database', 'is_registry DB'],
          ['Organization', 'The top-level holding entity within the tenant',                 'is_tenant_{slug} DB'],
          ['Company',      'A legal entity with its own NPWP, NIB, Chart of Accounts',       'is_tenant_{slug} DB'],
          ['Branch',       'A physical location or cost center within a company',             'is_tenant_{slug} DB'],
        ],
      },
      { type: 'p', text: 'A holding group (e.g. Acme Group) is one tenant with one database. Inside it: PT Acme Indonesia and PT Acme Logistik are two companies. Jakarta HQ and Surabaya are two branches of PT Acme Indonesia.' },
      { type: 'h2', text: 'company_id and branch_id on every record' },
      { type: 'p', text: 'Every record on every model carries company_id (required) and branch_id (optional) as kernel fields. These are stamped automatically by the Tool Registry from the caller\'s context. The Permission Fabric enforces cross-company isolation — a user assigned to PT Acme Indonesia cannot see PT Acme Logistik\'s invoices unless they hold an explicit cross-company role.' },
      { type: 'callout', variant: 'tip', title: 'Build order implication',
        text: 'Organization Structure is the first app built within Platform Core — HR (which company does this employee belong to?), Finance (which CoA, which NPWP?), and Auth (which company can this user access?) all depend on it.' },
    ],
  },

  // ─── Concepts: Platform Core ──────────────────────────────────────────────
  {
    id: 'concepts-platform-core',
    title: 'Platform Core',
    breadcrumb: 'Concepts',
    intro: 'The 9 foundational primitives that every domain module builds on. Built before any business module — nothing else starts until this layer is stable.',
    blocks: [
      { type: 'h2', text: 'The 9 primitives' },
      { type: 'table',
        headers: ['Primitive', 'Code', 'What it does'],
        rows: [
          ['Organization Structure', 'IS-PLAT-ORG',  'Multi-company/branch hierarchy; company_id + branch_id on every record'],
          ['Event Bus + Outbox',     'IS-PLAT-EVT',  'Postgres outbox → NATS/Redis; every action emits a typed event with correlation_id'],
          ['Tool Registry',          'IS-PLAT-TOOL', 'Named, typed, permission-checked actions; single entry point for UI/API/agents'],
          ['Audit Log',              'IS-PLAT-AUD',  'Immutable record of every tool execution with before/after diff'],
          ['Schema Extensibility',   'IS-PLAT-SCH',  'Drizzle kernel + JSONB overlay; per-tenant custom fields with LLM Field Builder'],
          ['Workflow Engine',        'IS-WF',        'Versioned trigger→condition→step→outcome; required for v1.0 approval flows'],
          ['Real-time Layer',        'IS-PLAT-RT',   'Hono WS/SSE hub; presence; in-app notifications; live dashboard updates'],
          ['Permission Fabric',      'IS-PLAT-PERM', 'RBAC + ABAC; users, service accounts, AI agents as first-class subjects'],
          ['Data Lineage & Privacy', 'IS-PLAT-DLP',  'PII catalog, consent, retention worker, DSAR — satisfies UU PDP No. 27/2022'],
        ],
      },
      { type: 'h2', text: 'Analytics Layer' },
      { type: 'p',  text: 'The Analytics Layer (IS-PLAT-VIZ) is a 10th Platform Core app — it provides one widget engine powering three surfaces: inline summary bar on every list view, per-module home canvas, and the global home dashboard. All charts are Apache ECharts widgets configured as JSON, fed by Tool Registry aggregate tools, and updated live via the Real-time Layer.' },
      { type: 'h2', text: 'Connector Framework' },
      { type: 'p',  text: 'The Connector Framework (IS-PLAT-CON) provides pluggable adapters for external APIs. Each connector registers its capabilities as tools in the Tool Registry. Includes: webhook engine (outbound, HMAC-signed, with retry queue), job queue (pg-boss or BullMQ for heavy async work), and a Connector SDK base class with credential vault, retry logic, and health checks.' },
    ],
  },

  // ─── Concepts: Tool Registry & Events ────────────────────────────────────
  {
    id: 'concepts-tool-registry',
    title: 'Tool Registry & Event Bus',
    breadcrumb: 'Concepts',
    intro: 'The two primitives that wire every part of the system together — the synchronous call layer and the asynchronous event layer.',
    blocks: [
      { type: 'h2', text: 'Tool Registry' },
      { type: 'p',  text: 'Every capability in the system is a named, typed, versioned tool: hr.employee.create, finance.invoice.approve, workflow.run. Tools are the single entry point for all callers — UI buttons, REST endpoints, workflow steps, and AI agents all invoke the same tool.' },
      { type: 'h3', text: 'Tool executor pattern' },
      { type: 'code', lang: 'typescript', text:
`// Every tool call follows this exact sequence:
1. Validate input against Zod schema
2. Check Permission Fabric (RBAC + ABAC)  → reject if denied
3. Run domain handler (write to DB, call external API, etc.)
4. Emit typed domain event to Event Bus
5. Write to Audit Log (actor, intent, before/after diff, source)
6. Return typed result to caller` },
      { type: 'h3', text: 'Tool manifest (machine-readable)' },
      { type: 'p',  text: 'Every tool is registered with a machine-readable manifest: name, description, input schema (Zod → JSON Schema), output schema, and required permission scopes. This manifest is consumed by: the REST API (auto-documentation), the no-code workflow builder (action picker), and AI agents (function-calling schema).' },
      { type: 'h2', text: 'Event Bus + Outbox' },
      { type: 'p',  text: 'The Postgres transactional outbox guarantees zero event loss — the event row is written in the same DB transaction as the domain write, so they are always in sync. A background worker reads the outbox and publishes to NATS/Redis Streams. Consumers are independent and can fail/restart without losing events.' },
      { type: 'h3', text: 'Event envelope' },
      { type: 'code', lang: 'typescript', text:
`type DomainEvent = {
  id:             string   // UUID
  tenant_id:      string
  company_id:     string
  branch_id?:     string
  actor_id:       string
  actor_type:     'user' | 'service' | 'agent' | 'workflow'
  event_type:     string   // e.g. 'hr.employee.created'
  payload:        unknown  // typed per event_type
  correlation_id: string   // tracks a full request chain
  causation_id?:  string   // parent event that caused this one
  timestamp:      string   // ISO 8601
}` },
      { type: 'h3', text: 'Fan-out consumers' },
      { type: 'ul', items: [
        'Audit Log writer — appends to the immutable audit table',
        'Workflow Engine trigger evaluator — checks if any workflow should start',
        'Real-time Layer broadcaster — forwards to connected WebSocket/SSE clients',
        'Webhook dispatcher — POSTs to registered external endpoints (HMAC-signed)',
        'AI agent notifier — wakes agents subscribed to this event type',
      ]},
    ],
  },

  // ─── Concepts: Schema extensibility ──────────────────────────────────────
  {
    id: 'concepts-schema',
    title: 'Schema extensibility',
    breadcrumb: 'Concepts',
    intro: 'How Indonesia System lets each company add custom fields to any model without database migrations — and how the LLM Field Builder makes this zero-friction.',
    blocks: [
      { type: 'h2', text: 'Kernel + JSONB overlay' },
      { type: 'p',  text: 'Every model has two layers of fields. Kernel fields are defined in the Drizzle schema: typed, indexed, migrated, validated at the DB level. Custom fields live in a custom_fields JSONB column on the same row — no migration needed to add one.' },
      { type: 'code', lang: 'typescript', text:
`// Kernel fields (Drizzle schema — typed, indexed)
export const employees = pgTable('employees', {
  id:         uuid('id').primaryKey(),
  company_id: uuid('company_id').notNull(),
  name:       varchar('name', { length: 255 }).notNull(),
  nik:        varchar('nik', { length: 16 }),
  // ...
  custom_fields: jsonb('custom_fields').default({}),  // ← overlay
})

// Custom field definition (stored in schema_registry table)
{
  entity_type: 'employee',
  field_key:   'nomor_kontrak',
  field_type:  'text',
  label:       'Nomor Kontrak',
  validation:  { required: false },
  pii:         false,
}` },
      { type: 'h2', text: 'LLM Field Builder' },
      { type: 'p',  text: 'Users describe a field in plain language. The system generates a typed field definition, shows a preview card, and the user confirms. No forms, no field type dropdowns.' },
      { type: 'code', text:
`User types: "tambahkan field NIK, wajib diisi, 16 digit, disembunyikan di UI"

System generates:
{
  field_key:   "nik",
  field_type:  "text",
  label:       "NIK",
  pii:         true,
  pii_category: "identity",
  validation:  { required: true, pattern: "^\\d{16}$" },
  ui:          { mask: true }
}` },
      { type: 'h2', text: 'Schema-driven forms' },
      { type: 'p',  text: 'The frontend reads field definitions from the schema registry and renders forms dynamically. Validation rules are colocated with field definitions. Custom fields appear alongside kernel fields in every form and list view — users cannot tell the difference.' },
      { type: 'h2', text: 'Custom views' },
      { type: 'p',  text: 'Per-company saved views (column sets, filters, sorts, groupings) are stored in the schema registry using the same pattern — JSON config rows, no migrations. This is how the no-code view customizer works.' },
    ],
  },

  // ─── Concepts: Permissions ────────────────────────────────────────────────
  {
    id: 'concepts-permissions',
    title: 'Permissions & subjects',
    breadcrumb: 'Concepts',
    intro: 'Indonesia System treats permissions as a first-class concern. Every action is checked — and the system recognises not just human users but also service accounts, workflow actors, and AI agents.',
    blocks: [
      { type: 'h2', text: 'Permission model: RBAC + ABAC' },
      { type: 'p',  text: 'Roles (RBAC) define what actions a subject can take. Attributes (ABAC) define conditions — only see records where company_id matches, only approve POs below a threshold, only edit your own time entries. Both are enforced inside the Tool Registry executor, never scattered across individual handlers.' },
      { type: 'h2', text: 'First-class non-human subjects' },
      { type: 'table',
        headers: ['Subject type', 'Examples', 'How it authenticates'],
        rows: [
          ['User',             'Finance lead, HR manager, CEO',           'JWT from better-auth session'],
          ['Service account',  'Background job, webhook handler',          'API key with scoped permissions'],
          ['Workflow actor',   'Approval step, scheduled automation',       'Signed workflow token per run'],
          ['AI agent',         'Conversational agent, analytics agent',     'Agent token with declared tool scopes'],
          ['Integration',      'Xendit webhook, Pajakku callback',          'HMAC-verified request + API key'],
        ],
      },
      { type: 'h2', text: 'Record-level and field-level scopes' },
      { type: 'ul', items: [
        'Record-level: row-level security enforced at the Tool Registry — consistent across UI, API, and agents.',
        'Field-level: PII fields (salary, NIK, health data) are masked for roles without explicit read:pii permission. The masking happens in the tool response layer, not the DB query.',
        'Cross-company scope: a group CFO can be granted explicit multi-company read access. All other users are isolated to their company_id by default.',
      ]},
      { type: 'h2', text: 'Permission audit' },
      { type: 'p',  text: 'Every permission check decision is logged: subject_id, subject_type, tool, resource_id, decision (allow/deny), rule_matched, timestamp. This powers who-can-do-what compliance reports required by UU PDP.' },
    ],
  },

  // ─── Concepts: Multi-tenancy ──────────────────────────────────────────────
  {
    id: 'concepts-multitenancy',
    title: 'Multi-tenancy',
    breadcrumb: 'Concepts',
    intro: 'Indonesia System uses hard tenant isolation — one PostgreSQL database per company group. No shared tables between tenants.',
    blocks: [
      { type: 'h2', text: 'One database per tenant' },
      { type: 'p',  text: 'Each paying customer (tenant) gets a dedicated PostgreSQL database. Tenant data is never commingled in shared tables. This eliminates an entire category of data leakage bugs and makes compliance audits straightforward — "all data for this customer" is one database.' },
      { type: 'code', text:
`is_registry          ← central: tenants, subscriptions, billing, feature flags
is_tenant_acmecorp   ← Acme Group's entire data
is_tenant_ptbakti    ← PT Bakti Nusantara's entire data` },
      { type: 'h2', text: 'Tenant resolution' },
      { type: 'p',  text: 'The API resolves tenant from the subdomain (acme.indonesiasystem.id) or from a JWT claim (for API clients). Drizzle connects to the correct tenant DB via a connection pool map keyed by tenant_id. The registry DB is only accessed during tenant resolution — after that, all queries go to the tenant DB.' },
      { type: 'h2', text: 'Registry DB' },
      { type: 'p',  text: 'The is_registry DB knows only about tenants as billing units. It holds: tenant slug, PG connection string, subscription tier, feature flags, and creation date. It has no knowledge of companies, branches, employees, or any business data.' },
      { type: 'callout', variant: 'info', title: 'Data residency',
        text: 'For cloud deployments, all tenant databases are in AWS ap-southeast-3 (Jakarta) or GCP asia-southeast2. This eliminates data residency risk under UU PDP No. 27/2022.' },
      { type: 'h2', text: 'On-premise deployments' },
      { type: 'p',  text: 'For on-premise customers, both the registry and tenant databases run on the customer\'s own infrastructure. Kamal manages the deployment and keeps the same topology. The customer provides the domain; IS provides the Docker images and Kamal configuration.' },
    ],
  },

  // ─── Platform Core (module page) ─────────────────────────────────────────
  {
    id: 'platform-core',
    title: 'Platform Core',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-PLAT',
    milestone: 'v1.0',
    intro: 'The foundational layer that every module builds on. Provides 9 primitives: organization structure, event bus, tool registry, audit log, schema extensibility, workflow engine, real-time layer, permission fabric, and data lineage. Built before any domain module.',
    blocks: [
      { type: 'callout', variant: 'warning', title: 'Build first',
        text: 'Platform Core has no external dependency and no visible UI until modules are built on top of it. It must be complete and stable before any domain module development starts.' },
      { type: 'h2', text: 'Build sub-order within Platform Core' },
      { type: 'ul', items: [
        '1. Organization Structure (IS-PLAT-ORG) — company_id + branch_id context everything depends on',
        '2. Permission Fabric (IS-PLAT-PERM) — enforces all access before any handler runs',
        '3. Tool Registry (IS-PLAT-TOOL) — the executor pipeline',
        '4. Event Bus + Outbox (IS-PLAT-EVT) — async event emission after every tool call',
        '5. Audit Log (IS-PLAT-AUD) — consumes events, writes immutable log',
        '6. Real-time Layer (IS-PLAT-RT) — consumes events, pushes to WS/SSE clients',
        '7. Schema Extensibility (IS-PLAT-SCH) — custom fields + LLM Field Builder',
        '8. Analytics Layer (IS-PLAT-VIZ) — widget engine, module home canvas, global home',
        '9. Connector Framework (IS-PLAT-CON) — webhook engine, job queue, connector SDK',
        '10. Data Lineage & Privacy (IS-PLAT-DLP) — PII catalog, consent, DSAR',
      ]},
      { type: 'h2', text: 'Feature codes' },
      { type: 'table',
        headers: ['App', 'Code prefix', 'Key features'],
        rows: [
          ['Organization Structure', 'IS-PLAT-ORG',  'Org hierarchy, company profile (NPWP/NIB), branches, request context stamping'],
          ['Event Bus',             'IS-PLAT-EVT',  'Outbox pattern, fan-out workers, event schema registry'],
          ['Tool Registry',         'IS-PLAT-TOOL', 'Tool definitions manifest, executor, TypeScript SDK for modules'],
          ['Audit Log',             'IS-PLAT-AUD',  'Audit writer, query API, UI for admins/compliance'],
          ['Schema Extensibility',  'IS-PLAT-SCH',  'Custom fields (JSONB), schema-driven forms, custom views, LLM Field Builder'],
          ['Workflow Engine',       'IS-WF',        'Approval flows (PO, leave, expense), scheduled automation, human gates'],
          ['Real-time Layer',       'IS-PLAT-RT',   'WS/SSE hub, presence tracking, in-app notification bell'],
          ['Permission Fabric',     'IS-PLAT-PERM', 'Non-human subjects, record-level security, permission audit'],
          ['Analytics Layer',       'IS-PLAT-VIZ',  'Widget runtime (ECharts), aggregate tools API, module home canvas, report scheduler'],
          ['Connector Framework',   'IS-PLAT-CON',  'Connector SDK, webhook engine (HMAC, retry), job queue'],
          ['Data Lineage',          'IS-PLAT-DLP',  'PII catalog, consent records, retention worker, DSAR export'],
        ],
      },
    ],
  },

  // ─── Authentication ───────────────────────────────────────────────────────
  {
    id: 'authentication',
    title: 'Authentication',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-AUTH',
    milestone: 'v1.0',
    intro: 'Identity and access management for all users and organisations. Self-built with better-auth — no third-party auth vendor. Phase 1 covers email/password + TOTP MFA + RBAC. Phase 2 adds passkeys and SAML SSO.',
    blocks: [
      { type: 'h2', text: 'Phase 1 (v1.0)' },
      { type: 'ul', items: [
        'Email + password (bcrypt, minimum 12 characters)',
        'TOTP / Authenticator app MFA — Google Authenticator, Authy. Code: IS-AUTH-002',
        'RBAC — roles, groups, module-level and record-level permissions per company. Code: IS-AUTH-005',
        'Session management — concurrent sessions, forced logout, remember-me. Code: IS-AUTH-001',
        'Auth audit log — immutable per-user login/permission event log. Code: IS-AUTH-006',
      ]},
      { type: 'h2', text: 'Phase 2 (v2.0)' },
      { type: 'ul', items: [
        'Passkeys / WebAuthn (FIDO2) — IS-AUTH-003',
        'SAML 2.0 / OIDC SSO — Google Workspace, Azure AD / Entra ID, Okta — IS-AUTH-004',
        'API keys + OAuth 2.0 for third-party integrations — IS-AUTH-007',
      ]},
      { type: 'callout', variant: 'warning', title: 'No SMS OTP',
        text: 'SMS OTP is a security anti-pattern (SIM swap attacks). Indonesia System uses TOTP (Phase 1) and passkeys (Phase 2) as MFA strategies. No Fazpass or similar SMS gateway is needed.' },
      { type: 'h2', text: 'Why self-built?' },
      { type: 'p',  text: 'Auth0, Clerk, and similar services are priced per MAU — a flat-fee SaaS with unlimited users cannot afford per-user auth billing. better-auth provides the same feature set (TOTP, sessions, RBAC, passkeys, SAML) with no per-user cost, full control over session storage, and no foreign data residency issue under UU PDP.' },
      { type: 'h2', text: 'Integration with Platform Core' },
      { type: 'ul', items: [
        'Every login event is emitted to the Event Bus and written to the Audit Log.',
        'Roles and permissions are enforced by the Permission Fabric at the Tool Registry layer — Auth module provides the identity; Permission Fabric does the enforcement.',
        'Session tokens carry company_id and branch_id for Tool Registry context stamping.',
      ]},
    ],
  },

  // ─── HR & Employees ───────────────────────────────────────────────────────
  {
    id: 'hr',
    title: 'HR & Employees',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-HR',
    milestone: 'v1.0',
    intro: 'The first user-visible module. Covers employee records, NIK verification via PrivyID, org chart, payroll basics, and BPJS compliance. The foundation every other module references when it needs to know "who is this person?"',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Employee records with full Indonesian field set: NIK, NPWP pribadi, BPJS numbers, bank account (validated before payroll disbursement)',
        'NIK verification via PrivyID API — returns match/no-match without storing raw ID card data',
        'Org chart with dynamic hierarchy from company/branch/department structure',
        'Leave management: leave types, balance tracking, leave request → Workflow Engine approval',
        'Payroll basics: salary components, PPh 21 calculation, BPJS Ketenagakerjaan + Kesehatan deductions',
        'Employee self-service: view payslip, submit leave, update contact info',
        'Audit trail on every employee record change — who changed what and when',
      ]},
      { type: 'h2', text: 'Indonesian context' },
      { type: 'table',
        headers: ['Requirement', 'How IS handles it'],
        rows: [
          ['NIK verification',           'PrivyID API — avoids direct Dukcapil (requires OJK license)'],
          ['BPJS Ketenagakerjaan',        'Auto-calculate JKK, JKM, JHT, JP contributions; report via BPJS API (PKS required)'],
          ['BPJS Kesehatan',              'Auto-calculate employee + employer portions; report via BPJS Kesehatan API'],
          ['PPh 21',                      'Monthly withholding calculation per TER (Tarif Efektif Rata-rata) method'],
          ['e-Meterai on employment docs', 'Peruri API for contracts > IDR 5 million'],
        ],
      },
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Platform Core — all employee records carry company_id + branch_id; field changes emit events; every tool call is audited',
        'Authentication — employee records are linked to user accounts; login identity ≠ employee record (a user may have access to multiple companies)',
        'PrivyID connector — Connector Framework registers the PrivyID tool',
        'Workflow Engine — leave and payroll approvals',
      ]},
    ],
  },

  // ─── Finance ─────────────────────────────────────────────────────────────
  {
    id: 'finance',
    title: 'Finance — Accounting',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-FIN',
    milestone: 'v1.0',
    intro: 'Double-entry accounting, AR/AP management, QRIS invoicing, and CoreTax DJP compliance. The financial backbone of the entire platform — unlocks QRIS invoicing, payroll disbursement validation, and procurement cost tracking.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Chart of Accounts (COA) per company — Indonesia standard account categories; importable from existing systems',
        'Journal entries — double-entry, multi-currency, attachment support',
        'Accounts Receivable: invoice creation, QRIS QR generation (Xendit MPM, IDR 10M cap), payment matching',
        'Accounts Payable: vendor bills, payment scheduling, BI-FAST for large B2B transfers',
        'Bank reconciliation: import bank statements, auto-match against AR/AP transactions',
        'e-Faktur via Pajakku/PajakExpress PJAP API — auto-generate on every taxable sale',
        'e-Meterai on invoices > IDR 5 million — Peruri API',
        'Financial reports: P&L, balance sheet, cash flow; all filterable by company and branch',
      ]},
      { type: 'h2', text: 'Indonesian tax compliance' },
      { type: 'table',
        headers: ['Tax type', 'Integration', 'Notes'],
        rows: [
          ['e-Faktur',          'Pajakku / PajakExpress',  'Auto-generated on taxable invoices for PKP companies'],
          ['e-Bupot Unifikasi', 'Pajakku / PajakExpress',  'Withholding tax reporting (PPh 23, PPh 4(2))'],
          ['e-Billing',         'Pajakku / PajakExpress',  'Tax payment voucher generation'],
          ['SPT Tahunan',        'Manual DJP portal (v1.0)', 'No direct API yet — checklist-driven prep in Compliance module (Phase 2)'],
        ],
      },
      { type: 'h2', text: 'QRIS payments' },
      { type: 'p',  text: 'Each AR invoice generates a Dynamic QRIS QR code (MPM format) via Xendit or DOKU. The customer scans with any Indonesian bank app or e-wallet. Payment confirmation triggers automatic invoice status update and AR journal entry via the Event Bus. No Bank Indonesia PJP license required — IS operates under Xendit/DOKU\'s license.' },
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Platform Core — COA is per company_id; every transaction emits a financial event; Analytics Layer drives the Finance home dashboard (AR aging, cash position, P&L trend)',
        'Workflow Engine — invoice approval, payment approval above threshold',
        'Pajakku connector and Xendit connector — both registered via Connector Framework',
      ]},
    ],
  },

  // ─── Workflow Engine ──────────────────────────────────────────────────────
  {
    id: 'workflow',
    title: 'Workflow Engine',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-WF',
    milestone: 'v1.0',
    intro: 'First-class versioned automation. Trigger → condition → steps → outcome. Required in Phase 1 because PO approvals, leave requests, and expense reimbursements cannot ship without it.',
    blocks: [
      { type: 'callout', variant: 'info', title: 'Moved from Phase 2 to Phase 1',
        text: 'The Workflow Engine was originally planned for Phase 2. It was moved to Phase 1 because approval flows (PO approval, leave, expense) are required in the first release across Finance, HR, and Procurement.' },
      { type: 'h2', text: 'Trigger types' },
      { type: 'ul', items: [
        'Domain event (e.g. procurement.po.submitted) — most common; fires when any tool emits the watched event type',
        'Schedule (cron) — recurring automations; e.g. "generate monthly payroll on the 25th"',
        'Manual — user-initiated from any record detail view',
        'API call — external system starts a workflow via the REST API',
        'AI agent (Phase 2+) — agent decides to start a workflow as part of a larger task',
      ]},
      { type: 'h2', text: 'Step types' },
      { type: 'ul', items: [
        'Tool Registry call — execute any registered tool on behalf of a workflow actor subject',
        'Condition branch — if/else branching based on record field values or previous step output',
        'Wait-for-event — pause the run until a specific domain event arrives (e.g. payment.received)',
        'Human approval gate — send approval request to a user or role group; timeout handling included',
        'Sub-workflow — compose complex flows from smaller reusable workflows',
        'Loop — iterate over a list of records, running steps for each',
      ]},
      { type: 'h2', text: 'Key design decisions' },
      { type: 'ul', items: [
        'Workflows are first-class versioned objects — not config stored in random tables. Version history is preserved.',
        'Each run is stored as a state machine with full step history — resumable after crash, server restart, or timeout.',
        'Workflow actors are non-human Permission Fabric subjects — they call Tool Registry tools with scoped tokens, full audit trail.',
        'No vendor lock-in — pure Postgres-backed state machine; no SQS, no Step Functions, no Temporal (for v1.0).',
      ]},
    ],
  },

  // ─── Procurement ─────────────────────────────────────────────────────────
  {
    id: 'procurement',
    title: 'Procurement',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-PROC',
    milestone: 'v1.0',
    intro: 'End-to-end purchase order management with multi-step approval, vendor management, and Finance integration for 3-way matching (PO → receipt → invoice).',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Purchase Request → Purchase Order flow with configurable approval rules',
        'Vendor directory with NPWP validation and bank account verification',
        'PO approval via Workflow Engine — amount-based escalation (e.g. >IDR 50M requires CFO sign-off)',
        'Goods receipt recording against PO line items',
        '3-way matching: PO ↔ goods receipt ↔ vendor invoice — auto-flags discrepancies',
        'AP integration — matched vendor invoices flow directly into Accounts Payable',
        'Spend analytics — by vendor, category, department, and branch on the Procurement home canvas',
      ]},
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Finance — every matched invoice creates an AP liability journal entry automatically',
        'Workflow Engine — PO approval workflow is the primary use case that justified moving Workflow to Phase 1',
        'HR — requestor identity, department, and cost center come from the employee record',
        'Inventory — received goods update stock levels when Inventory module is active',
      ]},
    ],
  },

  // ─── Sales ────────────────────────────────────────────────────────────────
  {
    id: 'sales',
    title: 'Sales',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-SALES',
    milestone: 'v1.0',
    intro: 'Quotation to sales order with Finance integration. Customer records, pricing, discount rules, and QRIS-linked invoicing.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Customer directory with NPWP validation for B2B customers',
        'Quotation builder — line items, tax calculation, e-Meterai if applicable',
        'Quotation → Sales Order with approval workflow for large deals',
        'Sales Order → AR Invoice with automatic e-Faktur generation (for PKP)',
        'QRIS QR on every invoice — customer pays directly from the invoice PDF or IS portal',
        'Revenue reports — by product, salesperson, customer, and branch',
      ]},
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Finance — sales orders generate AR invoices; payment receipt is reconciled in AR',
        'CRM — sales pipeline opportunities link to quotations',
        'Inventory — confirmed sales orders trigger stock reservation',
      ]},
    ],
  },

  // ─── CRM ─────────────────────────────────────────────────────────────────
  {
    id: 'crm',
    title: 'CRM',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-CRM',
    milestone: 'v1.0',
    intro: 'Sales pipeline management, lead tracking, and customer activity history. Tightly integrated with Sales — opportunities convert directly to quotations.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Lead and opportunity pipeline with configurable stages per company',
        'Activity log — calls, emails, meetings, notes — linked to each opportunity',
        'Contact and company records with deduplication',
        'Pipeline dashboard — conversion funnel, deal value by stage, expected close',
        'Opportunity → Quotation conversion (one click, data flows to Sales module)',
        'Sales team assignment and territory management',
      ]},
    ],
  },

  // ─── Inventory ───────────────────────────────────────────────────────────
  {
    id: 'inventory',
    title: 'Inventory',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-INV',
    milestone: 'v1.0',
    intro: 'Multi-warehouse stock management with lot/serial tracking, stock valuation, and bi-directional integration with Procurement and Sales.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Product catalogue with unit of measure, variants, and barcode',
        'Multi-warehouse and multi-location stock with branch-level isolation',
        'Stock movements: receipts (from PO), deliveries (from SO), internal transfers, adjustments',
        'Lot and serial number tracking for traceability',
        'FIFO / average cost stock valuation — journal entries auto-posted to Finance',
        'Reorder rules — auto-generate purchase requests when stock hits minimum',
        'Stock take (opname) workflow with approval',
      ]},
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Finance — stock valuation movements create journal entries automatically',
        'Procurement — received goods from PO receipts enter stock',
        'Sales — confirmed sales orders reserve and consume stock',
      ]},
    ],
  },

  // ─── Projects ────────────────────────────────────────────────────────────
  {
    id: 'projects',
    title: 'Projects',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-PROJ',
    milestone: 'v1.0',
    intro: 'Project and task tracking with time logging, milestone management, and Finance integration for project-based billing.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Project hierarchy: project → milestone → task → sub-task',
        'Kanban and list views; Gantt-style timeline view',
        'Time logging — employees log hours against tasks; feeds payroll and project billing',
        'Project budget vs. actuals tracking linked to Finance module',
        'Project-based invoice generation — bill customers by milestone or time & materials',
        'Resource allocation view — who is working on what across all projects',
      ]},
    ],
  },

  // ─── Documents ───────────────────────────────────────────────────────────
  {
    id: 'documents',
    title: 'Documents',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-DOCS-STORE',
    milestone: 'v1.0',
    intro: 'Centralized file storage with folder hierarchy, tagging, version history, and e-sign integration via PrivyID.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Folder hierarchy per company with granular access control',
        'File versioning — every upload is a new version; previous versions retained',
        'Tagging and search across document metadata and filenames',
        'Linked documents — attach files to any record (employee, invoice, contract, PO)',
        'e-Sign via PrivyID — TTE Tersertifikasi for legally binding documents',
        'e-Meterai via Peruri — for contracts and documents exceeding IDR 5 million value',
      ]},
      { type: 'callout', variant: 'info', title: 'e-Sign compliance',
        text: 'Indonesia System does not become a PSrE (Penyelenggara Sertifikasi Elektronik). It integrates with PrivyID (for TTE Tersertifikasi e-sign) and Peruri (for e-Meterai). This is the correct approach — becoming a PSrE requires BSSN accreditation.' },
    ],
  },

  // ─── Chat ────────────────────────────────────────────────────────────────
  {
    id: 'chat',
    title: 'Chat',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-CHAT',
    milestone: 'v1.0',
    intro: 'Internal messaging for teams and companies. Channels, direct messages, file sharing, and context-linked threads on any IS record.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Channels: public and private, per-company and per-project',
        'Direct messages — 1:1 and group DMs',
        'File sharing — files stored in the Documents module, shared in chat',
        'Record threads — comment directly on an invoice, PO, employee record, or task; thread appears both in chat and on the record',
        'Mentions and notifications — @user or @role; routed to the Real-time Layer notification bell',
        'Message search across all channels the user has access to',
      ]},
      { type: 'h2', text: 'Relation to Conversational (Phase 2)' },
      { type: 'p', text: 'Chat is internal-only (employees within a tenant). The Conversational module (Phase 2) adds external WhatsApp Business integration — customers and vendors can interact with IS workflows via WhatsApp without accessing the IS web app.' },
    ],
  },

  // ─── Mobile PWA ──────────────────────────────────────────────────────────
  {
    id: 'mobile-pwa',
    title: 'Mobile PWA',
    breadcrumb: 'Phase 1 — Foundation',
    phase: 1,
    code: 'IS-MOB',
    milestone: 'v1.0',
    intro: 'Progressive Web App layer for field and mobile access. Offline-capable, push notifications, camera and GPS. No native app store submission required.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Installable to home screen on Android and iOS via browser install prompt',
        'Offline mode — IndexedDB cache of recent records; mutations queued offline; sync on reconnect via Event Bus',
        'Push notifications — Web Push API; users opt-in per notification category; powered by Real-time Layer',
        'Camera — capture expense receipts, scan QR codes, photograph delivery items',
        'GPS — geo-tag field activities (attendance check-in, delivery confirmation)',
      ]},
      { type: 'h2', text: 'Why PWA, not native?' },
      { type: 'ul', items: [
        'One codebase — React 19 + Vite SPA is the same app; PWA is a shell wrapper',
        'No App Store / Play Store approval process — critical for on-premise customers who cannot use public app stores',
        'Over-the-air updates — app updates as soon as users refresh, no store approval wait',
        'Offline capability via IndexedDB is sufficient for the field use cases (receipt capture, delivery confirmation, leave submission)',
      ]},
      { type: 'callout', variant: 'tip', title: 'QRIS expense capture',
        text: 'The Camera + GPS combination in Mobile PWA enables the Phase 2 QRIS Expense flow: employee snaps a receipt → OCR + LLM extracts merchant, amount, date → pre-fills an Expense record for approval. No separate mobile app needed.' },
    ],
  },

  // ─── Changelog ────────────────────────────────────────────────────────────
  {
    id: 'changelog',
    title: 'Changelog',
    intro: 'A record of all significant roadmap and documentation updates.',
    blocks: [
      { type: 'h2', text: 'v0.8 — 6 Mei 2026' },
      { type: 'ul', items: [
        'Analytics Layer added to Platform Core (IS-PLAT-VIZ): widget runtime (Apache ECharts), aggregate tools API, inline summary bar, module home canvas, global home dashboard, report scheduler',
        'Widget Composer and Cross-Module Report Builder added to Studio (Phase 3)',
      ]},
      { type: 'h2', text: 'v0.7 — 5 Mei 2026' },
      { type: 'ul', items: [
        'LLM Field Builder added to Schema Extensibility (IS-PLAT-SCH-004)',
        'Model Builder, App Builder, and AI Config Assistant added to Studio (Phase 3)',
        'Industry Templates module added (IS-IND, Phase 3): Healthcare, Hospitality, Education, Construction, Retail',
      ]},
      { type: 'h2', text: 'v0.6 — 5 Mei 2026' },
      { type: 'ul', items: [
        'Organization Structure added to Platform Core (IS-PLAT-ORG): org hierarchy (organizations → companies → branches), company profile (NPWP/NIB), branch/business unit, request context stamping',
        'Build order updated: Organization Structure is the first app within Platform Core',
      ]},
      { type: 'h2', text: 'v0.5 — 4 Mei 2026' },
      { type: 'ul', items: [
        'Platform Core module added (IS-PLAT, Phase 1) with 8 foundational primitives: Event Bus + Outbox, Tool Registry, Audit Log, Schema Extensibility, Real-time Layer, Permission Fabric, Data Lineage & Privacy, Connector Framework',
        'Workflow Engine moved from Phase 2 to Phase 1 — required for v1.0 approval flows',
        'Mobile PWA module added (IS-MOB, Phase 1)',
        'Conversational module added (IS-CONV, Phase 2): WhatsApp Business approvals + NL agent',
        'Compliance Automation module added (IS-COMP, Phase 2): DPO dashboard, breach detection, tax calendar',
        'Marketplace module added (IS-MKT, Phase 3): Plugin SDK + App Store',
        'PRODUCT_CLAUDE.md created — full product context document for the IS product repo',
        'features.json → 432 nodes',
      ]},
      { type: 'h2', text: 'v0.4 — 3 Mei 2026' },
      { type: 'ul', items: [
        'Map view with expand/collapse hierarchy (SVG, radial layout, pan/zoom)',
        'Authentication module (IS-AUTH, Phase 1): login, TOTP MFA, passkeys, SAML SSO, RBAC, audit log, API keys',
        'Documentation module (IS-DOCS, Phase 2)',
        'e-Learning module (IS-EL, Phase 3)',
        'IS-* feature codes and milestone badges added to all nodes',
        'Search and filter bar in list view',
      ]},
    ],
  },
]

// ─── Concepts index ────────────────────────────────────────────────────────
const CONCEPTS_INDEX: DocPage = {
  id: 'concepts',
  title: 'Concepts',
  intro: 'The foundational ideas behind Indonesia System — how data is structured, how actions are executed, and how everything connects.',
  blocks: [
    { type: 'h2', text: 'Start here' },
    { type: 'p',  text: 'These concept pages explain the "why" behind the architecture. They are written for developers and technical leads who want to understand the system before building on it. Product managers and end users can skip straight to the module pages.' },
    { type: 'table',
      headers: ['Concept', 'What you will learn'],
      rows: [
        ['Architecture overview',    'The core mental model and tech stack'],
        ['Tenant hierarchy',         'Platform → Tenant → Org → Company → Branch → Model → Record'],
        ['Platform Core',            'The 9 foundational primitives every module builds on'],
        ['Tool Registry & Events',   'How actions are executed and events fan out'],
        ['Schema extensibility',     'Kernel fields + JSONB overlay + LLM Field Builder'],
        ['Permissions & subjects',   'RBAC + ABAC, non-human subjects, record-level security'],
        ['Multi-tenancy',            'One database per tenant, registry DB, data residency'],
      ],
    },
    { type: 'callout', variant: 'tip', title: 'Ask Claude',
      text: 'The Ask Claude panel on the right has full access to all architecture decisions and the feature list. For quick answers, try: "How does the Tool Registry work?" or "Explain the event envelope."' },
  ],
}

// ─── Phase 2 modules ────────────────────────────────────────────────────────
const PHASE2_PAGES: DocPage[] = [
  {
    id: 'conversational',
    title: 'Conversational',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-CONV',
    milestone: 'v2.0',
    intro: 'WhatsApp Business and chat-based access to Indonesia System. Employees approve invoices, check leave balances, and submit expenses via WhatsApp — powered by an AI agent calling the same Tool Registry used by the web app.',
    blocks: [
      { type: 'h2', text: 'WhatsApp Integration (IS-CONV-WA)' },
      { type: 'ul', items: [
        'WhatsApp Business Cloud API — inbound message routing to IS workflow handlers',
        'Approval via WhatsApp — PO, leave, expense approval requests delivered as WhatsApp messages; reply "Setuju" or "Tolak"; routed through Tool Registry with full audit trail',
        'Proactive alerts — invoice due, payroll processed, low stock — pushed to WhatsApp based on user notification preferences',
        'No new login required — phone number is linked to the IS user account at setup',
      ]},
      { type: 'h2', text: 'Conversational Agent (IS-CONV-AGT)' },
      { type: 'ul', items: [
        'Natural-language interface via WhatsApp or the IS web chat panel',
        'NL data queries in Bahasa Indonesia or English — "Berapa sisa cuti saya?" → reads from Tool Registry with permission check',
        'NL action execution — confirm-before-execute: agent describes what it will do, user confirms, Tool Registry executes with full audit entry',
        'Agent identity is a non-human Permission Fabric subject — scoped tokens, audited separately from human actors',
      ]},
      { type: 'callout', variant: 'info', title: 'WhatsApp Business requirement',
        text: 'WhatsApp Business Cloud API requires a verified Meta Business Account and a dedicated phone number. Approval time is typically 1–2 weeks. This is why Conversational is Phase 2 — the approval process cannot start until the product is publicly launched.' },
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Tool Registry — every NL action goes through the same tools as the web UI; permissions enforced identically',
        'Workflow Engine — approval requests are workflow steps with human approval gates',
        'AI Platform (Phase 2) — the NL → tool call translation layer',
        'Permission Fabric — agent subject type with minimal required scopes',
      ]},
    ],
  },
  {
    id: 'compliance-automation',
    title: 'Compliance Automation',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-COMP',
    milestone: 'v2.0',
    intro: 'Automated compliance workflows for Indonesian regulatory requirements — UU PDP data protection, CoreTax DJP filing deadlines, and BPJS contribution monitoring. Turns compliance from a manual burden into an automated background process.',
    blocks: [
      { type: 'h2', text: 'UU PDP Compliance (IS-COMP-PDP)' },
      { type: 'ul', items: [
        'DPO Dashboard — Data Protection Officer view: PII exposure map, consent coverage rate, active DSARs, upcoming retention deadlines',
        'Breach Detection — anomaly scoring on Audit Log (unusual bulk exports, off-hours access, permission escalations); triggers an incident workflow with <14 day notification SLA as required by UU PDP',
        'Consent audit — shows which processing purposes have valid consent for each data subject',
        'DSAR workflow — Data Subject Access Request handler; aggregates all personal data for a subject within the 14-day SLA',
      ]},
      { type: 'callout', variant: 'warning', title: 'UU PDP is already active',
        text: 'UU No. 27/2022 has been in effect since October 2024. Companies processing large-scale sensitive personal data (health, salary, employment) must appoint a DPO and meet all technical requirements. Sanction: up to 2% of annual revenue.' },
      { type: 'h2', text: 'Tax Compliance (IS-COMP-TAX)' },
      { type: 'ul', items: [
        'Tax calendar — automatic deadline calendar from DJP schedule; alerts 7/3/1 days before each deadline; marks completion when filed via Pajakku',
        'Filing status tracker — e-Faktur filed vs. due, e-Bupot status, e-Billing payments',
        'Compliance report — one-click posture overview: open penalties, BPJS contribution status, e-Meterai usage vs. contract value thresholds',
        'SPT Tahunan preparation checklist — guided annual tax return prep (DJP portal filing; no direct API in v2.0)',
      ]},
      { type: 'h2', text: 'Dependencies' },
      { type: 'ul', items: [
        'Platform Core Data Lineage (IS-PLAT-DLP) — PII catalog and consent records feed the DPO dashboard',
        'Audit Log — breach detection runs anomaly detection on the audit event stream',
        'Workflow Engine — breach incident and DSAR handling are structured workflows with time-boxed steps',
        'Finance (Pajakku connector) — filing status data comes from Pajakku API responses',
      ]},
    ],
  },
  {
    id: 'ai-platform',
    title: 'AI Platform',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-AI',
    milestone: 'v2.0',
    intro: 'AI agent orchestration as a thin layer on Platform Core. AI agents are not a separate system — they are Tool Registry callers with agent-type subject tokens, subscribing to Event Bus channels and executing registered tools.',
    blocks: [
      { type: 'h2', text: 'Design principle' },
      { type: 'p',  text: 'Indonesia System does not host AI models. It calls Anthropic API (Claude) or similar via the Connector Framework. The AI Platform module provides the orchestration layer — agent definitions, tool scope declarations, conversation context, and run history.' },
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Agent definitions — named agents with declared tool scopes; e.g. "Finance Analyst" can call finance.* read tools but not write tools',
        'Conversation context — multi-turn memory per session; context window management with automatic summarisation',
        'Tool calling — agents call Tool Registry tools; the same permission checks apply as for human users',
        'Run history — every agent run is logged with input, tool calls made, output, and audit trail entry',
        'Autonomous workflow steps — agents can be Workflow Engine step types; used for data extraction, classification, and drafting',
      ]},
      { type: 'h2', text: 'Indonesian context' },
      { type: 'p',  text: 'All agent prompts support Bahasa Indonesia. The default language for agent responses is set per tenant (ID or EN). The conversational agent in IS-CONV uses this platform as its execution backend.' },
      { type: 'callout', variant: 'info', title: 'Model selection',
        text: 'Default model: Claude Sonnet 4 (latest). Model is configurable per agent definition. API calls go through the Connector Framework — the connector handles retry, rate limiting, and credential rotation.' },
    ],
  },
  {
    id: 'email',
    title: 'Email',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-EMAIL',
    milestone: 'v2.0',
    intro: 'Shared team inboxes, email templates, and outbound email linked to IS records. Not a full email client — IS handles operational email (invoices, notifications, approvals) and routes incoming email to the right module.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Shared team inboxes — finance@, hr@, sales@ routed to IS with assignment and SLA tracking',
        'Outbound email templates — invoice PDFs, approval requests, payslips, contract links — branded per company',
        'Email → record linking — incoming emails auto-linked to the correct customer, vendor, or employee record',
        'Email campaign basics — announcement and newsletter sending to contact lists (for SMEs without a dedicated marketing tool)',
        'Integration: SendGrid or AWS SES for outbound delivery; IMAP for inbox sync',
      ]},
    ],
  },
  {
    id: 'meetings',
    title: 'Meetings',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-MTG',
    milestone: 'v2.0',
    intro: 'Calendar management, meeting scheduling, and video conference integration. Linked to CRM opportunities, HR leave, and project milestones.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Calendar view — personal and shared team calendars; cross-company scheduling for multi-entity groups',
        'Meeting scheduling — book meetings with internal or external attendees; auto-conflict detection',
        'Video conference — Google Meet or Zoom link generation per meeting',
        'Record linking — meetings linked to CRM opportunities, HR interviews, project reviews',
        'Meeting notes and action items — recorded in IS Chat thread linked to the meeting record',
      ]},
    ],
  },
  {
    id: 'omnichannel',
    title: 'Omnichannel',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-OC',
    milestone: 'v2.0',
    intro: 'Unified customer communication across channels — WhatsApp, email, chat widget — in one shared inbox. Every conversation is linked to a CRM contact and company record.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Unified inbox — WhatsApp Business, email, web chat widget, and Instagram DM in one queue',
        'Agent assignment — conversations assigned to team members with SLA countdown',
        'CRM integration — every conversation linked to a contact; history visible on the CRM record',
        'Canned responses — pre-approved response templates in Bahasa Indonesia and English',
        'CSAT survey — auto-sent after conversation resolution; results on the omnichannel dashboard',
        'Chatbot handoff — Conversational AI handles first-touch; escalates to human agent when confidence is low',
      ]},
    ],
  },
  {
    id: 'manufacturing',
    title: 'Manufacturing',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-MFG',
    milestone: 'v2.0',
    intro: 'Production order management, bill of materials, and work centre scheduling for light manufacturing companies.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Bill of Materials (BOM) — multi-level BOM with components, quantities, and yield factors',
        'Production orders — created from Sales Orders or manually; tracks materials consumed and output produced',
        'Work centres — define production stages with capacity and cycle time',
        'Inventory integration — material consumption automatically reduces stock; finished goods auto-added to inventory',
        'Production cost tracking — labour, material, and overhead rolled up to Finance journal entries',
        'Quality checks — configurable QC steps at production stages with pass/fail recording',
      ]},
    ],
  },
  {
    id: 'helpdesk',
    title: 'Helpdesk',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-HD',
    milestone: 'v2.0',
    intro: 'Internal IT helpdesk and external customer support ticketing. SLA management, escalation rules, and satisfaction tracking.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Ticket creation — from email, web form, WhatsApp (via Omnichannel), or manually by agents',
        'SLA policies — response and resolution time targets per ticket priority and team',
        'Escalation rules — auto-escalate overdue tickets to senior agents or managers via Workflow Engine',
        'Knowledge base integration — agents see suggested Knowledge articles while resolving tickets',
        'CSAT surveys — sent on ticket closure; rating visible on the helpdesk dashboard',
        'Internal IT helpdesk — separate queue for IT requests (access, hardware, software) separate from customer support',
      ]},
    ],
  },
  {
    id: 'knowledge',
    title: 'Knowledge Base',
    breadcrumb: 'Phase 2 — Expansion',
    phase: 2,
    code: 'IS-KN',
    milestone: 'v2.0',
    intro: 'Internal knowledge base for SOPs, policies, and how-to articles. Searchable by all employees; linked to Helpdesk for agent-assisted article suggestion.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Article editor — rich text with images, tables, code blocks, and file attachments',
        'Category hierarchy — organised by department, process, or module',
        'Version history — every edit tracked; revert to any previous version',
        'Search — full-text search across all articles; results surfaced in Helpdesk ticket view',
        'Access control — public (all employees), team-restricted, or admin-only articles',
        'AI-assisted drafting (Phase 3+) — AI Platform can draft new articles from a bullet list',
      ]},
    ],
  },
]

// ─── Phase 3 modules ────────────────────────────────────────────────────────
const PHASE3_PAGES: DocPage[] = [
  {
    id: 'marketplace',
    title: 'Marketplace',
    breadcrumb: 'Phase 3 — Scale',
    phase: 3,
    code: 'IS-MKT',
    milestone: 'v3.0',
    intro: 'Plugin SDK and App Store for third-party extensions. Developers build IS apps using the same Tool Registry, Event Bus, and schema primitives as first-party modules — and distribute them to any tenant.',
    blocks: [
      { type: 'h2', text: 'Plugin SDK (IS-MKT-SDK)' },
      { type: 'ul', items: [
        'npm package: register tools, subscribe to events, extend schemas, render UI slots',
        'Tool registration — SDK publishes named tools into the tenant Tool Registry with automatic permission scope generation',
        'Event subscription — subscribe to domain events from any module; events scoped to tenant',
        'UI slot extensions — inject React components into named layout slots (sidebar, record-detail, dashboard widget) without forking core UI',
        'Same primitives as first-party modules — plugins cannot do anything a first-party module cannot do',
      ]},
      { type: 'h2', text: 'App Store (IS-MKT-STORE)' },
      { type: 'ul', items: [
        'Browse, install, and manage third-party plugins from the tenant-admin portal',
        'Sandboxed execution — plugins run in isolated worker context; can be disabled per-tenant without restart',
        'Permission review — admin sees exactly which tool scopes a plugin requests before installing',
        'Usage-based billing — tool call counts metered via Tool Registry; revenue share disbursed to plugin authors via Xendit',
      ]},
      { type: 'h2', text: 'Industry templates pathway' },
      { type: 'p',  text: 'Industry Templates (IS-IND) are first-party plugins — IS builds and maintains them using the same Marketplace SDK. When a hospital builds a queue management system via Studio and it proves useful, IS can package it as a first-party Industry Template available to all healthcare tenants.' },
    ],
  },
  {
    id: 'studio',
    title: 'Studio',
    breadcrumb: 'Phase 3 — Scale',
    phase: 3,
    code: 'IS-STUDIO',
    milestone: 'v3.0',
    intro: 'No-code and low-code app builder. Build custom models, views, automations, and dashboards using Indonesia System primitives — without writing code. For power users and internal tooling.',
    blocks: [
      { type: 'h2', text: 'App Builder (IS-STUDIO-APP)' },
      { type: 'ul', items: [
        'Model Builder — Q&A wizard: what are you tracking, identifier, relations, lifecycle/status, approval requirement — outputs a schema definition',
        'App Builder — describe in plain language what you want to build; LLM scaffolds model + views + permissions + optional workflow; visual editor to refine',
        'AI Config Assistant — natural language → workflow draft or form schema; generates inspectable, editable artifacts (not black-box execution)',
        'Widget Composer — drag-drop dashboard builder; query picker from aggregate tools; chart type selector (bar, line, pie, heatmap, gauge, table)',
        'Cross-Module Report Builder — combine aggregate tools from multiple modules into one management dashboard; LLM-assisted layout',
      ]},
      { type: 'h2', text: 'Field Builder (available in Phase 1)' },
      { type: 'p',  text: 'The LLM Field Builder (IS-PLAT-SCH-004) ships in Phase 1 as part of Schema Extensibility — it is the earliest Studio-like capability. Users describe a field in plain language; the system generates the typed definition with PII tagging, validation, and UI hints; user confirms.' },
      { type: 'callout', variant: 'info', title: 'No-code vs. low-code',
        text: 'Studio is no-code for business users (field builder, model builder, widget composer) and low-code for developers (direct schema editing, custom tool handlers registered via Marketplace SDK). The same primitives power both.' },
    ],
  },
  {
    id: 'industry-templates',
    title: 'Industry Templates',
    breadcrumb: 'Phase 3 — Scale',
    phase: 3,
    code: 'IS-IND',
    milestone: 'v3.0',
    intro: 'Curated first-party industry packs. Pre-built models, workflows, and views for vertical markets — installable one-click per tenant. Built using the Marketplace SDK; maintained by the IS team.',
    blocks: [
      { type: 'h2', text: 'Available packs' },
      { type: 'table',
        headers: ['Pack', 'Code', 'Key capabilities'],
        rows: [
          ['Healthcare',    'IS-IND-HC',  'Queue management, BPJS Kesehatan claims, ICD-10 service codes, multi-poli scheduling, patient data PII handling'],
          ['Hospitality',   'IS-IND-HO',  'Room inventory, reservation lifecycle, F&B outlet integration, channel manager webhook receiver'],
          ['Education',     'IS-IND-ED',  'Student records, tuition billing (QRIS), academic calendar, BOS/Dana BOS budget tracking'],
          ['Construction',  'IS-IND-CON', 'RAB (Rencana Anggaran Biaya), equipment tracking, sub-contractor payments, progress billing (termin)'],
          ['Retail',        'IS-IND-RT',  'POS integration, loyalty program, SKU promotions, Shopee/Tokopedia connector via Marketplace SDK'],
        ],
      },
      { type: 'h2', text: 'From tenant-specific to shared' },
      { type: 'p',  text: 'The intended pathway: a tenant builds a custom app via Studio → it proves useful → IS extracts it into a curated Industry Template with proper Indonesian regulatory fields baked in → all new tenants in that vertical get it as a one-click install. This is how the Healthcare queue system example becomes a shareable BPJS Kesehatan-integrated template.' },
      { type: 'h2', text: 'Ownership and updates' },
      { type: 'p',  text: 'Industry Templates are first-party — IS owns the code and maintains compatibility with platform updates. Third-party industry packs go through the Marketplace. A tenant can fork a template via Studio and customise it; their fork is tenant-private and not eligible for Marketplace listing without a separate submission.' },
    ],
  },
  {
    id: 'ai-marketing',
    title: 'AI Marketing',
    breadcrumb: 'Phase 3 — Scale',
    phase: 3,
    code: 'IS-AM',
    milestone: 'v3.0',
    intro: 'AI-native marketing tools for Indonesian SMEs — campaign generation, customer segmentation from CRM data, WhatsApp broadcast integration, and performance analytics.',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'AI copywriting — generate marketing copy in Bahasa Indonesia and English from a brief; tone and brand voice configurable per company',
        'Customer segmentation — AI segments CRM contacts by purchase history, industry, location, and engagement score',
        'WhatsApp broadcast — send approved marketing messages to opted-in contacts via WhatsApp Business; tracks delivery and read rates',
        'Email campaign analytics — open rate, click rate, and conversion linked back to CRM opportunities',
        'ROAS dashboard — marketing spend vs. revenue from Sales module; by channel and campaign',
      ]},
      { type: 'callout', variant: 'warning', title: 'WhatsApp broadcast compliance',
        text: 'WhatsApp marketing messages require opt-in consent from recipients. IS enforces consent status from the CRM contact record — contacts without valid marketing consent are automatically excluded from broadcasts.' },
    ],
  },
  {
    id: 'ecommerce',
    title: 'E-Commerce',
    breadcrumb: 'Phase 3 — Scale',
    phase: 3,
    code: 'IS-EC',
    milestone: 'v3.0',
    intro: 'B2B and B2C online store with QRIS checkout, inventory integration, and marketplace channel connectors (Tokopedia, Shopee, Lazada).',
    blocks: [
      { type: 'h2', text: 'Key features' },
      { type: 'ul', items: [
        'Storefront — hosted product catalogue with category pages, search, and product detail pages',
        'QRIS checkout — Dynamic QRIS QR at checkout; payment via Xendit/DOKU; auto-reconciled to AR',
        'Inventory sync — stock levels from IS Inventory module reflected in real time on the storefront',
        'Marketplace connectors — Tokopedia, Shopee, Lazada order import; inventory updated bidirectionally',
        'B2B portal — customers log in to see their custom pricing and credit terms; order history from CRM',
        'Fulfilment — pick-pack-ship workflow linked to Inventory deliveries; tracking number pushed back to order',
      ]},
    ],
  },
]

export const DOCS_MAP: Record<string, DocPage> = Object.fromEntries(
  [...PAGES, CONCEPTS_INDEX, ...PHASE2_PAGES, ...PHASE3_PAGES].map(p => [p.id, p])
)
