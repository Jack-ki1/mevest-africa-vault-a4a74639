import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  // === Nairobi Securities Exchange (NSE) — full main board coverage ===
  SCOM: { sym: 'SCOM.NR', name: 'Safaricom PLC', price: 28.50, chg: 0.75, chgPct: 2.70, type: 'stock', sector: 'Telecommunications', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.14T KES' },
  EQTY: { sym: 'EQTY.NR', name: 'Equity Group Holdings', price: 52.25, chg: 1.25, chgPct: 2.45, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '197B KES' },
  KCB: { sym: 'KCB.NR', name: 'KCB Group PLC', price: 42.10, chg: 0.85, chgPct: 2.06, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '135B KES' },
  COOP: { sym: 'COOP.NR', name: 'Co-operative Bank of Kenya', price: 16.40, chg: 0.20, chgPct: 1.23, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '96B KES' },
  ABSA: { sym: 'ABSA.NR', name: 'Absa Bank Kenya PLC', price: 18.95, chg: 0.30, chgPct: 1.61, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '103B KES' },
  SCBK: { sym: 'SCBK.NR', name: 'Standard Chartered Bank Kenya', price: 285.00, chg: 4.50, chgPct: 1.60, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '108B KES' },
  SBIC: { sym: 'SBIC.NR', name: 'Stanbic Holdings PLC', price: 152.00, chg: 2.25, chgPct: 1.50, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '60B KES' },
  DTK: { sym: 'DTK.NR', name: 'Diamond Trust Bank Kenya', price: 68.25, chg: 1.00, chgPct: 1.49, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '19B KES' },
  NCBA: { sym: 'NCBA.NR', name: 'NCBA Group PLC', price: 48.50, chg: 0.65, chgPct: 1.36, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '80B KES' },
  IMH: { sym: 'IMH.NR', name: 'I&M Group PLC', price: 32.80, chg: 0.40, chgPct: 1.23, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '54B KES' },
  HFCK: { sym: 'HFCK.NR', name: 'HF Group PLC', price: 6.20, chg: 0.10, chgPct: 1.64, type: 'stock', sector: 'Banking', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '2.4B KES' },
  EABL: { sym: 'EABL.NR', name: 'East African Breweries PLC', price: 175.00, chg: 2.50, chgPct: 1.45, type: 'stock', sector: 'Beverages', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '138B KES' },
  BAT: { sym: 'BAT.NR', name: 'British American Tobacco Kenya', price: 410.00, chg: 5.00, chgPct: 1.23, type: 'stock', sector: 'Tobacco', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '41B KES' },
  KEGN: { sym: 'KEGN.NR', name: 'KenGen PLC', price: 4.85, chg: 0.08, chgPct: 1.68, type: 'stock', sector: 'Energy', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '32B KES' },
  KPLC: { sym: 'KPLC.NR', name: 'Kenya Power & Lighting Co.', price: 4.20, chg: 0.05, chgPct: 1.20, type: 'stock', sector: 'Utilities', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '8.2B KES' },
  KENO: { sym: 'KENO.NR', name: 'KenolKobil PLC', price: 23.40, chg: 0.30, chgPct: 1.30, type: 'stock', sector: 'Energy', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '34B KES' },
  TOTL: { sym: 'TOTL.NR', name: 'TotalEnergies Marketing Kenya', price: 24.50, chg: 0.40, chgPct: 1.66, type: 'stock', sector: 'Energy', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '15B KES' },
  UMME: { sym: 'UMME.NR', name: 'Umeme Limited', price: 13.20, chg: 0.15, chgPct: 1.15, type: 'stock', sector: 'Utilities', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '21B KES' },
  BAMB: { sym: 'BAMB.NR', name: 'Bamburi Cement PLC', price: 48.00, chg: 0.75, chgPct: 1.59, type: 'stock', sector: 'Construction', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '17B KES' },
  ARM: { sym: 'ARM.NR', name: 'ARM Cement PLC', price: 5.50, chg: 0.05, chgPct: 0.92, type: 'stock', sector: 'Construction', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '5.5B KES' },
  CRWN: { sym: 'CRWN.NR', name: 'Crown Paints Kenya PLC', price: 45.80, chg: 0.60, chgPct: 1.33, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '6.5B KES' },
  CARB: { sym: 'CARB.NR', name: 'Carbacid Investments', price: 17.50, chg: 0.20, chgPct: 1.16, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '4.4B KES' },
  BOC: { sym: 'BOC.NR', name: 'BOC Kenya PLC', price: 88.00, chg: 1.00, chgPct: 1.15, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.7B KES' },
  UNGA: { sym: 'UNGA.NR', name: 'Unga Group PLC', price: 15.40, chg: 0.20, chgPct: 1.32, type: 'stock', sector: 'Food', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.2B KES' },
  KAPC: { sym: 'KAPC.NR', name: 'Kapchorua Tea Kenya', price: 175.00, chg: 2.00, chgPct: 1.16, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.4B KES' },
  KUKZ: { sym: 'KUKZ.NR', name: 'Kakuzi PLC', price: 380.00, chg: 5.00, chgPct: 1.33, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '7.4B KES' },
  LIMT: { sym: 'LIMT.NR', name: 'Limuru Tea PLC', price: 320.00, chg: 4.00, chgPct: 1.27, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '768M KES' },
  SASN: { sym: 'SASN.NR', name: 'Sasini PLC', price: 22.30, chg: 0.30, chgPct: 1.36, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '5.1B KES' },
  WTK: { sym: 'WTK.NR', name: 'Williamson Tea Kenya', price: 245.00, chg: 3.00, chgPct: 1.24, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '2.1B KES' },
  JUB: { sym: 'JUB.NR', name: 'Jubilee Holdings Ltd', price: 195.00, chg: 2.50, chgPct: 1.30, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '14B KES' },
  CIC: { sym: 'CIC.NR', name: 'CIC Insurance Group', price: 2.45, chg: 0.04, chgPct: 1.66, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '6.4B KES' },
  KNRE: { sym: 'KNRE.NR', name: 'Kenya Re-Insurance Corp.', price: 2.05, chg: 0.03, chgPct: 1.49, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '5.7B KES' },
  BRIT: { sym: 'BRIT.NR', name: 'Britam Holdings PLC', price: 5.80, chg: 0.10, chgPct: 1.75, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '14.6B KES' },
  LBTY: { sym: 'LBTY.NR', name: 'Liberty Kenya Holdings', price: 4.25, chg: 0.05, chgPct: 1.19, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '2.3B KES' },
  SCAN: { sym: 'SCAN.NR', name: 'Sanlam Kenya PLC', price: 6.40, chg: 0.10, chgPct: 1.59, type: 'stock', sector: 'Insurance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '922M KES' },
  NMG: { sym: 'NMG.NR', name: 'Nation Media Group', price: 14.80, chg: 0.20, chgPct: 1.37, type: 'stock', sector: 'Media', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '2.8B KES' },
  SGL: { sym: 'SGL.NR', name: 'Standard Group PLC', price: 7.20, chg: 0.10, chgPct: 1.41, type: 'stock', sector: 'Media', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '588M KES' },
  TPSE: { sym: 'TPSE.NR', name: 'TPS Eastern Africa (Serena)', price: 16.50, chg: 0.20, chgPct: 1.23, type: 'stock', sector: 'Hospitality', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '3.0B KES' },
  KQ: { sym: 'KQ.NR', name: 'Kenya Airways PLC', price: 3.95, chg: 0.05, chgPct: 1.28, type: 'stock', sector: 'Transport', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '23B KES' },
  EXPR: { sym: 'EXPR.NR', name: 'Express Kenya PLC', price: 3.80, chg: 0.05, chgPct: 1.33, type: 'stock', sector: 'Transport', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '134M KES' },
  EVRD: { sym: 'EVRD.NR', name: 'Eveready East Africa', price: 1.05, chg: 0.02, chgPct: 1.94, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '221M KES' },
  CABL: { sym: 'CABL.NR', name: 'East African Cables PLC', price: 1.85, chg: 0.03, chgPct: 1.65, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '468M KES' },
  PORT: { sym: 'PORT.NR', name: 'East African Portland Cement', price: 8.50, chg: 0.10, chgPct: 1.19, type: 'stock', sector: 'Construction', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '765M KES' },
  CGEN: { sym: 'CGEN.NR', name: 'Car & General Kenya', price: 28.40, chg: 0.40, chgPct: 1.43, type: 'stock', sector: 'Automotive', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.1B KES' },
  HAFR: { sym: 'HAFR.NR', name: 'Home Afrika Ltd', price: 0.45, chg: 0.01, chgPct: 2.27, type: 'stock', sector: 'Real Estate', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '182M KES' },
  ICDC: { sym: 'ICDC.NR', name: 'Centum Investment Co.', price: 9.85, chg: 0.15, chgPct: 1.55, type: 'stock', sector: 'Investment', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '6.5B KES' },
  OCH: { sym: 'OCH.NR', name: 'Olympia Capital Holdings', price: 2.60, chg: 0.04, chgPct: 1.56, type: 'stock', sector: 'Investment', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '104M KES' },
  NSE: { sym: 'NSE.NR', name: 'Nairobi Securities Exchange', price: 7.40, chg: 0.10, chgPct: 1.37, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.9B KES' },
  FTGH: { sym: 'FTGH.NR', name: 'Flame Tree Group Holdings', price: 1.95, chg: 0.03, chgPct: 1.56, type: 'stock', sector: 'Manufacturing', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '348M KES' },
  KURV: { sym: 'KURV.NR', name: 'Kurwitu Ventures Ltd', price: 1500, chg: 15, chgPct: 1.01, type: 'stock', sector: 'Investment', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '150M KES' },
  NBV: { sym: 'NBV.NR', name: 'Nairobi Business Ventures', price: 5.85, chg: 0.08, chgPct: 1.39, type: 'stock', sector: 'Retail', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '848M KES' },
  LKL: { sym: 'LKL.NR', name: 'L&L Industries (Longhorn Pub.)', price: 2.40, chg: 0.04, chgPct: 1.69, type: 'stock', sector: 'Media', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '654M KES' },
  UCHM: { sym: 'UCHM.NR', name: 'Uchumi Supermarkets', price: 0.22, chg: 0.00, chgPct: 0.00, type: 'stock', sector: 'Retail', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '80M KES' },
  MASH: { sym: 'MASH.NR', name: 'Mumias Sugar Co.', price: 0.30, chg: 0.01, chgPct: 3.45, type: 'stock', sector: 'Agriculture', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '459M KES' },
  XPRS: { sym: 'XPRS.NR', name: 'Express Kenya Ltd', price: 3.85, chg: 0.05, chgPct: 1.32, type: 'stock', sector: 'Logistics', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '136M KES' },
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
  registerSymbols: (syms: string[]) => void;
}

const RealtimeMarketContext = createContext<RealtimeMarketContextType | null>(null);

export function RealtimeMarketProvider({ children }: { children: React.ReactNode }) {
  const [liveQuotes, setLiveQuotes] = useState<Record<string, QuoteData>>({});
  const [isLive, setIsLive] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [extraSymbols, setExtraSymbols] = useState<string[]>([]);
  const [simulatedPrices, setSimulatedPrices] = useState<Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }>>(() => {
    const initial: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }> = {};
    Object.entries(BUILTIN_ASSETS).forEach(([key, asset]) => {
      initial[asset.sym] = { price: asset.price, chg: asset.chg, chgPct: asset.chgPct, prevPrice: asset.price };
    });
    return initial;
  });

  // Allow external components to register symbols for live polling
  const registerSymbols = useCallback((syms: string[]) => {
    setExtraSymbols(prev => {
      const newSyms = syms.filter(s => !prev.includes(s) && !CORE_SYMBOLS.includes(s));
      return newSyms.length > 0 ? [...prev, ...newSyms] : prev;
    });
  }, []);

  // Fetch live quotes from Yahoo Finance via edge function
  const fetchLiveQuotes = useCallback(async () => {
    try {
      const allSyms = [...new Set([...CORE_SYMBOLS, ...extraSymbols])];
      const quotes = await marketApi.getQuotes(allSyms);
      if (Object.keys(quotes).length > 0) {
        setLiveQuotes(quotes);
        setIsLive(true);
        setLastUpdate(Date.now());
      }
    } catch (e) {
      console.warn('Live quotes unavailable, using simulation:', e);
    }
  }, [extraSymbols]);

  // Initial fetch + polling every 30 seconds
  useEffect(() => {
    fetchLiveQuotes();
    const interval = setInterval(fetchLiveQuotes, 30000);
    return () => clearInterval(interval);
  }, [fetchLiveQuotes]);

  // NOTE: A previous implementation simulated micro price movements every 2s
  // by calling setState on a large dictionary, which forced every consumer of
  // useRealtimeMarket() to re-render every 2 seconds — a major mobile perf hit.
  // Removed entirely. Live prices are refreshed every 30s from the real API.


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
    <RealtimeMarketContext.Provider value={{ prices, tickerItems, searchAssets, searchAssetsLive, getQuotesLive, getAsset, allAssets, lastUpdate, isLive, registerSymbols }}>
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
