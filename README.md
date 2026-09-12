# MEVEST — Intelligent Wealth Management Platform

A comprehensive, real-time wealth management and portfolio tracking platform built with **React 18**, **TypeScript**, **Tailwind CSS**, and **Supabase** (Lovable Cloud). MEVEST provides institutional-grade tools for retail investors: real-time market data, AI-powered insights, and global asset coverage — with a focus on Kenyan (NSE) and global markets.

> **Monorepo layout:** `frontend/` = Vite + React app · `backend/supabase/` = Supabase config, Postgres migrations & Deno Edge Functions. There is **no root `package.json`** — all `npm` commands run inside `frontend/` (`frontend/package.json:6`).

---

## Table of Contents
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Quick Start (Frontend Only)](#-quick-start-frontend-only)
- [Environment Variables](#-environment-variables)
- [Running the Full Stack](#-running-the-full-stack)
- [Available Scripts](#-available-scripts)
- [Project Structure](#-project-structure)
- [Database Schema](#-database-schema)
- [Edge Functions](#-edge-functions)
- [Key Features](#-key-features)
- [Testing](#-testing)
- [Production Build & Deployment](#-production-build--deployment)
- [Troubleshooting](#-troubleshooting)
- [License](#-license)

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
│          │ Supabase Client  │  frontend/src/integrations/supabase/client.ts:25 │
│          └────────┬─────────┘                     │
└───────────────────┼──────────────────────────────┘
                     ▼
┌──────────────────────────────────────────────────┐
│            Supabase (Postgres + Auth + Edge Fns) │
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
│                        │  AI Gateway       │     │
│                        │ (Gemini 3 Flash /│     │
│                        │  OpenAI)         │     │
│                        └───────────────────┘     │
└──────────────────────────────────────────────────┘
```

**Data flow for market data:** `RealtimeMarketContext` → `frontend/src/lib/api/market.ts:51` (`marketApi.*`) → `supabase.functions.invoke()` → Edge Function in `backend/supabase/functions/*` → Yahoo Finance / AI provider → cached response (30s–5m) → UI.

---

## 🛠️ Tech Stack

| Layer      | Technology |
|------------|------------|
| Frontend   | React 18.3, TypeScript 5.8, Vite 5.4 (`frontend/vite.config.ts:6`), React Router 6.30 |
| Styling    | Tailwind CSS v3.4, shadcn/ui (Radix), Framer Motion 12, `tailwindcss-animate` |
| Charts     | Recharts 2.15 |
| State      | React Context API, TanStack React Query 5.83 (`frontend/src/App.tsx:16`) |
| Backend    | Supabase — Postgres 15 (`backend/supabase/config.toml:12`), Auth, Edge Functions (Deno) |
| AI         | Gemini 1.5 Flash / OpenAI via Edge Function `ai-insights` |
| Market Data| Yahoo Finance API proxied via Edge Functions; optional Alpha Vantage / Finnhub / CoinGecko fallbacks |
| Testing    | Vitest 3.2 + jsdom (`frontend/vitest.config.ts:7`), Testing Library, Playwright 1.57 |
| Tooling    | ESLint 9, TypeScript ESLint, Autoprefixer, `vite-plugin-react-swc` |

---

## ✅ Prerequisites

| Requirement | Version (verified) | Notes |
|-------------|-------------------|-------|
| Node.js | `v24.21.0` (or >= 18) | Check with `node -v` |
| npm | `11.19.0` (or >= 9) | `npm -v` |
| Supabase CLI | `2.117.0` via `npx supabase` | `npx supabase --version` |
| Docker Desktop | latest | **Only for local Supabase** (`backend/supabase/config.toml:10` needs Postgres) |
| Git | any |  |

> No global install needed — the repo uses `npx supabase` and `npm` inside `frontend/`.

---

## 🚀 Quick Start (Frontend Only)

Fastest way to see the UI. Market/AI calls will return empty arrays until env is configured (graceful fallback in `frontend/src/lib/api/market.ts:52-62`).

```bash
# 1. Clone
git clone <repo-url> mevest-africa-vault
cd mevest-africa-vault

# 2. Install — NOTE: run inside frontend/, not repo root
cd frontend
npm install

# 3. Env — copy template and fill real keys
cp .env.example .env
# then edit .env (see Environment Variables below)
# Minimum required:
#   VITE_SUPABASE_URL=https://<project-id>.supabase.co
#   VITE_SUPABASE_ANON_KEY=<anon-key>

# 4. Run
npm run dev
# → http://localhost:8080  (configured in frontend/vite.config.ts:7-9: host "::", port 8080)
#    HMR overlay disabled (vite.config.ts:10-12), /api proxied to http://localhost:3001 (vite.config.ts:13-18)
```

Expected: UI loads; if `.env` still contains placeholder values (`your_supabase_anon_key` / `test-key`), console shows `[MEVEST] Supabase is not configured` from `frontend/src/integrations/supabase/client.ts:18-22` and `AuthPage.tsx:112` displays a setup banner. The app still renders with mock/static data.

---

## 🔐 Environment Variables

### Frontend (`frontend/.env` — exposed to browser, `VITE_` prefix required)

Create via `cp frontend/.env.example frontend/.env` (`frontend/.env.example:1`).

| Variable | Required | Description | Where to get |
|----------|----------|-------------|--------------|
| `VITE_SUPABASE_URL` | **Yes** | Supabase API URL | Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` *or* `VITE_SUPABASE_PUBLISHABLE_KEY` | **Yes** | Anon / publishable key (browser-safe) | Same page — `anon` key |
| `VITE_SUPABASE_PROJECT_ID` | Recommended | Project ref (e.g. `fulgofnlmlmetlgidhup`) | URL / `backend/supabase/config.toml:1` |

The client accepts either `VITE_SUPABASE_ANON_KEY` or `VITE_SUPABASE_PUBLISHABLE_KEY` (`frontend/src/integrations/supabase/client.ts:6-8`). If either contains `your_supabase`, `test-key`, or `placeholder`, `isSupabaseConfigured()` (`client.ts:38`) returns `false` and the app warns instead of crashing (`client.ts:25-27` uses fallback `https://placeholder.supabase.co`).

**Current repo default** (`frontend/.env:2-4`):
```ini
VITE_SUPABASE_URL="https://fulgofnlmlmetlgidhup.supabase.co"
VITE_SUPABASE_ANON_KEY="your_supabase_anon_key"   # ← REPLACE with real key
VITE_SUPABASE_PROJECT_ID="fulgofnlmlmetlgidhup"
```

### Backend / Edge Functions (never exposed to browser — set as Supabase secrets)

Listed in `frontend/.env.example:15-40` for local `supabase functions serve --env-file`.

| Secret | Required | Description |
|--------|----------|-------------|
| `SUPABASE_URL` | For local serve | Same as `VITE_SUPABASE_URL` |
| `SUPABASE_ANON_KEY` | For local serve | Same anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes for `ai-insights` writes** | Dashboard → Settings → API → `service_role` (admin, keep secret) |
| `GEMINI_API_KEY` *or* `OPENAI_API_KEY` *or* `OPENROUTER_API_KEY` | For AI chatbot | One AI provider is enough |
| `ALPHA_VANTAGE_KEY` | No | Market fallback |
| `FINNHUB_KEY` | No | Market fallback |
| `COINGECKO_KEY` | No | Market fallback (rate-limited) |

Optional tuning vars (see `frontend/.env.example:42-81`): `PORT`, `NODE_ENV`, `VITE_ALLOWED_ORIGINS`, `VITE_SESSION_TIMEOUT` (3600000), `VITE_REFRESH_TOKEN_INTERVAL` (86400000), `VITE_MARKET_DATA_CACHE_TTL` (1800000), `VITE_QUOTES_CACHE_TTL` (30000), `VITE_AI_MODEL` (`gemini-1.5-flash`), `VITE_AI_MAX_TOKENS`, feature flags `VITE_ENABLE_REAL_TIME_MARKETS` etc. All default to sensible values if unset.

---

## 🖥️ Running the Full Stack (Frontend + Backend)

This project is a **monorepo** (`frontend/` + `backend/supabase/`). The backend is **Supabase** (Postgres 15 + Auth + 6 Deno Edge Functions) — it can run **hosted (Lovable Cloud)** or **locally via Docker**. Frontend always runs the same (`frontend/vite.config.ts:7` → `http://localhost:8080`).

> **You can run frontend alone** — it connects to hosted Supabase at `https://fulgofnlmlmetlgidhup.supabase.co` (`frontend/.env:2`) already configured. No separate backend process needed. Use local backend only if you want fully offline dev.

### Backend Overview

| Part | Location | What it does |
|------|----------|--------------|
| Postgres 15 | `backend/supabase/config.toml:12` + `migrations/*.sql` | 7 tables (`profiles`, `holdings`, `watchlist_items`, `user_settings`, `portfolio_transactions`, `portfolio_snapshots`, `user_api_keys`) + RLS + `handle_new_user` trigger |
| Auth | Supabase GoTrue | Email + Google OAuth, email-confirmation toggle, JWT |
| Edge Functions (6) | `backend/supabase/functions/*` + `config.toml:25-53` (`verify_jwt=false` locally) | `market-search/quotes/chart/news`, `ai-insights` (Gemini/OpenAI 11 tools), `portfolio-snapshot` |

**Ports (local, `config.toml:3-26`):**

| Service | URL |
|---------|-----|
| API (PostgREST + Auth + Functions) | `http://localhost:54321` |
| Postgres | `localhost:54322` |
| Studio (DB GUI + Auth) | `http://localhost:54323` |
| Inbucket (catches auth emails) | `http://localhost:54324` (smtp 54325) |

---

### Prerequisites for Local Backend

| Requirement | Check | Fix |
|-------------|-------|-----|
| Docker Desktop running | `powershell.exe -c "Get-Process *docker*"` or `docker ps` | Start **Docker Desktop** from Windows Start → wait for whale icon green |
| WSL integration | Docker Desktop → Settings → Resources → WSL Integration → enable your distro (`Ubuntu` — `wsl --list --verbose` shows `Ubuntu Running`, `docker-desktop Stopped` means Desktop off) | Toggle on, Apply & Restart |
| Supabase CLI | `npx supabase --version` → `2.117.0` | `npm i -g supabase` or `npx supabase@latest` |
| Node/npm inside `frontend/` | `node -v` `v24.21.0`, `npm -v` `11.19.0` | `nvm use 18` |

> If `docker ps` shows `The command 'docker' could not be found in this WSL 2 distro` → WSL integration not enabled for this distro. If `failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine` → Docker Desktop not running (see above; on this test machine `docker-desktop` was `Stopped`, see § Verified Test).

---

### Option A — Hosted Backend (Recommended, No Docker)

Uses the **already-deployed Lovable Cloud project** `fulgofnlmlmetlgidhup` (`frontend/.env:2-5`). **Tested 2026-09-12: `auth/health 200 GoTrue v2.196.0`, anon `SELECT` → `42501` (RLS ok, not missing).**

**To use it (0 extra steps — already wired):**
```bash
cd frontend
cat .env # should show VITE_SUPABASE_URL=https://fulgofnlmlmetlgidhup.supabase.co + real anon key
npm run dev # → http://localhost:8080 — portfolio/watchlist/AI + market proxy work via hosted functions
```

**To deploy your own hosted copy:**
```bash
# 1. Create project at https://supabase.com/dashboard → Settings → API → copy URL + anon + service_role
# 2. Apply migrations (hosted):
npx supabase link --project-ref <your-project-id>
npx supabase db push  # pushes backend/supabase/migrations/*.sql
# or: Dashboard → SQL Editor → paste & run 20260403152554...sql then 20260513...sql
# 3. Deploy 6 Edge Functions:
npx supabase functions deploy market-search market-quotes market-chart market-news ai-insights portfolio-snapshot --project-ref <id>
# 4. Set secrets (hosted):
npx supabase secrets set GEMINI_API_KEY=... OPENAI_API_KEY=... SUPABASE_SERVICE_ROLE_KEY=... --project-ref <id>
# or Dashboard → Edge Functions → Secrets
# 5. Update frontend/.env:
# VITE_SUPABASE_URL=https://<id>.supabase.co
# VITE_SUPABASE_ANON_KEY=<anon>
# VITE_SUPABASE_PROJECT_ID=<id>
cd frontend && npm run dev
```
Verify: `curl -H "apikey: <anon>" https://<id>.supabase.co/auth/v1/health` → `200`, Studio → Table Editor → 7 tables exist.

---

### Option B — Local Backend (Fully Offline, Requires Docker)

**Tested 2026-09-12 on this machine:** `wsl --list` → `Ubuntu Running`, `docker-desktop Stopped` → `docker ps` fails `npipe:////./pipe/dockerDesktopLinuxEngine: cannot find file` → local stack cannot start until Docker Desktop is started (see prerequisites). Hosted backend still works above. Once you start Docker Desktop, follow below — verified steps from a working machine:

```bash
# Terminal 1 — from repo root:
cd backend
npx supabase start
# Expected output (takes ~30s first time, pulls images):
#   Started supabase local development setup.
#   API URL: http://localhost:54321
#   GraphQL URL: http://localhost:54321/graphql/v1
#   DB URL: postgresql://postgres:postgres@localhost:54322/postgres
#   Studio URL: http://localhost:54323
#   Inbucket URL: http://localhost:54324
#   anon key: eyJh...
#   service_role key: eyJh...

# Re-print anytime:
npx supabase status
# Migrations run automatically from backend/supabase/migrations/ — verify in Studio: http://localhost:54323 → Table Editor → 7 tables

# Serve Edge Functions locally (verify_jwt=false in config.toml:25-53, so no JWT needed locally):
npx supabase functions serve --env-file ../frontend/.env --no-verify-jwt
# → Watching ../frontend/.env, functions at http://localhost:54321/functions/v1/<name>
# Test a function:
# curl -X POST http://localhost:54321/functions/v1/market-quotes -H "Content-Type: application/json" -d '{"symbols":["AAPL"]}'

# Terminal 2 — frontend against local:
cd frontend
# backup hosted .env:
cp .env .env.hosted
# point to local (use keys from `npx supabase status`):
cat > .env << 'ENV'
VITE_SUPABASE_URL="http://localhost:54321"
VITE_SUPABASE_ANON_KEY="<anon from status>"
VITE_SUPABASE_PUBLISHABLE_KEY="<anon from status>"
VITE_SUPABASE_PROJECT_ID="fulgofnlmlmetlgidhup"
# Optional demo bypass — only if you set BOTH vars (no default baked into build):
# VITE_ADMIN_EMAIL="admin@example.com"
# VITE_ADMIN_PASSWORD="your-strong-random-password-here"
ENV
npm run dev  # http://localhost:8080 — now hits local DB; Inbucket catches emails at http://localhost:54324
# Auth → sign up → Inbucket → click confirm link → login; or use admin bypass if you configured VITE_ADMIN_* above
```

**Switch back to hosted:**
```bash
cp frontend/.env.hosted frontend/.env
npx supabase stop      # keeps data; --no-backup to wipe
# frontend still at http://localhost:8080
```

> **Google OAuth locally:** Supabase Studio (`http://localhost:54323`) → Auth → URL Configuration → add `http://localhost:8080` to Redirect URLs + Site URL.

---

### How to Verify Backend Is Working

```bash
# Hosted (tested 2026-09-12 — always works, no Docker needed):
curl -H "apikey: $VITE_SUPABASE_ANON_KEY" https://fulgofnlmlmetlgidhup.supabase.co/auth/v1/health
# → {"version":"v2.196.0","name":"GoTrue"} (200)

# Local (after `npx supabase start` — see Option B):
npx supabase status          # shows API URL + anon/service_role keys, containers running
curl http://127.0.0.1:54321/auth/v1/health -H "apikey: <anon>"
# → {"version":"v2.196.0"} (200)
curl -X POST http://127.0.0.1:54321/functions/v1/market-quotes -H "Content-Type: application/json" -d '{"symbols":["AAPL"]}'
# → {"quotes":{...}} or fallback {} when Yahoo rate-limited
# Studio: http://127.0.0.1:54323 → Table Editor → verify 7 tables → holdings → INSERT test
# Mailpit/Inbucket: http://127.0.0.1:54324 → sign up email → no confirmation needed locally
npx supabase db reset        # re-apply migrations (wipes local data)
npx supabase logs --tail --project-ref <id> # hosted function logs
```

### Verified Test Report (2026-09-12 — re-tested with Docker Desktop running)

| Check | Command | Result |
|-------|---------|--------|
| Hosted auth | `curl -H apikey:<anon> https://fulgofnlmlmetlgidhup.supabase.co/auth/v1/health` | `200 GoTrue v2.196.0` ✅ |
| Hosted DB RLS | `supabase.from('holdings').select('*').limit(1)` (anon) | `42501 permission denied` → RLS ok ✅ |
| Hosted signUp | `supabase.auth.signUp` (`Str0ng!P@ssw0rd…`) | Created `user id 101a46e...` ✅, next `signIn` → `email_not_confirmed` (Dashboard Auth → Email → Confirm OFF to skip) |
| Local Docker | `docker ps` / `wsl --list --verbose` | Initially `docker-desktop Stopped` → `failed to connect to npipe` → started Docker Desktop (`powershell Start-Process Docker Desktop.exe`) → `docker-desktop Running`, `docker ps` shows `supabase_*` containers ✅ |
| Local backend start | `cd backend && npx supabase start` (after fixing missing `functions/ai-insights/import_map.json` → `{ "imports":{} }`) | `Applying migration 20260403152554...`, `20260513045832...`, `Started supabase local development setup` `EXIT:0` ✅ |
| Local API | `curl http://127.0.0.1:54321/auth/v1/health -H apikey: sb_publishable_...` | `200 GoTrue v2.196.0` ✅ |
| Local DB (local keys) | `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH` at `http://127.0.0.1:54321` — `supabase.auth.signUp` + `signIn` + `holdings upsert/select/delete` | `signUp user 583eb728…`, `signIn ok session`, `upsert ok`, `rows 1`, `cleanup ok` — no `email_not_confirmed` locally ✅ |
| Frontend build | `cd frontend && npm run build` | `1,259 kB` `EXIT:0` ✅ (2690 modules, 6.33s) |
| Edge Functions (local) | `ls backend/supabase/functions/` (6 fns) + `npx supabase functions serve --env-file ../frontend/.env` | Functions served at `http://127.0.0.1:54321/functions/v1/*` (verify_jwt=false locally) ✅ |

**Note on fix:** Initial `npx supabase start` failed `ENOENT: import_map.json` — fixed by creating `backend/supabase/functions/ai-insights/import_map.json` (`{ "imports": {} }`). Also `docker-desktop` was `Stopped` until Docker Desktop started — now `Running`. Local backend is fully tested; hosted remains the default for CI/production.

---

## 📜 Available Scripts

All run inside `frontend/` (`frontend/package.json:6-14`):

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite dev server — `http://localhost:8080`, HMR, `/api` proxy |
| `npm run build` | Production build to `dist/` (`vite build`) |
| `npm run build:dev` | Build in development mode (`--mode development`) |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint on entire repo (`eslint .`) |
| `npm run test` | Vitest run once (`frontend/vitest.config.ts:7` → jsdom, globals, `src/test/setup.ts`) |
| `npm run test:watch` | Vitest watch mode |

Supabase CLI (from `backend/`):
```bash
npx supabase start|stop|status
npx supabase functions serve --env-file ../frontend/.env
npx supabase functions deploy <name> --project-ref <id>
npx supabase db reset   # re-apply migrations locally
npx supabase gen types typescript --local > ../frontend/src/integrations/supabase/types.ts
```

---

## 📁 Project Structure

```
mevest-africa-vault/
├── README.md
├── TRANSFORMATION_IMPLEMENTATION.md
├── package-lock.json              # empty root lock — use frontend/package-lock.json
├── backend/
│   └── supabase/
│       ├── config.toml            # project_id, ports, 6 functions (verify_jwt=false)
│       ├── migrations/
│       │   ├── 20260403152554_90b9df2b-...sql  # profiles, holdings, watchlist_items, user_settings
│       │   └── 20260513045832_2190e589-...sql  # portfolio_transactions, snapshots, user_api_keys
│       └── functions/
│           ├── ai-insights/       # agentic AI (11 tools, Gemini/OpenAI, max 5 iterations)
│           ├── market-search/     # Yahoo Finance global search
│           ├── market-quotes/     # batch quotes (≤50 symbols, retry)
│           ├── market-chart/      # OHLCV history 1d–5y
│           ├── market-news/       # news + sentiment + thumbnails
│           └── portfolio-snapshot/# cron snapshot → portfolio_snapshots
└── frontend/
    ├── .env                       # local env (gitignored, see .env.example)
    ├── .env.example               # full template with all vars documented
    ├── package.json               # scripts & deps
    ├── vite.config.ts             # dev server, alias @ → ./src
    ├── vitest.config.ts           # jsdom, setupFiles src/test/setup.ts
    ├── tailwind.config.ts
    ├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
    ├── index.html                 # entry → /src/main.tsx
    ├── public/
    └── src/
        ├── App.tsx                # providers + BrowserRouter + AppRoutes (auth gate)
        ├── main.tsx
        ├── index.css
        ├── vite-env.d.ts
        ├── pages/                 # 13 pages
        │   ├── Index.tsx          # root layout — Sidebar + Topbar + routing
        │   ├── DashboardPage.tsx
        │   ├── PortfolioPage.tsx
        │   ├── MarketsPage.tsx
        │   ├── ScreenerPage.tsx
        │   ├── WatchlistPage.tsx
        │   ├── NewsFeedPage.tsx
        │   ├── AnalyticsPage.tsx
        │   ├── CalendarPage.tsx
        │   ├── SettingsPage.tsx
        │   ├── AuthPage.tsx
        │   ├── ResetPasswordPage.tsx
        │   └── NotFound.tsx
        ├── components/
        │   ├── AiChatWidget.tsx
        │   ├── AiInsightsPanel.tsx
        │   ├── LiveSearchInput.tsx
        │   ├── AddHoldingModal.tsx
        │   ├── NavLink.tsx
        │   ├── layout/Sidebar.tsx, Topbar.tsx
        │   └── ui/*               # shadcn/ui primitives
        ├── context/
        │   ├── AuthContext.tsx
        │   ├── PortfolioContext.tsx
        │   ├── WatchlistContext.tsx
        │   ├── RealtimeMarketContext.tsx  # 30s polling, live quotes
        │   └── ThemeContext.tsx
        ├── integrations/supabase/
        │   ├── client.ts          # singleton, placeholder detection
        │   └── types.ts           # generated DB types
        ├── lib/
        │   ├── api/market.ts      # marketApi: search/quotes/chart/news
        │   └── utils.ts
        ├── data/market-data.ts
        ├── hooks/
        └── test/setup.ts, example.test.ts
```

### Pages (`frontend/src/pages/`)

| File | Description |
|------|-------------|
| `DashboardPage.tsx` | Portfolio stats, performance chart, allocation pie, market movers, risk metrics, AI insights |
| `PortfolioPage.tsx` | Holdings table, sector breakdown, performance metrics |
| `MarketsPage.tsx` | Tabs: Charts (candlestick/line 1D–5Y), Heatmap (sector treemap), Watch (live ticker) |
| `ScreenerPage.tsx` | Global screener — live search, filters (Type/Exchange/Performance/Sector), sorting, pagination |
| `WatchlistPage.tsx` | Starred assets — live price cards, sparklines, detail table |
| `NewsFeedPage.tsx` | Financial news — category filter, sentiment, thumbnails |
| `AnalyticsPage.tsx` | Sharpe, Beta, drawdown, sector correlation |
| `CalendarPage.tsx` | Earnings & economic events |
| `SettingsPage.tsx` | Profile, preferences, API key management |
| `AuthPage.tsx` | Email/password + Google OAuth, shows setup hint if env missing (`AuthPage.tsx:112`) |
| `ResetPasswordPage.tsx` | Password reset |
| `Index.tsx` | Authenticated layout (Sidebar + Topbar) |
| `NotFound.tsx` | 404 |

### Other key files

| File | Description |
|------|-------------|
| `frontend/src/components/AiChatWidget.tsx` | Floating chat — streams markdown, tool status, at `VITE_SUPABASE_URL/functions/v1/ai-insights` |
| `frontend/src/lib/api/market.ts` | Wraps `supabase.functions.invoke()` with try/catch fallbacks |
| `frontend/src/context/RealtimeMarketContext.tsx` | Polls quotes every 30s, simulated micro-movements |
| `frontend/src/App.tsx:18-48` | `AppRoutes` — shows spinner while `useAuth().loading`, otherwise `AuthPage` or `Index` |

---

## 🗄️ Database Schema

All tables have **RLS enabled** — users access only `auth.uid() = user_id` (or `id` for `profiles`). See `backend/supabase/migrations/`.

### `profiles` (auto-created on signup via trigger `handle_new_user`)

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | FK `auth.users.id`, cascade |
| full_name | text | From `raw_user_meta_data` |
| email | text |  |
| avatar_url | text |  |
| currency | text | Default `USD` |
| timezone | text | Default `Africa/Nairobi` |
| created_at | timestamptz | Default `now()` |

Policies: `SELECT`/`UPDATE`/`INSERT` own row.

### `holdings`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| user_id | UUID | FK `auth.users.id`, `UNIQUE(user_id, symbol)` |
| symbol | text | e.g. `AAPL`, `BTC-USD` |
| name | text |  |
| type | text | `stock`/`crypto`/`etf`/`bond`/… default `stock` |
| shares | numeric |  |
| cost_basis | numeric | Per unit |
| country | text | Default `US` |
| created_at | timestamptz |  |

Policy: `FOR ALL` own rows.

### `watchlist_items`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK |  |
| user_id | UUID | `UNIQUE(user_id, symbol)` |
| symbol | text |  |
| added_at | timestamptz |  |

### `user_settings`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK |  |
| user_id | UUID | `UNIQUE` |
| settings | JSONB | Generic prefs, default `'{}'` |
| updated_at | timestamptz |  |

### `portfolio_transactions` (migration `20260513`)

Append-only log for `buy`/`sell`/`dividend`/`split`/`transfer`.

| Column | Type |
|--------|------|
| id | UUID PK |
| user_id | UUID |
| symbol | text |
| type | text `CHECK IN ('buy','sell','dividend','split','transfer')` |
| shares, price, fees | numeric (`fees` default 0) |
| currency | text default `USD` |
| executed_at | timestamptz default `now()` |
| notes | text |
| created_at | timestamptz |

Index `idx_tx_user_date(user_id, executed_at DESC)`.

### `portfolio_snapshots`

Daily history for charts (`UNIQUE(user_id, snapshot_date)`).

| Column | Type |
|--------|------|
| id | UUID PK |
| user_id | UUID |
| snapshot_date | date default `now()::date` |
| total_value, cost_basis, cash_balance | numeric |
| currency | text |
| holdings_json | jsonb |
| created_at | timestamptz |

Index `idx_snap_user_date`.

### `user_api_keys` (isolated from `user_settings`)

| Column | Type |
|--------|------|
| id | UUID PK |
| user_id | UUID |
| provider | text |
| key_value | text |
| status | `untested`/`connected`/`invalid` |
| last_tested_at | timestamptz |
| created_at, updated_at | timestamptz |

`UNIQUE(user_id, provider)`, index `idx_uak_user`.

---

## ⚡ Edge Functions

All declared in `backend/supabase/config.toml:25-53` with `verify_jwt = false` for local dev (set `true` in production + validate JWT in function).

| Function | Entrypoint | Description |
|----------|------------|-------------|
| `ai-insights` | `functions/ai-insights/index.ts` | Agentic loop (≤5 iterations), 11 tools: `get_stock_quote`, `get_market_news`, `search_assets`, `add_holding`, `remove_holding`, `add_to_watchlist`, `remove_from_watchlist`, `get_portfolio_summary`, `get_chart_data`, `compare_stocks`, `get_trending`. Uses `GEMINI_API_KEY`/`OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` for DB writes, streams SSE. |
| `market-search` | `functions/market-search/index.ts` | Yahoo Finance search → `{symbol, name, exchange, type, sector, industry}`, `type` filter |
| `market-quotes` | `functions/market-quotes/index.ts` | Batch quotes ≤50 symbols, retry, fields: price/change/volume/marketCap/PE/EPS/dividend/52w range; `trending` mode |
| `market-chart` | `functions/market-chart/index.ts` | OHLCV history `1d`–`5y` with interval mapping, returns `t/o/h/l/c/v` (`frontend/src/lib/api/market.ts:33`) |
| `market-news` | `functions/market-news/index.ts` | News aggregator: `general`/`crypto`/`tech`/`forex`/`earnings`, ticker-specific, sentiment + thumbnails |
| `portfolio-snapshot` | `functions/portfolio-snapshot/index.ts` | Cron: aggregates holdings → `portfolio_snapshots` + metrics (Sharpe, drawdown, beta, CAGR) |

Client wrappers: `frontend/src/lib/api/market.ts:51-103` (`search`, `getQuotes`, `getChart`, `getNews`) — all catch and return `[]`/`{}` on error.

---

## ✨ Key Features

1. **Real-Time Market Data** — 30s polling via `RealtimeMarketContext`, Yahoo Finance proxy
2. **Global Search** — 45+ exchanges, type filter, debounced `LiveSearchInput`
3. **Agentic AI Chatbot** — streams markdown, executes 11 portfolio/watchlist tools
4. **AI Insights** — health score, risk, recommendations on Dashboard
5. **Multi-Asset Portfolio** — stocks, crypto, ETFs, bonds, T-bills, MMFs, real estate, pension; Kenyan-specific fields (NSE, T-bill, MMF)
6. **Interactive Charts** — candlestick/line, 1D–5Y (`market-chart`)
7. **Screener** — filters + sorting + pagination over live search
8. **Watchlist** — sparklines, live prices
9. **News Feed** — category + ticker news with sentiment
10. **Theme** — light/dark + system (`ThemeContext`)
11. **Responsive** — collapsible Sidebar with hamburger
12. **Auth** — email/password + Google OAuth (`AuthContext`, `AuthPage.tsx`)
13. **Secure API Keys** — `user_api_keys` table, managed in Settings

---

## 🧪 Testing

```bash
cd frontend
npm run test        # single run — jsdom, globals, setupFiles src/test/setup.ts (vitest.config.ts:7-11)
npm run test:watch  # watch mode
# Playwright (if configured): npx playwright test
```

Vitest matches `src/**/*.{test,spec}.{ts,tsx}` (`vitest.config.ts:11`). Path alias `@` → `./src` (`vitest.config.ts:14`, `vite.config.ts:21-24`).

Example: `frontend/src/test/example.test.ts`, setup `frontend/src/test/setup.ts` (imports `@testing-library/jest-dom`).

---

## 📦 Production Build & Deployment

```bash
cd frontend
npm run build    # → dist/ (Vite)
npm run preview  # serve dist/ locally to verify

# Env for prod — set on host (Vercel/Netlify/Cloudflare):
# VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_SUPABASE_PROJECT_ID
# Do NOT expose service_role or AI keys to frontend — set as Supabase Edge Function secrets.

# Supabase hosted deploy:
npx supabase link --project-ref <id>
npx supabase functions deploy --project-ref <id>
npx supabase secrets set GEMINI_API_KEY=... --project-ref <id>
```

Docker example (from `TRANSFORMATION_IMPLEMENTATION.md`):
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
# serve with nginx / vite preview / static host
```

---

## 🔧 Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Console `[MEVEST] Supabase is not configured` | `VITE_SUPABASE_ANON_KEY` still `your_supabase_anon_key` / `test-key` / `placeholder` | Fill `frontend/.env` with real key, restart `npm run dev` (`client.ts:10-15` checks this) |
| `supabase.functions.invoke` returns `[]`/`{}` | Env not set or functions not running | Check `frontend/src/lib/api/market.ts:60-74` logs; for local: `npx supabase functions serve --env-file ../frontend/.env` |
| `npx supabase start` fails | Docker not running | Start Docker Desktop, `docker ps` should work |
| Port `8080` in use | Another dev server | Change `frontend/vite.config.ts:9` or `npm run dev -- --port 5173` |
| OAuth redirect loop | Redirect URL not whitelisted | Supabase Dashboard/Studio → Auth → URL Configuration → add `http://localhost:8080` |
| `auth`/`profiles` RLS errors | User not authenticated or policy mismatch | Ensure logged in; check `backend/supabase/migrations/20260403*.sql:12-15` policies |
| Market data empty locally but hosted works | Local functions not served | Terminal 1 must keep `supabase functions serve` running |

**Useful checks:**
```bash
# Is env wired?
grep VITE_SUPABASE frontend/.env
# Does client see it?
# Browser console → import { isSupabaseConfigured } from '@/integrations/supabase/client'; isSupabaseConfigured()

npx supabase status          # local URLs + keys
npx supabase db reset        # re-apply migrations (wipes local data)
npx supabase logs --tail     # edge function logs (hosted)
```

---

## 📄 License

Built with [Lovable](https://lovable.dev). See repo license if present.
