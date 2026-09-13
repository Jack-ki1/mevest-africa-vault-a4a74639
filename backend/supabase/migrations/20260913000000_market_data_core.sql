-- §3.1 Market data core tables
-- OHLCV history
CREATE TABLE public.price_history (
  symbol TEXT NOT NULL,
  ts TIMESTAMPTZ NOT NULL,
  interval TEXT NOT NULL DEFAULT '1d',
  open NUMERIC,
  high NUMERIC,
  low NUMERIC,
  close NUMERIC NOT NULL,
  volume BIGINT,
  source TEXT NOT NULL,
  PRIMARY KEY (symbol, ts, interval)
);
CREATE INDEX idx_price_history_symbol_ts ON public.price_history (symbol, interval, ts DESC);
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read price history" ON public.price_history FOR SELECT TO authenticated, anon USING (true);

-- Fundamentals + reference data
CREATE TABLE public.symbols_meta (
  symbol TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  exchange TEXT NOT NULL,
  country TEXT,
  sector TEXT,
  industry TEXT,
  currency TEXT DEFAULT 'USD',
  market_cap NUMERIC,
  pe_ratio NUMERIC,
  dividend_yield NUMERIC,
  beta NUMERIC,
  week52_high NUMERIC,
  week52_low NUMERIC,
  is_sharia_compliant BOOLEAN,
  logo_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symbols_meta ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symbol metadata" ON public.symbols_meta FOR SELECT TO authenticated, anon USING (true);

-- Corporate actions
CREATE TABLE public.corporate_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL REFERENCES public.symbols_meta(symbol),
  action_type TEXT NOT NULL CHECK (action_type IN ('dividend','split','book_closure','earnings','agm')),
  ex_date DATE,
  record_date DATE,
  payment_date DATE,
  amount NUMERIC,
  details JSONB DEFAULT '{}'::jsonb,
  source TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_corporate_actions_symbol_date ON public.corporate_actions (symbol, ex_date);
ALTER TABLE public.corporate_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read corporate actions" ON public.corporate_actions FOR SELECT TO authenticated, anon USING (true);

-- Key Moments
CREATE TABLE public.key_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  change_pct NUMERIC NOT NULL,
  summary TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.key_moments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read key moments" ON public.key_moments FOR SELECT TO authenticated, anon USING (true);

-- News cache for key moments sourcing
CREATE TABLE public.news_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  symbol TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  publisher TEXT,
  published_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_news_cache_symbol ON public.news_cache (symbol, published_at DESC);
ALTER TABLE public.news_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read news cache" ON public.news_cache FOR SELECT TO authenticated, anon USING (true);

-- Scheduled briefings
CREATE TABLE public.scheduled_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  prompt TEXT NOT NULL,
  schedule_cron TEXT NOT NULL,
  scope TEXT NOT NULL DEFAULT 'portfolio' CHECK (scope IN ('portfolio','watchlist','custom')),
  delivery TEXT NOT NULL DEFAULT 'in_app' CHECK (delivery IN ('in_app','email','whatsapp')),
  active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.scheduled_briefings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own briefings" ON public.scheduled_briefings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.briefing_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  briefing_id UUID REFERENCES public.scheduled_briefings(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  generated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.briefing_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own briefing results" ON public.briefing_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service can insert briefing results" ON public.briefing_results FOR INSERT TO service_role WITH CHECK (true);

-- Screener presets
CREATE TABLE public.screener_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name)
);
ALTER TABLE public.screener_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own presets" ON public.screener_presets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Kenya rates
CREATE TABLE public.kenya_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  instrument TEXT NOT NULL,
  rate_pct NUMERIC NOT NULL,
  as_of DATE NOT NULL,
  source TEXT NOT NULL,
  UNIQUE(instrument, as_of)
);
ALTER TABLE public.kenya_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read rates" ON public.kenya_rates FOR SELECT TO authenticated, anon USING (true);

-- Price alerts
CREATE TABLE public.price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('price_above','price_below','pct_change_up','pct_change_down','rsi_above','rsi_below')),
  threshold NUMERIC NOT NULL,
  active BOOLEAN DEFAULT true,
  triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own alerts" ON public.price_alerts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own subscriptions" ON public.push_subscriptions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Public track records
CREATE TABLE public.public_track_records (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  opted_in BOOLEAN DEFAULT false,
  ytd_return_pct NUMERIC,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.public_track_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read opted-in track records" ON public.public_track_records FOR SELECT TO authenticated, anon USING (opted_in = true);
CREATE POLICY "Users manage own track record" ON public.public_track_records FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Learning progress
CREATE TABLE public.learning_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  module_id TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  score INTEGER,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, module_id)
);
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own learning" ON public.learning_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Seed symbols_meta from existing NSE + global coverage
INSERT INTO public.symbols_meta (symbol, name, exchange, country, sector, currency) VALUES
  ('SCOM.NR','Safaricom PLC','NSE','KE','Telecommunications','KES'),
  ('EQTY.NR','Equity Group Holdings','NSE','KE','Banking','KES'),
  ('KCB.NR','KCB Group PLC','NSE','KE','Banking','KES'),
  ('COOP.NR','Co-operative Bank of Kenya','NSE','KE','Banking','KES'),
  ('ABSA.NR','Absa Bank Kenya PLC','NSE','KE','Banking','KES'),
  ('EABL.NR','East African Breweries PLC','NSE','KE','Beverages','KES'),
  ('BAT.NR','British American Tobacco Kenya','NSE','KE','Tobacco','KES'),
  ('AAPL','Apple Inc.','NASDAQ','US','Technology','USD'),
  ('MSFT','Microsoft Corp.','NASDAQ','US','Technology','USD'),
  ('NVDA','NVIDIA Corp.','NASDAQ','US','Semiconductors','USD'),
  ('GOOGL','Alphabet Inc.','NASDAQ','US','Technology','USD'),
  ('AMZN','Amazon.com Inc.','NASDAQ','US','Consumer','USD'),
  ('BTC-USD','Bitcoin USD','Crypto','GLOBAL','Crypto','USD'),
  ('ETH-USD','Ethereum USD','Crypto','GLOBAL','Crypto','USD'),
  ('SPY','SPDR S&P 500 ETF','NYSE','US','Index','USD')
ON CONFLICT (symbol) DO NOTHING;

-- Seed kenya_rates with current indicative values
INSERT INTO public.kenya_rates (instrument, rate_pct, as_of, source) VALUES
  ('T-Bill-91', 15.04, CURRENT_DATE, 'CBK'),
  ('T-Bill-182', 15.80, CURRENT_DATE, 'CBK'),
  ('T-Bill-364', 16.50, CURRENT_DATE, 'CBK'),
  ('MMF-Average', 13.20, CURRENT_DATE, 'CMA'),
  ('USDKES', 129.50, CURRENT_DATE, 'CBK')
ON CONFLICT (instrument, as_of) DO NOTHING;

-- Seed corporate actions (NSE book closures - indicative 2026)
INSERT INTO public.corporate_actions (symbol, action_type, ex_date, record_date, payment_date, amount, source) VALUES
  ('SCOM.NR','book_closure','2026-09-15','2026-09-16','2026-10-10',1.20,'NSE'),
  ('EQTY.NR','dividend','2026-09-20','2026-09-21','2026-10-05',4.00,'NSE'),
  ('KCB.NR','dividend','2026-09-25','2026-09-26','2026-10-12',2.50,'NSE'),
  ('EABL.NR','book_closure','2026-10-01','2026-10-02','2026-10-28',5.50,'NSE')
ON CONFLICT DO NOTHING;
