import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MARKET, MarketAsset, TICKER_ITEMS, MARKET_REGIONS, MarketRegionItem } from '@/data/market-data';
import { marketApi, SearchResult, QuoteData } from '@/lib/api/market';

// Extended universal asset database - any asset searchable
export interface UniversalAsset {
  sym: string;
  name: string;
  price: number;
  chg: number;
  chgPct: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond' | 'commodity' | 'index' | 'forex';
  sector: string;
  exchange: string;
  country: string;
  currency: string;
  mktcap?: string;
  isLive?: boolean;
}

// Built-in fallback assets (used when API unavailable)
const BUILTIN_ASSETS: Record<string, UniversalAsset> = {
  AAPL: { sym: 'AAPL', name: 'Apple Inc.', price: 213.42, chg: 1.83, chgPct: 0.87, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '3.31T' },
  MSFT: { sym: 'MSFT', name: 'Microsoft Corp.', price: 415.80, chg: 5.10, chgPct: 1.24, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '3.09T' },
  NVDA: { sym: 'NVDA', name: 'NVIDIA Corp.', price: 875.40, chg: 27.2, chgPct: 3.21, type: 'stock', sector: 'Semiconductors', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.16T' },
  GOOGL: { sym: 'GOOGL', name: 'Alphabet Inc.', price: 168.40, chg: 1.04, chgPct: 0.62, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.09T' },
  AMZN: { sym: 'AMZN', name: 'Amazon.com Inc.', price: 195.80, chg: 3.60, chgPct: 1.85, type: 'stock', sector: 'Consumer', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.05T' },
  META: { sym: 'META', name: 'Meta Platforms Inc.', price: 512.30, chg: 16.3, chgPct: 3.28, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '1.31T' },
  TSLA: { sym: 'TSLA', name: 'Tesla Inc.', price: 182.60, chg: -4.51, chgPct: -2.41, type: 'stock', sector: 'Automotive', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '581B' },
  JPM: { sym: 'JPM', name: 'JPMorgan Chase & Co.', price: 205.70, chg: 1.22, chgPct: 0.60, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '595B' },
  V: { sym: 'V', name: 'Visa Inc.', price: 290.50, chg: 2.40, chgPct: 0.83, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '596B' },
  BTC_USD: { sym: 'BTC-USD', name: 'Bitcoin USD', price: 67420, chg: 1421, chgPct: 2.15, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '1.33T' },
  ETH_USD: { sym: 'ETH-USD', name: 'Ethereum USD', price: 3540, chg: 132, chgPct: 3.87, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '425B' },
  SOL_USD: { sym: 'SOL-USD', name: 'Solana USD', price: 178.40, chg: 7.6, chgPct: 4.45, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '82B' },
  SPY: { sym: 'SPY', name: 'SPDR S&P 500 ETF', price: 528.60, chg: 2.20, chgPct: 0.42, type: 'etf', sector: 'Index', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '513B' },
  QQQ: { sym: 'QQQ', name: 'Invesco QQQ Trust', price: 448.20, chg: 3.52, chgPct: 0.79, type: 'etf', sector: 'Index', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '218B' },
  GLD: { sym: 'GLD', name: 'SPDR Gold Trust', price: 224.80, chg: 1.12, chgPct: 0.50, type: 'etf', sector: 'Commodities', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '58B' },
  SCOM: { sym: 'SCOM.NR', name: 'Safaricom PLC', price: 28.50, chg: 0.75, chgPct: 2.70, type: 'stock', sector: 'Telecom', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.14T KES' },
  EQTY: { sym: 'EQTY.NR', name: 'Equity Group Holdings', price: 52.25, chg: 1.25, chgPct: 2.45, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '197B KES' },
  EURUSD: { sym: 'EURUSD=X', name: 'EUR/USD', price: 1.0842, chg: 0.0012, chgPct: 0.11, type: 'forex', sector: 'Major', exchange: 'FX', country: 'GLOBAL', currency: 'USD' },
  GC_F: { sym: 'GC=F', name: 'Gold Futures', price: 2340.50, chg: 12.40, chgPct: 0.53, type: 'commodity', sector: 'Precious Metals', exchange: 'COMEX', country: 'GLOBAL', currency: 'USD' },
  CL_F: { sym: 'CL=F', name: 'Crude Oil WTI', price: 82.45, chg: -0.64, chgPct: -0.78, type: 'commodity', sector: 'Energy', exchange: 'NYMEX', country: 'GLOBAL', currency: 'USD' },
};

// Core ticker symbols to fetch live quotes for
const CORE_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN', 'META', 'TSLA', 'JPM', 'V',
  'BTC-USD', 'ETH-USD', 'SOL-USD', 'SPY', 'QQQ', 'GLD',
  'EURUSD=X', 'GC=F', 'CL=F', '^GSPC', '^IXIC',
];

interface RealtimeMarketContextType {
  prices: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }>;
  tickerItems: typeof TICKER_ITEMS;
  searchAssets: (query: string) => UniversalAsset[];
  searchAssetsLive: (query: string) => Promise<SearchResult[]>;
  getQuotesLive: (symbols: string[]) => Promise<Record<string, QuoteData>>;
  getAsset: (sym: string) => UniversalAsset | undefined;
  allAssets: UniversalAsset[];
  lastUpdate: number;
  isLive: boolean;
}

const RealtimeMarketContext = createContext<RealtimeMarketContextType | null>(null);

export function RealtimeMarketProvider({ children }: { children: React.ReactNode }) {
  const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteData>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [simulatedPrices, setSimulatedPrices] = useState<Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }>>(() => {
    const initial: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }> = {};
    Object.entries(BUILTIN_ASSETS).forEach(([key, asset]) => {
      initial[asset.sym] = { price: asset.price, chg: asset.chg, chgPct: asset.chgPct, prevPrice: asset.price };
    });
    return initial;
  });

  // Fetch live quotes from Yahoo Finance via edge function
  const fetchLiveQuotes = useCallback(async () => {
    try {
      const quotes = await marketApi.getQuotes(CORE_SYMBOLS);
      if (Object.keys(quotes).length > 0) {
        setLiveQuotes(quotes);
        setIsLive(true);
        setLastUpdate(Date.now());
      }
    } catch (e) {
      console.warn('Live quotes unavailable, using simulation:', e);
    }
  }, []);

  // Initial fetch + polling every 15 seconds
  useEffect(() => {
    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 15000);
    return () => clearInterval(interval);
  }, [fetchLiveQuotes]);

  // Simulate micro-movements between live fetches (every 2s)
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedPrices(prev => {
        const next = { ...prev };
        const syms = Object.keys(next);
        const updateCount = Math.ceil(syms.length * 0.3);
        const shuffled = [...syms].sort(() => Math.random() - 0.5).slice(0, updateCount);
        shuffled.forEach(sym => {
          const current = next[sym];
          const isCrypto = sym.includes('USD') || sym.includes('BTC') || sym.includes('ETH') || sym.includes('SOL');
          const volatility = isCrypto ? 0.002 : 0.0008;
          const move = (Math.random() - 0.5) * 2 * volatility;
          const newPrice = +(current.price * (1 + move)).toFixed(current.price < 1 ? 6 : current.price < 10 ? 4 : 2);
          next[sym] = { ...current, price: newPrice, prevPrice: current.price };
        });
        return next;
      });
      if (!isLive) setLastUpdate(Date.now());
    }, 2000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Build unified price map: live data takes priority over simulation
  const prices = React.useMemo(() => {
    const result: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }> = { ...simulatedPrices };
    Object.entries(liveQuotes).forEach(([sym, q]) => {
      const prev = result[sym]?.price || q.prevClose || q.price;
      result[sym] = {
        price: q.price,
        chg: q.change,
        chgPct: q.changePercent,
        prevPrice: prev,
      };
    });
    return result;
  }, [liveQuotes, simulatedPrices]);

  // Local search (instant, for built-in assets)
  const searchAssets = useCallback((query: string): UniversalAsset[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.values(BUILTIN_ASSETS)
      .filter(a =>
        a.sym.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.sector.toLowerCase().includes(q) ||
        a.exchange.toLowerCase().includes(q)
      )
      .slice(0, 12)
      .map(a => {
        const p = prices[a.sym];
        return p ? { ...a, price: p.price, chg: p.chg, chgPct: p.chgPct, isLive } : a;
      });
  }, [prices, isLive]);

  // Live search via edge function (global, unlimited)
  const searchAssetsLive = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim() || query.length < 2) return [];
    return marketApi.search(query);
  }, []);

  // Live quotes for any symbol
  const getQuotesLive = useCallback(async (symbols: string[]): Promise<Record<string, QuoteData>> => {
    return marketApi.getQuotes(symbols);
  }, []);

  const getAsset = useCallback((sym: string): UniversalAsset | undefined => {
    const base = Object.values(BUILTIN_ASSETS).find(a => a.sym === sym || Object.keys(BUILTIN_ASSETS).find(k => BUILTIN_ASSETS[k].sym === sym));
    if (!base) return undefined;
    const p = prices[base.sym];
    return p ? { ...base, price: p.price, chg: p.chg, chgPct: p.chgPct, isLive } : base;
  }, [prices, isLive]);

  const allAssets = React.useMemo(() => {
    return Object.values(BUILTIN_ASSETS).map(a => {
      const p = prices[a.sym];
      return p ? { ...a, price: p.price, chg: p.chg, chgPct: p.chgPct, isLive } : a;
    });
  }, [prices, isLive]);

  const tickerItems = React.useMemo(() => {
    // Build ticker from live data if available, else fallback
    const liveKeys = Object.keys(liveQuotes);
    if (liveKeys.length > 0) {
      return liveKeys.slice(0, 12).map(sym => {
        const q = liveQuotes[sym];
        return { sym: q.symbol, p: q.price, c: q.changePercent };
      });
    }
    return TICKER_ITEMS.map(item => {
      const asset = Object.values(BUILTIN_ASSETS).find(a => a.sym === item.sym || a.name.includes(item.sym));
      const p = asset ? prices[asset.sym] : null;
      return p ? { ...item, p: p.price, c: p.chgPct } : item;
    });
  }, [liveQuotes, prices]);

  return (
    <RealtimeMarketContext.Provider value={{ prices, tickerItems, searchAssets, searchAssetsLive, getQuotesLive, getAsset, allAssets, lastUpdate, isLive }}>
      {children}
    </RealtimeMarketContext.Provider>
  );
}

export function useRealtimeMarket() {
  const ctx = useContext(RealtimeMarketContext);
  if (!ctx) throw new Error('useRealtimeMarket must be used within RealtimeMarketProvider');
  return ctx;
}

export { BUILTIN_ASSETS as UNIVERSAL_ASSETS };
