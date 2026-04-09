import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Holding {
  sym: string;
  name: string;
  type: string;
  shares: number;
  cost: number;
  price: number;
  sector: string;
  country: string;
  color: string;
}

interface PortfolioContextType {
  holdings: Holding[];
  addHolding: (h: Omit<Holding, 'price' | 'sector' | 'country' | 'color'>) => void;
  removeHolding: (sym: string) => void;
  loading: boolean;
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const COLORS = ['#5b9cf6','#63d2aa','#a78bfa','#f5a623','#f0616b','#fb8c5a','#26c6da','#ec4899'];

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHoldings = useCallback(() => {
    if (!user) { setHoldings([]); setLoading(false); return; }
    setLoading(true);
    supabase
      .from('holdings')
      .select('*')
      .eq('user_id', user.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setHoldings(data.map((h: any, i: number) => ({
            sym: h.symbol,
            name: h.name,
            type: h.type || 'stock',
            shares: Number(h.shares),
            cost: Number(h.cost_basis),
            price: Number(h.cost_basis),
            sector: 'Other',
            country: h.country || 'US',
            color: COLORS[i % COLORS.length],
          })));
        }
        setLoading(false);
      });
  }, [user]);

  useEffect(() => { loadHoldings(); }, [loadHoldings]);

  // Listen for data changes from AI chatbot
  useEffect(() => {
    const handler = () => loadHoldings();
    window.addEventListener('mevest-data-changed', handler);
    return () => window.removeEventListener('mevest-data-changed', handler);
  }, [loadHoldings]);

  const addHolding = useCallback(async (h: Omit<Holding, 'price' | 'sector' | 'country' | 'color'>) => {
    if (!user) return;
    // Optimistic update
    setHoldings(prev => {
      if (prev.find(x => x.sym === h.sym)) return prev;
      return [...prev, { ...h, price: h.cost, sector: 'Other', country: 'US', color: COLORS[prev.length % COLORS.length] }];
    });
    // Persist
    await supabase.from('holdings').upsert({
      user_id: user.id, symbol: h.sym, name: h.name, type: h.type, shares: h.shares, cost_basis: h.cost, country: 'US',
    }, { onConflict: 'user_id,symbol' });
  }, [user]);

  const removeHolding = useCallback(async (sym: string) => {
    if (!user) return;
    setHoldings(prev => prev.filter(h => h.sym !== sym));
    await supabase.from('holdings').delete().eq('user_id', user.id).eq('symbol', sym);
  }, [user]);

  return (
    <PortfolioContext.Provider value={{ holdings, addHolding, removeHolding, loading }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
