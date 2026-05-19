-- Phase 17: auth hardening — password reset, TOTP 2FA, session metadata
--> statement-breakpoint
ALTER TABLE "platform"."users"
  ADD COLUMN IF NOT EXISTS "totp_secret" text,
  ADD COLUMN IF NOT EXISTS "totp_enabled" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "backup_code_hashes" text[];
--> statement-breakpoint
ALTER TABLE "platform"."sessions"
  ADD COLUMN IF NOT EXISTS "ip" varchar(64),
  ADD COLUMN IF NOT EXISTS "user_agent" text,
  ADD COLUMN IF NOT EXISTS "last_seen_at" timestamptz;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform"."password_reset_tokens" (
  "token" text PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "platform"."users"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "prt_user_idx" ON "platform"."password_reset_tokens" ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "platform"."totp_challenges" (
  "token" text PRIMARY KEY,
  "user_id" uuid NOT NULL REFERENCES "platform"."users"("id") ON DELETE CASCADE,
  "expires_at" timestamptz NOT NULL,
  "used" boolean NOT NULL DEFAULT false
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "tc_user_idx" ON "platform"."totp_challenges" ("user_id");
