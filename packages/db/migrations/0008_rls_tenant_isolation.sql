-- Phase 16: Row-Level Security on every tenant-scoped table.
--
-- Defense-in-depth on top of the app-layer `where tenant_id = ...` filters.
-- A query that forgets the filter now returns 0 rows instead of cross-tenant
-- data, because Postgres evaluates the policy against the GUC `app.tenant_id`
-- which is set per-request via `SET LOCAL`.
--
-- `FORCE ROW LEVEL SECURITY` ensures the schema owner role also respects the
-- policy — without it, the role that owns the table bypasses RLS by default.
--
-- Bootstrap paths (signup creating the first membership) must call
-- `SET LOCAL app.tenant_id = <new tenant id>` after creating the tenant row
-- and before inserting any tenant-scoped row. The withTenant() helper in
-- apps/web/lib/db.ts handles this for normal request paths.

-- ── chat ────────────────────────────────────────────────────────────────────
ALTER TABLE "chat"."channels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat"."channels" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "chat"."channels"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "chat"."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "chat"."messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "chat"."messages"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── proj ────────────────────────────────────────────────────────────────────
ALTER TABLE "proj"."projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proj"."projects" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "proj"."projects"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "proj"."issues" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "proj"."issues" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "proj"."issues"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── agent ───────────────────────────────────────────────────────────────────
ALTER TABLE "agent"."tools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent"."tools" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "agent"."tools"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "agent"."agents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent"."agents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "agent"."agents"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "agent"."mandates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent"."mandates" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "agent"."mandates"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

ALTER TABLE "agent"."runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "agent"."runs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "agent"."runs"
  USING (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- ── platform (only tenant-scoped tables) ────────────────────────────────────
-- platform.tenants, platform.users, platform.sessions are intentionally NOT
-- under RLS — they're either tenant-routing tables or cross-tenant identity.
--
-- platform.memberships is special: the user resolution flow needs to see
-- "which tenants does this user belong to" BEFORE any tenant is selected.
-- The SELECT policy therefore also accepts a match on app.user_id, set via
-- withUser() in the auth flow. INSERTs still require app.tenant_id to match
-- — a user cannot grant themselves membership in a tenant they don't own.
ALTER TABLE "platform"."memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform"."memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_or_self" ON "platform"."memberships"
  USING (
    (
      COALESCE(current_setting('app.tenant_id', true), '') <> ''
      AND tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR (
      COALESCE(current_setting('app.user_id', true), '') <> ''
      AND user_id = current_setting('app.user_id', true)::uuid
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );

-- platform.invites: invite acceptance happens before the user has a
-- membership, so the policy also accepts a match on the invite token
-- (set via app.invite_token) so an unauthenticated user can read their own
-- invite. Writes still require app.tenant_id to match.
ALTER TABLE "platform"."invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "platform"."invites" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_or_token" ON "platform"."invites"
  USING (
    (
      COALESCE(current_setting('app.tenant_id', true), '') <> ''
      AND tenant_id = current_setting('app.tenant_id', true)::uuid
    )
    OR (
      COALESCE(current_setting('app.invite_token', true), '') <> ''
      AND token = current_setting('app.invite_token', true)
    )
  )
  WITH CHECK (
    COALESCE(current_setting('app.tenant_id', true), '') <> ''
    AND tenant_id = current_setting('app.tenant_id', true)::uuid
  );
