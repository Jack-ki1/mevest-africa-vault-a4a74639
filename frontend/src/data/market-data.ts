export interface MarketAsset {
  name: string;
  price: number;
  chg: number;
  chgPct: number;
  type: 'stock' | 'crypto' | 'etf' | 'bond';
  mktcap: string;
  vol: string;
  rsi: number | string;
  pe: number | string;
  sector: string;
  signal: 'bullish' | 'bearish' | 'overbought' | 'oversold' | 'neutral';
  cap: string;
  dividend?: number;
  divYield?: number;
  analystRating?: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';
  priceTarget?: number;
  fairValue?: number;
  morningstarRating?: number; // 1-5 stars
  eps?: number;
  revenue?: string;
  beta?: number;
}

// MARKET is a legacy static fallback. Canonical live/fallback prices live in
// RealtimeMarketContext.tsx BUILTIN_ASSETS. Keep values in sync — KCB/SCOM/EQTY
// aligned to BUILTIN_ASSETS. Future: delete MARKET and use a schema-only asset list.
export const MARKET: Record<string, MarketAsset> = {
  AAPL: { name:'Apple Inc.', price:213.42, chg:1.83, chgPct:0.87, type:'stock', mktcap:'3.31T', vol:'58.2M', rsi:58.2, pe:28.4, sector:'Technology', signal:'neutral', cap:'mega', dividend:0.96, divYield:0.45, analystRating:'buy', priceTarget:235, fairValue:220, morningstarRating:4, eps:6.57, revenue:'383B', beta:1.21 },
  MSFT: { name:'Microsoft', price:415.80, chg:5.10, chgPct:1.24, type:'stock', mktcap:'3.09T', vol:'18.4M', rsi:62.1, pe:35.1, sector:'Technology', signal:'bullish', cap:'mega', dividend:3.00, divYield:0.72, analystRating:'strong_buy', priceTarget:480, fairValue:440, morningstarRating:5, eps:11.86, revenue:'227B', beta:0.89 },
  NVDA: { name:'NVIDIA', price:875.40, chg:27.2, chgPct:3.21, type:'stock', mktcap:'2.16T', vol:'42.1M', rsi:72.4, pe:68.2, sector:'Semiconductors', signal:'overbought', cap:'mega', dividend:0.16, divYield:0.02, analystRating:'strong_buy', priceTarget:1100, fairValue:920, morningstarRating:4, eps:12.84, revenue:'61B', beta:1.68 },
  TSLA: { name:'Tesla', price:182.60, chg:-4.51, chgPct:-2.41, type:'stock', mktcap:'581B', vol:'38.2M', rsi:38.6, pe:44.8, sector:'Automotive', signal:'oversold', cap:'large', analystRating:'hold', priceTarget:210, fairValue:175, morningstarRating:3, eps:4.08, revenue:'96.7B', beta:2.04 },
  AMZN: { name:'Amazon', price:195.80, chg:3.60, chgPct:1.85, type:'stock', mktcap:'2.05T', vol:'24.6M', rsi:60.2, pe:42.1, sector:'Consumer', signal:'bullish', cap:'mega', analystRating:'strong_buy', priceTarget:230, fairValue:210, morningstarRating:5, eps:4.65, revenue:'575B', beta:1.15 },
  GOOGL: { name:'Alphabet', price:168.40, chg:1.04, chgPct:0.62, type:'stock', mktcap:'2.09T', vol:'14.8M', rsi:54.2, pe:24.8, sector:'Technology', signal:'neutral', cap:'mega', dividend:0.80, divYield:0.48, analystRating:'buy', priceTarget:195, fairValue:180, morningstarRating:4, eps:6.79, revenue:'307B', beta:1.06 },
  META: { name:'Meta Platforms', price:512.30, chg:16.3, chgPct:3.28, type:'stock', mktcap:'1.31T', vol:'12.4M', rsi:66.4, pe:24.2, sector:'Technology', signal:'bullish', cap:'mega', dividend:2.00, divYield:0.39, analystRating:'buy', priceTarget:580, fairValue:530, morningstarRating:4, eps:21.16, revenue:'135B', beta:1.24 },
  JPM: { name:'JPMorgan Chase', price:205.70, chg:1.22, chgPct:0.60, type:'stock', mktcap:'595B', vol:'8.4M', rsi:52.1, pe:12.4, sector:'Finance', signal:'neutral', cap:'large', dividend:4.60, divYield:2.24, analystRating:'buy', priceTarget:225, fairValue:215, morningstarRating:4, eps:16.59, revenue:'158B', beta:1.08 },
  V: { name:'Visa Inc.', price:290.50, chg:2.40, chgPct:0.83, type:'stock', mktcap:'596B', vol:'5.2M', rsi:55.8, pe:31.2, sector:'Finance', signal:'neutral', cap:'large', dividend:2.08, divYield:0.72, analystRating:'buy', priceTarget:320, fairValue:300, morningstarRating:5, eps:9.31, revenue:'33B', beta:0.94 },
  JNJ: { name:'Johnson & Johnson', price:158.20, chg:-0.82, chgPct:-0.52, type:'stock', mktcap:'381B', vol:'6.1M', rsi:45.2, pe:18.6, sector:'Healthcare', signal:'neutral', cap:'large', dividend:4.96, divYield:3.14, analystRating:'hold', priceTarget:170, fairValue:165, morningstarRating:4, eps:8.51, revenue:'85B', beta:0.55 },
  UNH: { name:'UnitedHealth', price:528.40, chg:4.10, chgPct:0.78, type:'stock', mktcap:'487B', vol:'3.2M', rsi:57.4, pe:22.8, sector:'Healthcare', signal:'bullish', cap:'large', dividend:7.52, divYield:1.42, analystRating:'strong_buy', priceTarget:600, fairValue:560, morningstarRating:5, eps:23.18, revenue:'371B', beta:0.68 },
  BTC: { name:'Bitcoin', price:67420, chg:1421, chgPct:2.15, type:'crypto', mktcap:'1.33T', vol:'38.7B', rsi:61.5, pe:'—', sector:'Crypto', signal:'bullish', cap:'mega', morningstarRating:3, beta:1.82 },
  ETH: { name:'Ethereum', price:3540, chg:132, chgPct:3.87, type:'crypto', mktcap:'425B', vol:'18.2B', rsi:65.4, pe:'—', sector:'Crypto', signal:'bullish', cap:'large', morningstarRating:3, beta:1.95 },
  SOL: { name:'Solana', price:178.40, chg:7.6, chgPct:4.45, type:'crypto', mktcap:'82B', vol:'4.2B', rsi:68.2, pe:'—', sector:'Crypto', signal:'bullish', cap:'large', morningstarRating:2, beta:2.40 },
  XRP: { name:'XRP / Ripple', price:0.582, chg:0.024, chgPct:4.30, type:'crypto', mktcap:'32B', vol:'1.8B', rsi:58.6, pe:'—', sector:'Crypto', signal:'bullish', cap:'mid' },
  SPY: { name:'S&P 500 ETF', price:528.60, chg:2.20, chgPct:0.42, type:'etf', mktcap:'513B', vol:'22.1M', rsi:56.8, pe:21.4, sector:'Index', signal:'neutral', cap:'mega', dividend:6.52, divYield:1.23, morningstarRating:5, beta:1.00 },
  QQQ: { name:'NASDAQ ETF', price:448.20, chg:3.52, chgPct:0.79, type:'etf', mktcap:'218B', vol:'6.4M', rsi:58.4, pe:26.2, sector:'Index', signal:'neutral', cap:'large', dividend:3.18, divYield:0.71, morningstarRating:5, beta:1.12 },
  GLD: { name:'Gold ETF (SPDR)', price:224.80, chg:1.12, chgPct:0.50, type:'etf', mktcap:'58B', vol:'5.8M', rsi:52.0, pe:'—', sector:'Commodities', signal:'neutral', cap:'large', morningstarRating:4, beta:0.05 },
  US10Y: { name:'US 10Y Treasury', price:96.80, chg:-0.12, chgPct:-0.12, type:'bond', mktcap:'—', vol:'—', rsi:'—', pe:'—', sector:'Government', signal:'neutral', cap:'—' },
  SCOM: { name:'Safaricom PLC', price:28.50, chg:0.75, chgPct:2.70, type:'stock', mktcap:'1.14T KES', vol:'12.4M', rsi:54.8, pe:14.2, sector:'Telecom', signal:'bullish', cap:'large', dividend:1.44, divYield:5.05, analystRating:'buy', priceTarget:32, fairValue:30, morningstarRating:4, eps:2.01, revenue:'308B KES', beta:0.72 },
  EQTY: { name:'Equity Group', price:52.25, chg:1.25, chgPct:2.45, type:'stock', mktcap:'197B KES', vol:'3.8M', rsi:58.2, pe:6.8, sector:'Finance', signal:'bullish', cap:'mid', dividend:4.00, divYield:7.66, analystRating:'strong_buy', priceTarget:62, fairValue:58, morningstarRating:5, eps:7.68, revenue:'142B KES', beta:0.85 },
  KCB: { name:'KCB Group', price:42.10, chg:0.85, chgPct:2.06, type:'stock', mktcap:'135B KES', vol:'2.1M', rsi:52.4, pe:5.2, sector:'Finance', signal:'neutral', cap:'mid', dividend:2.50, divYield:6.43, analystRating:'buy', priceTarget:45, fairValue:42, morningstarRating:4, eps:7.48, revenue:'118B KES', beta:0.78 },
};

// Sector heatmap data
export interface SectorHeatmapItem {
  name: string;
  sym: string;
  chgPct: number;
  mktcap: number; // in billions for sizing
  sector: string;
}

export const SECTOR_HEATMAP: SectorHeatmapItem[] = [
  { name: 'Apple', sym: 'AAPL', chgPct: 0.87, mktcap: 3310, sector: 'Technology' },
  { name: 'Microsoft', sym: 'MSFT', chgPct: 1.24, mktcap: 3090, sector: 'Technology' },
  { name: 'NVIDIA', sym: 'NVDA', chgPct: 3.21, mktcap: 2160, sector: 'Technology' },
  { name: 'Alphabet', sym: 'GOOGL', chgPct: 0.62, mktcap: 2090, sector: 'Technology' },
  { name: 'Meta', sym: 'META', chgPct: 3.28, mktcap: 1310, sector: 'Technology' },
  { name: 'Amazon', sym: 'AMZN', chgPct: 1.85, mktcap: 2050, sector: 'Consumer' },
  { name: 'Tesla', sym: 'TSLA', chgPct: -2.41, mktcap: 581, sector: 'Automotive' },
  { name: 'JPMorgan', sym: 'JPM', chgPct: 0.60, mktcap: 595, sector: 'Finance' },
  { name: 'Visa', sym: 'V', chgPct: 0.83, mktcap: 596, sector: 'Finance' },
  { name: 'J&J', sym: 'JNJ', chgPct: -0.52, mktcap: 381, sector: 'Healthcare' },
  { name: 'UnitedHealth', sym: 'UNH', chgPct: 0.78, mktcap: 487, sector: 'Healthcare' },
  { name: 'Bitcoin', sym: 'BTC', chgPct: 2.15, mktcap: 1330, sector: 'Crypto' },
  { name: 'Ethereum', sym: 'ETH', chgPct: 3.87, mktcap: 425, sector: 'Crypto' },
  { name: 'Solana', sym: 'SOL', chgPct: 4.45, mktcap: 82, sector: 'Crypto' },
  { name: 'S&P 500 ETF', sym: 'SPY', chgPct: 0.42, mktcap: 513, sector: 'ETFs' },
  { name: 'NASDAQ ETF', sym: 'QQQ', chgPct: 0.79, mktcap: 218, sector: 'ETFs' },
  { name: 'Gold ETF', sym: 'GLD', chgPct: 0.50, mktcap: 58, sector: 'Commodities' },
  { name: 'Safaricom', sym: 'SCOM', chgPct: 2.70, mktcap: 9, sector: 'Africa' },
  { name: 'Equity Grp', sym: 'EQTY', chgPct: 2.45, mktcap: 1.5, sector: 'Africa' },
  { name: 'KCB Group', sym: 'KCB', chgPct: 1.57, mktcap: 1, sector: 'Africa' },
];

// Earnings calendar
export interface EarningsEvent {
  sym: string;
  name: string;
  date: string;
  time: 'BMO' | 'AMC' | 'DMH'; // Before Market Open, After Market Close, During Market Hours
  epsEstimate: number;
  epsPrior: number;
  revenueEstimate: string;
  revenuePrior: string;
}

export const EARNINGS_CALENDAR: EarningsEvent[] = [
  { sym: 'AAPL', name: 'Apple Inc.', date: '2026-04-24', time: 'AMC', epsEstimate: 1.62, epsPrior: 1.53, revenueEstimate: '94.2B', revenuePrior: '90.8B' },
  { sym: 'MSFT', name: 'Microsoft', date: '2026-04-22', time: 'AMC', epsEstimate: 3.22, epsPrior: 2.94, revenueEstimate: '68.5B', revenuePrior: '61.9B' },
  { sym: 'AMZN', name: 'Amazon', date: '2026-04-25', time: 'AMC', epsEstimate: 1.38, epsPrior: 1.17, revenueEstimate: '155B', revenuePrior: '143B' },
  { sym: 'META', name: 'Meta Platforms', date: '2026-04-23', time: 'AMC', epsEstimate: 5.82, epsPrior: 5.33, revenueEstimate: '41.2B', revenuePrior: '39.1B' },
  { sym: 'GOOGL', name: 'Alphabet', date: '2026-04-22', time: 'AMC', epsEstimate: 2.01, epsPrior: 1.89, revenueEstimate: '86.3B', revenuePrior: '80.5B' },
  { sym: 'TSLA', name: 'Tesla', date: '2026-04-22', time: 'AMC', epsEstimate: 0.52, epsPrior: 0.45, revenueEstimate: '25.8B', revenuePrior: '23.3B' },
  { sym: 'NVDA', name: 'NVIDIA', date: '2026-05-21', time: 'AMC', epsEstimate: 7.40, epsPrior: 6.12, revenueEstimate: '37.5B', revenuePrior: '26.0B' },
  { sym: 'JPM', name: 'JPMorgan Chase', date: '2026-04-11', time: 'BMO', epsEstimate: 4.65, epsPrior: 4.44, revenueEstimate: '42.8B', revenuePrior: '41.9B' },
  { sym: 'JNJ', name: 'Johnson & Johnson', date: '2026-04-15', time: 'BMO', epsEstimate: 2.58, epsPrior: 2.71, revenueEstimate: '21.4B', revenuePrior: '21.4B' },
  { sym: 'V', name: 'Visa Inc.', date: '2026-04-22', time: 'AMC', epsEstimate: 2.68, epsPrior: 2.51, revenueEstimate: '9.4B', revenuePrior: '8.8B' },
  { sym: 'UNH', name: 'UnitedHealth', date: '2026-04-15', time: 'BMO', epsEstimate: 7.14, epsPrior: 6.91, revenueEstimate: '101B', revenuePrior: '99.8B' },
  { sym: 'SCOM', name: 'Safaricom PLC', date: '2026-05-08', time: 'BMO', epsEstimate: 2.10, epsPrior: 2.01, revenueEstimate: '320B KES', revenuePrior: '308B KES' },
];

// Economic calendar
export interface EconomicEvent {
  date: string;
  time: string;
  country: string;
  flag: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  actual?: string;
  forecast: string;
  previous: string;
}

export const ECONOMIC_CALENDAR: EconomicEvent[] = [
  { date: '2026-03-24', time: '08:30', country: 'US', flag: '🇺🇸', event: 'GDP (QoQ) Q4', impact: 'high', forecast: '3.3%', previous: '3.2%' },
  { date: '2026-03-24', time: '10:00', country: 'US', flag: '🇺🇸', event: 'Consumer Confidence', impact: 'medium', forecast: '104.5', previous: '106.7' },
  { date: '2026-03-25', time: '08:30', country: 'US', flag: '🇺🇸', event: 'Durable Goods Orders', impact: 'medium', forecast: '1.1%', previous: '-6.1%' },
  { date: '2026-03-25', time: '10:00', country: 'US', flag: '🇺🇸', event: 'New Home Sales', impact: 'medium', forecast: '680K', previous: '664K' },
  { date: '2026-03-26', time: '08:30', country: 'US', flag: '🇺🇸', event: 'Initial Jobless Claims', impact: 'high', forecast: '215K', previous: '210K' },
  { date: '2026-03-26', time: '10:00', country: 'KE', flag: '🇰🇪', event: 'CBK Monetary Policy Rate', impact: 'high', forecast: '12.00%', previous: '12.50%' },
  { date: '2026-03-27', time: '08:30', country: 'US', flag: '🇺🇸', event: 'PCE Price Index (YoY)', impact: 'high', forecast: '2.5%', previous: '2.6%' },
  { date: '2026-03-27', time: '08:30', country: 'US', flag: '🇺🇸', event: 'Personal Spending (MoM)', impact: 'medium', forecast: '0.3%', previous: '0.2%' },
  { date: '2026-03-28', time: '09:00', country: 'EU', flag: '🇪🇺', event: 'ECB Interest Rate Decision', impact: 'high', forecast: '4.25%', previous: '4.50%' },
  { date: '2026-03-28', time: '07:00', country: 'UK', flag: '🇬🇧', event: 'UK GDP (QoQ) Q4', impact: 'high', forecast: '0.3%', previous: '-0.1%' },
  { date: '2026-03-31', time: '10:00', country: 'KE', flag: '🇰🇪', event: 'Kenya CPI (YoY)', impact: 'medium', forecast: '6.3%', previous: '6.8%' },
  { date: '2026-03-31', time: '21:00', country: 'CN', flag: '🇨🇳', event: 'China PMI Manufacturing', impact: 'high', forecast: '50.2', previous: '49.1' },
];

// Sector performance data
export interface SectorPerf {
  name: string;
  chg1d: number;
  chg1w: number;
  chg1m: number;
  chg3m: number;
  chgYtd: number;
}

export const SECTOR_PERFORMANCE: SectorPerf[] = [
  { name: 'Technology', chg1d: 1.82, chg1w: 3.45, chg1m: 5.21, chg3m: 12.8, chgYtd: 18.4 },
  { name: 'Healthcare', chg1d: 0.34, chg1w: 1.12, chg1m: 2.85, chg3m: 4.2, chgYtd: 6.1 },
  { name: 'Finance', chg1d: 0.68, chg1w: 2.31, chg1m: 4.12, chg3m: 8.4, chgYtd: 12.2 },
  { name: 'Consumer', chg1d: 1.12, chg1w: 1.85, chg1m: 3.42, chg3m: 7.1, chgYtd: 10.8 },
  { name: 'Energy', chg1d: -0.82, chg1w: -1.24, chg1m: -2.18, chg3m: 3.4, chgYtd: 5.2 },
  { name: 'Industrials', chg1d: 0.42, chg1w: 1.54, chg1m: 2.96, chg3m: 6.8, chgYtd: 9.4 },
  { name: 'Real Estate', chg1d: -0.28, chg1w: 0.45, chg1m: 1.24, chg3m: -1.2, chgYtd: -3.4 },
  { name: 'Utilities', chg1d: 0.18, chg1w: 0.82, chg1m: 1.95, chg3m: 3.8, chgYtd: 7.2 },
  { name: 'Materials', chg1d: 0.54, chg1w: 1.42, chg1m: 2.58, chg3m: 5.4, chgYtd: 8.1 },
  { name: 'Telecom', chg1d: 0.92, chg1w: 2.14, chg1m: 3.82, chg3m: 6.2, chgYtd: 9.8 },
];

// Fear & Greed Index
export const FEAR_GREED = {
  value: 68,
  label: 'Greed',
  previous: 62,
  oneWeekAgo: 55,
  oneMonthAgo: 42,
};

export interface MarketRegionItem {
  sym: string;
  key: string;
  price: number;
  chg: number;
}

export const MARKET_REGIONS: Record<string, MarketRegionItem[]> = {
  us: [
    { sym:'S&P 500', key:'SPX', price:5282.70, chg:0.42 },
    { sym:'NASDAQ', key:'NDX', price:18420.30, chg:0.81 },
    { sym:'DOW JONES', key:'DJI', price:39842.00, chg:0.18 },
    { sym:'RUSSELL 2000', key:'RUT', price:2086.40, chg:-0.32 },
    { sym:'VIX', key:'VIX', price:14.82, chg:-1.20 },
    { sym:'AAPL', key:'AAPL', price:213.42, chg:0.87 },
  ],
  crypto: [
    { sym:'BTC/USD', key:'BTC', price:67420, chg:2.15 },
    { sym:'ETH/USD', key:'ETH', price:3540, chg:3.87 },
    { sym:'SOL/USD', key:'SOL', price:178.40, chg:4.45 },
    { sym:'BNB/USD', key:'BNB', price:612.80, chg:1.82 },
    { sym:'XRP/USD', key:'XRP', price:0.582, chg:4.30 },
    { sym:'ADA/USD', key:'ADA', price:0.482, chg:2.10 },
  ],
  africa: [
    { sym:'NSE 20 (Kenya)', key:'NSE20', price:1874.40, chg:2.10 },
    { sym:'JSE All Share (SA)', key:'JSE', price:76842.00, chg:0.55 },
    { sym:'NGX (Nigeria)', key:'NGX', price:99812.00, chg:1.34 },
    { sym:'EGX 30 (Egypt)', key:'EGX', price:26482.00, chg:-0.42 },
    { sym:'BRVM (W. Africa)', key:'BRVM', price:218.40, chg:0.28 },
    { sym:'USE (Uganda)', key:'USE', price:1482.60, chg:0.82 },
  ],
  europe: [
    { sym:'FTSE 100 (UK)', key:'FTSE', price:8128.50, chg:0.34 },
    { sym:'DAX (Germany)', key:'DAX', price:18282.40, chg:0.62 },
    { sym:'CAC 40 (France)', key:'CAC', price:8082.20, chg:-0.28 },
    { sym:'EURO STOXX 50', key:'SX5E', price:5012.40, chg:0.41 },
    { sym:'SMI (Switzerland)', key:'SMI', price:11882.40, chg:0.18 },
    { sym:'IBEX 35 (Spain)', key:'IBEX', price:11022.00, chg:0.95 },
  ],
  commodities: [
    { sym:'Gold (XAU/USD)', key:'GOLD', price:2340.50, chg:0.53 },
    { sym:'Silver (XAG/USD)', key:'SILVER', price:28.42, chg:1.14 },
    { sym:'Crude Oil WTI', key:'OIL', price:82.45, chg:-0.78 },
    { sym:'Brent Crude', key:'BRENT', price:87.20, chg:-0.52 },
    { sym:'Natural Gas', key:'NATGAS', price:2.14, chg:-1.82 },
    { sym:'Copper', key:'COPPER', price:4.52, chg:0.84 },
  ],
  bonds: [
    { sym:'US 10Y Treasury', key:'US10Y', price:4.48, chg:0.03 },
    { sym:'US 2Y Treasury', key:'US2Y', price:4.82, chg:0.02 },
    { sym:'UK Gilt 10Y', key:'UKGILT', price:4.22, chg:0.04 },
    { sym:'Germany 10Y Bund', key:'BUND', price:2.48, chg:0.02 },
    { sym:'Kenya Govt Bond 10Y', key:'KEGB', price:16.20, chg:-0.10 },
    { sym:'SA Govt Bond 10Y', key:'SAGB', price:10.42, chg:0.08 },
  ],
};

export interface NewsItem {
  src: string;
  headline: string;
  time: string;
  tags: string[];
  sent: 'bullish' | 'bearish';
}

export const ALL_NEWS: NewsItem[] = [
  { src:'Bloomberg', headline:'Federal Reserve signals potential rate cuts as inflation eases toward 2% target', time:'2h ago', tags:['Macro','macro'], sent:'bullish' },
  { src:'Reuters', headline:'NVIDIA surges past $2T market cap as AI chip demand accelerates — analysts raise targets', time:'3h ago', tags:['Tech','tech'], sent:'bullish' },
  { src:'CoinDesk', headline:'Bitcoin consolidates above $67K as spot ETF inflows hit monthly record of $4.2B', time:'4h ago', tags:['Crypto','crypto'], sent:'bullish' },
  { src:'FT', headline:"Apple Vision Pro 2 launch drives shares to multi-month highs on strong pre-order data", time:'5h ago', tags:['Tech','tech'], sent:'bullish' },
  { src:'CNBC', headline:'Rising 10Y Treasury yields above 4.5% pressure high-multiple growth stocks broadly', time:'6h ago', tags:['Macro','markets','macro'], sent:'bearish' },
  { src:'MarketWatch', headline:'Tesla misses Q1 delivery estimates by 12%; shares drop 4% in after-hours trade', time:'7h ago', tags:['Markets','markets'], sent:'bearish' },
  { src:'Business Daily', headline:'Kenya NSE 20 index gains 2.1% driven by banking sector earnings beats', time:'8h ago', tags:['Africa','africa'], sent:'bullish' },
  { src:'Ethereum.org', headline:'Ethereum Pectra upgrade confirmed for Q3; developers cite improved validator UX', time:'9h ago', tags:['Crypto','crypto'], sent:'bullish' },
  { src:'WSJ', headline:'Amazon AWS cloud revenue beats estimates; operating margins hit new record of 38%', time:'10h ago', tags:['Tech','tech'], sent:'bullish' },
  { src:'Bloomberg', headline:'ECB holds rates steady; Lagarde signals summer cuts if data cooperates', time:'11h ago', tags:['Macro','macro'], sent:'bullish' },
  { src:'Reuters', headline:'Solana network processes 65,000 TPS milestone as DeFi TVL surpasses $10B', time:'12h ago', tags:['Crypto','crypto'], sent:'bullish' },
  { src:'Business Daily', headline:'NSE records strongest quarter in 5 years as foreign inflows return to Nairobi', time:'13h ago', tags:['Africa','africa'], sent:'bullish' },
  { src:'FT', headline:'JPMorgan Q1 profits rise 8% as net interest income remains elevated', time:'14h ago', tags:['Markets','markets'], sent:'bullish' },
  { src:'CNBC', headline:'Gold rallies to $2,340 as central banks accelerate reserve diversification', time:'15h ago', tags:['Markets','markets'], sent:'bullish' },
];

export const TICKER_ITEMS = [
  { sym:'S&P 500', p:5282.70, c:0.42 },
  { sym:'NASDAQ', p:18420, c:0.81 },
  { sym:'DOW', p:39842, c:0.18 },
  { sym:'BTC', p:67420, c:2.15 },
  { sym:'ETH', p:3540, c:3.87 },
  { sym:'GOLD', p:2340.50, c:0.53 },
  { sym:'OIL', p:82.45, c:-0.78 },
  { sym:'NVDA', p:875.40, c:3.21 },
  { sym:'AAPL', p:213.42, c:0.87 },
  { sym:'MSFT', p:415.80, c:1.24 },
  { sym:'TSLA', p:182.60, c:-2.41 },
  { sym:'NSE 20', p:1874, c:2.10 },
];

export function genLine(start: number, pts: number, drift = 0.003, vol = 0.015): number[] {
  const data: number[] = [start];
  for (let i = 1; i <= pts; i++) {
    const d = drift + (Math.random() - 0.5) * vol * 2;
    data.push(+(data[i - 1] * (1 + d)).toFixed(2));
  }
  return data;
}

export function formatMoney(v: number): string {
  if (Math.abs(v) >= 1e9) return '$' + (v / 1e9).toFixed(2) + 'B';
  if (Math.abs(v) >= 1e6) return '$' + (v / 1e6).toFixed(2) + 'M';
  if (Math.abs(v) >= 1e3) return '$' + (v / 1e3).toFixed(1) + 'K';
  return '$' + v.toFixed(2);
}

export function formatPct(v: number): string {
  return (v >= 0 ? '+' : '') + v.toFixed(2) + '%';
}

export function formatPrice(p: number): string {
  if (p >= 1000) return p.toLocaleString('en-US', { maximumFractionDigits: 0 });
  if (p >= 1) return p.toFixed(2);
  return p.toFixed(4);
}
