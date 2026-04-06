

# Plan: Enhanced Auth, Agentic AI Chat, Settings API Keys, Screener Overhaul, and Improved Data APIs

## Summary

Five enhancements: (1) Add Google OAuth sign-in, (2) make the AI chatbot agentic with tool-calling capabilities, (3) add secure third-party API key management in Settings, (4) overhaul the Screener with dynamic dropdowns fetching live data, (5) improve existing edge functions for better real-time coverage.

---

## 1. Add Google OAuth Sign-In

**Files:** `src/pages/AuthPage.tsx`

- Use the Lovable Cloud managed Google OAuth (no extra config needed)
- Add a "Sign in with Google" button below the email/password form with a divider ("or")
- Import `lovable.auth.signInWithOAuth("google", ...)` from the lovable module
- Run the **Configure Social Auth** tool first to generate the lovable integration module

## 2. Agentic AI Chatbot

**Files:** `supabase/functions/ai-insights/index.ts`, `src/components/AiChatWidget.tsx`

### Edge Function Changes
- Add tool definitions to the AI model call for agentic capabilities:
  - `get_portfolio_summary` — returns user's holdings summary
  - `get_stock_quote` — fetches real-time quote for any symbol via Yahoo Finance
  - `get_market_news` — fetches latest news for a topic/symbol
  - `add_to_watchlist` — adds a symbol to user's watchlist (requires auth)
  - `get_chart_data` — fetches chart data for a symbol
- Implement a tool-calling loop: send messages → check for tool calls → execute tools → send results back → get final response
- Stream the final text response back to the client

### Widget Changes
- Add markdown rendering using `react-markdown` for rich AI responses (tables, lists, bold)
- Show a "tools used" indicator when the AI executes operations
- Add suggested quick actions: "Analyze my portfolio", "What's trending?", "Add AAPL to watchlist"
- Increase chat window size slightly for better readability

## 3. Secure Third-Party API Key Management in Settings

**Files:** `src/pages/SettingsPage.tsx`

- Replace the current mock "API Keys" tab with a **"Data Sources & API Keys"** section
- Add a form to securely input API keys for:
  - Alpha Vantage
  - CoinGecko Pro
  - NewsAPI
  - Polygon.io
  - Custom endpoints
- Store API keys in the `user_settings` table (JSONB `settings` field) — keys are encrypted client-side before storage using a simple hashing display (show only last 4 chars)
- Each key entry shows: provider name, masked key, status (connected/invalid), last tested timestamp
- Add a "Test Connection" button per key that calls the respective API to validate
- Show the existing "Connected Data Sources" section with real status based on stored keys

## 4. Screener Overhaul with Dynamic Dropdowns

**Files:** `src/pages/ScreenerPage.tsx`, `src/components/LiveSearchInput.tsx`

### Replace Static Filter Buttons with Smart Dropdowns
- **TYPE**: Dropdown with categories: All, Stocks, ETFs, Mutual Funds, Crypto, Bonds, Commodities, Forex, Indices, ADRs, REITs — sourced from Yahoo Finance `quoteType` taxonomy
- **COUNTRY/EXCHANGE**: Searchable dropdown listing 60+ exchanges fetched from a static comprehensive list (NYSE, NASDAQ, LSE, TSE, NSE Kenya, JSE, BSE India, KRX Korea, etc.) grouped by region
- **PERFORMANCE**: Dropdown with: All, Top Gainers, Top Losers, Most Active, 52W High, 52W Low, High Dividend
- **SECTOR**: New dropdown filter with all GICS sectors (Technology, Healthcare, Finance, Energy, etc.)

### Improved Search
- Make the search bar more prominent with larger size
- Add search result count and "Load more" pagination
- Show richer result cards: price, change%, volume, market cap, sector
- Add column sorting by clicking headers
- Add infinite scroll or "Load 50 more" button for large result sets

## 5. Improve Real-Time Data APIs

**Files:** `supabase/functions/market-quotes/index.ts`, `supabase/functions/market-news/index.ts`, `supabase/functions/market-search/index.ts`

### Market Quotes
- Increase default batch size from 20 to 50 symbols per request
- Add retry logic with exponential backoff on Yahoo Finance failures
- Return additional fields: volume, marketCap, pe ratio, dividend yield, 52W range
- Add a `trending` endpoint mode that returns Yahoo's trending tickers

### Market News
- Add category filtering: general, business, technology, crypto, forex, earnings
- Add symbol-specific news: pass `tickers` param to get news for specific holdings
- Return more metadata: sentiment score (positive/negative/neutral based on title), read time

### Market Search
- Increase `quotesCount` from 20 to 40
- Add result type filtering (only stocks, only crypto, etc.)
- Return additional metadata: sector, industry, market cap range

---

## Technical Details

- Google OAuth uses Lovable Cloud's managed credentials — zero configuration needed
- Agentic AI uses OpenAI-compatible tool-calling format via the Lovable AI gateway with `google/gemini-3-flash-preview`
- API keys in settings are stored in Supabase `user_settings.settings` JSONB — only masked values displayed in UI
- Screener dropdowns use Headless UI / custom select components with search built on top of existing shadcn/ui Select
- All edge function improvements are backward-compatible

## File Summary

| Action | File |
|--------|------|
| Edit | `src/pages/AuthPage.tsx` (add Google OAuth button) |
| Edit | `supabase/functions/ai-insights/index.ts` (add tool-calling loop) |
| Edit | `src/components/AiChatWidget.tsx` (markdown, quick actions, tool indicators) |
| Edit | `src/pages/SettingsPage.tsx` (API key management UI) |
| Edit | `src/pages/ScreenerPage.tsx` (dynamic dropdowns, improved search) |
| Edit | `supabase/functions/market-quotes/index.ts` (more fields, retry, trending) |
| Edit | `supabase/functions/market-news/index.ts` (categories, sentiment) |
| Edit | `supabase/functions/market-search/index.ts` (more results, filtering) |
| Tool | Configure Social Auth (for Google OAuth module) |

