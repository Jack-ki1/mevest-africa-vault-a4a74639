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
}

export const MARKET: Record<string, MarketAsset> = {
  AAPL: { name:'Apple Inc.', price:213.42, chg:1.83, chgPct:0.87, type:'stock', mktcap:'3.31T', vol:'58.2M', rsi:58.2, pe:28.4, sector:'Technology', signal:'neutral', cap:'mega' },
  MSFT: { name:'Microsoft', price:415.80, chg:5.10, chgPct:1.24, type:'stock', mktcap:'3.09T', vol:'18.4M', rsi:62.1, pe:35.1, sector:'Technology', signal:'bullish', cap:'mega' },
  NVDA: { name:'NVIDIA', price:875.40, chg:27.2, chgPct:3.21, type:'stock', mktcap:'2.16T', vol:'42.1M', rsi:72.4, pe:68.2, sector:'Semiconductors', signal:'overbought', cap:'mega' },
  TSLA: { name:'Tesla', price:182.60, chg:-4.51, chgPct:-2.41, type:'stock', mktcap:'581B', vol:'38.2M', rsi:38.6, pe:44.8, sector:'Automotive', signal:'oversold', cap:'large' },
  AMZN: { name:'Amazon', price:195.80, chg:3.60, chgPct:1.85, type:'stock', mktcap:'2.05T', vol:'24.6M', rsi:60.2, pe:42.1, sector:'Consumer', signal:'bullish', cap:'mega' },
  GOOGL: { name:'Alphabet', price:168.40, chg:1.04, chgPct:0.62, type:'stock', mktcap:'2.09T', vol:'14.8M', rsi:54.2, pe:24.8, sector:'Technology', signal:'neutral', cap:'mega' },
  META: { name:'Meta Platforms', price:512.30, chg:16.3, chgPct:3.28, type:'stock', mktcap:'1.31T', vol:'12.4M', rsi:66.4, pe:24.2, sector:'Technology', signal:'bullish', cap:'mega' },
  JPM: { name:'JPMorgan Chase', price:205.70, chg:1.22, chgPct:0.60, type:'stock', mktcap:'595B', vol:'8.4M', rsi:52.1, pe:12.4, sector:'Finance', signal:'neutral', cap:'large' },
  BTC: { name:'Bitcoin', price:67420, chg:1421, chgPct:2.15, type:'crypto', mktcap:'1.33T', vol:'38.7B', rsi:61.5, pe:'—', sector:'Crypto', signal:'bullish', cap:'mega' },
  ETH: { name:'Ethereum', price:3540, chg:132, chgPct:3.87, type:'crypto', mktcap:'425B', vol:'18.2B', rsi:65.4, pe:'—', sector:'Crypto', signal:'bullish', cap:'large' },
  SOL: { name:'Solana', price:178.40, chg:7.6, chgPct:4.45, type:'crypto', mktcap:'82B', vol:'4.2B', rsi:68.2, pe:'—', sector:'Crypto', signal:'bullish', cap:'large' },
  XRP: { name:'XRP / Ripple', price:0.582, chg:0.024, chgPct:4.30, type:'crypto', mktcap:'32B', vol:'1.8B', rsi:58.6, pe:'—', sector:'Crypto', signal:'bullish', cap:'mid' },
  SPY: { name:'S&P 500 ETF', price:528.60, chg:2.20, chgPct:0.42, type:'etf', mktcap:'513B', vol:'22.1M', rsi:56.8, pe:21.4, sector:'Index', signal:'neutral', cap:'mega' },
  QQQ: { name:'NASDAQ ETF', price:448.20, chg:3.52, chgPct:0.79, type:'etf', mktcap:'218B', vol:'6.4M', rsi:58.4, pe:26.2, sector:'Index', signal:'neutral', cap:'large' },
  GLD: { name:'Gold ETF (SPDR)', price:224.80, chg:1.12, chgPct:0.50, type:'etf', mktcap:'58B', vol:'5.8M', rsi:52.0, pe:'—', sector:'Commodities', signal:'neutral', cap:'large' },
  US10Y: { name:'US 10Y Treasury', price:96.80, chg:-0.12, chgPct:-0.12, type:'bond', mktcap:'—', vol:'—', rsi:'—', pe:'—', sector:'Government', signal:'neutral', cap:'—' },
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

// Generate a line of random walk data
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
