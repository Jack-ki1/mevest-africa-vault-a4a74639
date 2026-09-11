# MEVEST Africa Vault — In-Depth Architecture Review & Full Transformation Plan

> **Date:** September 2026  
> **Target Codebase:** [`mevest-africa-vault`](file:///home/jackson11/projects/web/mevest-africa-vault)  
> **Source Platform:** Lovable AI (`lovable.dev`)  
> **Current Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind CSS, shadcn/ui, Supabase (Postgres, Auth, Edge Functions)

---

## Executive Summary

The **MEVEST Africa Vault** project is an institutional-grade retail wealth management concept designed for emerging (specifically Kenyan NSE & East African) and global asset tracking (stocks, ETFs, crypto, bonds, T-bills, MMFs, real estate).

However, **extracting the project directly from Lovable AI created immediate operational failure modes**. Lovable relies on a proprietary cloud runtime where environment variables, OAuth wrappers, AI gateways, and Deno edge functions are silently provisioned behind the scenes. When extracted to a standalone environment, the application is stripped of this managed substrate, leaving:

1. **A broken environment configuration:** The `.env` file was replaced with local PostgreSQL connection strings (`DATABASE_URL`), but the frontend is a pure client-side Vite SPA that communicates with Supabase APIs (`VITE_SUPABASE_URL`), causing all API and DB calls to fail silently.
2. **Proprietary Vendor Lock-in:** Code dependencies on `@lovable.dev/cloud-auth-js`, `lovable-tagger`, and `https://ai.gateway.lovable.dev/v1/chat/completions`.
3. **Severed Backend & Market Data Engine:** Six Deno Edge Functions in `supabase/functions/` are not running, and their data source (unauthenticated Yahoo Finance scrapers) suffers from IP blocking, missing session crumbs, and lack of API fallbacks.
4. **Architectural Frontend Flaws:** A state-based tab switcher in `Index.tsx` instead of true URL routing, monolithic bundling without code splitting (1.7 MB single chunk), chart timestamp duplication errors, and a watchlist bug that drops all non-hardcoded symbols.

This document delivers a **forensic codebase audit** and a **complete 5-phase transformation blueprint** to make MEVEST fully functional, cloud-agnostic, and production-ready.

---

## 1. System Architecture & Component Anatomy

```mermaid
flowchart TD
    subgraph Client ["Client Browser (React 18 + Vite 5)"]
        UI["UI Layer (shadcn/ui + Radix + Recharts)"]
        Router["Current: Tab State Switcher (Index.tsx)\nTarget: React Router v6 URL Routing"]
        Contexts["Context Hub\n(Auth, Portfolio, Watchlist, RealtimeMarket)"]
        SupabaseClient["Supabase JS Client\n(@supabase/supabase-js)"]
    end

    subgraph BackendGateway ["Backend & Service Layer"]
        DirectionChoice{"Architecture Choice"}
        SupabaseBackend["Option A: Native Supabase\n(Postgres + Auth + Deno Functions)"]
        NodeBackend["Option B: Standalone Node/Hono API\n(Express/Hono + Prisma + Direct DB)"]
    end

    subgraph ExternalServices ["External Providers"]
        AI["AI Model Gateway\n(Gemini 1.5/2.0 Flash / OpenAI Direct)"]
        MarketData["Market Data APIs\n(Yahoo Finance + AlphaVantage / Finnhub / CoinGecko)"]
        PostgresDB[("PostgreSQL Database\n(Profiles, Holdings, Watchlists, Snapshots)")]
    end

    Client --> DirectionChoice
    DirectionChoice --> SupabaseBackend
    DirectionChoice --> NodeBackend
    SupabaseBackend --> PostgresDB
    SupabaseBackend --> AI
    SupabaseBackend --> MarketData
    NodeBackend --> PostgresDB
    NodeBackend --> AI
    NodeBackend --> MarketData
```

### Key Modules Breakdown

| Module | Location | Purpose | Current Operational State |
| :--- | :--- | :--- | :--- |
| **Client Initialization** | [`src/integrations/supabase/client.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/src/integrations/supabase/client.ts) | Initializes `@supabase/supabase-js` client | ❌ **Broken:** Missing `VITE_SUPABASE_URL` in `.env` |
| **Cloud Auth Wrapper** | [`src/integrations/lovable/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/src/integrations/lovable/index.ts) | Proprietary Google/Apple/Microsoft OAuth | ❌ **Broken:** Relies on `@lovable.dev/cloud-auth-js` |
| **Agentic AI Chatbot** | [`src/components/AiChatWidget.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/components/AiChatWidget.tsx) | AI portfolio copilot with tool execution | ❌ **Broken:** Endpoint points to undefined URL + Lovable Gateway |
| **Realtime Market Hub** | [`src/context/RealtimeMarketContext.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/context/RealtimeMarketContext.tsx) | Live price polling & universal asset cache | ⚠️ **Degraded:** Falls back to ~50 static assets |
| **Portfolio Store** | [`src/context/PortfolioContext.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/context/PortfolioContext.tsx) | Holdings CRUD, Supabase sync, optimistic UI | ⚠️ **Flawed:** Sets price = cost basis upon DB fetch |
| **Watchlist Store** | [`src/context/WatchlistContext.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/context/WatchlistContext.tsx) | Watchlist items CRUD | ❌ **Bugged:** Page drops all assets outside static list |
| **Edge Functions** | [`supabase/functions/`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/) | 6 Deno functions for market data & AI | ❌ **Offline:** Not served in local dev environment |

---

## 2. In-Depth Defect & Gap Analysis

### Category A: Critical Blocker Issues (App Fails to Run or Connect)

#### 1. Mismatched `.env` Configuration & Architecture Inversion
* **File:** [`.env`](file:///home/jackson11/projects/web/mevest-africa-vault/.env)
* **What Happened:** Git diff reveals that `.env` previously contained:
  ```env
  VITE_SUPABASE_PROJECT_ID="fulgofnlmlmetlgidhup"
  VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOi..."
  VITE_SUPABASE_URL="https://fulgofnlmlmetlgidhup.supabase.co"
  ```
  This was replaced with:
  ```env
  DATABASE_URL="postgresql://devuser:devpassword@localhost:5432/devdb"
  PORT=3000
  NODE_ENV=development
  ```
* **Impact:** In Vite, only variables prefixed with `VITE_` are exposed to client code (`import.meta.env`). Node-style variables like `DATABASE_URL` are ignored. As a result, `client.ts` receives `undefined` for both URL and Key, causing all Supabase queries to fail on mount.

#### 2. Proprietary OAuth Lock-In (`@lovable.dev/cloud-auth-js`)
* **Files:** [`src/integrations/lovable/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/src/integrations/lovable/index.ts), [`src/pages/AuthPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/AuthPage.tsx#L70-L85)
* **Problem:** Social login executes `lovable.auth.signInWithOAuth("google")` using an internal Lovable cloud proxy.
* **Impact:** Clicking "Sign in with Google" throws network exceptions or authentication token rejection. Standard Supabase projects must use `supabase.auth.signInWithOAuth({ provider: 'google' })`.

#### 3. Proprietary AI Gateway (`ai.gateway.lovable.dev`)
* **File:** [`supabase/functions/ai-insights/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/ai-insights/index.ts#L391-L456)
* **Problem:** The AI chat function invokes `https://ai.gateway.lovable.dev/v1/chat/completions` using secret `LOVABLE_API_KEY`.
* **Impact:** Any AI query in `AiChatWidget` or `AiInsightsPanel` returns `500 AI not configured` or `401 Unauthorized`.

---

### Category B: High-Priority Functional & Logic Bugs

#### 4. The Watchlist "Ghost Asset" Bug
* **File:** [`src/pages/WatchlistPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/WatchlistPage.tsx#L21-L24)
* **Code:**
  ```typescript
  const liveAsset = getAsset(sym);
  const marketAsset = MARKET[sym];
  if (!liveAsset && !marketAsset) return null;
  ```
* **Problem:** `getAsset(sym)` in [`RealtimeMarketContext.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/context/RealtimeMarketContext.tsx#L214) ONLY checks the hardcoded `BUILTIN_ASSETS` dictionary.
* **Impact:** If a user searches for an asset globally (e.g., TSMC `TSM`, Palantir `PLTR`, or African stocks like `EQTY.NR`), successfully stars it into their watchlist in the database, and navigates to the Watchlist page, **the asset is completely hidden from the table**.

#### 5. Corrupted Chart Date Millisecond Duplication
* **Files:** [`supabase/functions/market-chart/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/market-chart/index.ts#L55), [`src/pages/MarketsPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/MarketsPage.tsx#L95)
* **Problem:** 
  1. The edge function converts Unix seconds to milliseconds: `t: t * 1000`.
  2. The frontend formats the date with: `new Date(p.t * 1000)`.
* **Impact:** The timestamp is multiplied by $10^6$, rendering dates in the year ~55,000 AD on chart X-axes.

#### 6. Multi-Asset Type Flattening in `AddHoldingModal`
* **File:** [`src/components/AddHoldingModal.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/components/AddHoldingModal.tsx#L124-L136)
* **Problem:** When adding Money Market Funds (MMF), Real Estate, or Pensions, the code overrides `type = 'stock'` and generates synthetic symbols (`MMF-CIC`, `RE-123456`).
* **Impact:** 
  - Non-equity investments pollute the equity holdings view and allocation charts.
  - The live quotes engine queries Yahoo Finance for `RE-123456`, which 404s continuously.

#### 7. Screener Default Sort State Mismatch
* **File:** [`src/pages/ScreenerPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/ScreenerPage.tsx#L57)
* **Problem:** State initializes to `sort = 'mktcap'`, but:
  - There is no `<option value="mktcap">` in the UI `<select>`.
  - The sorting comparator contains no branch for `'mktcap'`.
* **Impact:** On load, the table sort order is undefined and does not match the dropdown display.

#### 8. Fake API Key Validation in Settings
* **File:** [`src/pages/SettingsPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/SettingsPage.tsx#L154-L161)
* **Problem:** The test button checks `stored.key.length >= 8` and toasts "Connection valid" without hitting any endpoint. Furthermore, keys stored in `user_api_keys` are never consumed by any data fetcher.

---

### Category C: Architecture & Code Quality Issues

#### 9. State-Based Tab Switching vs. True URL Routing
* **File:** [`src/pages/Index.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/Index.tsx#L25-L51)
* **Problem:** The entire multi-page application runs on `const [page, setPage] = useState('dashboard')` instead of React Router routes.
* **Impact:**
  - Browser Back and Forward buttons do not work (pressing Back leaves the site).
  - Page refresh always resets back to Dashboard.
  - Users cannot bookmark or share links to `/markets/AAPL` or `/portfolio`.

#### 10. Monolithic 1.7 MB Bundle (No Route-Based Code Splitting)
* **File:** [`dist/assets/index-Bzf-_Zb2.js`](file:///home/jackson11/projects/web/mevest-africa-vault/dist/)
* **Problem:** Every single page and library (Recharts, Framer Motion, date-fns, Lucide icons, Markdown parsers) is loaded synchronously in a single bundle.
* **Impact:** Sub-optimal First Contentful Paint (FCP) and heavy mobile memory footprint.

#### 11. 68 ESLint Violations & Config Misalignment
* **File:** [`eslint.config.js`](file:///home/jackson11/projects/web/mevest-africa-vault/eslint.config.js)
* **Problem:** ESLint runs browser TypeScript lint rules over `supabase/functions/` (which are Deno scripts), producing 53 errors regarding `any` and Deno syntax, plus `require()` in `tailwind.config.ts`.

---

## 3. The Decoupling Strategy: Choosing Your Target Backend

Because Lovable Cloud was acting as both the database host, edge functions runtime, and AI proxy, you have two primary deployment architectures to choose from:

### Option 1: Native Supabase Backend (Recommended & Fastest Path)
Keep the existing client architecture, but point it to a standard, independent Supabase project (either Supabase Cloud free/pro tier or local self-hosted Supabase with Docker).

* **Pros:**
  - 100% compatibility with existing Postgres migrations, RLS policies, and triggers.
  - Zero frontend data-layer rewrites (`supabase.from('holdings')` works out of the box).
  - Edge functions can be deployed using standard `supabase functions deploy`.
* **Changes Needed:**
  - Provision a free project on [supabase.com](https://supabase.com).
  - Run the two existing SQL migrations in [`supabase/migrations/`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/migrations/).
  - Replace `ai.gateway.lovable.dev` in `supabase/functions/ai-insights/index.ts` with standard Google Gemini (`generativelanguage.googleapis.com`) or OpenAI (`api.openai.com`).
  - Configure standard Google OAuth in Supabase Auth Dashboard.

### Option 2: Full-Stack Express/Hono Node.js Backend
If you want to run purely on the local PostgreSQL database specified in your `.env` (`postgresql://devuser:devpassword@localhost:5432/devdb`) without Supabase:

* **Pros:** Complete control over your backend server without BaaS dependency.
* **Cons:** Requires creating a Node.js/TypeScript backend API server to handle Auth (JWT/Sessions), Postgres CRUD, Yahoo Finance proxying, and AI completions, plus updating frontend API calls.

---

## 4. Market Data Engine Overhaul

The current market data pipeline relies entirely on unauthenticated Yahoo Finance web scraping via Deno edge functions.

### Reliability Vulnerabilities
1. **IP Rate-Limiting / Cloud Blocking:** Yahoo Finance frequently blocks cloud IP addresses (AWS, Deno Deploy, Supabase, Cloudflare Workers) with HTTP 429 / 403 unless valid cookies (`A1`) and session crumbs are provided.
2. **African / NSE Data Gap:** While Kenyan tickers (e.g. `SCOM.NR`, `EQTY.NR`) exist on Yahoo Finance, liquidity and delayed reporting can cause stale or empty quote objects.

### Recommended Dual-Tier Market Engine
```mermaid
flowchart LR
    ClientReq["Client Quote Request\n(e.g., AAPL, BTC-USD, SCOM.NR)"] --> Cache["In-Memory / Redis Cache\n(TTL: 30s)"]
    Cache -->|Hit| Return["Return Cached Quote"]
    Cache -->|Miss| Primary["Primary: Yahoo Finance\n(with auto-crumb & chart fallback)"]
    Primary -->|Success| Store["Store in Cache"]
    Primary -->|Failure / Rate Limit| Fallback["Secondary Fallback:\nAlpha Vantage / Finnhub / CoinGecko"]
    Fallback --> Store
    Store --> Return
```

---

## 5. Master 5-Phase Transformation Plan

### Phase 1: Environment & Lovable Decoupling (Instant Unblock)
**Objective:** Restore database connectivity, remove proprietary Lovable packages, and enable standard OAuth.

1. **Clean `.env` Configuration:**
   - Restore `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
   - Add `.env.example` with documented keys.
2. **Remove Lovable Proprietary Packages:**
   - Uninstall `@lovable.dev/cloud-auth-js` and `lovable-tagger`.
   - Remove `componentTagger` from [`vite.config.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/vite.config.ts).
   - Delete [`src/integrations/lovable/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/src/integrations/lovable/index.ts).
3. **Switch to Standard Supabase OAuth:**
   - In [`src/pages/AuthPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/AuthPage.tsx), replace `lovable.auth.signInWithOAuth` with:
     ```typescript
     const { error } = await supabase.auth.signInWithOAuth({
       provider: 'google',
       options: { redirectTo: window.location.origin },
     });
     ```
4. **Fix ESLint Setup:**
   - Exclude `supabase/functions/**` from browser ESLint (or configure Deno-specific linting).
   - Fix `require()` in [`tailwind.config.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/tailwind.config.ts) by using ES `import tailwindcssAnimate from 'tailwindcss-animate'`.

---

### Phase 2: Frontend Modernization & Critical Bug Fixes
**Objective:** Replace state-based page switching with true URL routing, split bundles, and resolve data inconsistencies.

1. **React Router v6 URL Routing:**
   - Convert [`src/App.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/App.tsx) and [`src/pages/Index.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/Index.tsx) to standard nested layout routes:
     - `/` $\rightarrow$ Dashboard
     - `/portfolio` $\rightarrow$ Portfolio
     - `/markets` and `/markets/:symbol` $\rightarrow$ Interactive Charts & Watchlists
     - `/screener` $\rightarrow$ Asset Screener
     - `/news` $\rightarrow$ News Feed
     - `/analytics` $\rightarrow$ Portfolio Risk & Performance
     - `/calendar` $\rightarrow$ Earnings & Macro
     - `/watchlist` $\rightarrow$ Starred Assets
     - `/settings` $\rightarrow$ Profile & Data Providers
2. **Code Splitting via `React.lazy` & `Suspense`:**
   - Dynamically import pages to drop initial bundle size from 1.7 MB to < 250 KB.
3. **Resolve Watchlist Ghost Asset Bug:**
   - In [`src/pages/WatchlistPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/WatchlistPage.tsx), fetch quotes dynamically for *all* user watchlist symbols rather than filtering against `BUILTIN_ASSETS`.
4. **Fix Chart Timestamp Bug:**
   - Standardize timestamps so that millisecond conversion occurs exactly once across [`market-chart/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/market-chart/index.ts) and [`MarketsPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/MarketsPage.tsx).
5. **Fix Screener Sorting & Add Holding Types:**
   - Add `'mktcap'` option to `<select>` in [`ScreenerPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/ScreenerPage.tsx).
   - Support proper asset types (`'mmf'`, `'real_estate'`, `'pension'`) in [`PortfolioContext.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/context/PortfolioContext.tsx) and database schema.

---

### Phase 3: Market Data Engine & Local Dev Mocking
**Objective:** Ensure zero crashes and seamless local development regardless of external API rate-limits.

1. **Local Edge Function Emulator / Fallback Mode:**
   - Enhance [`src/lib/api/market.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/src/lib/api/market.ts) so that if Supabase Edge Functions are unreachable or return errors, it gracefully falls back to local data simulations without crashing UI components.
2. **Yahoo Finance Crumb & Resilient Scraping:**
   - Update Edge functions with cookie/crumb acquisition logic to prevent 401/429 errors from Yahoo Finance.
3. **Multi-Provider Fallback Integration:**
   - Wire user API keys entered in Settings (Alpha Vantage, CoinGecko, Finnhub) into the live market fetcher.

---

### Phase 4: Direct AI Agent Integration
**Objective:** Restore the Agentic AI assistant (`AiChatWidget` and `AiInsightsPanel`) with direct, independent LLM provider access.

1. **Migrate Edge Function to Direct LLM API:**
   - In [`supabase/functions/ai-insights/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/ai-insights/index.ts), replace the Lovable Gateway URL with either:
     - **Google Gemini API Direct:** `https://generativelanguage.googleapis.com/v1beta/chat/completions` (using `GEMINI_API_KEY`)
     - **OpenAI Direct / OpenRouter:** `https://api.openai.com/v1/chat/completions` (using `OPENAI_API_KEY`)
2. **Preserve Agentic Tool Calling:**
   - Maintain the 11 function-calling tools (`get_stock_quote`, `search_assets`, `add_holding`, `remove_holding`, `add_to_watchlist`, etc.) with user JWT validation.
3. **True Server-Sent Events (SSE) Streaming:**
   - Clean up SSE formatting for smooth, low-latency markdown streaming in the chat bubble.

---

### Phase 5: Production Readiness, Analytics & Deployment
**Objective:** Finalize portfolio analytics, database cron snapshots, automated testing, and CI/CD containerization.

1. **Populate Historical Portfolio Snapshots:**
   - Wire up [`supabase/functions/portfolio-snapshot/index.ts`](file:///home/jackson11/projects/web/mevest-africa-vault/supabase/functions/portfolio-snapshot/index.ts) as a daily scheduled pg_cron / edge webhook.
   - Fetch real snapshot rows in [`DashboardPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/DashboardPage.tsx) and [`AnalyticsPage.tsx`](file:///home/jackson11/projects/web/mevest-africa-vault/src/pages/AnalyticsPage.tsx) to calculate real Sharpe Ratio, Max Drawdown, Beta, and CAGR.
2. **Automated Vitest & Playwright Suite:**
   - Expand unit tests for `PortfolioContext`, `RealtimeMarketContext`, and currency calculations.
   - Run end-to-end authentication and holding transaction tests.
3. **Containerization & Deployment:**
   - Add a multi-stage production `Dockerfile` with Nginx reverse proxy.
   - Configure deployment manifests for Vercel, Netlify, or Docker Swarm/Kubernetes.

---

## 6. Implementation Readiness Matrix

| Task | Priority | Effort | Dependency | Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Restore `.env` & Supabase credentials** | P0 | 15 mins | Supabase Project | Unblocks entire app |
| **Decouple Lovable Auth & Tagger** | P0 | 30 mins | None | Removes proprietary lock-in |
| **Fix Watchlist & Chart Timestamp bugs** | P0 | 45 mins | None | Eliminates silent data corruption |
| **Convert `Index.tsx` to React Router v6** | P1 | 2 hours | None | Browser history, deep-linking |
| **Replace Lovable AI Gateway with Direct Gemini/OpenAI** | P1 | 1.5 hours | API Key | Restores Agentic AI Copilot |
| **Route-level Code Splitting (`React.lazy`)** | P2 | 1 hour | React Router | Cuts bundle size by ~85% |
| **Wire up `portfolio_snapshots` & Analytics** | P2 | 3 hours | Postgres cron | Delivers true financial analytics |
| **Multi-Provider Market Fallbacks** | P3 | 3 hours | API Keys | 99.9% market data uptime |
