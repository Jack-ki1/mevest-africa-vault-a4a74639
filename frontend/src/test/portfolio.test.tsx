import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import React from "react";

// Mock supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getSession: () => Promise.resolve({ data: { session: null } }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
      signUp: () => Promise.resolve({ error: null }),
      signInWithPassword: () => Promise.resolve({ error: null }),
      resend: () => Promise.resolve({ error: null }),
      resetPasswordForEmail: () => Promise.resolve({ error: null }),
      signOut: () => Promise.resolve({}),
      signInWithOAuth: () => Promise.resolve({ error: null }),
      updateUser: () => Promise.resolve({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
          limit: () => Promise.resolve({ data: null, error: null }),
        }),
        // default for holdings/watchlist load: thenable that returns data null error
        then: undefined,
      }),
      upsert: () => Promise.resolve({ error: null }),
      delete: () => ({ eq: () => ({ eq: () => Promise.resolve({ error: null }) }) }),
    }),
    functions: {
      invoke: () => Promise.resolve({ data: { quotes: {} }, error: null }),
    },
  },
  isSupabaseConfigured: () => false,
}));

import { PortfolioProvider, usePortfolio } from "@/context/PortfolioContext";
import { AuthProvider } from "@/context/AuthContext";
import { RealtimeMarketProvider } from "@/context/RealtimeMarketContext";

// Minimal wrapper to test localStorage fallback when no user
function TestConsumer() {
  const { holdings, loading } = usePortfolio();
  return <div data-testid="holdings">{loading ? "loading" : holdings.length.toString()}</div>;
}

describe("PortfolioContext localStorage fallback", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("falls back to local cache on Supabase error", async () => {
    const cached = [{ sym: "AAPL", name: "Apple", type: "stock", shares: 10, cost: 150, price: 150, sector: "Other", country: "US", color: "#fff" }];
    // Simulate a user id cache key — but with no user, it uses demo key
    localStorage.setItem("mevest_demo_holdings", JSON.stringify(cached));

    render(
      <RealtimeMarketProvider>
        <AuthProvider>
          <PortfolioProvider>
            <TestConsumer />
          </PortfolioProvider>
        </AuthProvider>
      </RealtimeMarketProvider>
    );

    await waitFor(() => expect(screen.getByTestId("holdings").textContent).not.toBe("loading"));
    // With no user, should load from demo key
    await waitFor(() => expect(screen.getByTestId("holdings").textContent).toBe("1"));
  });

  it("handles corrupt localStorage gracefully", async () => {
    localStorage.setItem("mevest_demo_holdings", "not-json{{{");

    render(
      <RealtimeMarketProvider>
        <AuthProvider>
          <PortfolioProvider>
            <TestConsumer />
          </PortfolioProvider>
        </AuthProvider>
      </RealtimeMarketProvider>
    );

    await waitFor(() => expect(screen.getByTestId("holdings").textContent).not.toBe("loading"));
    expect(screen.getByTestId("holdings").textContent).toBe("0");
  });
});

describe("WatchlistContext fallback", () => {
  it("loads from cache when no user", async () => {
    const { WatchlistProvider, useWatchlist } = await import("@/context/WatchlistContext");
    function WatchConsumer() {
      const { watchlist } = useWatchlist();
      return <div data-testid="wl">{watchlist.length}</div>;
    }
    localStorage.setItem("mevest_demo_watchlist", JSON.stringify(["AAPL", "MSFT"]));
    render(
      <RealtimeMarketProvider>
        <AuthProvider>
          <WatchlistProvider>
            <WatchConsumer />
          </WatchlistProvider>
        </AuthProvider>
      </RealtimeMarketProvider>
    );
    await waitFor(() => expect(screen.getByTestId("wl").textContent).toBe("2"));
  });
});
