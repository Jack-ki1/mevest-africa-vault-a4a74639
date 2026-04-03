import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface WatchlistContextType {
  watchlist: string[];
  addToWatchlist: (sym: string) => void;
  removeFromWatchlist: (sym: string) => void;
  isInWatchlist: (sym: string) => boolean;
}

const WatchlistContext = createContext<WatchlistContextType | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [watchlist, setWatchlist] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { setWatchlist([]); return; }
    supabase
      .from('watchlist_items')
      .select('symbol')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (data) setWatchlist(data.map((d: any) => d.symbol));
      });
  }, [user]);

  const addToWatchlist = useCallback(async (sym: string) => {
    if (!user) return;
    setWatchlist(prev => prev.includes(sym) ? prev : [...prev, sym]);
    await supabase.from('watchlist_items').upsert({ user_id: user.id, symbol: sym }, { onConflict: 'user_id,symbol' });
  }, [user]);

  const removeFromWatchlist = useCallback(async (sym: string) => {
    if (!user) return;
    setWatchlist(prev => prev.filter(s => s !== sym));
    await supabase.from('watchlist_items').delete().eq('user_id', user.id).eq('symbol', sym);
  }, [user]);

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
