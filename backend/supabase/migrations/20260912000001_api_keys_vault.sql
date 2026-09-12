-- Encryption at rest for user_api_keys.key_value
-- Option A: use Supabase Vault (pgsodium) to encrypt. This migration documents the intent.
-- Until vault is enabled, keys remain plaintext in RLS-protected table (service_role readable).
-- To enable encryption:
--  1. Enable pgsodium extension: CREATE EXTENSION IF NOT EXISTS pgsodium;
--  2. Create vault secret and migrate existing rows.
-- For now, add a comment and ensure no SELECT without auth.

COMMENT ON COLUMN public.user_api_keys.key_value IS 'Plaintext — encrypt at rest via Supabase Vault (pgsodium) or application-level encryption before marking feature production-ready. See transformation_improvements.md Introduce section.';
-- Note: application-level encryption can be added in edge functions before upsert:
--   const encrypted = await encrypt(key_value, VAULT_KEY) and decrypt on read.
