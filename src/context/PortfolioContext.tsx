import React, { createContext, useContext, useState, useCallback } from 'react';
import { MARKET } from '@/data/market-data';

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
}

const PortfolioContext = createContext<PortfolioContextType | null>(null);

const COLORS = ['#5b9cf6','#63d2aa','#a78bfa','#f5a623','#f0616b','#fb8c5a','#26c6da','#ec4899'];

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [holdings, setHoldings] = useState<Holding[]>([]);

  const addHolding = useCallback((h: Omit<Holding, 'price' | 'sector' | 'country' | 'color'>) => {
    const marketAsset = MARKET[h.sym];
    setHoldings(prev => {
      if (prev.find(x => x.sym === h.sym)) return prev;
      return [...prev, {
        ...h,
        price: marketAsset?.price || h.cost,
        sector: marketAsset?.sector || 'Other',
        country: 'US',
        color: COLORS[prev.length % COLORS.length],
      }];
    });
  }, []);

  const removeHolding = useCallback((sym: string) => {
    setHoldings(prev => prev.filter(h => h.sym !== sym));
  }, []);

  return (
    <PortfolioContext.Provider value={{ holdings, addHolding, removeHolding }}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio must be used within PortfolioProvider');
  return ctx;
}
