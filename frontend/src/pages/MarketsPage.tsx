import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { marketApi, ChartPoint, QuoteData } from '@/lib/api/market';
import { SECTOR_HEATMAP, MARKET_REGIONS, formatPct, formatPrice } from '@/data/market-data';
import LiveSearchInput from '@/components/LiveSearchInput';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
  CartesianGrid, ComposedChart, Line,
} from 'recharts';
import { TrendingUp, BarChart3, Grid3X3, Wifi, Globe, Loader2, ArrowUpRight, ArrowDownRight, Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PriceAlertModal from '@/components/PriceAlertModal';
import { sma, rsi, bollinger } from '@/lib/analytics/indicators';

const TABS = [
  { id: 'charts', label: 'Charts', icon: TrendingUp },
  { id: 'heatmap', label: 'Heatmap', icon: Grid3X3 },
  { id: 'marketwatch', label: 'Market Watch', icon: BarChart3 },
] as const;

const RANGES = [
  { key: '1D', range: '1d', interval: '5m' },
  { key: '1W', range: '5d', interval: '15m' },
  { key: '1M', range: '1mo', interval: '1d' },
  { key: '3M', range: '3mo', interval: '1d' },
  { key: '1Y', range: '1y', interval: '1wk' },
  { key: '5Y', range: '5y', interval: '1mo' },
];

const MW_TABS = ['us', 'crypto', 'africa', 'europe', 'commodities', 'bonds'] as const;

export default function MarketsPage({ initialSymbol }: { initialSymbol?: string }) {
  const location = useLocation();
  const stateSymbol = (location.state as { symbol?: string } | null)?.symbol;
  const resolvedInitial = initialSymbol ?? stateSymbol ?? 'AAPL';
  const [activeTab, setActiveTab] = useState<string>('charts');
  const { prices, allAssets, isLive } = useRealtimeMarket();

  return (
    <div className="space-y-3.5">
      {/* Tab bar */}
      <div className="flex items-center gap-1 bg-card border border-border rounded-xl p-1">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === t.id
                  ? 'bg-primary/10 text-primary border border-primary/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/30 border border-transparent'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-1 px-2">
          <Wifi className={`w-2.5 h-2.5 ${isLive ? 'text-primary' : 'text-muted-foreground'}`} />
          <span className={`text-[9px] font-bold ${isLive ? 'text-primary' : 'text-muted-foreground'}`}>{isLive ? 'LIVE' : 'SIM'}</span>
        </div>
      </div>

      {activeTab === 'charts' && <ChartsTab initialSymbol={resolvedInitial} />}
      {activeTab === 'heatmap' && <HeatmapTab />}
      {activeTab === 'marketwatch' && <MarketWatchTab />}
    </div>
  );
}

/* ───── CHARTS TAB ───── */
function ChartsTab({ initialSymbol }: { initialSymbol?: string }) {
  const location = useLocation();
  const stateSym = (location.state as { symbol?: string } | null)?.symbol;
  const resolved = initialSymbol ?? stateSym ?? 'AAPL';
  const [symbol, setSymbol] = useState(resolved);
  const [rangeIdx, setRangeIdx] = useState(2); // 1M
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [overlay, setOverlay] = useState<string>('none');
  const [showAlert, setShowAlert] = useState(false);

  const fetchData = useCallback(async (sym: string, ri: number) => {
    setLoading(true);
    try {
      const r = RANGES[ri];
      const [chartRes, quotesRes] = await Promise.all([
        marketApi.getChart(sym, r.range, r.interval),
        marketApi.getQuotes([sym]),
      ]);
      setChartData(chartRes.points);
      setQuote(quotesRes[sym] || null);
    } catch { /* fallback handled */ }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(symbol, rangeIdx); }, [symbol, rangeIdx, fetchData]);

  const displayData = useMemo(() => {
    if (!chartData.length) return [];
    return chartData.map(p => ({
      time: new Date(p.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      close: p.c,
      open: p.o,
      high: p.h,
      low: p.l,
      volume: p.v,
    }));
  }, [chartData]);

  const closes = useMemo(() => displayData.map(d => d.close), [displayData]);
  const sma20 = useMemo(() => sma(closes, 20), [closes]);
  const sma50 = useMemo(() => sma(closes, 50), [closes]);
  const rsiArr = useMemo(() => rsi(closes, 14), [closes]);
  const bb = useMemo(() => bollinger(closes, 20, 2), [closes]);

  const maData = useMemo(() => {
    return displayData.map((d, i) => ({
      ...d,
      ma20: sma20[i] ?? undefined,
      ma50: sma50[i] ?? undefined,
      rsi: rsiArr[i] ?? undefined,
      bbUpper: bb.upper[i] ?? undefined,
      bbLower: bb.lower[i] ?? undefined,
    }));
  }, [displayData, sma20, sma50, rsiArr, bb]);

  const chgColor = quote && quote.changePercent >= 0 ? 'text-primary' : 'text-destructive';
  const gradId = quote && quote.changePercent >= 0 ? 'chartGradUp' : 'chartGradDown';
  const strokeColor = quote && quote.changePercent >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3 flex-wrap">
        <LiveSearchInput
          onSelect={(sym) => setSymbol(sym)}
          placeholder="Search symbol... AAPL, BTC-USD, 005930.KS"
          className="w-[300px]"
          size="sm"
        />
        <div className="flex gap-0.5 bg-secondary rounded-lg p-[2px]">
          {RANGES.map((r, i) => (
            <button key={r.key} onClick={() => setRangeIdx(i)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${rangeIdx === i ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
              {r.key}
            </button>
          ))}
        </div>
        <select value={overlay} onChange={e => setOverlay(e.target.value)}
          className="px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-foreground outline-none">
          <option value="none">No Overlay</option>
          <option value="ma">MA (20/50)</option>
          <option value="volume">Volume</option>
          <option value="bb">Bollinger Bands</option>
          <option value="rsi">RSI (14)</option>
        </select>
        <button onClick={() => setShowAlert(true)} className="px-2 py-1 rounded-md text-[11px] bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"><Bell className="w-3 h-3" />Alert</button>
      </div>

      {symbol.endsWith('.NR') && <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">NSE price: indicative, updated manually — not live until NSE Delayed Data vendor setup (see §3.1). 15-min delay planned.</div>}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Chart */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <div className="font-display font-bold text-lg">{symbol}</div>
            {quote && (
              <>
                <span className="font-mono text-lg font-semibold tabular-nums">${formatPrice(quote.price)}</span>
                <span className={`font-mono text-sm font-semibold ${chgColor}`}>
                  {quote.change >= 0 ? '+' : ''}{quote.change.toFixed(2)} ({formatPct(quote.changePercent)})
                </span>
              </>
            )}
            {loading && <Loader2 className="w-4 h-4 text-primary animate-spin ml-auto" />}
          </div>
          <div className="p-3">
            {displayData.length > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                {overlay === 'volume' ? (
                  <ComposedChart data={maData}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(displayData.length / 8))} />
                    <YAxis yAxisId="price" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} width={55} tickFormatter={v => '$' + formatPrice(v)} domain={['auto', 'auto']} />
                    <YAxis yAxisId="vol" orientation="right" tick={false} axisLine={false} width={0} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Bar yAxisId="vol" dataKey="volume" fill="hsl(var(--muted-foreground))" opacity={0.15} />
                    <Area yAxisId="price" type="monotone" dataKey="close" stroke={strokeColor} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                  </ComposedChart>
                ) : (
                  <AreaChart data={maData}>
                    <defs>
                      <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={strokeColor} stopOpacity={0.15} />
                        <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="time" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.max(1, Math.floor(displayData.length / 8))} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} width={55} tickFormatter={v => '$' + formatPrice(v)} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Area type="monotone" dataKey="close" stroke={strokeColor} fill={`url(#${gradId})`} strokeWidth={2} dot={false} />
                    {overlay === 'ma' && <Line type="monotone" dataKey="ma20" stroke="hsl(38 95% 55%)" strokeWidth={1.5} dot={false} />}
                    {overlay === 'ma' && <Line type="monotone" dataKey="ma50" stroke="hsl(258 89% 76%)" strokeWidth={1.5} dot={false} />}
                    {overlay === 'bb' && <Line type="monotone" dataKey="bbUpper" stroke="hsl(200 80% 60%)" strokeWidth={1} dot={false} strokeDasharray="4 2" />}
                    {overlay === 'bb' && <Line type="monotone" dataKey="bbLower" stroke="hsl(200 80% 60%)" strokeWidth={1} dot={false} strokeDasharray="4 2" />}
                    {overlay === 'rsi' && <Line type="monotone" dataKey="rsi" stroke="hsl(280 80% 60%)" strokeWidth={1.5} dot={false} />}
                  </AreaChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="h-[320px] flex items-center justify-center text-muted-foreground text-sm">
                {loading ? 'Loading chart data...' : 'No data available for this symbol'}
              </div>
            )}
          </div>
          {overlay === 'rsi' && <div className="px-3 pb-2 text-[10px] text-muted-foreground">RSI(14): &gt;70 overbought, &lt;30 oversold. Grey area = neutral.</div>}
        </div>
        <PriceAlertModal open={showAlert} onClose={() => setShowAlert(false)} symbol={symbol} price={quote?.price} />

        {/* Quote Details */}
        <div className="space-y-3">
          <div className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Quote Details</div>
            {quote ? (
              <div className="space-y-1.5">
                {[
                  ['Open', quote.open], ['High', quote.dayHigh], ['Low', quote.dayLow],
                  ['Prev Close', quote.prevClose], ['Volume', quote.volume],
                  ['Mkt Cap', quote.marketCap], ['52W High', quote.fiftyTwoWeekHigh],
                  ['52W Low', quote.fiftyTwoWeekLow], ['50D Avg', quote.fiftyDayAvg],
                  ['200D Avg', quote.twoHundredDayAvg],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">{label}</span>
                    <span className="text-[11px] font-mono tabular-nums text-foreground">
                      {typeof val === 'number' ? (val >= 1e9 ? `$${(val / 1e9).toFixed(1)}B` : val >= 1e6 ? `$${(val / 1e6).toFixed(1)}M` : val >= 1000 ? val.toLocaleString() : val.toFixed(2)) : '—'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">Select a symbol to view details</div>
            )}
          </div>
          {quote && (
            <div className="bg-card border border-border rounded-xl p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Info</div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Exchange</span><span className="font-semibold">{quote.exchange}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-semibold">{quote.currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold uppercase">{quote.type}</span></div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ───── HEATMAP TAB ───── */
function HeatmapTab() {
  const { prices } = useRealtimeMarket();
  const [heatQuotes, setHeatQuotes] = useState<Record<string, QuoteData>>({});

  useEffect(() => {
    const syms = SECTOR_HEATMAP.map(h => h.sym);
    marketApi.getQuotes(syms).then(q => { if (Object.keys(q).length) setHeatQuotes(q); });
  }, []);

  const sectors = useMemo(() => {
    const groups: Record<string, typeof SECTOR_HEATMAP> = {};
    SECTOR_HEATMAP.forEach(h => {
      if (!groups[h.sector]) groups[h.sector] = [];
      groups[h.sector].push(h);
    });
    return groups;
  }, []);

  const getChg = (sym: string, fallback: number) => {
    if (heatQuotes[sym]) return heatQuotes[sym].changePercent;
    const p = prices[sym];
    return p ? p.chgPct : fallback;
  };

  const colorForChg = (chg: number) => {
    if (chg > 3) return 'bg-primary/80 text-primary-foreground';
    if (chg > 1) return 'bg-primary/50 text-foreground';
    if (chg > 0) return 'bg-primary/20 text-foreground';
    if (chg > -1) return 'bg-destructive/20 text-foreground';
    if (chg > -3) return 'bg-destructive/50 text-foreground';
    return 'bg-destructive/80 text-white';
  };

  return (
    <div className="space-y-3">
      {Object.entries(sectors).map(([sector, items]) => (
        <div key={sector}>
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{sector}</div>
          <div className="flex gap-1.5 flex-wrap">
            {items.map(item => {
              const chg = getChg(item.sym, item.chgPct);
              const size = Math.max(60, Math.min(140, Math.sqrt(item.mktcap) * 3));
              return (
                <div
                  key={item.sym}
                  className={`rounded-lg flex flex-col items-center justify-center p-2 transition-all hover:scale-105 cursor-pointer ${colorForChg(chg)}`}
                  style={{ width: size, height: size * 0.7 }}
                >
                  <div className="font-mono text-[10px] font-bold">{item.sym}</div>
                  <div className="font-mono text-[12px] font-semibold tabular-nums">{formatPct(chg)}</div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

const REGION_SYMBOLS: Record<string, string[]> = {
  us: ['^GSPC', '^IXIC', '^DJI', '^RUT', '^VIX', 'AAPL'],
  crypto: ['BTC-USD', 'ETH-USD', 'SOL-USD', 'BNB-USD', 'XRP-USD', 'ADA-USD'],
  africa: ['SCOM.NR', 'EQTY.NR', 'KCB.NR', '^J203.JO', 'NGXGROUP.LG'],
  europe: ['^FTSE', '^GDAXI', '^FCHI', '^STOXX50E'],
  commodities: ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F'],
  bonds: ['^TNX', '^IRX', '^TYX'],
};

/* ───── MARKET WATCH TAB ───── */
function MarketWatchTab() {
  const [activeRegion, setActiveRegion] = useState<string>('us');
  const [liveRegionQuotes, setLiveRegionQuotes] = useState<Record<string, QuoteData>>({});
  const { isLive } = useRealtimeMarket();

  useEffect(() => {
    const syms = REGION_SYMBOLS[activeRegion] || [];
    if (syms.length) {
      marketApi.getQuotes(syms).then(q => setLiveRegionQuotes(q));
    }
  }, [activeRegion]);

  const regionData = MARKET_REGIONS[activeRegion] || [];

  return (
    <div className="space-y-3">
      <div className="flex gap-1 flex-wrap">
        {MW_TABS.map(t => (
          <button key={t} onClick={() => setActiveRegion(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${activeRegion === t ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'}`}>
            {t === 'us' ? '🇺🇸 US' : t === 'crypto' ? '₿ Crypto' : t === 'africa' ? '🌍 Africa' : t === 'europe' ? '🇪🇺 Europe' : t === 'commodities' ? '🏆 Commodities' : '📊 Bonds'}
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Instrument</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Change</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map(item => {
              // Try live quote first
              const syms = REGION_SYMBOLS[activeRegion] || [];
              const matchedSym = syms.find(s => s.includes(item.key) || item.key.includes(s.replace(/[\^=]/g, '')));
              const lq = matchedSym ? liveRegionQuotes[matchedSym] : null;
              const price = lq?.price ?? item.price;
              const chg = lq?.changePercent ?? item.chg;
              const isUp = chg >= 0;

              return (
                <tr key={item.key} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                  <td className="p-3">
                    <div className="font-semibold text-[12px]">{item.sym}</div>
                  </td>
                  <td className="text-right p-3 font-mono font-semibold tabular-nums">
                    {price >= 1000 ? price.toLocaleString('en-US', { maximumFractionDigits: 0 }) : price < 1 ? price.toFixed(4) : price.toFixed(2)}
                  </td>
                  <td className="text-right p-3">
                    <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-md tabular-nums ${isUp ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {formatPct(chg)}
                    </span>
                  </td>
                  <td className="text-right p-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${lq ? 'text-primary bg-primary/10' : 'text-muted-foreground bg-muted'}`}>
                      {lq ? 'LIVE' : 'SIM'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
