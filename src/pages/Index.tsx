import { useState, useCallback } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AddHoldingModal from '@/components/AddHoldingModal';
import DashboardPage from '@/pages/DashboardPage';
import PortfolioPage from '@/pages/PortfolioPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ChartsPage from '@/pages/ChartsPage';
import ScreenerPage from '@/pages/ScreenerPage';
import HeatmapPage from '@/pages/HeatmapPage';
import MarketWatchPage from '@/pages/MarketWatchPage';
import CalendarPage from '@/pages/CalendarPage';
import WatchlistPage from '@/pages/WatchlistPage';
import NewsFeedPage from '@/pages/NewsFeedPage';
import SettingsPage from '@/pages/SettingsPage';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', portfolio: 'My Portfolio', analytics: 'Advanced Analytics',
  charts: 'Market Charts', screener: 'Market Screener', heatmap: 'Market Heatmap',
  marketwatch: 'Market Watch', calendar: 'Calendar', watchlist: 'My Watchlist',
  news: 'News Feed', settings: 'Settings',
};

export default function Index() {
  const [page, setPage] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);
  const [chartSymbol, setChartSymbol] = useState<string | undefined>();

  const openModal = () => setModalOpen(true);

  const handleNavigate = useCallback((targetPage: string, sym?: string) => {
    setPage(targetPage);
    if (sym) setChartSymbol(sym);
  }, []);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onAddHolding={openModal} />;
      case 'portfolio': return <PortfolioPage onAddHolding={openModal} />;
      case 'analytics': return <AnalyticsPage />;
      case 'charts': return <ChartsPage initialSymbol={chartSymbol} />;
      case 'screener': return <ScreenerPage onNavigate={handleNavigate} />;
      case 'heatmap': return <HeatmapPage />;
      case 'marketwatch': return <MarketWatchPage />;
      case 'calendar': return <CalendarPage />;
      case 'watchlist': return <WatchlistPage onNavigate={handleNavigate} />;
      case 'news': return <NewsFeedPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onAddHolding={openModal} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onAddHolding={openModal} onNavigate={handleNavigate} />
        <div className="flex-1 overflow-y-auto p-[18px]">
          {renderPage()}
        </div>
      </div>
      <AddHoldingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
