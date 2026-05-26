-- Add per-tenant access control for the "Salin info" (copy record info) button
-- on transactional and contact records. Stores the minimum membership role
-- required to see and use the copy button.
--
-- Values match public.membership_role enum: 'owner' | 'admin' | 'member'.
-- Default 'member' = everyone in the workspace can copy.

ALTER TABLE platform.workspace_security_policy
  ADD COLUMN IF NOT EXISTS copy_info_min_role public.membership_role NOT NULL DEFAULT 'member';
