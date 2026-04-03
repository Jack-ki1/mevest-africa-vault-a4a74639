

# Plan: Auth, Mobile Responsive, AI Features, and Search Verification

## Summary

Four major enhancements: (1) verify/fix search functionality, (2) add user authentication with persistent data, (3) make the app fully mobile-responsive with hamburger sidebar, (4) add AI-powered features.

---

## 1. Verify and Fix Search

- Test the `LiveSearchInput` component and `market-search` edge function
- Ensure results render correctly and navigation to Markets page works on selection
- No major changes expected -- the edge function and component are already wired

## 2. User Authentication with Data Persistence

### Database Migration

Create tables with RLS:

```sql
-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  currency TEXT DEFAULT 'USD',
  timezone TEXT DEFAULT 'Africa/Nairobi',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Holdings table
CREATE TABLE public.holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'stock',
  shares NUMERIC NOT NULL,
  cost_basis NUMERIC NOT NULL,
  country TEXT DEFAULT 'US',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE public.holdings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own holdings" ON public.holdings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Watchlist table
CREATE TABLE public.watchlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  symbol TEXT NOT NULL,
  added_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, symbol)
);
ALTER TABLE public.watchlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own watchlist" ON public.watchlist_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- User settings
CREATE TABLE public.user_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  settings JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users CRUD own settings" ON public.user_settings FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
```

### New Files

- **`src/pages/AuthPage.tsx`** -- Login/signup form with email+password, toggle between modes, full_name field on signup. Styled to match MEVEST branding.
- **`src/context/AuthContext.tsx`** -- Wraps `supabase.auth.onAuthStateChange`, provides `user`, `signIn`, `signUp`, `signOut`, `loading` state. Set up listener before `getSession()`.
- **`src/pages/ResetPasswordPage.tsx`** -- Password reset page at `/reset-password` route.

### Modified Files

- **`src/App.tsx`** -- Wrap with `AuthProvider`, show `AuthPage` when not authenticated, show main app when authenticated. Add `/reset-password` route.
- **`src/context/PortfolioContext.tsx`** -- Load/save holdings from `public.holdings` table using authenticated user's ID. Replace `useState` with Supabase queries.
- **`src/context/WatchlistContext.tsx`** -- Load/save watchlist from `public.watchlist_items` table.
- **`src/pages/SettingsPage.tsx`** -- Load/save profile from `public.profiles` and settings from `public.user_settings`. Add logout button.
- **`src/components/layout/Sidebar.tsx`** -- Show authenticated user's name/initials in footer instead of hardcoded "Alex Kamau".

## 3. Mobile Responsive with Hamburger Menu

### Modified Files

- **`src/pages/Index.tsx`** -- Add `sidebarOpen` state, pass to Sidebar. Add overlay when open on mobile.
- **`src/components/layout/Sidebar.tsx`** -- On mobile (`<768px`): render as a slide-over drawer with full width (~260px), overlay backdrop. Close on nav item click. Add close button.
- **`src/components/layout/Topbar.tsx`** -- Add hamburger menu button (visible only on mobile) that toggles sidebar. Show search on mobile too (smaller).
- **`src/index.css`** -- Add responsive utility classes for sidebar transitions.
- **Key pages** (Dashboard, Portfolio, Markets, etc.) -- Ensure grid layouts use responsive breakpoints (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`).

## 4. AI-Powered Features

### New Edge Function

- **`supabase/functions/ai-insights/index.ts`** -- Uses Lovable AI (via `LOVABLE_API_KEY`) with `google/gemini-2.5-flash` model. Accepts a portfolio summary and returns:
  - Portfolio health analysis
  - Risk assessment
  - Actionable recommendations
  - Market sentiment summary

### New Files

- **`src/components/AiInsightsPanel.tsx`** -- A collapsible panel on the Dashboard showing AI-generated insights about the user's portfolio. Features:
  - "Analyze Portfolio" button that sends holdings data to the edge function
  - Displays risk score, diversification advice, sector exposure warnings
  - Refreshes on demand (not automatic to save API calls)

- **`src/components/AiChatWidget.tsx`** -- A floating chat bubble (bottom-right) that opens a mini chat window. Users can ask questions like "What's my best performing stock?" or "Should I diversify?" The AI responds using portfolio context. Uses the same edge function with a `mode: 'chat'` parameter.

### Modified Files

- **`src/pages/DashboardPage.tsx`** -- Add `AiInsightsPanel` component below the portfolio overview cards.
- **`src/pages/Index.tsx`** -- Add `AiChatWidget` as a global floating component.

---

## Technical Notes

- Auth uses email+password only (no auto-confirm -- users must verify email)
- AI uses `LOVABLE_API_KEY` (already configured) with Gemini 2.5 Flash for cost efficiency
- Mobile sidebar uses CSS transforms for smooth slide animation
- All Supabase queries use the authenticated client -- RLS handles data isolation
- Holdings/watchlist contexts fall back to local state if user is not authenticated

## File Summary

| Action | File |
|--------|------|
| New | `src/pages/AuthPage.tsx` |
| New | `src/context/AuthContext.tsx` |
| New | `src/pages/ResetPasswordPage.tsx` |
| New | `src/components/AiInsightsPanel.tsx` |
| New | `src/components/AiChatWidget.tsx` |
| New | `supabase/functions/ai-insights/index.ts` |
| Edit | `src/App.tsx` |
| Edit | `src/pages/Index.tsx` |
| Edit | `src/components/layout/Sidebar.tsx` |
| Edit | `src/components/layout/Topbar.tsx` |
| Edit | `src/context/PortfolioContext.tsx` |
| Edit | `src/context/WatchlistContext.tsx` |
| Edit | `src/pages/SettingsPage.tsx` |
| Edit | `src/pages/DashboardPage.tsx` |
| Edit | `src/index.css` |
| Migration | Create profiles, holdings, watchlist_items, user_settings tables |

