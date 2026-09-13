-- v2 extensions: sentiment, fees, goals, txns, ideas, alert extensions
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral'));
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC;

CREATE TABLE IF NOT EXISTS public.symbol_sentiment (
  symbol TEXT PRIMARY KEY REFERENCES public.symbols_meta(symbol),
  avg_score NUMERIC, label TEXT, updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.symbol_sentiment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read symbol sentiment" ON public.symbol_sentiment FOR SELECT TO authenticated, anon USING (true);

CREATE TABLE IF NOT EXISTS public.fees_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  holding_id UUID,
  fee_type TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  incurred_at DATE DEFAULT CURRENT_DATE
);
ALTER TABLE public.fees_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users CRUD own fees" ON public.fees_ledger;
CREATE POLICY "Users CRUD own fees" ON public.fees_ledger FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0, currency TEXT DEFAULT 'KES',
  deadline DATE, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users CRUD own goals" ON public.investment_goals;
CREATE POLICY "Users CRUD own goals" ON public.investment_goals FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  shares NUMERIC NOT NULL, price NUMERIC NOT NULL,
  fees NUMERIC DEFAULT 0, executed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users CRUD own txns" ON public.transactions;
CREATE POLICY "Users CRUD own txns" ON public.transactions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  sentiment TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read ideas" ON public.ideas;
CREATE POLICY "Anyone can read ideas" ON public.ideas FOR SELECT TO authenticated, anon USING (true);
DROP POLICY IF EXISTS "Users CRUD own ideas" ON public.ideas;
CREATE POLICY "Users CRUD own ideas" ON public.ideas FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS extra_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS watchlist_id UUID;
