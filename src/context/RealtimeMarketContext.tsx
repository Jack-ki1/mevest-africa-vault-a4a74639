import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { MARKET, MarketAsset, TICKER_ITEMS, MARKET_REGIONS, MarketRegionItem } from '@/data/market-data';

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
}

// Massive universe of searchable assets
const UNIVERSAL_ASSETS: Record<string, UniversalAsset> = {
  // US Mega Caps
  AAPL: { sym: 'AAPL', name: 'Apple Inc.', price: 213.42, chg: 1.83, chgPct: 0.87, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '3.31T' },
  MSFT: { sym: 'MSFT', name: 'Microsoft Corp.', price: 415.80, chg: 5.10, chgPct: 1.24, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '3.09T' },
  NVDA: { sym: 'NVDA', name: 'NVIDIA Corp.', price: 875.40, chg: 27.2, chgPct: 3.21, type: 'stock', sector: 'Semiconductors', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.16T' },
  GOOGL: { sym: 'GOOGL', name: 'Alphabet Inc.', price: 168.40, chg: 1.04, chgPct: 0.62, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.09T' },
  AMZN: { sym: 'AMZN', name: 'Amazon.com Inc.', price: 195.80, chg: 3.60, chgPct: 1.85, type: 'stock', sector: 'Consumer', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '2.05T' },
  META: { sym: 'META', name: 'Meta Platforms Inc.', price: 512.30, chg: 16.3, chgPct: 3.28, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '1.31T' },
  TSLA: { sym: 'TSLA', name: 'Tesla Inc.', price: 182.60, chg: -4.51, chgPct: -2.41, type: 'stock', sector: 'Automotive', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '581B' },
  BRK_B: { sym: 'BRK.B', name: 'Berkshire Hathaway B', price: 418.20, chg: 2.30, chgPct: 0.55, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '890B' },
  JPM: { sym: 'JPM', name: 'JPMorgan Chase & Co.', price: 205.70, chg: 1.22, chgPct: 0.60, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '595B' },
  V: { sym: 'V', name: 'Visa Inc.', price: 290.50, chg: 2.40, chgPct: 0.83, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '596B' },
  JNJ: { sym: 'JNJ', name: 'Johnson & Johnson', price: 158.20, chg: -0.82, chgPct: -0.52, type: 'stock', sector: 'Healthcare', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '381B' },
  UNH: { sym: 'UNH', name: 'UnitedHealth Group', price: 528.40, chg: 4.10, chgPct: 0.78, type: 'stock', sector: 'Healthcare', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '487B' },
  MA: { sym: 'MA', name: 'Mastercard Inc.', price: 468.50, chg: 3.80, chgPct: 0.82, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '437B' },
  HD: { sym: 'HD', name: 'Home Depot Inc.', price: 368.40, chg: 1.90, chgPct: 0.52, type: 'stock', sector: 'Consumer', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '365B' },
  PG: { sym: 'PG', name: 'Procter & Gamble', price: 165.20, chg: 0.45, chgPct: 0.27, type: 'stock', sector: 'Consumer', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '389B' },
  XOM: { sym: 'XOM', name: 'Exxon Mobil Corp.', price: 108.60, chg: -1.20, chgPct: -1.09, type: 'stock', sector: 'Energy', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '453B' },
  LLY: { sym: 'LLY', name: 'Eli Lilly & Co.', price: 782.40, chg: 12.50, chgPct: 1.62, type: 'stock', sector: 'Healthcare', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '743B' },
  AVGO: { sym: 'AVGO', name: 'Broadcom Inc.', price: 1342.80, chg: 28.40, chgPct: 2.16, type: 'stock', sector: 'Semiconductors', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '625B' },
  COST: { sym: 'COST', name: 'Costco Wholesale', price: 738.20, chg: 4.60, chgPct: 0.63, type: 'stock', sector: 'Consumer', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '327B' },
  ABBV: { sym: 'ABBV', name: 'AbbVie Inc.', price: 178.40, chg: 1.20, chgPct: 0.68, type: 'stock', sector: 'Healthcare', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '315B' },
  CRM: { sym: 'CRM', name: 'Salesforce Inc.', price: 272.60, chg: 5.40, chgPct: 2.02, type: 'stock', sector: 'Technology', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '264B' },
  AMD: { sym: 'AMD', name: 'Advanced Micro Devices', price: 168.20, chg: 4.80, chgPct: 2.94, type: 'stock', sector: 'Semiconductors', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '272B' },
  NFLX: { sym: 'NFLX', name: 'Netflix Inc.', price: 628.40, chg: 8.20, chgPct: 1.32, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '272B' },
  INTC: { sym: 'INTC', name: 'Intel Corp.', price: 32.40, chg: -0.80, chgPct: -2.41, type: 'stock', sector: 'Semiconductors', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '137B' },
  DIS: { sym: 'DIS', name: 'Walt Disney Co.', price: 112.80, chg: 1.40, chgPct: 1.26, type: 'stock', sector: 'Entertainment', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '206B' },
  PYPL: { sym: 'PYPL', name: 'PayPal Holdings', price: 68.40, chg: 1.20, chgPct: 1.79, type: 'stock', sector: 'Finance', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '73B' },
  BA: { sym: 'BA', name: 'Boeing Co.', price: 198.60, chg: -2.40, chgPct: -1.19, type: 'stock', sector: 'Industrials', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '120B' },
  NKE: { sym: 'NKE', name: 'Nike Inc.', price: 98.20, chg: 0.80, chgPct: 0.82, type: 'stock', sector: 'Consumer', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '149B' },
  COIN: { sym: 'COIN', name: 'Coinbase Global', price: 228.40, chg: 8.60, chgPct: 3.91, type: 'stock', sector: 'Finance', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '55B' },
  PLTR: { sym: 'PLTR', name: 'Palantir Technologies', price: 24.80, chg: 0.92, chgPct: 3.85, type: 'stock', sector: 'Technology', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '54B' },
  SNAP: { sym: 'SNAP', name: 'Snap Inc.', price: 14.20, chg: -0.30, chgPct: -2.07, type: 'stock', sector: 'Technology', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '23B' },
  UBER: { sym: 'UBER', name: 'Uber Technologies', price: 72.40, chg: 1.80, chgPct: 2.55, type: 'stock', sector: 'Technology', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '150B' },
  SQ: { sym: 'SQ', name: 'Block Inc.', price: 78.60, chg: 2.40, chgPct: 3.15, type: 'stock', sector: 'Finance', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '46B' },
  SHOP: { sym: 'SHOP', name: 'Shopify Inc.', price: 78.40, chg: 2.20, chgPct: 2.89, type: 'stock', sector: 'Technology', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '100B' },
  ROKU: { sym: 'ROKU', name: 'Roku Inc.', price: 68.20, chg: 1.40, chgPct: 2.10, type: 'stock', sector: 'Technology', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '10B' },
  // Crypto
  BTC: { sym: 'BTC', name: 'Bitcoin', price: 67420, chg: 1421, chgPct: 2.15, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '1.33T' },
  ETH: { sym: 'ETH', name: 'Ethereum', price: 3540, chg: 132, chgPct: 3.87, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '425B' },
  SOL: { sym: 'SOL', name: 'Solana', price: 178.40, chg: 7.6, chgPct: 4.45, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '82B' },
  XRP: { sym: 'XRP', name: 'XRP / Ripple', price: 0.582, chg: 0.024, chgPct: 4.30, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '32B' },
  BNB: { sym: 'BNB', name: 'Binance Coin', price: 612.80, chg: 11.2, chgPct: 1.86, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '94B' },
  ADA: { sym: 'ADA', name: 'Cardano', price: 0.482, chg: 0.010, chgPct: 2.12, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '17B' },
  DOGE: { sym: 'DOGE', name: 'Dogecoin', price: 0.162, chg: 0.008, chgPct: 5.19, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '23B' },
  DOT: { sym: 'DOT', name: 'Polkadot', price: 7.84, chg: 0.24, chgPct: 3.16, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '11B' },
  AVAX: { sym: 'AVAX', name: 'Avalanche', price: 38.20, chg: 1.80, chgPct: 4.94, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '14B' },
  LINK: { sym: 'LINK', name: 'Chainlink', price: 18.40, chg: 0.82, chgPct: 4.67, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '10B' },
  MATIC: { sym: 'MATIC', name: 'Polygon', price: 0.72, chg: 0.03, chgPct: 4.35, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '7B' },
  UNI: { sym: 'UNI', name: 'Uniswap', price: 12.40, chg: 0.62, chgPct: 5.26, type: 'crypto', sector: 'DeFi', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '7.4B' },
  ATOM: { sym: 'ATOM', name: 'Cosmos', price: 9.82, chg: 0.42, chgPct: 4.47, type: 'crypto', sector: 'Crypto', exchange: 'Crypto', country: 'GLOBAL', currency: 'USD', mktcap: '3.8B' },
  // ETFs
  SPY: { sym: 'SPY', name: 'SPDR S&P 500 ETF', price: 528.60, chg: 2.20, chgPct: 0.42, type: 'etf', sector: 'Index', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '513B' },
  QQQ: { sym: 'QQQ', name: 'Invesco QQQ Trust', price: 448.20, chg: 3.52, chgPct: 0.79, type: 'etf', sector: 'Index', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '218B' },
  IWM: { sym: 'IWM', name: 'iShares Russell 2000', price: 208.60, chg: -0.80, chgPct: -0.38, type: 'etf', sector: 'Index', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '58B' },
  VTI: { sym: 'VTI', name: 'Vanguard Total Stock', price: 268.40, chg: 1.20, chgPct: 0.45, type: 'etf', sector: 'Index', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '380B' },
  EEM: { sym: 'EEM', name: 'iShares MSCI Emerging', price: 42.80, chg: 0.60, chgPct: 1.42, type: 'etf', sector: 'Emerging Markets', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '17B' },
  GLD: { sym: 'GLD', name: 'SPDR Gold Trust', price: 224.80, chg: 1.12, chgPct: 0.50, type: 'etf', sector: 'Commodities', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '58B' },
  TLT: { sym: 'TLT', name: 'iShares 20+ Year Treasury', price: 92.40, chg: -0.30, chgPct: -0.32, type: 'etf', sector: 'Bonds', exchange: 'NASDAQ', country: 'US', currency: 'USD', mktcap: '40B' },
  ARKK: { sym: 'ARKK', name: 'ARK Innovation ETF', price: 48.60, chg: 1.40, chgPct: 2.96, type: 'etf', sector: 'Innovation', exchange: 'NYSE', country: 'US', currency: 'USD', mktcap: '7B' },
  // Kenya / Africa
  SCOM: { sym: 'SCOM', name: 'Safaricom PLC', price: 28.50, chg: 0.75, chgPct: 2.70, type: 'stock', sector: 'Telecom', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '1.14T KES' },
  EQTY: { sym: 'EQTY', name: 'Equity Group Holdings', price: 52.25, chg: 1.25, chgPct: 2.45, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '197B KES' },
  KCB: { sym: 'KCB', name: 'KCB Group PLC', price: 38.90, chg: 0.60, chgPct: 1.57, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '124B KES' },
  ABSA: { sym: 'ABSA', name: 'ABSA Bank Kenya', price: 14.20, chg: 0.15, chgPct: 1.07, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '77B KES' },
  COOP: { sym: 'COOP', name: 'Co-operative Bank', price: 15.80, chg: 0.20, chgPct: 1.28, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '93B KES' },
  EABL: { sym: 'EABL', name: 'East African Breweries', price: 168.50, chg: -2.00, chgPct: -1.17, type: 'stock', sector: 'Consumer', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '133B KES' },
  BAT: { sym: 'BAT', name: 'BAT Kenya', price: 412.00, chg: 3.50, chgPct: 0.86, type: 'stock', sector: 'Consumer', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '41B KES' },
  SBIC: { sym: 'SBIC', name: 'Stanbic Holdings', price: 118.75, chg: 1.75, chgPct: 1.50, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '47B KES' },
  KPLC: { sym: 'KPLC', name: 'Kenya Power & Lighting', price: 3.82, chg: 0.08, chgPct: 2.14, type: 'stock', sector: 'Utilities', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '7.4B KES' },
  DTK: { sym: 'DTK', name: 'Diamond Trust Bank', price: 52.50, chg: 0.50, chgPct: 0.96, type: 'stock', sector: 'Finance', exchange: 'NSE', country: 'KE', currency: 'KES', mktcap: '14.7B KES' },
  // South Africa
  NPN: { sym: 'NPN', name: 'Naspers Ltd.', price: 342800, chg: 4200, chgPct: 1.24, type: 'stock', sector: 'Technology', exchange: 'JSE', country: 'ZA', currency: 'ZAR', mktcap: '742B ZAR' },
  SOL_ZA: { sym: 'SOL.ZA', name: 'Sasol Ltd.', price: 14280, chg: -180, chgPct: -1.25, type: 'stock', sector: 'Energy', exchange: 'JSE', country: 'ZA', currency: 'ZAR', mktcap: '89B ZAR' },
  // Nigeria
  DANGCEM: { sym: 'DANGCEM', name: 'Dangote Cement', price: 290.50, chg: 5.50, chgPct: 1.93, type: 'stock', sector: 'Materials', exchange: 'NGX', country: 'NG', currency: 'NGN', mktcap: '4.95T NGN' },
  GTCO: { sym: 'GTCO', name: 'GTBank Holdings', price: 42.80, chg: 0.80, chgPct: 1.90, type: 'stock', sector: 'Finance', exchange: 'NGX', country: 'NG', currency: 'NGN', mktcap: '1.26T NGN' },
  // Europe
  ASML: { sym: 'ASML', name: 'ASML Holding NV', price: 948.20, chg: 18.40, chgPct: 1.98, type: 'stock', sector: 'Semiconductors', exchange: 'Euronext', country: 'EU', currency: 'EUR', mktcap: '374B EUR' },
  SAP: { sym: 'SAP', name: 'SAP SE', price: 182.40, chg: 2.80, chgPct: 1.56, type: 'stock', sector: 'Technology', exchange: 'XETRA', country: 'EU', currency: 'EUR', mktcap: '224B EUR' },
  NOVO: { sym: 'NOVO', name: 'Novo Nordisk A/S', price: 128.40, chg: 3.20, chgPct: 2.55, type: 'stock', sector: 'Healthcare', exchange: 'CPH', country: 'EU', currency: 'DKK', mktcap: '572B DKK' },
  // UK
  SHEL: { sym: 'SHEL', name: 'Shell PLC', price: 2840, chg: -22, chgPct: -0.77, type: 'stock', sector: 'Energy', exchange: 'LSE', country: 'GB', currency: 'GBP', mktcap: '181B GBP' },
  AZN: { sym: 'AZN', name: 'AstraZeneca PLC', price: 11820, chg: 140, chgPct: 1.20, type: 'stock', sector: 'Healthcare', exchange: 'LSE', country: 'GB', currency: 'GBP', mktcap: '183B GBP' },
  // Commodities
  GOLD: { sym: 'GOLD', name: 'Gold (XAU/USD)', price: 2340.50, chg: 12.40, chgPct: 0.53, type: 'commodity', sector: 'Precious Metals', exchange: 'COMEX', country: 'GLOBAL', currency: 'USD' },
  SILVER: { sym: 'SILVER', name: 'Silver (XAG/USD)', price: 28.42, chg: 0.32, chgPct: 1.14, type: 'commodity', sector: 'Precious Metals', exchange: 'COMEX', country: 'GLOBAL', currency: 'USD' },
  OIL: { sym: 'OIL', name: 'Crude Oil WTI', price: 82.45, chg: -0.64, chgPct: -0.78, type: 'commodity', sector: 'Energy', exchange: 'NYMEX', country: 'GLOBAL', currency: 'USD' },
  NATGAS: { sym: 'NATGAS', name: 'Natural Gas', price: 2.14, chg: -0.04, chgPct: -1.82, type: 'commodity', sector: 'Energy', exchange: 'NYMEX', country: 'GLOBAL', currency: 'USD' },
  COPPER: { sym: 'COPPER', name: 'Copper', price: 4.52, chg: 0.04, chgPct: 0.84, type: 'commodity', sector: 'Industrial Metals', exchange: 'COMEX', country: 'GLOBAL', currency: 'USD' },
  // Forex
  EURUSD: { sym: 'EUR/USD', name: 'Euro / US Dollar', price: 1.0842, chg: 0.0012, chgPct: 0.11, type: 'forex', sector: 'Major', exchange: 'FX', country: 'GLOBAL', currency: 'USD' },
  GBPUSD: { sym: 'GBP/USD', name: 'British Pound / USD', price: 1.2648, chg: -0.0018, chgPct: -0.14, type: 'forex', sector: 'Major', exchange: 'FX', country: 'GLOBAL', currency: 'USD' },
  USDJPY: { sym: 'USD/JPY', name: 'US Dollar / Japanese Yen', price: 151.42, chg: 0.28, chgPct: 0.19, type: 'forex', sector: 'Major', exchange: 'FX', country: 'GLOBAL', currency: 'JPY' },
  USDKES: { sym: 'USD/KES', name: 'US Dollar / Kenya Shilling', price: 153.80, chg: -0.40, chgPct: -0.26, type: 'forex', sector: 'Emerging', exchange: 'FX', country: 'KE', currency: 'KES' },
  USDZAR: { sym: 'USD/ZAR', name: 'US Dollar / SA Rand', price: 18.42, chg: 0.08, chgPct: 0.44, type: 'forex', sector: 'Emerging', exchange: 'FX', country: 'ZA', currency: 'ZAR' },
  USDNGN: { sym: 'USD/NGN', name: 'US Dollar / Nigerian Naira', price: 1520.40, chg: 8.20, chgPct: 0.54, type: 'forex', sector: 'Emerging', exchange: 'FX', country: 'NG', currency: 'NGN' },
  // Bonds
  US10Y: { sym: 'US10Y', name: 'US 10-Year Treasury', price: 4.48, chg: 0.03, chgPct: 0.67, type: 'bond', sector: 'Government', exchange: 'BOND', country: 'US', currency: 'USD' },
  US2Y: { sym: 'US2Y', name: 'US 2-Year Treasury', price: 4.82, chg: 0.02, chgPct: 0.42, type: 'bond', sector: 'Government', exchange: 'BOND', country: 'US', currency: 'USD' },
  KEGB10Y: { sym: 'KEGB10Y', name: 'Kenya 10-Year Bond', price: 16.20, chg: -0.10, chgPct: -0.61, type: 'bond', sector: 'Government', exchange: 'BOND', country: 'KE', currency: 'KES' },
  // Indices (non-tradeable but viewable)
  SPX: { sym: 'SPX', name: 'S&P 500 Index', price: 5282.70, chg: 22.10, chgPct: 0.42, type: 'index', sector: 'Index', exchange: 'INDEX', country: 'US', currency: 'USD' },
  NDX: { sym: 'NDX', name: 'NASDAQ 100 Index', price: 18420.30, chg: 148.20, chgPct: 0.81, type: 'index', sector: 'Index', exchange: 'INDEX', country: 'US', currency: 'USD' },
  NSE20: { sym: 'NSE20', name: 'NSE 20 Share Index', price: 1874.40, chg: 38.60, chgPct: 2.10, type: 'index', sector: 'Index', exchange: 'INDEX', country: 'KE', currency: 'KES' },
};

interface RealtimeMarketContextType {
  prices: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }>;
  tickerItems: typeof TICKER_ITEMS;
  searchAssets: (query: string) => UniversalAsset[];
  getAsset: (sym: string) => UniversalAsset | undefined;
  allAssets: UniversalAsset[];
  lastUpdate: number;
}

const RealtimeMarketContext = createContext<RealtimeMarketContextType | null>(null);

export function RealtimeMarketProvider({ children }: { children: React.ReactNode }) {
  const [prices, setPrices] = useState<Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }>>(() => {
    const initial: Record<string, { price: number; chg: number; chgPct: number; prevPrice: number }> = {};
    Object.entries(UNIVERSAL_ASSETS).forEach(([sym, asset]) => {
      initial[sym] = { price: asset.price, chg: asset.chg, chgPct: asset.chgPct, prevPrice: asset.price };
    });
    return initial;
  });
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const baseRef = useRef(UNIVERSAL_ASSETS);

  // Tick prices every 2 seconds with realistic micro-movements
  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        const syms = Object.keys(next);
        // Update ~30% of assets per tick for realistic feel
        const updateCount = Math.ceil(syms.length * 0.3);
        const shuffled = [...syms].sort(() => Math.random() - 0.5).slice(0, updateCount);

        shuffled.forEach(sym => {
          const base = baseRef.current[sym];
          if (!base) return;
          const current = next[sym];
          const volatility = base.type === 'crypto' ? 0.003 : base.type === 'forex' ? 0.0002 : 0.001;
          const drift = base.chgPct >= 0 ? 0.00005 : -0.00005;
          const move = (Math.random() - 0.5) * 2 * volatility + drift;
          const newPrice = +(current.price * (1 + move)).toFixed(
            base.price < 1 ? 6 : base.price < 10 ? 4 : base.price < 1000 ? 2 : 0
          );
          const newChg = +(newPrice - base.price + base.chg).toFixed(2);
          const newChgPct = +((newPrice - base.price) / base.price * 100 + base.chgPct).toFixed(2);
          next[sym] = { price: newPrice, chg: newChg, chgPct: newChgPct, prevPrice: current.price };
        });
        return next;
      });
      setLastUpdate(Date.now());
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const searchAssets = useCallback((query: string): UniversalAsset[] => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.values(UNIVERSAL_ASSETS)
      .filter(a =>
        a.sym.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.sector.toLowerCase().includes(q) ||
        a.exchange.toLowerCase().includes(q) ||
        a.country.toLowerCase().includes(q)
      )
      .slice(0, 12)
      .map(a => {
        const p = prices[a.sym];
        return p ? { ...a, price: p.price, chg: p.chg, chgPct: p.chgPct } : a;
      });
  }, [prices]);

  const getAsset = useCallback((sym: string): UniversalAsset | undefined => {
    const base = UNIVERSAL_ASSETS[sym];
    if (!base) return undefined;
    const p = prices[sym];
    return p ? { ...base, price: p.price, chg: p.chg, chgPct: p.chgPct } : base;
  }, [prices]);

  const allAssets = Object.values(UNIVERSAL_ASSETS).map(a => {
    const p = prices[a.sym];
    return p ? { ...a, price: p.price, chg: p.chg, chgPct: p.chgPct } : a;
  });

  const tickerItems = TICKER_ITEMS.map(item => {
    const sym = Object.keys(UNIVERSAL_ASSETS).find(s => s === item.sym || UNIVERSAL_ASSETS[s].name.includes(item.sym));
    const p = sym ? prices[sym] : null;
    return p ? { ...item, p: p.price, c: p.chgPct } : item;
  });

  return (
    <RealtimeMarketContext.Provider value={{ prices, tickerItems, searchAssets, getAsset, allAssets, lastUpdate }}>
      {children}
    </RealtimeMarketContext.Provider>
  );
}

export function useRealtimeMarket() {
  const ctx = useContext(RealtimeMarketContext);
  if (!ctx) throw new Error('useRealtimeMarket must be used within RealtimeMarketProvider');
  return ctx;
}

export { UNIVERSAL_ASSETS };
