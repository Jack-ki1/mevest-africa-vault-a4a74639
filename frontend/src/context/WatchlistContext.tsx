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

  const loadWatchlist = useCallback(() => {
    if (!user) {
      try {
        const demo = localStorage.getItem('mevest_demo_watchlist');
        if (demo) setWatchlist(JSON.parse(demo));
        else setWatchlist([]);
      } catch { setWatchlist([]); }
      return;
    }
    supabase
      .from('watchlist_items')
      .select('symbol')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) setWatchlist(data.map((d: any) => d.symbol));
        else if (error) {
          console.warn('[Watchlist] load failed, using cache:', error.message);
          try {
            const cached = localStorage.getItem(`mevest_watchlist_${user.id}`);
            if (cached) setWatchlist(JSON.parse(cached));
          } catch {}
        }
      })
      .catch((err) => {
        console.warn('[Watchlist] network error, using cache:', err?.message);
        try {
          const cached = localStorage.getItem(`mevest_watchlist_${user.id}`);
          if (cached) setWatchlist(JSON.parse(cached));
        } catch {}
      });
  }, [user]);

  useEffect(() => { loadWatchlist(); }, [loadWatchlist]);

  // Listen for data changes from AI chatbot
  useEffect(() => {
    const handler = () => loadWatchlist();
    window.addEventListener('mevest-data-changed', handler);
    return () => window.removeEventListener('mevest-data-changed', handler);
  }, [loadWatchlist]);

  const addToWatchlist = useCallback(async (sym: string) => {
    if (!user) return;
    setWatchlist(prev => {
      const next = prev.includes(sym) ? prev : [...prev, sym];
      try { localStorage.setItem(`mevest_watchlist_${user.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    const { error } = await supabase.from('watchlist_items').upsert({ user_id: user.id, symbol: sym }, { onConflict: 'user_id,symbol' });
    if (error) console.warn('[Watchlist] upsert failed:', error.message);
  }, [user]);

  const removeFromWatchlist = useCallback(async (sym: string) => {
    if (!user) return;
    setWatchlist(prev => {
      const next = prev.filter(s => s !== sym);
      try { localStorage.setItem(`mevest_watchlist_${user.id}`, JSON.stringify(next)); } catch {}
      return next;
    });
    const { error } = await supabase.from('watchlist_items').delete().eq('user_id', user.id).eq('symbol', sym);
    if (error) console.warn('[Watchlist] delete failed:', error.message);
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
