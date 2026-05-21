-- IS-KMS: Knowledge Management
-- Migration 0033

CREATE SCHEMA IF NOT EXISTS kms;

DO $$ BEGIN
  CREATE TYPE kms.article_status AS ENUM ('draft', 'published', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kms.article_visibility AS ENUM ('internal', 'portal', 'public');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Spaces ─────────────────────────────────────────────────────────────────────
-- A space is a top-level grouping (e.g. "Customer Help Center", "HR Handbook")

CREATE TABLE IF NOT EXISTS kms.spaces (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  slug        TEXT NOT NULL,             -- URL-safe identifier, unique per tenant
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT,                       -- emoji or icon key
  visibility  kms.article_visibility NOT NULL DEFAULT 'internal',
  created_by  UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, slug)
);

CREATE INDEX IF NOT EXISTS kms_spaces_tenant_idx ON kms.spaces(tenant_id);

-- ── Articles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS kms.articles (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  space_id     UUID NOT NULL REFERENCES kms.spaces(id) ON DELETE CASCADE,
  parent_id    UUID REFERENCES kms.articles(id) ON DELETE SET NULL,
  slug         TEXT NOT NULL,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL DEFAULT '',
  excerpt      TEXT,
  status       kms.article_status NOT NULL DEFAULT 'draft',
  visibility   kms.article_visibility NOT NULL DEFAULT 'internal',
  tags         TEXT[] NOT NULL DEFAULT '{}',
  view_count   INT NOT NULL DEFAULT 0,
  position     INT NOT NULL DEFAULT 0,        -- ordering within parent
  author_id    UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(space_id, slug)
);

CREATE INDEX IF NOT EXISTS kms_articles_tenant_idx       ON kms.articles(tenant_id);
CREATE INDEX IF NOT EXISTS kms_articles_space_idx        ON kms.articles(space_id);
CREATE INDEX IF NOT EXISTS kms_articles_parent_idx       ON kms.articles(parent_id);
CREATE INDEX IF NOT EXISTS kms_articles_tenant_status    ON kms.articles(tenant_id, status);
CREATE INDEX IF NOT EXISTS kms_articles_tags_gin         ON kms.articles USING gin(tags);

-- Full-text search index over title + body (English + Indonesian fallback to simple)
CREATE INDEX IF NOT EXISTS kms_articles_fts ON kms.articles USING gin(
  to_tsvector('simple', coalesce(title, '') || ' ' || coalesce(body, ''))
);

-- ── Article Versions (revision history) ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS kms.article_versions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id  UUID NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  article_id UUID NOT NULL REFERENCES kms.articles(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  author_id  UUID REFERENCES platform.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS kms_versions_article_idx ON kms.article_versions(article_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────

ALTER TABLE kms.spaces           ENABLE ROW LEVEL SECURITY;
ALTER TABLE kms.articles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE kms.article_versions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY kms_spaces_isolation     ON kms.spaces
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY kms_articles_isolation   ON kms.articles
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
  CREATE POLICY kms_versions_isolation   ON kms.article_versions
    USING (tenant_id = current_setting('app.tenant_id', true)::uuid);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
