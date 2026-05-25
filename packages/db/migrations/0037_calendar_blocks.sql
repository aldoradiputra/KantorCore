-- IS-MTG stub: calendar blocks for presence meeting detection.
--
-- platform.user_calendar_blocks — meeting windows synced from IS-MTG (or created
-- directly). The presence heartbeat checks this table to override status → 'meeting'
-- when the user has an active block. No app-level writes yet; populated by IS-MTG
-- integration in a future migration.

CREATE TABLE IF NOT EXISTS "platform"."user_calendar_blocks" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id"  uuid NOT NULL REFERENCES "platform"."tenants"("id") ON DELETE CASCADE,
  "user_id"    uuid NOT NULL REFERENCES "platform"."users"("id") ON DELETE CASCADE,
  "title"      varchar(255) NOT NULL DEFAULT 'Meeting',
  "starts_at"  timestamptz NOT NULL,
  "ends_at"    timestamptz NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "ucb_tenant_user_idx" ON "platform"."user_calendar_blocks" ("tenant_id", "user_id");
CREATE INDEX IF NOT EXISTS "ucb_tenant_time_idx" ON "platform"."user_calendar_blocks" ("tenant_id", "starts_at", "ends_at");
