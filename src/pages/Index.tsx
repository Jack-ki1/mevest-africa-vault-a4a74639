import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AddHoldingModal from '@/components/AddHoldingModal';
import DashboardPage from '@/pages/DashboardPage';
import PortfolioPage from '@/pages/PortfolioPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import ChartsPage from '@/pages/ChartsPage';
import ScreenerPage from '@/pages/ScreenerPage';
import MarketWatchPage from '@/pages/MarketWatchPage';
import NewsFeedPage from '@/pages/NewsFeedPage';
import SettingsPage from '@/pages/SettingsPage';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', portfolio: 'My Portfolio', analytics: 'Advanced Analytics',
  charts: 'Market Charts', screener: 'Market Screener', watchlist: 'Market Watch',
  news: 'News Feed', settings: 'Settings',
};

export default function Index() {
  const [page, setPage] = useState('dashboard');
  const [modalOpen, setModalOpen] = useState(false);

  const openModal = () => setModalOpen(true);

  const renderPage = () => {
    switch (page) {
      case 'dashboard': return <DashboardPage onAddHolding={openModal} />;
      case 'portfolio': return <PortfolioPage onAddHolding={openModal} />;
      case 'analytics': return <AnalyticsPage />;
      case 'charts': return <ChartsPage />;
      case 'screener': return <ScreenerPage />;
      case 'watchlist': return <MarketWatchPage />;
      case 'news': return <NewsFeedPage />;
      case 'settings': return <SettingsPage />;
      default: return <DashboardPage onAddHolding={openModal} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage={page} onNavigate={setPage} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={PAGE_TITLES[page] || 'Dashboard'} onAddHolding={openModal} />
        <div className="flex-1 overflow-y-auto p-[18px]">
          {renderPage()}
        </div>
      </div>
      <AddHoldingModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
