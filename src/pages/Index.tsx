import { useState, useCallback } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AddHoldingModal from '@/components/AddHoldingModal';
import AiChatWidget from '@/components/AiChatWidget';
import DashboardPage from '@/pages/DashboardPage';
import PortfolioPage from '@/pages/PortfolioPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import MarketsPage from '@/pages/MarketsPage';
import ScreenerPage from '@/pages/ScreenerPage';
import CalendarPage from '@/pages/CalendarPage';
import WatchlistPage from '@/pages/WatchlistPage';
import NewsFeedPage from '@/pages/NewsFeedPage';
import SettingsPage from '@/pages/SettingsPage';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', portfolio: 'My Portfolio', analytics: 'Advanced Analytics',
  markets: 'Markets', screener: 'Market Screener',
  calendar: 'Calendar', watchlist: 'My Watchlist',
  news: 'News Feed', settings: 'Settings',
};

export default function Index() {
  const [page, setPage] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string | undefined>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openModal = () => setModalOpen(true);

  const handleNavigate = useCallback((targetPage: string, sym?: string) => {
    setPage(targetPage);
    if (sym) setChartSymbol(sym);
    setSidebarOpen(false);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onAddHolding={openModal} />;
      case 'portfolio': return <PortfolioPage onAddHolding={openModal} />;
      case 'analytics': return <AnalyticsPage />;
      case 'markets': return <MarketsPage initialSymbol={chartSymbol} />;
      case 'screener': return <ScreenerPage onNavigate={handleNavigate} />;
      case 'calendar': return <CalendarPage />;
      case 'watchlist': return <WatchlistPage onNavigate={handleNavigate} />;
      case 'news': return <NewsFeedPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onAddHolding={openModal} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar activePage={page} onNavigate={handleNavigate} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onAddHolding={openModal} onNavigate={handleNavigate} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-[18px]">
          {renderPage()}
        </div>
      </div>
      <AddHoldingModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AiChatWidget />
    </div>
  );
}
