-- Add rich-text JSON body to KMS articles (IS-EDITOR)
ALTER TABLE kms.articles
  ADD COLUMN IF NOT EXISTS body_json JSONB;

-- Index for potential JSONB queries
CREATE INDEX IF NOT EXISTS kms_articles_body_json_idx
  ON kms.articles USING gin (body_json)
  WHERE body_json IS NOT NULL;
