CREATE SCHEMA "platform";
--> statement-breakpoint
CREATE TYPE "public"."tenant_db_mode" AS ENUM('shared', 'dedicated');--> statement-breakpoint
CREATE TYPE "public"."tenant_plan" AS ENUM('rintis', 'tumbuh', 'pilih', 'penuh');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('provisioning', 'active', 'suspended', 'archived');--> statement-breakpoint
CREATE TABLE "platform"."tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" "tenant_status" DEFAULT 'provisioning' NOT NULL,
	"plan" "tenant_plan" DEFAULT 'rintis' NOT NULL,
	"db_mode" "tenant_db_mode" DEFAULT 'shared' NOT NULL,
	"db_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
