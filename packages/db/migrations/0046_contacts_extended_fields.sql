-- 0046: extend platform.contacts with PKP flag, website, language,
--       country, and structured Indonesian address fields.

ALTER TABLE platform.contacts
  ADD COLUMN IF NOT EXISTS is_pkp         boolean       NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS website        varchar(500),
  ADD COLUMN IF NOT EXISTS language       varchar(10),
  ADD COLUMN IF NOT EXISTS country        varchar(2),
  ADD COLUMN IF NOT EXISTS addr_line1     text,
  ADD COLUMN IF NOT EXISTS addr_line2     text,
  ADD COLUMN IF NOT EXISTS addr_rt        varchar(10),
  ADD COLUMN IF NOT EXISTS addr_rw        varchar(10),
  ADD COLUMN IF NOT EXISTS addr_kelurahan varchar(100),
  ADD COLUMN IF NOT EXISTS addr_kecamatan varchar(100),
  ADD COLUMN IF NOT EXISTS addr_kota      varchar(100),
  ADD COLUMN IF NOT EXISTS addr_provinsi  varchar(100),
  ADD COLUMN IF NOT EXISTS addr_kode_pos  varchar(10);
