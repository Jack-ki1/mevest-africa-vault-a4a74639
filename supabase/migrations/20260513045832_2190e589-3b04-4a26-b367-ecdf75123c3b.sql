-- Portfolio transactions: append-only log of buy/sell/dividend events
CREATE TABLE public.portfolio_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  symbol text NOT NULL,
  type text NOT NULL CHECK (type IN ('buy','sell','dividend','split','transfer')),
  shares numeric NOT NULL,
  price numeric NOT NULL,
  fees numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  executed_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.portfolio_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own transactions" ON public.portfolio_transactions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_tx_user_date ON public.portfolio_transactions(user_id, executed_at DESC);

-- Daily portfolio snapshots for history charts
CREATE TABLE public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  snapshot_date date NOT NULL DEFAULT (now() AT TIME ZONE 'UTC')::date,
  total_value numeric NOT NULL DEFAULT 0,
  cost_basis numeric NOT NULL DEFAULT 0,
  cash_balance numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  holdings_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, snapshot_date)
);
ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own snapshots" ON public.portfolio_snapshots
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_snap_user_date ON public.portfolio_snapshots(user_id, snapshot_date DESC);

-- Isolated API key storage (separate from generic settings JSONB)
CREATE TABLE public.user_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  provider text NOT NULL,
  key_value text NOT NULL,
  status text NOT NULL DEFAULT 'untested' CHECK (status IN ('untested','connected','invalid')),
  last_tested_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);
ALTER TABLE public.user_api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own api keys" ON public.user_api_keys
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_uak_user ON public.user_api_keys(user_id);