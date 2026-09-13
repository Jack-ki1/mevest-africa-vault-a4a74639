import { useState, useCallback, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AddHoldingModal from '@/components/AddHoldingModal';
import AiChatWidget from '@/components/AiChatWidget';

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard', portfolio: 'My Portfolio', analytics: 'Advanced Analytics',
  markets: 'Markets', screener: 'Market Screener',
  calendar: 'Calendar', watchlist: 'My Watchlist',
  news: 'News Feed', community: 'Community', learn: 'Learn', settings: 'Settings',
};

function pathToPage(pathname: string): string {
  const seg = pathname.split('/').filter(Boolean)[0] || 'dashboard';
  return PAGE_TITLES[seg] ? seg : 'dashboard';
}

export default function Index() {
  const navigate = useNavigate();
  const location = useLocation();
  const activePage = pathToPage(location.pathname);
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const openModal = useCallback(() => setModalOpen(true), []);
  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleNavigate = useCallback((targetPage: string, sym?: string) => {
    setSidebarOpen(false);
    if (sym) {
      navigate(`/${targetPage}`, { state: { symbol: sym } });
    } else {
      navigate(`/${targetPage}`);
    }
  }, [navigate]);

  // Support legacy window events dispatched from lazy child routes (App.tsx suspense)
  useEffect(() => {
    const openHandler = () => setModalOpen(true);
    const navHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail as { page: string; sym?: string };
      if (detail?.page) handleNavigate(detail.page, detail.sym);
    };
    window.addEventListener('mevest-open-add-holding', openHandler);
    window.addEventListener('mevest-navigate', navHandler as EventListener);
    return () => {
      window.removeEventListener('mevest-open-add-holding', openHandler);
      window.removeEventListener('mevest-navigate', navHandler as EventListener);
    };
  }, [handleNavigate]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar activePage={activePage} onNavigate={handleNavigate} mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar title={PAGE_TITLES[activePage] || 'Dashboard'} onAddHolding={openModal} onNavigate={handleNavigate} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
        <div className="flex-1 overflow-y-auto p-3 md:p-[18px]">
          <Outlet context={{ openModal }} />
        </div>
      </div>
      <AddHoldingModal open={modalOpen} onClose={closeModal} />
      <AiChatWidget />
    </div>
  );
}
