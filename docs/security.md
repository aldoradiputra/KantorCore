# KantorCore — Security Architecture

> Version 0.1 · Phase 16 · May 2026
> Owner: platform team

This doc records the tenant-isolation and audit model after Phase 16. It also
calls out the gaps we knowingly carry, so an enterprise procurement review
can see exactly where we stand.

---

## 1. Tenancy model

Single shared Postgres cluster, schema-scoped per module (`chat`, `proj`,
`agent`, `platform`). Every tenant-scoped table carries a `tenant_id uuid`
foreign key to `platform.tenants`, plus an index.

`platform.tenants` has a `db_mode` enum (`shared` | `dedicated`) and a nullable
`db_url`. Dedicated-DB routing is **planned** but not yet implemented — every
tenant today is in the shared cluster.

## 2. Defense in depth

Three layers, in order of evaluation:

1. **Session/auth layer** — `requireAuthedContext()` resolves the caller's
   tenant from the session cookie. No tenant context = 401.
2. **App-layer filter** — every Drizzle query against a tenant-scoped table
   carries `where tenant_id = ctx.tenant.id`. A missing filter is a code
   bug; CI's review surface should catch it but we don't yet have a lint
   rule.
3. **Postgres RLS** — migration `0008_rls_tenant_isolation.sql` enables
   `ROW LEVEL SECURITY` with `FORCE` on every tenant-scoped table. The
   policy compares `tenant_id` against the session-level GUC `app.tenant_id`,
   set per-request via `SET LOCAL` inside the request's transaction. If
   layer 2 forgets the filter, RLS still returns 0 rows.

Tables with RLS enabled:

- `chat.channels`, `chat.messages`
- `proj.projects`, `proj.issues`
- `agent.tools`, `agent.agents`, `agent.mandates`, `agent.runs`
- `platform.memberships`, `platform.invites`

Tables intentionally NOT under RLS:

- `platform.tenants` — tenant routing table; reads must work across tenants
- `platform.users` — identity, can span tenants
- `platform.sessions` — keyed by token, not tenant
- `platform.audit_log` — write-path always carries explicit `tenant_id`

## 3. Request-scoped context

The app uses three helpers in `apps/web/lib/db.ts`:

| Helper | Sets | Use case |
|---|---|---|
| `withTenant(tenantId, fn)` | `app.tenant_id` | Default for tenant-scoped work |
| `withUser(userId, fn)` | `app.user_id` | Auth handshake, resolving the user's tenants |
| `withInviteToken(token, fn)` | `app.invite_token` | Unauthenticated invite read |

Two special policies in the migration:

- `platform.memberships` accepts `tenant_id = app.tenant_id` **OR** `user_id = app.user_id`
- `platform.invites` accepts `tenant_id = app.tenant_id` **OR** `token = app.invite_token`

This is the only place RLS deviates from "tenant_id alone". Both alternates
exist because the request that needs them hasn't established a tenant context
yet. `WITH CHECK` (writes) still always requires `app.tenant_id`.

## 4. Audit log

`platform.audit_log` is append-only. Schema: `(id, tenant_id, actor_user_id,
action, resource_type, resource_id, payload jsonb, ip, user_agent, created_at)`.

Currently wired:

- `agent.create`
- `agent.mandate_grant` / `agent.mandate_revoke`
- `member.invite_create` / `member.invite_accept`

To extend: call `recordAudit({...})` from `apps/web/lib/audit.ts` at the
write site. Reads are admin-only and will land at `/settings/audit` in a
follow-up phase.

Failures to write are logged to stderr but do not block the user action.
Acceptable trade-off until we ship the durable audit queue.

## 5. Verifying isolation

Run the smoke test against a dev database:

```bash
cd apps/web && pnpm exec tsx scripts/test-rls.ts
```

It plants two throwaway tenants, asserts:

1. tenant A's request context returns only A's rows
2. no-context queries return 0 rows
3. INSERT for tenant B from A's context is rejected by `WITH CHECK`

Exits 1 on any failure.

## 6. Comparison vs Creatio (database-per-tenant)

| Property | KantorCore today | Creatio |
|---|---|---|
| DB isolation | Shared DB + RLS | One DB per tenant |
| Cross-tenant analytics | Trivial (`tenant_id` group-by) | Cross-DB join required |
| Onboarding cost | Single row insert | Provision new DB |
| Per-tenant tuning | None | Per-DB indexes, vacuum schedules |
| Blast radius of bug | Cross-tenant possible if all 3 layers fail | Limited to one DB |
| Encryption at rest | Cluster-wide (provider) | Cluster-wide (provider) |

Our `tenants.db_mode = 'dedicated'` path is architecturally reserved for the
Penuh (enterprise) tier. Implementation is **deferred to Phase 17+**: per-
request DB client resolution by tenant id, connection cache with TTL,
provisioning job that creates a new Postgres database and applies the
migration set.

## 7. Known gaps

| Gap | Severity | Plan |
|---|---|---|
| Dedicated-DB routing not implemented | High for enterprise | Phase 17 |
| No customer-managed keys (BYOK) | Medium | Phase 18+ |
| No private-link DB | Medium | Vercel + provider config |
| No 2FA | High | Phase 17 candidate |
| No password reset flow | High | Phase 17 candidate |
| Audit log coverage incomplete | Medium | Wire remaining writes incrementally |
| No lint rule preventing missing `tenant_id` filter | Low | Add `eslint-plugin-drizzle` rule |
| `chat-pubsub` is in-process only | Operational | Postgres LISTEN/NOTIFY for multi-worker |
| No data residency selection per tenant | High for BUMN | Tied to dedicated-DB work |

## 8. Indonesia-specific posture

- All Vercel apps pinned to `sin1` (Singapore). Banking/BUMN tier will need
  Jakarta region — tied to dedicated-DB work since the routing layer chooses
  the connection.
- POJK 11/2022 compliance requires audit log, encryption at rest, access
  control, and incident response runbooks. Audit log shipped this phase; the
  rest are operational/policy work.
- UU PDP (data protection law) requires breach-notification within 3×24
  hours. Audit log gives us the timeline; runbook is open work.

## 9. Operational checklist for enterprise procurement

- [x] Tenant isolation enforced at DB layer (RLS)
- [x] Audit log of security-sensitive writes
- [x] Argon2id password hashing, opaque session tokens
- [x] HTTPS-only cookies, SameSite=Lax
- [ ] 2FA / TOTP
- [ ] SAML / OIDC SSO
- [ ] BYOK / customer-managed keys
- [ ] Dedicated database per tenant (Penuh tier)
- [ ] Data residency (Jakarta region)
- [ ] Private-link database (no public Postgres endpoint)
- [ ] Audit log retention policy + export
- [ ] Incident response runbook
- [ ] Penetration test report
- [ ] SOC 2 Type II / ISO 27001 (post-revenue)
