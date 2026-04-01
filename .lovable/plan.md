

# Plan: Unified Search, Merged Markets Page, and Live Data Everywhere

## Summary

1. **Fix and supercharge all search bars** — every search input (Topbar, Add Holding, Screener) will use the same live Yahoo Finance search engine via the `market-search` edge function, returning unlimited global results.
2. **Merge Charts + Heatmap + Market Watch** into a single tabbed "Markets" page with three sub-views (Charts, Heatmap, Market Watch), reducing sidebar clutter.
3. **Make all market-facing sections use live API data** — Dashboard movers, Heatmap prices, Charts OHLCV, and Screener quotes will all pull from the `market-quotes` and `market-chart` edge functions instead of static mock data.

---

## Changes

### 1. Unified Live Search Component

**New file: `src/components/LiveSearchInput.tsx`**

A reusable search input component that:
- Calls `market-search` edge function with 300ms debounce
- Shows dropdown with symbol, name, exchange, and type for each result
- Supports `onSelect(symbol, name)` callback
- Used in: Topbar search, Add Holding symbol field, and Screener search bar
- Returns up to 20 results from any global exchange

### 2. Improve Topbar Search (`src/components/layout/Topbar.tsx`)

- Replace the current dual local+live search with the new `LiveSearchInput` component
- Remove the separate local results section — all results come from the live API
- Keep the ⌘K shortcut and navigate-to-charts behavior

### 3. Improve Add Holding Modal (`src/components/AddHoldingModal.tsx`)

- Replace the static text input for symbol/name with `LiveSearchInput`
- When user selects a result, auto-fill symbol, name, exchange, and fetch the current price via `market-quotes`
- Works for any asset worldwide — Korean, Brazilian, Indian stocks all searchable

### 4. Merge Charts + Heatmap + Market Watch into "Markets" Page

**Modified file: `src/pages/MarketsPage.tsx`** (rename from one of the existing files)

- Single page with 3 tabs: **Charts** | **Heatmap** | **Market Watch**
- Charts tab: current ChartsPage content, but with `LiveSearchInput` replacing the static symbol dropdown, and OHLCV/fundamentals pulled live from `market-quotes`
- Heatmap tab: current HeatmapPage content, with live prices from `market-quotes` replacing static `SECTOR_HEATMAP` data
- Market Watch tab: current MarketWatchPage content (already live)

**Sidebar update (`src/components/layout/Sidebar.tsx`):**
- Remove separate Charts, Heatmap, Market Watch entries
- Add single "Markets" entry under the Markets section

**Index update (`src/pages/Index.tsx`):**
- Route `markets` to the new merged page
- Remove old individual routes

### 5. Live Data for Dashboard (`src/pages/DashboardPage.tsx`)

- Market Movers section: fetch top gainers/losers from `market-quotes` using a curated list of ~30 symbols (S&P large caps) instead of static mock data
- Sector performance: keep as simulated (no free API for sector data), but refresh from allAssets live prices
- Fear & Greed: keep as simulated gauge (no free API)

### 6. Live Data for Charts Tab (within merged Markets page)

- Replace `genLine()` mock chart data with real historical data from `market-chart` edge function
- OHLCV panel: show real open/high/low/close/volume from the quote data
- Fundamentals panel: show real market cap, P/E, 52W high/low from quote data
- Technical indicators (MA, RSI, MACD, BB, FIB) calculated from real chart points

### 7. Live Data for Heatmap Tab

- Fetch quotes for heatmap symbols via `market-quotes` on mount
- Color tiles based on real `changePercent` values
- Keep treemap layout logic unchanged

---

## Technical Details

- **LiveSearchInput** uses `marketApi.search()` internally with `useEffect` + debounce timer
- Charts tab calls `marketApi.getChart(symbol, range, interval)` and transforms `ChartPoint[]` into Recharts-compatible data
- Range/interval mapping: `1D→1d/5m`, `1W→5d/15m`, `1M→1mo/1d`, `3M→3mo/1d`, `1Y→1y/1wk`
- Heatmap fetches ~20 symbols on mount via `marketApi.getQuotes()`
- All API calls go through existing edge functions (no new backend needed)
- Error handling: fall back to simulated data if API calls fail

## Files Modified
- `src/components/LiveSearchInput.tsx` (new)
- `src/pages/MarketsPage.tsx` (new — merged page)
- `src/components/layout/Topbar.tsx` (use LiveSearchInput)
- `src/components/AddHoldingModal.tsx` (use LiveSearchInput for symbol)
- `src/components/layout/Sidebar.tsx` (merge nav items)
- `src/pages/Index.tsx` (update routing)
- `src/pages/ScreenerPage.tsx` (use LiveSearchInput)
- `src/pages/DashboardPage.tsx` (live market movers)

## Files Removed
- `src/pages/ChartsPage.tsx` (merged into MarketsPage)
- `src/pages/HeatmapPage.tsx` (merged into MarketsPage)
- `src/pages/MarketWatchPage.tsx` (merged into MarketsPage)

