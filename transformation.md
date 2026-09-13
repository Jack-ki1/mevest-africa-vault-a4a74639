# MEVEST 10x Plan v2 — AI-Native Africa+Global Investing Platform (With Full Competitive Intelligence)

_This is v2 of the 10x plan. v1's hygiene is done (admin bypass fixed, portfolio-snapshot authenticated, code-splitting, Finnhub fallback, 23 tests green). v2 keeps every v1 decision and adds deep competitive intelligence gathered Sep 2026 — full teardowns of Google Finance (Jun 25 2026 relaunch), Perplexity Finance, TradingView, 30+ GitHub finance OSS projects, and the Hugging Face finance model ecosystem. Every new idea below cites its source and maps to a concrete file change._

_Research basis, Sep 2026 — primary sources verified via web fetch:_

| Source | Date | Key finding |
|---|---|---|
| **Google Finance blog** `blog.google/products-and-platforms/products/search/google-finance-updates-june-2026` | Jun 25 2026 | Out of beta, Android app (iOS late 2026), portfolios return after 2017 removal, AI research tool, natural-language **Tasks** (scheduled briefings), **Key Moments** (AI explains why stock moved), advanced charts (MA envelopes, candlestick), live earnings (audio + transcript + AI highlights), 100+ countries since Apr 8 2026 |
| **Perplexity Finance** `perplexity.ai/finance` + FindMyMoat review | 2026 | Cited AI answers over SEC filings/news/charts/screens/earnings docs/ownership; upgraded charts with TradingView engine; watchlists + AI briefings; **natural-language screener (US + Indian equities only)**; **Earnings Hub** (calendar/slides/transcripts/audio); **Politicians/holders/insiders + Polymarket prediction markets**; `finance_search` API tool; **Plaid** holdings sync |
| **TradingView Features** `tradingview.com/features` + Pine Screener docs | 2026 | **Supercharts** (cloud, 400+ indicators, 70 stock + 70 crypto exchanges, 6 screeners); **Pine Script®** IDE + community library; **Pine Screener** (scan watchlists with your scripts); **Alerts** (13 conditions, drawing alerts, Pine alerts, webhook, watchlist alerts, multi-condition up to 5); **Strategy Tester** (backtest metrics, orders on chart, downloadable); **Ideas Stream** social; heatmaps, multi-chart 8/tab |
| **GitHub ecosystem** `awesome-quant` (26.5k★), Qlib (39.3k★), Abu (16.6k★), Blankly (2.4k★), portwine, TradePruf, backtrader (20.9k★), Wealthfolio, LibreFolio (AGPL-3) | Mar 2026 | Chinese quant surge (Qlib/Qbot/Abu), AI quant tooling, event-driven frameworks, fees/goal add-ons, FIFO/WAC + TWRR/MWRR, transaction-cost aware backtests, offline PWA |
| **Hugging Face** ProsusAI/finbert (4.49M dl), FinBERT-FOMC, finance-Llama3-8B (8.5k likes), BloombergGPT (50B, 363B FinPile) | 2026 | Finance-tuned sentiment + text generation, RAG over filings, MCP pattern |
| **Kenyan set** Hisa (NSE+US, CDS, M-Pesa), Ndovu (robo questionnaire), Mali (book-closure), Ziidi Trader (KES 1 min) | 2026 | NSE dividend calendar + M-Pesa goal framing are the only features no global competitor has |

---

## 0. The honest scorecard: why v1 was 20/100 and why v2 targets 95/100

| Axis | v1 initial state | v1 after plan (§3-9) | v2 gap (new research uncovers) | v2 target |
|---|---|---|---|---|
| **Live data trust** | Yahoo scrape, no history | price_history + cascade + Realtime | No FinBERT sentiment, no strategy tester export, no fees/goal add-ons | 92 |
| **AI** | Single chat widget | Key Moments + briefings + import + citations | No nat-lang portfolio creation, no suggested prompts per page, no FOMC/earnings RAG, no on-device small model | 94 |
| **Analysis** | "Awaiting benchmark regression" | Real Sharpe/Beta/Drawdown from price_history | No FIFO/WAC, no TWRR/MWRR, no transaction-cost backtest, no downloadable report, no regime indicator | 93 |
| **Screener** | 3 text filters | Numeric filters + Sharia + presets | No natural-language input box, no Pine-like formula bar | 90 |
| **Charts** | Line chart only | Candlestick + 12 indicators (planned) | No comparison overlay, no 2-chart mode, no volume profile hint | 90 |
| **Alerts** | None | price_alerts + push + WhatsApp | No webhook, no multi-condition, no watchlist-alerts (one alert many symbols) | 92 |
| **Calendar** | Generic | NSE dividends lane | No earnings audio/transcript, no alert-from-row, no premarket filter | 90 |
| **Onboarding** | Manual one-row | CSV/PDF/image import | No nat-lang describe-to-create ("20 SCOM at 28 KES") — Google's top new feature | 95 |
| **Africa-fit** | 55 tickers, stale | KES toggle + RatesComparator | No Swahili toggle, no M-Pesa goal framing, no CBK sentiment, no KES 1 minimum framing | 96 |
| **Trust** | No provenance | Citations on all AI claims | No FinBERT sentiment badges on news/Key Moments, no source drill-down | 94 |
| **Social** | None | Community leaderboard | No Ideas stream publish/comment/like, no watchlist share modal | 85 |
| **PWA / Mobile** | Web only | — | No installable PWA, no offline cache of price_history | 85 |
| **Notifications** | None | Push + WhatsApp | No email digest template, no prediction-market embed virality | 88 |

---

## 1. Positioning (unchanged — sharpened)

**"The AI research layer for the African + global retail investor that Google Finance forgot to build."**

Google Finance (even after Jun 2026) has no NSE depth, no M-Pesa mental model, no WhatsApp. Perplexity's screener is US+India only. TradingView has no African fundamentals. Hisa/Mali have NSE but no AI. **Mevest's wedge is global coverage + true NSE depth + cited proactive AI + KES-first + Swahili.** This is uncopyable by US giants because it requires NSE licensing + local distribution (WhatsApp). It's uncopyable by local brokers because it requires BloombergGPT-class AI discipline.

---

## 2. Feature parity + superiority matrix v2

| Capability | Google Jun 2026 | Perplexity 2026 | TradingView | Mevest v1 | Mevest v2 |
|---|---|---|---|---|---|
| Real-time quotes | ✅ | ✅ | ✅ | ✅ cascade | ✅ + sentiment overlay |
| Key Moments (why did it move) | ✅ | ✅ cited | — | ✅ v1 | ✅ inline on chart + FinBERT tone |
| Scheduled Briefings / Tasks | ✅ nat-lang Tasks | ✅ | — | ✅ + WhatsApp | ✅ nat-lang + suggested prompts per page |
| Portfolio import | ✅ screenshot/CSV/PDF/chat | ✅ Plaid | — | ✅ CSV/image | ✅ + **nat-lang describe** (`20 SCOM at 28`) |
| Nat-lang screener | — | ✅ US+India | Pine Screener | ✅ numeric | ✅ **NL input box** + Pine-lite formula |
| Charts + indicators | ✅ MA envelopes/candlestick | ✅ TradingView engine | ✅✅ 400+ | ✅ 12 | ✅ + **comparison overlay** + **2-chart mode** |
| Live earnings | ✅ audio+transcript+AI | ✅ hub (slides/audio) | — | — | ✅ **stub: audio player + transcript + AI highlights** |
| Dividend/Earnings calendar | ⚠️ US only | ✅ hub | ✅ economic | ✅ NSE dividends | ✅ + **alert-from-row** + **premarket filter** + filing PDF |
| MMF/T-Bill comparator | — | — | — | ✅ | ✅ + **fees audited** |
| Alerts | — | ✅ | ✅ 13 conditions + Pine + webhook | ✅ push/WA | ✅ + **webhook** + **multi-condition** + **watchlist-alerts** |
| Social / Ideas | — | — | ✅ Ideas stream | ✅ leaderboard | ✅ + **publish idea + comments/likes** |
| Literacy | — | — | — | ✅ Learn | ✅ + regime indicator + goal-linked |
| Citations | ⚠️ partial | ✅✅ | n/a | ✅✅ | ✅ + **FinBERT sentiment badges** |
| KES-first + M-Pesa + Swahili | — | — | — | ✅ KES | ✅ + **Swahili toggle** + **Goal Tracker (M-Pesa framing)** |
| Fees Tracker | — | — | — | — | ✅ (Wealthfolio pattern) |
| Portfolio analytics | basic | basic | ✅ backtest export | ✅ Sharpe/Beta | ✅ + **FIFO/WAC + TWRR/MWRR + cost-aware backtest + CSV export** |
| PWA offline | — | — | — | — | ✅ installable + cached price_history |
| Prediction markets | — | ✅ Polymarket | — | — | ✅ embed |
| Government trading | — | ✅ politicians tracker | — | — | ✅ KE mock (Parliament disclosures) |

Where we **still won't compete**: live brokerage execution (Plaid/Hisa partner path, not broker-dealer), 400 indicators (12 correct > 400 noisy).

---

## 3. Architecture shift: from "fetch on render" to "own the data" + own the intelligence

Same §3 diagram as v1 (market-sync → Postgres → Realtime) — v2 adds three intelligence layers on top:

```
price_history / symbols_meta / corporate_actions   ← own the data (v1)
        ↓
news_cache + sentiment scorer (FinBERT)            ← own the interpretation
        ↓
Key Moments + Briefings + Earnings AI              ← own the narrative (proactive)
```

### 3.1 Tables — v1 plus v2 extensions (migration `20260913000000_market_data_core.sql` already shipped; append as `20260914000000_v2_extensions.sql`)

```sql
-- FinBERT sentiment on news_cache (nullable, backfilled)
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS sentiment TEXT CHECK (sentiment IN ('positive','negative','neutral'));
ALTER TABLE public.news_cache ADD COLUMN IF NOT EXISTS sentiment_score NUMERIC;

-- Sentiment cache for symbols (latest aggregate)
CREATE TABLE IF NOT EXISTS public.symbol_sentiment (
  symbol TEXT PRIMARY KEY REFERENCES public.symbols_meta(symbol),
  avg_score NUMERIC, label TEXT, updated_at TIMESTAMPTZ DEFAULT now()
);

-- Fees ledger (Wealthfolio Fees Tracker pattern)
CREATE TABLE public.fees_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  holding_id UUID,
  fee_type TEXT NOT NULL, -- 'brokerage'|'management'|'fx'|'other'
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'KES',
  incurred_at DATE DEFAULT CURRENT_DATE
);
ALTER TABLE public.fees_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own fees" ON public.fees_ledger FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Goals Tracker (M-Pesa framing: "KES 1 min" like Ziidi)
CREATE TABLE public.investment_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL, target_amount NUMERIC NOT NULL,
  current_amount NUMERIC DEFAULT 0, currency TEXT DEFAULT 'KES',
  deadline DATE, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.investment_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own goals" ON public.investment_goals FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Transactions for FIFO/WAC + TWRR/MWRR (LibreFolio pattern)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL, side TEXT NOT NULL CHECK (side IN ('buy','sell')),
  shares NUMERIC NOT NULL, price NUMERIC NOT NULL,
  fees NUMERIC DEFAULT 0, executed_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own txns" ON public.transactions FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Ideas stream (TradingView Ideas lite)
CREATE TABLE public.ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
  sentiment TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read ideas" ON public.ideas FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "Users CRUD own ideas" ON public.ideas FOR ALL TO authenticated USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

-- Extend price_alerts with webhook + multi-condition
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS webhook_url TEXT;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS extra_conditions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.price_alerts ADD COLUMN IF NOT EXISTS watchlist_id UUID;
```

### 3.2 Edge functions — v1 plus

- `market-sync`: unchanged (Finnhub → TwelveData → Yahoo). For `.NR` symbols, add comment for NSE Delayed Data 4th provider (commercial dependency).
- `sentiment-sync` (NEW, cron 15m): pulls `news_cache` rows without sentiment, calls HF Inference `ProsusAI/finbert` (fallback to keyword heuristic), writes `sentiment`/`sentiment_score` and upserts `symbol_sentiment`.

---

## 4. AI: from chatbot to analyst + companion

### 4.1 Key Moments v2 — inline on chart + FinBERT tone
`KeyMomentsCard.tsx` renders on Dashboard above holdings *and* as a **tooltip on the candlestick** in `MarketsPage.tsx` (hover the big candle → "KCB -2.1% [FinBERT negative 0.81] — Safaricom FY results [1]"). Each card shows citation chips + sentiment badge (green/red/grey).

### 4.2 Scheduled Briefings v2 — suggested prompts per page
`SettingsPage.tsx` Briefings tab already has nat-lang input + cron + delivery toggle. **Add:** `DashboardPage.tsx`, `PortfolioPage.tsx`, `MarketsPage.tsx` each show **2 contextual suggested prompts** tapping to create briefing:
- Dashboard: "Daily pre-market briefing on my portfolio and NSE banking stocks"
- Portfolio: "Weekly drift report — is my allocation off target?"
- Markets: "Alert me when my watchlist moves >2% overnight"

WhatsApp remains the Kenya differentiator (90%+ smartphone penetration > app open rate).

### 4.3 Frictionless import v2 — add nat-lang describe (Google parity)
`PortfolioImportWizard.tsx` already handles CSV + vision. **Add third mode:** textarea `Describe your holdings` ("I have 20 SCOM at 28 KES, 5 EQTY at 52") → `ai-insights` tool `add_holding` in loop with user confirm table before persist. This is Google's most novel onboarding — missing in v1.

### 4.4 Trust layer v2 — FinBERT badges
Every `news_cache` row and every `key_moments` sources list gets a **sentiment badge** (`sentiment-sync` writes it). `AiChatWidget.tsx` already renders citation chips + footer; add **source drill-down**: clicking [1] scrolls to source card with timestamp + provider.

### 4.5 Earnings Hub lite + RAG stub
`CalendarPage.tsx` Dividends tab already from `corporate_actions`. **Add Earnings lane:** table with `earnings` action_type rows, **audio play button stub** + **transcript collapsed** + **AI highlights bullet** (from `key_moments` for that symbol). Filing PDF link from `news_cache.url`.

---

## 5. Screener 2.0 → 2.1 + real analytics + real charts

### 5.1 Screener 2.1
Filters already numeric (marketCap/pe/dividendYield/perfPct/Sharia) + presets. **Add:**
- **Natural-language input box** at top: `Find undervalued NSE banks with PE<10 and div>4%` → parser (regex MVP, later HF `finance-Llama3-8B`) maps to Filters state.
- **Pine-lite formula bar** (collapsible): `SMA(close,20) > SMA(close,50) AND RSI < 70` → computed client-side against `price_history` (future: server-side `LATERAL JOIN latest_prices`).
- **Sharia badge** already in UI.

### 5.2 Analytics — real math + missing formulas
`riskMetrics.ts` already has dailyReturns/volatility/Sharpe/maxDrawdown/beta/cagr/sortino/calmar. **Add:**
```ts
// frontend/src/lib/analytics/extendedMetrics.ts
export function twrr(returns: number[]): number { return returns.reduce((a,r)=>a*(1+r),1)-1; }
export function mwrr(cashflows: {amount:number,t:number}[], endValue:number): number { /* XIRR via Newton */ }
export function fifoCostBasis(txns: {side:'buy'|'sell', shares:number, price:number}[]): number { /* queue lots */ return 0; }
export function wacCostBasis(txns: {side:'buy'|'sell', shares:number, price:number}[]): number { return 0; }
export function withTransactionCosts(returns: number[], costBpsPerTrade:number, tradesPerYear:number): number[] { return returns.map((r,i)=> i===0? r : r - (costBpsPerTrade/10000)*tradesPerYear/252); }
export function regimeLabel(returns: number[]): 'bull'|'bear'|'neutral' { const sma50 = returns.slice(-50).reduce((a,b)=>a+b,0)/50; return sma50>0.001? 'bull': sma50<-0.001? 'bear':'neutral'; }
```
`AnalyticsPage.tsx`: add **FIFO/WAC toggle**, **TWRR vs MWRR cards**, **cost-aware backtest line (0.3% NSE brokerage)**, **Download CSV report** button, **Regime banner** ("Market regime: neutral — volatility elevated").

### 5.3 Charts — candlestick + comparison + 2-chart
`MarketsPage.tsx` already has MA/BB/RSI overlays via `indicators.ts`. **Add:**
- **Comparison overlay**: second search box "Compare with…" → second Area line (purple) with synchronized Y.
- **2-chart mode**: toggle `▭▭ Side-by-side` → grid `1fr 1fr`, each chart independent symbol/range.
- **Volume profile hint**: show volume bars faint behind price when `overlay==='volume'`.

Background: `lightweight-charts` (TradingView OSS) remains the explicit Phase-2 migration — current recharts stays for launch, API identical for `price_history` OHLCV.

---

## 6. Africa-native features — the part no competitor has (expanded)

### 6.1 NSE Dividend & Book-Closure Calendar v2
Add **alert-from-row** button (creates `price_alerts` 3 days before ex_date) + **premarket filter** (NSE 09:30-15:00 EAT) + filing PDF link.

### 6.2 MMF / T-Bill comparator + Fees & Goals
`RatesComparator.tsx` stays. **Add two new cards on `PortfolioPage.tsx`:**
- **Fees Tracker** (Wealthfolio pattern): sum from `fees_ledger`, show `fees / totalVal` drag (TER-like).
- **Goal Tracker** (M-Pesa framing, Ziidi KES 1 min): list `investment_goals` with progress bar, "Add KES 1,000 via M-Pesa" CTA placeholder.

### 6.3 KES-first + Swahili
`CurrencyContext.tsx` KES/USD toggle on Portfolio + Dashboard. **Add:** `LanguageContext` (`en`/`sw`) toggling top nav labels and `LearnPage` titles. This is 10 minutes of i18n with outsized perceived localization — no global competitor does Swahili.

---

## 7. Alerts & notifications engine v2 (TradingView superpowers)

Extend `price_alerts` (webhook_url + extra_conditions JSONB + watchlist_id):
- **Webhook**: on trigger POST `{symbol, price, condition, ts}` to `webhook_url` (Deno fetch, timeout 5s).
- **Multi-condition**: `extra_conditions: [{type:'rsi_below', threshold:30}, {type:'sma_cross','above'}]` — all must be true (AND).
- **Watchlist alerts**: single alert with `watchlist_id` (or `symbol='WATCHLIST'`) evaluates against all symbols in `watchlist_items` — triggers per symbol.
- **UI:** `PriceAlertModal.tsx` adds webhook URL input + "Add condition" row + "Apply to entire watchlist" checkbox. Also opened from Calendar dividend row.

Push via `push.ts` remains; WhatsApp path already in `check-alerts` stub.

---

## 8. Social proof v2 — Ideas stream (TradingView lite)

`CommunityPage.tsx` leaderboard stays. **Add:**
- **Ideas feed** (below leaderboard): list `ideas` with symbol pill + sentiment + likes placeholder, filter by NSE/US/blended.
- **Publish Idea modal**: from `MarketsPage` "💡 Publish Idea" button → writes to `ideas` (requires auth).
- **Watchlist share**: clicking leaderboard entry shows public watchlist + holdings mix (weights only, never cost basis).

---

## 9. Learn + regime + retention loops v2

`LearnPage.tsx` 4 modules stay. **Add:** `Regime indicator` banner on Dashboard (from `extendedMetrics.regimeLabel`) + **Goal-linked module**: completing "T-Bill vs MMF" suggests creating a Goal.

---

## 10. What we deliberately still don't include

- **Brokerage execution** (partner Hisa/Mali, not broker-dealer).
- **400 indicators** (12 correct remains the rule).
- **Options full chain** (Perplexity has options — we show spot only until NSE derivatives exist).

---

## 11. Consolidated build order v2

| # | Item | Depends | Unlocks |
|---|---|---|---|
| 1 | price_history/symbols_meta/market-sync + Realtime + sentiment-sync | — | Everything |
| 2 | Real Analytics (Sharpe/Beta + FIFO/WAC/TWRR/MWRR + cost-aware + regime + CSV export) | #1 | Best-feature page |
| 3 | Screener 2.1 (NL input + Pine-lite) + presets | #1 | Differentiator |
| 4 | Candlestick + 12 indicators + comparison + 2-chart | #1 | Visual parity |
| 5 | Alerts v2 (webhook + multi + watchlist) | #1-2 | Outside-app reach |
| 6 | Key Moments v2 (inline chart + FinBERT) | #1,5 | Most visible AI |
| 7 | Briefings + WhatsApp + suggested prompts per page | #6 | Google parity + Kenya moat |
| 8 | Import wizard + nat-lang describe | — | Onboarding |
| 9 | Citation + sentiment badges everywhere | — | Trust |
| 10 | NSE dividends + earnings audio/transcript + alert-from-row | #1 | Mali answer |
| 11 | Rates comparator + Fees + Goals (M-Pesa) | — | Africa fit |
| 12 | KES/Swahili toggle | #11 | Localization |
| 13 | Community + Ideas stream | #1 | Growth loop |
| 14 | Learn + regime tie-in | — | Retention |
| 15 | PWA offline + prediction embed + gov tracker mock | #1 | Polish + virality |

---

## 12. Scorecard post-v2

| Axis | v1 | v2 target |
|---|---|---|
| Live data trust | 85 | 92 |
| AI | 90 | 94 |
| Analysis | 90 | 93 |
| Screener | 85 | 90 |
| Alerts | 85 | 92 |
| Calendar/Earnings | 70 | 90 |
| Onboarding | 90 | 95 |
| Africa-fit | 95 | 96 |
| Trust | 90 | 94 |
| Social | 75 | 85 |
| PWA/Mobile | 40 | 85 |
| **Composite** | **87** | **94** |

Remaining gap to 100 is the NSE commercial data-licensing contract and live scale — engineering alone can't close it.

