# MEVEST — Intelligent Wealth Management Platform

A comprehensive, real-time wealth management and portfolio tracking platform built with React 18, TypeScript, Tailwind CSS, and Lovable Cloud. MEVEST provides institutional-grade tools for retail investors including real-time market data, AI-powered insights, and global asset coverage.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│                  Frontend (React 18 + Vite 5)    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Pages   │ │Components│ │ Contexts (State)  │ │
│  └──────────┘ └──────────┘ └──────────────────┘ │
│           │          │              │             │
│           └──────────┼──────────────┘             │
│                      ▼                            │
│          ┌──────────────────┐                     │
│          │ Supabase Client  │                     │
│          └────────┬─────────┘                     │
└───────────────────┼──────────────────────────────┘
                    ▼
┌──────────────────────────────────────────────────┐
│            Lovable Cloud (Supabase)              │
│  ┌────────────┐ ┌───────────┐ ┌──────────────┐  │
│  │  Database  │ │   Auth    │ │Edge Functions │  │
│  │ (Postgres) │ │(Email+OAuth)│ │(Deno Deploy) │  │
│  └────────────┘ └───────────┘ └──────────────┘  │
│         │                           │            │
│         ▼                           ▼            │
│  ┌────────────┐        ┌───────────────────┐     │
│  │   RLS      │        │  Yahoo Finance    │     │
│  │ Policies   │        │  API (proxy)      │     │
│  └────────────┘        └───────────────────┘     │
│                                     │            │
│                        ┌────────────┴──────┐     │
│                        │ Lovable AI Gateway│     │
│                        │ (Gemini 3 Flash)  │     │
│                        └───────────────────┘     │
└──────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Layer      | Technology                                             |
|------------|--------------------------------------------------------|
| Frontend   | React 18, TypeScript 5, Vite 5                        |
| Styling    | Tailwind CSS v3, shadcn/ui, Framer Motion             |
| Charts     | Recharts                                               |
| State      | React Context API, TanStack React Query               |
| Backend    | Lovable Cloud (Supabase) — Postgres, Auth, Edge Fns   |
| AI         | Lovable AI Gateway → Google Gemini 3 Flash Preview    |
| Market Data| Yahoo Finance API (proxied via Edge Functions)         |

---

## 📁 File Structure

### Pages (`src/pages/`)

| File               | Description                                                                 |
|--------------------|-----------------------------------------------------------------------------|
| `DashboardPage.tsx`| Main dashboard — portfolio stats, performance chart, allocation pie, market movers, risk metrics, AI insights panel |
| `PortfolioPage.tsx`| Detailed portfolio view with holdings table, sector breakdown, performance metrics |
| `MarketsPage.tsx`  | Unified markets page with tabs: Charts (interactive candlestick/line), Heatmap (sector treemap), Market Watch (live ticker table) |
| `ScreenerPage.tsx` | Global asset screener with live search, filterable dropdowns (Type, Exchange, Performance, Sector), column sorting, pagination |
| `WatchlistPage.tsx`| User's starred assets with live price cards, sparklines, and detail table |
| `NewsFeedPage.tsx` | Live financial news feed with category filtering, sentiment indicators, thumbnails |
| `AnalyticsPage.tsx`| Advanced portfolio analytics — Sharpe ratio, Beta, drawdown, sector correlation |
| `CalendarPage.tsx` | Earnings calendar and economic events |
| `SettingsPage.tsx` | User profile, preferences, API key management for third-party data sources |
| `AuthPage.tsx`     | Authentication — email/password signup/login + Google OAuth |
| `ResetPasswordPage.tsx` | Password reset flow |
| `NotFound.tsx`     | 404 page |
| `Index.tsx`        | Root layout — sidebar + topbar + page routing |

### Components (`src/components/`)

| File                  | Description                                                            |
|-----------------------|------------------------------------------------------------------------|
| `AiChatWidget.tsx`    | Floating agentic AI chatbot — executes portfolio/watchlist operations, fetches live quotes, streams markdown responses |
| `AiInsightsPanel.tsx` | Dashboard panel showing AI-generated portfolio health score, risk level, recommendations |
| `LiveSearchInput.tsx` | Unified live search component — debounced Yahoo Finance search with type filtering, used across Topbar, Add Holding, Screener |
| `AddHoldingModal.tsx` | Multi-step modal for adding holdings — different forms per asset type (stock, crypto, bond, T-bill, MMF, real estate, pension) with country-specific fields |
| `NavLink.tsx`         | Sidebar navigation link component |

### Layout (`src/components/layout/`)

| File          | Description                                              |
|---------------|----------------------------------------------------------|
| `Sidebar.tsx` | Collapsible sidebar navigation with mobile hamburger menu |
| `Topbar.tsx`  | Top bar with global search (⌘K), theme toggle, notifications, user menu |

### Contexts (`src/context/`)

| File                      | Description                                                         |
|---------------------------|---------------------------------------------------------------------|
| `AuthContext.tsx`          | Authentication state — user, session, signUp, signIn, signOut       |
| `PortfolioContext.tsx`     | Portfolio holdings CRUD — loads from DB, optimistic updates, listens for AI-triggered changes |
| `WatchlistContext.tsx`     | Watchlist management — add/remove symbols, persisted to DB          |
| `RealtimeMarketContext.tsx`| Real-time market data hub — polls Yahoo Finance every 30s, manages live quotes, simulated micro-movements, universal asset search |
| `ThemeContext.tsx`         | Light/dark theme toggle with system preference detection             |

### Edge Functions (`supabase/functions/`)

| Function        | Description                                                                  |
|-----------------|------------------------------------------------------------------------------|
| `ai-insights`   | **Agentic AI** — tool-calling loop (max 5 iterations) with 11 tools: `get_stock_quote`, `get_market_news`, `search_assets`, `add_holding`, `remove_holding`, `add_to_watchlist`, `remove_from_watchlist`, `get_portfolio_summary`, `get_chart_data`, `compare_stocks`, `get_trending`. Validates user auth via JWT for DB operations. |
| `market-search` | Global asset search via Yahoo Finance — returns symbol, name, exchange, type, sector, industry. Supports type filtering. |
| `market-quotes` | Batch quote fetcher — up to 50 symbols per request with retry logic. Returns price, change, volume, market cap, PE, EPS, dividend yield, 52-week range. Supports `trending` mode. |
| `market-chart`  | Historical chart data — supports 1d to 5y ranges with appropriate intervals. Returns OHLCV data points. |
| `market-news`   | Financial news aggregator — category filtering (general, crypto, tech, forex, earnings), ticker-specific news, sentiment analysis, thumbnails. |

### Data & API (`src/data/`, `src/lib/`)

| File               | Description                                               |
|--------------------|-----------------------------------------------------------|
| `market-data.ts`   | Static market data, sector performance, fear/greed index, ticker items |
| `api/market.ts`    | Market API client — wraps Supabase function invocations for search, quotes, chart, news |

---

## 🗄️ Database Schema

### `profiles`
| Column     | Type    | Description                   |
|------------|---------|-------------------------------|
| id         | UUID PK | Matches `auth.users.id`       |
| full_name  | text    | User's display name           |
| email      | text    | User's email                  |
| avatar_url | text    | Profile picture URL           |
| currency   | text    | Preferred currency (default: USD) |
| timezone   | text    | User's timezone               |

### `holdings`
| Column     | Type    | Description                   |
|------------|---------|-------------------------------|
| id         | UUID PK | Auto-generated                |
| user_id    | UUID    | Owner's auth user ID          |
| symbol     | text    | Ticker symbol (e.g., AAPL)    |
| name       | text    | Asset name                    |
| type       | text    | Asset type (stock, crypto, etf, bond) |
| shares     | numeric | Number of units               |
| cost_basis | numeric | Purchase price per unit        |
| country    | text    | Country code                  |

### `watchlist_items`
| Column  | Type    | Description              |
|---------|---------|--------------------------|
| id      | UUID PK | Auto-generated           |
| user_id | UUID    | Owner's auth user ID     |
| symbol  | text    | Ticker symbol            |
| added_at| timestamptz | When added            |

### `user_settings`
| Column   | Type    | Description                    |
|----------|---------|--------------------------------|
| id       | UUID PK | Auto-generated                 |
| user_id  | UUID    | Owner's auth user ID           |
| settings | JSONB   | API keys, preferences, etc.    |

All tables have **Row Level Security (RLS)** enabled. Users can only access their own data.

---

## ✨ Key Features

1. **Real-Time Market Data** — Live quotes polled every 30 seconds from Yahoo Finance via Edge Functions
2. **Global Asset Search** — Search any stock, ETF, crypto, bond, commodity across 45+ international exchanges
3. **Agentic AI Chatbot** — Conversational AI that can execute operations: add/remove holdings, manage watchlist, compare stocks, fetch live data
4. **AI Portfolio Insights** — Automated health scoring, risk analysis, and personalized recommendations
5. **Multi-Asset Portfolio** — Support for stocks, crypto, ETFs, bonds, T-bills, money market funds, real estate, pensions
6. **Country-Specific Forms** — Kenyan NSE stocks, T-bills, MMFs with local broker fields
7. **Interactive Charts** — Candlestick and line charts with multiple timeframes (1D to 5Y)
8. **Market Screener** — Filter by type, exchange, performance, sector with live global search
9. **Watchlist** — Star assets, track with live sparklines and price alerts
10. **News Feed** — Live financial news with sentiment analysis and category filtering
11. **Light/Dark Theme** — Full theme support with system preference detection
12. **Responsive Design** — Collapsible sidebar with hamburger menu for mobile
13. **Google OAuth** — One-click sign-in alongside email/password
14. **Secure API Key Storage** — Add third-party API keys (Alpha Vantage, CoinGecko, etc.) in Settings

---

## 🚀 Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

## 🔐 Environment Variables

Automatically configured by Lovable Cloud:

| Variable                        | Description                |
|--------------------------------|----------------------------|
| `VITE_SUPABASE_URL`           | Backend API URL            |
| `VITE_SUPABASE_PUBLISHABLE_KEY`| Public API key            |
| `VITE_SUPABASE_PROJECT_ID`    | Project identifier         |

Edge Function secrets (auto-provisioned):

| Secret                    | Description                    |
|--------------------------|--------------------------------|
| `SUPABASE_URL`           | Internal backend URL           |
| `SUPABASE_ANON_KEY`      | Anonymous access key           |
| `SUPABASE_SERVICE_ROLE_KEY`| Admin access for AI agent ops |
| `LOVABLE_API_KEY`        | AI Gateway access key          |

---

## 📄 License

Built with [Lovable](https://lovable.dev)
