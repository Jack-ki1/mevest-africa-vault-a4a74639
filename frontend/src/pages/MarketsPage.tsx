import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { marketApi, ChartPoint, QuoteData } from '@/lib/api/market';
import { SECTOR_HEATMAP, MARKET_REGIONS, formatPct, formatPrice, TICKER_ITEMS, genLine } from '@/data/market-data';
import LiveSearchInput from '@/components/LiveSearchInput';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar,
  CartesianGrid, ComposedChart, Line,
} from 'recharts';
import { TrendingUp, BarChart3, Grid3X3, Wifi, Globe, Loader2, ArrowUpRight, ArrowDownRight, Bell, Sparkles, Activity, Zap } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import PriceAlertModal from '@/components/PriceAlertModal';
import { sma, rsi, bollinger } from '@/lib/analytics/indicators';
import { motion } from 'framer-motion';

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

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ── Ticker Tape (infinite scroll) ─────────────────────────────────────
function TickerTape() {
  const { tickerItems, isLive } = useRealtimeMarket();
  const items = tickerItems.length ? tickerItems : TICKER_ITEMS;
  const doubled = [...items, ...items, ...items]; // triple for seamless loop
  return (
    <div className="relative overflow-hidden bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl">
      <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-card to-transparent z-10 pointer-events-none" />
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-card to-transparent z-10 pointer-events-none" />
      <motion.div
        className="flex gap-6 py-2"
        animate={{ x: ['0%', '-33.33%'] }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
        style={{ width: 'max-content' }}
      >
        {doubled.map((it, idx) => {
          const up = it.c >= 0;
          return (
            <div key={`${it.sym}-${idx}`} className="flex items-center gap-2 shrink-0">
              <span className="font-mono text-[11px] font-bold tracking-wide">{it.sym}</span>
              <span className="font-mono text-[11px] tabular-nums">${it.p >= 1000 ? it.p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : it.p < 1 ? it.p.toFixed(4) : it.p.toFixed(2)}</span>
              <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-bold px-1 py-0.5 rounded ${up ? 'bg-primary/15 text-primary' : 'bg-destructive/15 text-destructive'}`}>
                {up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}{formatPct(it.c)}
              </span>
              <span className="w-px h-3 bg-border/60 mx-1" />
            </div>
          );
        })}
      </motion.div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-[9px] font-bold bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded-full z-20">
        <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-primary animate-pulse' : 'bg-muted-foreground'}`} />{isLive ? 'LIVE' : 'SIM'}
      </div>
    </div>
  );
}

// ── Market Breadth Panel ───────────────────────────────────────────────
function BreadthPanel() {
  const { allAssets } = useRealtimeMarket();
  const stats = useMemo(() => {
    const live = allAssets.filter(a => ['stock', 'etf'].includes(a.type));
    const adv = live.filter(a => a.chgPct > 0).length;
    const decl = live.filter(a => a.chgPct < 0).length;
    const unch = live.length - adv - decl;
    const total = live.length || 1;
    const advPct = Math.round((adv / total) * 100);
    const declPct = Math.round((decl / total) * 100);
    // mock adv/decl volume ratio
    const advVol = adv * 1.35 + decl * 0.4;
    const declVol = decl * 1.15 + adv * 0.3;
    const volAdvPct = Math.round((advVol / (advVol + declVol)) * 100) || 50;
    return { adv, decl, unch, total, advPct, declPct, volAdvPct };
  }, [allAssets]);

  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center gap-1.5 mb-2">
        <Activity className="w-3.5 h-3.5 text-primary" />
        <span className="font-display text-[13px] font-bold">Market Breadth</span>
        <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Adv / Decl</span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-2">
          <div className="font-mono text-lg font-bold text-primary">{stats.adv}</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Advancing</div>
          <div className="font-mono text-[10px] text-primary">{stats.advPct}%</div>
        </div>
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-2">
          <div className="font-mono text-lg font-bold text-destructive">{stats.decl}</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Declining</div>
          <div className="font-mono text-[10px] text-destructive">{stats.declPct}%</div>
        </div>
        <div className="bg-muted/40 border border-border/50 rounded-lg p-2">
          <div className="font-mono text-lg font-bold">{stats.unch}</div>
          <div className="text-[10px] font-semibold text-muted-foreground uppercase">Unchanged</div>
          <div className="font-mono text-[10px] text-muted-foreground">{100 - stats.advPct - stats.declPct}%</div>
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div>
          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1"><span>Issues</span><span className="font-mono">{stats.adv} adv vs {stats.decl} decl</span></div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden flex">
            <div className="h-full bg-primary transition-all" style={{ width: `${stats.advPct}%` }} />
            <div className="h-full bg-muted/20" style={{ width: `${100 - stats.advPct - stats.declPct}%` }} />
            <div className="h-full bg-destructive/70" style={{ width: `${stats.declPct}%` }} />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[10px] font-semibold text-muted-foreground mb-1"><span>Volume breadth</span><span className="font-mono">{stats.volAdvPct}% adv vol</span></div>
          <div className="h-2 rounded-full bg-muted/30 overflow-hidden flex">
            <div className="h-full bg-primary/70" style={{ width: `${stats.volAdvPct}%` }} />
            <div className="h-full bg-destructive/50" style={{ width: `${100 - stats.volAdvPct}%` }} />
          </div>
        </div>
        <div className="text-[10px] text-muted-foreground">Breadth confirms trend when price + adv volume align · Today: <strong className={stats.adv > stats.decl ? 'text-primary' : 'text-destructive'}>{stats.adv > stats.decl ? 'Risk-on' : 'Risk-off'}</strong></div>
      </div>
    </GlassCard>
  );
}

// ── AI Market Summary Card (pre-written, 2 sentences + citations) ──────
function AIMarketSummary() {
  return (
    <GlassCard className="p-3.5">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center"><Sparkles className="w-4 h-4 text-purple-500" /></div>
        <div>
          <div className="font-display text-[13px] font-bold leading-none">AI Market Summary</div>
          <div className="text-[10px] text-muted-foreground">Generated 06:00 EAT · mock until LLM wired</div>
        </div>
        <span className="ml-auto text-[9px] font-bold bg-amber-500/15 text-amber-700 border border-amber-500/20 px-1.5 py-0.5 rounded-full">MOCK</span>
      </div>
      <p className="text-xs leading-relaxed text-foreground">
        US equities held gains as the S&P 500 closed +0.42% with breadth supportive (68% advancers), while NSE 20 outperformed +2.10% on banking earnings beats<span className="text-[10px] align-super text-primary font-bold">[1]</span>.
        {' '}Crypto extended risk-on with BTC +2.15% above $67K on spot-ETF inflows, though VIX at 14.8% keeps hedging cheap<span className="text-[10px] align-super text-primary font-bold">[2]</span>.
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <span className="text-[10px] font-mono bg-secondary rounded px-1.5 py-0.5 border border-border">[1] NSE Daily Report — 2026-03-24</span>
        <span className="text-[10px] font-mono bg-secondary rounded px-1.5 py-0.5 border border-border">[2] CoinDesk ETF Flows — 2026-03-23</span>
      </div>
      <div className="mt-2 flex gap-2">
        <button onClick={() => window.dispatchEvent(new CustomEvent('mevest-open-chat'))} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90">Ask AI about today</button>
        <button onClick={() => window.dispatchEvent(new CustomEvent('mevest-ask-followup', { detail: 'Explain today\'s market breadth and what it means for my portfolio' }))} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium">What does breadth say?</button>
      </div>
    </GlassCard>
  );
}

export default function MarketsPage({ initialSymbol }: { initialSymbol?: string }) {
  const location = useLocation();
  const stateSymbol = (location.state as { symbol?: string } | null)?.symbol;
  const resolvedInitial = initialSymbol ?? stateSymbol ?? 'AAPL';
  const [activeTab, setActiveTab] = useState<string>('charts');
  const { isLive } = useRealtimeMarket();

  return (
    <div className="space-y-3.5">
      {/* Ticker tape */}
      <TickerTape />

      {/* AI Summary + Breadth bento */}
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-7">
          <AIMarketSummary />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <BreadthPanel />
        </div>
      </div>

      {/* Tab bar — glass */}
      <div className="flex items-center gap-1 bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl p-1 shadow-[0_4px_24px_hsl(var(--foreground)/0.04)]">
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
  const [compareSymbol, setCompareSymbol] = useState<string>('');
  const [compareData, setCompareData] = useState<ChartPoint[]>([]);
  const [compareQuote, setCompareQuote] = useState<QuoteData | null>(null);
  const [twoChart, setTwoChart] = useState(false);
  const [secondSymbol, setSecondSymbol] = useState('MSFT');
  const [secondData, setSecondData] = useState<ChartPoint[]>([]);
  const [secondQuote, setSecondQuote] = useState<QuoteData | null>(null);
  const [normalize, setNormalize] = useState(true);

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
      if (compareSymbol) {
        const [cmp, cmpQ] = await Promise.all([
          marketApi.getChart(compareSymbol, r.range, r.interval),
          marketApi.getQuotes([compareSymbol]),
        ]);
        setCompareData(cmp.points);
        setCompareQuote(cmpQ[compareSymbol] || null);
      } else { setCompareData([]); setCompareQuote(null); }
      if (twoChart) {
        const [s2, q2] = await Promise.all([
          marketApi.getChart(secondSymbol, r.range, r.interval),
          marketApi.getQuotes([secondSymbol]),
        ]);
        setSecondData(s2.points);
        setSecondQuote(q2[secondSymbol] || null);
      }
    } catch { /* fallback handled */ }
    setLoading(false);
  }, [compareSymbol, twoChart, secondSymbol]);

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

  const compareMap = useMemo(() => {
    const m = new Map<number, number>();
    compareData.forEach((p) => m.set(p.t, p.c));
    return m;
  }, [compareData]);

  // comparison stats: correlation & relative performance
  const compareStats = useMemo(() => {
    if (!compareData.length || !chartData.length) return null;
    const n = Math.min(chartData.length, compareData.length);
    const a = chartData.slice(-n).map(p => p.c);
    const b = compareData.slice(-n).map(p => p.c);
    // returns for correlation
    const ra = a.slice(1).map((v, i) => (v - a[i]) / a[i]);
    const rb = b.slice(1).map((v, i) => (v - b[i]) / b[i]);
    const meanA = ra.reduce((s, v) => s + v, 0) / (ra.length || 1);
    const meanB = rb.reduce((s, v) => s + v, 0) / (rb.length || 1);
    const cov = ra.reduce((s, v, i) => s + (v - meanA) * (rb[i] - meanB), 0) / (ra.length - 1 || 1);
    const varA = ra.reduce((s, v) => s + (v - meanA) ** 2, 0) / (ra.length - 1 || 1);
    const varB = rb.reduce((s, v) => s + (v - meanB) ** 2, 0) / (rb.length - 1 || 1);
    const corr = (Math.sqrt(varA * varB) === 0) ? 0 : cov / Math.sqrt(varA * varB);
    const perfA = n > 1 ? (a[a.length - 1] / a[0] - 1) * 100 : 0;
    const perfB = n > 1 ? (b[b.length - 1] / b[0] - 1) * 100 : 0;
    return { corr, perfA, perfB, diff: perfA - perfB };
  }, [chartData, compareData]);

  const maData = useMemo(() => {
    return displayData.map((d, i) => {
      const cmpClose = compareData[i]?.c ?? (compareMap.get(chartData[i]?.t) ?? undefined);
      const first = compareData[0]?.c || 1;
      let cmpNorm: number | undefined;
      if (cmpClose !== undefined) {
        if (normalize) cmpNorm = (cmpClose / first) * (displayData[0]?.close || 1);
        else cmpNorm = cmpClose;
      }
      return {
        ...d,
        ma20: sma20[i] ?? undefined,
        ma50: sma50[i] ?? undefined,
        rsi: rsiArr[i] ?? undefined,
        bbUpper: bb.upper[i] ?? undefined,
        bbLower: bb.lower[i] ?? undefined,
        compare: cmpNorm,
      };
    });
  }, [displayData, sma20, sma50, rsiArr, bb, compareData, compareMap, chartData, normalize]);

  const chgColor = quote && quote.changePercent >= 0 ? 'text-primary' : 'text-destructive';
  const gradId = quote && quote.changePercent >= 0 ? 'chartGradUp' : 'chartGradDown';
  const strokeColor = quote && quote.changePercent >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))';

  const secondDisplay = useMemo(() => secondData.map(p => ({
    time: new Date(p.t * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    close: p.c,
  })), [secondData]);

  return (
    <div className="space-y-3.5">
      <GlassCard className="p-3">
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
          <div className="flex items-center gap-1">
            <LiveSearchInput onSelect={(sym) => setCompareSymbol(sym)} placeholder="Compare with…" className="w-[160px]" size="sm" />
            {compareSymbol && <button onClick={() => setCompareSymbol('')} className="text-[10px] text-muted-foreground">✕ {compareSymbol}</button>}
          </div>
          <button onClick={() => setTwoChart(!twoChart)} className={`px-2 py-1 rounded-md text-[11px] border ${twoChart ? 'bg-primary text-primary-foreground border-primary' : 'bg-secondary border-border'}`}>▭▭ {twoChart ? '1-Chart' : '2-Chart'}</button>
          {compareSymbol && (
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <input type="checkbox" checked={normalize} onChange={e => setNormalize(e.target.checked)} className="accent-primary" /> Normalize
            </label>
          )}
        </div>
        {compareStats && (
          <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-1 rounded-md bg-secondary border border-border font-mono">Corr {compareStats.corr.toFixed(2)} — {Math.abs(compareStats.corr) > 0.7 ? 'Strong' : Math.abs(compareStats.corr) > 0.4 ? 'Moderate' : 'Weak'}</span>
            <span className={`px-2 py-1 rounded-md border font-mono ${compareStats.diff >= 0 ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>{symbol} {compareStats.perfA.toFixed(2)}% vs {compareSymbol} {compareStats.perfB.toFixed(2)}% · Δ {compareStats.diff >= 0 ? '+' : ''}{compareStats.diff.toFixed(2)}%</span>
            <span className="text-muted-foreground self-center">— Normalized overlay (TradingView pattern). Toggle Normalize to see raw prices.</span>
          </div>
        )}
      </GlassCard>
      {twoChart && (
        <GlassCard className="p-2 flex items-center gap-2">
          <span className="text-[11px] font-semibold">Second chart:</span>
          <LiveSearchInput onSelect={(sym) => setSecondSymbol(sym)} placeholder={secondSymbol} className="w-[200px]" size="sm" />
          <span className="text-[11px] text-muted-foreground">Side-by-side comparison — independent fetch + quotes</span>
        </GlassCard>
      )}

      {symbol.endsWith('.NR') && <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 backdrop-blur">NSE price: indicative, updated manually — not live until NSE Delayed Data vendor setup (see §3.1). 15-min delay planned.</div>}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '1fr 280px' }}>
        {/* Chart */}
        <GlassCard className="overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
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
            {!loading && compareQuote && (
              <span className="ml-auto font-mono text-[11px] text-muted-foreground">{compareSymbol} ${formatPrice(compareQuote.price)} <span className={compareQuote.changePercent >= 0 ? 'text-primary' : 'text-destructive'}>{formatPct(compareQuote.changePercent)}</span></span>
            )}
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
                    {compareSymbol && <Line yAxisId="price" type="monotone" dataKey="compare" stroke="hsl(258 89% 76%)" strokeWidth={1.5} dot={false} strokeDasharray={normalize ? '6 3' : undefined} />}
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
                    {compareSymbol && <Line type="monotone" dataKey="compare" stroke="hsl(258 89% 76%)" strokeWidth={1.5} dot={false} strokeDasharray={normalize ? '6 3' : undefined} />}
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
          {compareSymbol && <div className="px-3 pb-2 text-[10px] text-muted-foreground">Compare overlay: <span className="font-semibold" style={{ color: 'hsl(258 89% 76%)' }}>{compareSymbol}</span> {normalize ? `(normalized to ${symbol} start price)` : '(raw price)'} — Perplexity pattern. {compareStats ? `Corr ${compareStats.corr.toFixed(2)}` : ''}</div>}
          {twoChart && (
            <div className="border-t border-border/50 p-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-display text-[13px] font-bold">Second Chart — {secondSymbol}</span>
                {secondQuote && <span className="font-mono text-xs">${formatPrice(secondQuote.price)} <span className={secondQuote.changePercent >= 0 ? 'text-primary' : 'text-destructive'}>{formatPct(secondQuote.changePercent)}</span></span>}
              </div>
              {secondDisplay.length ? (
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={secondDisplay}>
                    <defs><linearGradient id="grad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(218 90% 66%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(218 90% 66%)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={Math.max(1, Math.floor(secondDisplay.length / 8))} />
                    <YAxis tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={50} tickFormatter={v => '$' + formatPrice(v)} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                    <Area type="monotone" dataKey="close" stroke="hsl(218 90% 66%)" fill="url(#grad2)" strokeWidth={1.6} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-xs text-muted-foreground">Loading {secondSymbol}…</div>
              )}
            </div>
          )}
        </GlassCard>
        <PriceAlertModal open={showAlert} onClose={() => setShowAlert(false)} symbol={symbol} price={quote?.price} />

        {/* Quote Details */}
        <div className="space-y-3">
          <GlassCard className="p-3.5">
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
          </GlassCard>
          {quote && (
            <GlassCard className="p-3.5">
              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Info</div>
              <div className="space-y-1.5 text-[10px]">
                <div className="flex justify-between"><span className="text-muted-foreground">Exchange</span><span className="font-semibold">{quote.exchange}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span className="font-semibold">{quote.currency}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Type</span><span className="font-semibold uppercase">{quote.type}</span></div>
              </div>
            </GlassCard>
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
    <GlassCard className="p-3.5">
      <div className="flex items-center gap-2 mb-3">
        <Grid3X3 className="w-4 h-4 text-primary" />
        <span className="font-display text-[13px] font-bold">Sector Heatmap</span>
        <span className="ml-auto text-[10px] text-muted-foreground">Sized by mkt cap · colored by 1D %</span>
      </div>
      <div className="space-y-3">
        {Object.entries(sectors).map(([sector, items]) => (
          <div key={sector}>
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{sector}</div>
            <div className="flex gap-1.5 flex-wrap">
              {items.map(item => {
                const chg = getChg(item.sym, item.chgPct);
                const size = Math.max(60, Math.min(140, Math.sqrt(item.mktcap) * 3));
                return (
                  <motion.div
                    key={item.sym}
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className={`rounded-lg flex flex-col items-center justify-center p-2 transition-all hover:scale-105 cursor-pointer border border-border/20 backdrop-blur ${colorForChg(chg)}`}
                    style={{ width: size, height: size * 0.7 }}
                  >
                    <div className="font-mono text-[10px] font-bold">{item.sym}</div>
                    <div className="font-mono text-[12px] font-semibold tabular-nums">{formatPct(chg)}</div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
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
function SparklineCell({ base, isUp }: { base: number; isUp: boolean }) {
  const data = useMemo(() => {
    // deterministic spark based on base: 12 points with small drift
    const pts = 12;
    const vol = isUp ? 0.012 : 0.014;
    const drift = isUp ? 0.003 : -0.002;
    // use seeded-ish pseudo random from base
    let cur = base;
    const arr: { v: number }[] = [{ v: cur }];
    for (let i = 1; i < pts; i++) {
      const r = ((Math.sin(base * 997 + i * 13.37) + 1) % 1) - 0.5; // pseudo
      const change = drift + r * vol;
      cur = cur * (1 + change);
      // alternate pseudo
      arr.push({ v: cur });
    }
    return arr;
  }, [base, isUp]);
  const color = isUp ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)';
  const fill = isUp ? 'hsl(160 60% 52% / 0.12)' : 'hsl(0 76% 58% / 0.10)';
  return (
    <div className="w-[72px] h-[28px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <Area type="monotone" dataKey="v" stroke={color} fill={fill} strokeWidth={1.2} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function MarketWatchTab() {
  const [activeRegion, setActiveRegion] = useState<string>('us');
  const [liveRegionQuotes, setLiveRegionQuotes] = useState<Record<string, QuoteData>>({});

  useEffect(() => {
    const syms = REGION_SYMBOLS[activeRegion] || [];
    if (syms.length) {
      marketApi.getQuotes(syms).then(q => setLiveRegionQuotes(q));
    }
  }, [activeRegion]);

  const regionData = MARKET_REGIONS[activeRegion] || [];

  return (
    <div className="space-y-3">
      <GlassCard className="p-2 flex gap-1 flex-wrap">
        {MW_TABS.map(t => (
          <button key={t} onClick={() => setActiveRegion(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold capitalize transition-colors ${activeRegion === t ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-secondary text-muted-foreground border border-border hover:text-foreground'}`}>
            {t === 'us' ? '🇺🇸 US' : t === 'crypto' ? '₿ Crypto' : t === 'africa' ? '🌍 Africa' : t === 'europe' ? '🇪🇺 Europe' : t === 'commodities' ? '🏆 Commodities' : '📊 Bonds'}
          </button>
        ))}
        <span className="ml-auto text-[10px] text-muted-foreground self-center hidden sm:inline">Sparkline = 12-pt intraday mock · LIVE where available</span>
      </GlassCard>

      <GlassCard className="overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border/50">
              <th className="text-left p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Instrument</th>
              <th className="text-center p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider hidden sm:table-cell">Sparkline</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Price</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Change</th>
              <th className="text-right p-3 text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {regionData.map(item => {
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
                    <div className="text-[10px] text-muted-foreground font-mono">{item.key}</div>
                  </td>
                  <td className="p-2 hidden sm:table-cell">
                    <SparklineCell base={price} isUp={isUp} />
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
        <div className="px-3 py-2 bg-secondary/30 border-t border-border/30 text-[10px] text-muted-foreground flex items-center gap-2">
          <Zap className="w-3 h-3 text-primary" /> Tip: Compare two symbols in Charts tab — toggle Normalize to see % vs price overlays with correlation stats.
        </div>
      </GlassCard>
    </div>
  );
}
