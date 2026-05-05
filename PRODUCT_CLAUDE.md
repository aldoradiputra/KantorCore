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

### PSrE / E-Sign
- Do NOT become a PSrE — partner with PrivyID and Peruri
- Certified TTE (TTE Tersertifikasi) required for legally binding documents

---

## Phase 1 — v1.0 Modules (Build Order)

Build order is dependency-driven:

1. **Authentication** (IS-AUTH) — foundational, nothing works without it
2. **HR & Employees** (IS-HR) — first visible value; covers NIK onboarding via PrivyID, employee records, org chart
3. **Finance — Accounting** (IS-FIN) — COA, journal entries, AR/AP; unlocks QRIS invoicing
4. **Procurement** (IS-PROC) — PO flow; depends on Finance
5. **Sales & CRM** (IS-SALES, IS-CRM) — pipeline, quotations, SO; depends on Finance
6. **Inventory** (IS-INV) — stock management; depends on Procurement + Sales
7. **Projects** (IS-PROJ) — project tracking; relatively standalone
8. **Documents** (IS-DOCS-STORE) — file storage; relatively standalone
9. **Chat / Messaging** (IS-CHAT) — internal comms; standalone

All Phase 1 modules ship in v1.0. Timeline target: 12 months to v1.0.

---

## Feature Code Reference

All features follow the IS-{MODULE}-{APP}-{SEQ} format, defined in the public roadmap (`is-roadmap` repo, `data/features.json`). Use these codes in commit messages, PR titles, and issue references.

Examples:
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

## What NOT to build (avoid redundancy with ecosystem)

| Area | Don't build | Use instead |
|---|---|---|
| NIK chip reading | ❌ Private NFC chip read not supported | PrivyID OCR + verification API |
| IKD QR scan | ❌ Blocked for private apps | Wait for Dukcapil SDK (2026+) |
| QRIS infrastructure | ❌ Requires BI PJP license | Xendit / DOKU as acquirer |
| Payment rail | ❌ Requires BI licensing | BI-FAST via bank API or Xendit |
| CA / certificate authority | ❌ PSRE requires BSSN accreditation | PrivyID (e-sign), Peruri (e-Meterai) |
| SMS OTP | ❌ Security anti-pattern | TOTP / passkeys instead |
| Tax engine (core) | ❌ DJP handles rules | Pajakku/PajakExpress API for filing |

---

## Sister Products (same PT entity, separate repos)

- **is-roadmap** — Public product roadmap (this planning tool, Vercel)
- **Supapark** — (separate product, separate repo)
- **Jurna** — (separate product, separate repo)
