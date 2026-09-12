import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { PortfolioProvider } from "@/context/PortfolioContext";
import { WatchlistProvider } from "@/context/WatchlistContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { RealtimeMarketProvider } from "@/context/RealtimeMarketContext";
import React, { Suspense, lazy } from "react";
import { Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const PortfolioPage = lazy(() => import("./pages/PortfolioPage"));
const AnalyticsPage = lazy(() => import("./pages/AnalyticsPage"));
const MarketsPage = lazy(() => import("./pages/MarketsPage"));
const ScreenerPage = lazy(() => import("./pages/ScreenerPage"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const WatchlistPage = lazy(() => import("./pages/WatchlistPage"));
const NewsFeedPage = lazy(() => import("./pages/NewsFeedPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
    );
  }

  return (
    <PortfolioProvider>
      <WatchlistProvider>
        <Suspense fallback={<LazyFallback />}>
          <Routes>
            <Route path="/" element={<Index />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage onAddHolding={() => window.dispatchEvent(new CustomEvent('mevest-open-add-holding'))} />} />
              <Route path="portfolio" element={<PortfolioPage onAddHolding={() => window.dispatchEvent(new CustomEvent('mevest-open-add-holding'))} />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="markets" element={<MarketsPage />} />
              <Route path="screener" element={<ScreenerPage onNavigate={(p, s) => window.dispatchEvent(new CustomEvent('mevest-navigate', { detail: { page: p, sym: s } }))} />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="watchlist" element={<WatchlistPage onNavigate={(p, s) => window.dispatchEvent(new CustomEvent('mevest-navigate', { detail: { page: p, sym: s } }))} />} />
              <Route path="news" element={<NewsFeedPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </WatchlistProvider>
    </PortfolioProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ThemeProvider>
        <AuthProvider>
          <RealtimeMarketProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </RealtimeMarketProvider>
        </AuthProvider>
      </ThemeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
