CREATE SCHEMA "proj";
--> statement-breakpoint
CREATE TYPE "public"."proj_issue_priority" AS ENUM('none', 'low', 'medium', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."proj_issue_status" AS ENUM('backlog', 'todo', 'in_progress', 'in_review', 'done', 'cancelled');--> statement-breakpoint
CREATE TABLE "proj"."issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text,
	"status" "proj_issue_status" DEFAULT 'backlog' NOT NULL,
	"priority" "proj_issue_priority" DEFAULT 'none' NOT NULL,
	"assignee_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proj"."projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(64) NOT NULL,
	"key" varchar(8) NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "proj"."issues" ADD CONSTRAINT "issues_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proj"."issues" ADD CONSTRAINT "issues_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "proj"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proj"."issues" ADD CONSTRAINT "issues_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "platform"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proj"."issues" ADD CONSTRAINT "issues_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "platform"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proj"."projects" ADD CONSTRAINT "projects_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "platform"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proj"."projects" ADD CONSTRAINT "projects_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "platform"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "proj_issues_project_number_unique" ON "proj"."issues" USING btree ("project_id","number");--> statement-breakpoint
CREATE INDEX "proj_issues_project_status_idx" ON "proj"."issues" USING btree ("project_id","status");--> statement-breakpoint
CREATE INDEX "proj_issues_assignee_idx" ON "proj"."issues" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "proj_issues_tenant_id_idx" ON "proj"."issues" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "proj_projects_tenant_slug_unique" ON "proj"."projects" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "proj_projects_tenant_key_unique" ON "proj"."projects" USING btree ("tenant_id","key");--> statement-breakpoint
CREATE INDEX "proj_projects_tenant_id_idx" ON "proj"."projects" USING btree ("tenant_id");