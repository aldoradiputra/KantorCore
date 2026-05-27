-- 0047: contact hierarchy (company/individual, parent_id, address_type),
--       bank accounts (1:N), and financial profiles (1:1 with inheritance).

-- 1. Rename enum values: person → individual, organization → company
ALTER TYPE platform_contact_type RENAME VALUE 'person'       TO 'individual';
ALTER TYPE platform_contact_type RENAME VALUE 'organization' TO 'company';

-- 2. New enum for address classification on Individual contacts
CREATE TYPE platform_contact_address_type AS ENUM ('main', 'invoice', 'delivery', 'contact', 'other');

-- 3. Extend contacts with self-reference and address type
ALTER TABLE platform.contacts
  ADD COLUMN IF NOT EXISTS parent_id    uuid REFERENCES platform.contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS address_type platform_contact_address_type;

CREATE INDEX IF NOT EXISTS contacts_parent_id_idx ON platform.contacts(parent_id);

-- 4. Bank accounts (1:N)
CREATE TABLE IF NOT EXISTS platform.contact_bank_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id     uuid        NOT NULL REFERENCES platform.contacts(id) ON DELETE CASCADE,
  tenant_id      uuid        NOT NULL REFERENCES platform.tenants(id)  ON DELETE CASCADE,
  account_number text        NOT NULL,
  bank_name      varchar(200),
  branch         varchar(200),
  routing_number varchar(50),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cba_contact_idx ON platform.contact_bank_accounts(contact_id);
CREATE INDEX IF NOT EXISTS cba_tenant_idx  ON platform.contact_bank_accounts(tenant_id);

-- 5. Financial profiles (1:1)
--    FKs to payment_terms / pricelists / chart_of_accounts are stored as plain UUIDs
--    (no referential constraint) — those tables ship in later finance migrations.
CREATE TABLE IF NOT EXISTS platform.contact_financial_profiles (
  contact_id                        uuid        PRIMARY KEY REFERENCES platform.contacts(id) ON DELETE CASCADE,
  tenant_id                         uuid        NOT NULL REFERENCES platform.tenants(id) ON DELETE CASCADE,
  -- Sales
  salesperson_id                    uuid        REFERENCES platform.users(id) ON DELETE SET NULL,
  payment_terms_id                  uuid,
  payment_terms_label               varchar(200),
  pricelist_id                      uuid,
  pricelist_label                   varchar(200),
  delivery_method                   text,
  -- Purchase
  buyer_id                          uuid        REFERENCES platform.users(id) ON DELETE SET NULL,
  purchase_payment_terms_id         uuid,
  purchase_payment_terms_label      varchar(200),
  purchase_payment_method           text,
  receipt_reminder                  boolean     NOT NULL DEFAULT false,
  supplier_currency                 varchar(3),
  -- Accounting defaults
  property_account_receivable_id    uuid,
  property_account_receivable_label varchar(200),
  property_account_payable_id       uuid,
  property_account_payable_label    varchar(200),
  updated_at                        timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS cfp_tenant_idx ON platform.contact_financial_profiles(tenant_id);
