

# Plan: Agentic AI, Enhanced APIs/Search, Real-Time Data, and README Documentation

## Summary

Four workstreams: (1) Make the AI chatbot fully agentic with execution capabilities (add/remove holdings, manage watchlist, navigate app, analyze charts), (2) improve all APIs and search components, (3) ensure real-time data across all sections, (4) write a comprehensive README.

---

## 1. Fully Agentic AI Chatbot

### Edge Function (`supabase/functions/ai-insights/index.ts`)

Add new tool definitions to the existing tool-calling loop:

- **`add_holding`** — Add a stock/asset to user's portfolio (params: symbol, shares, cost_basis). Executes a Supabase insert using the service role key + user auth token.
- **`remove_holding`** — Remove a holding by symbol.
- **`add_to_watchlist`** — Add symbol to watchlist via Supabase insert.
- **`remove_from_watchlist`** — Remove symbol from watchlist.
- **`get_portfolio_summary`** — Returns the user's full portfolio from the `holdings` table.
- **`get_chart_data`** — Fetches chart data for a symbol/range via Yahoo Finance.
- **`compare_stocks`** — Fetches quotes for multiple symbols side-by-side.
- **`get_trending`** — Fetches Yahoo Finance trending tickers.

Changes: Accept an auth token from the client, validate it to get user_id, use Supabase client with service role to execute DB operations on behalf of the user. Increase tool-calling loop from 3 to 5 iterations.

### Widget (`src/components/AiChatWidget.tsx`)

- Pass the user's auth token in the request so the edge function can execute DB operations.
- Show tool execution indicators (e.g., "Adding AAPL to portfolio..." with a spinner).
- Add more quick actions: "Add AAPL to my portfolio", "Remove TSLA from watchlist", "Compare AAPL vs MSFT".
- After a tool execution that modifies data (add/remove holding), trigger a context refresh so the UI updates immediately.
- Add a "clear chat" button in the header.

## 2. Improve All APIs and Search

### Edge Functions

**`market-search/index.ts`**:
- Accept optional `type` filter param (already partially there but improve).
- Return sector, industry, and exchange display name in results.
- Handle edge cases for empty/short queries better.

**`market-quotes/index.ts`**:
- Already has retry logic and trending mode. Add a `screener` mode that accepts filters (type, exchange, performance) and returns matching symbols from Yahoo Finance screener API.

**`market-news/index.ts`**:
- Add `symbol` param for ticker-specific news.
- Return image thumbnails when available.

### Search Components

**`LiveSearchInput.tsx`**:
- Accept `type` filter prop to narrow results (e.g., only crypto, only stocks).
- Show price and change% inline in search results when available (fetch a quick quote batch for top results).
- Increase max results from 20 to 30.

**`AddHoldingModal.tsx`**:
- Pass the selected `assetType` as a `type` filter to `LiveSearchInput` so searching for "BTC" in crypto mode only shows crypto results.
- Auto-detect country/exchange from the search result and update the country dropdown.

**`ScreenerPage.tsx`**:
- Make the search bar trigger live API search (currently it filters local `allAssets` only). Use `LiveSearchInput` logic to search globally when the local filter yields few results.
- Add sort-by-column (click headers to sort by price, change%, name).
- Add a "Fetch live quotes" button that batch-fetches current prices for displayed results.

## 3. Real-Time Data Everywhere

**`RealtimeMarketContext.tsx`**:
- Reduce polling interval from current value to 30 seconds for core symbols.
- Add user's holdings symbols to the poll list automatically so portfolio values update live.
- Add watchlist symbols to the poll list.

**`DashboardPage.tsx`**:
- Replace the simulated `dayChg` calculation with actual live change data from `prices`.
- Replace `genLine()` mock chart with real portfolio history (or at minimum, use real current values as the endpoint).
- Market Movers section: if live data is available from `allAssets`, sort by `chgPct` to show real gainers/losers.

**`MarketsPage.tsx`**:
- Already uses live chart data. Ensure the heatmap tab refreshes on a timer (every 60s).
- Market Watch tab: add auto-refresh indicator and countdown.

**`WatchlistPage.tsx`**:
- Show live sparkline prices using real data from `prices` context.

## 4. Comprehensive README

**`README.md`** — Complete rewrite documenting:

- Project overview and vision (MEVEST wealth management platform)
- Tech stack (React 18, Vite 5, Tailwind CSS, TypeScript, Lovable Cloud)
- Architecture diagram (text-based)
- File structure with descriptions of every major file:
  - Pages (Dashboard, Portfolio, Markets, Screener, Watchlist, News, Analytics, Calendar, Settings, Auth)
  - Components (AiChatWidget, AiInsightsPanel, LiveSearchInput, AddHoldingModal, Sidebar, Topbar)
  - Contexts (Auth, Portfolio, Watchlist, RealtimeMarket, Theme)
  - Edge Functions (ai-insights, market-search, market-quotes, market-chart, market-news)
  - Data layer (market-data.ts, market.ts API client)
- Features list (auth, portfolio management, live search, AI chatbot, real-time data, screener, news)
- Database schema (profiles, holdings, watchlist_items, user_settings)
- Deployment instructions
- Environment variables reference

---

## Technical Details

- Agentic DB operations use the `SUPABASE_SERVICE_ROLE_KEY` secret (already available) with the user's JWT extracted from the request Authorization header to validate identity before executing.
- Tool execution indicators use a `toolStatus` state in the widget that shows which tool is running.
- The `type` filter for search is passed through to the `market-search` edge function which already has the `typeMap` filtering logic.
- Real-time polling adds dynamic symbols (holdings + watchlist) to the core symbols list on each interval.

## File Summary

| Action | File |
|--------|------|
| Edit | `supabase/functions/ai-insights/index.ts` (add 5+ new tools, auth handling) |
| Edit | `src/components/AiChatWidget.tsx` (tool indicators, auth token, context refresh) |
| Edit | `src/components/LiveSearchInput.tsx` (type filter, richer results) |
| Edit | `src/components/AddHoldingModal.tsx` (pass type filter to search) |
| Edit | `src/pages/ScreenerPage.tsx` (global search, column sorting) |
| Edit | `src/pages/DashboardPage.tsx` (real data for movers, day change) |
| Edit | `src/context/RealtimeMarketContext.tsx` (dynamic symbol polling) |
| Edit | `supabase/functions/market-search/index.ts` (return richer metadata) |
| Edit | `supabase/functions/market-news/index.ts` (ticker-specific news) |
| Rewrite | `README.md` (comprehensive documentation) |

