-- Phase 18: agent execution — add execution tracking columns to agent.runs
--> statement-breakpoint
ALTER TABLE "agent"."runs"
  ADD COLUMN IF NOT EXISTS "tool_calls" jsonb NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS "pending_messages" jsonb,
  ADD COLUMN IF NOT EXISTS "pending_tool_call_id" text,
  ADD COLUMN IF NOT EXISTS "input_tokens" text,
  ADD COLUMN IF NOT EXISTS "output_tokens" text;
