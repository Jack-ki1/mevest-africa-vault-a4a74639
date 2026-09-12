-- Distributed rate limiting (replaces in-memory Map per isolate)
-- Used by ai-insights and portfolio-snapshot for multi-instance protection.
CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rate_limits_key_time ON public.rate_limits(key, created_at DESC);
-- Cleanup old entries (TTL 1 minute) — run via cron or on each check.
-- Example check: SELECT count(*) FROM rate_limits WHERE key = $1 AND created_at > now() - interval '1 minute';

-- Enable RLS but allow service_role full access (edge functions use service_role)
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role bypass" ON public.rate_limits;
CREATE POLICY "service_role bypass" ON public.rate_limits FOR ALL USING (true) WITH CHECK (true);
