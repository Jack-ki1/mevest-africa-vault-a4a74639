import React, { createContext, useContext, useState, useCallback } from 'react';

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (sym: string) => void;
  removeFromWatchlist: (sym: string) => void;
  isInWatchlist: (sym: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [watchlist, setWatchlist] = useState<string[]>(['AAPL', 'BTC', 'NVDA', 'ETH', 'SPY']);

  const addToWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym]);
  }, []);

  const removeFromWatchlist = useCallback((sym: string) => {
    setWatchlist(prev => prev.filter(s => s !== sym));
  }, []);

  const isInWatchlist = useCallback((sym: string) => watchlist.includes(sym), [watchlist]);

  return (
    <WatchlistContext.Provider value={{ watchlist, addToWatchlist, removeFromWatchlist, isInWatchlist }}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
