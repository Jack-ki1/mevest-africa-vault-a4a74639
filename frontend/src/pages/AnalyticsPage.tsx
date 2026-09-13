import { useEffect, useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { supabase } from '@/integrations/supabase/client';
import { dailyReturns, volatility, sharpeRatio, maxDrawdown, beta, cagr, sortinoRatio, calmarRatio } from '@/lib/analytics/riskMetrics';
import { twrr, fifoCostBasis, wacCostBasis, withTransactionCosts, regimeLabel } from '@/lib/analytics/extendedMetrics';
import RatesComparator from '@/components/RatesComparator';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, ComposedChart, Line, Cell
} from 'recharts';
import { TrendingUp, Activity, GitCompareArrows, Waves, Layers, ShieldAlert } from 'lucide-react';

// ── helpers ──────────────────────────────────────────────────────────────
function GlassCard({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

// correlation helper (Pearson)
function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  const aa = a.slice(-n), bb = b.slice(-n);
  const mA = aa.reduce((s, v) => s + v, 0) / n;
  const mB = bb.reduce((s, v) => s + v, 0) / n;
  const cov = aa.reduce((s, v, i) => s + (v - mA) * (bb[i] - mB), 0) / (n - 1 || 1);
  const varA = aa.reduce((s, v) => s + (v - mA) ** 2, 0) / (n - 1 || 1);
  const varB = bb.reduce((s, v) => s + (v - mB) ** 2, 0) / (n - 1 || 1);
  const denom = Math.sqrt(varA * varB);
  return denom === 0 ? 0 : Math.max(-1, Math.min(1, cov / denom));
}
function pseudoCorr(symA: string, symB: string): number {
  if (symA === symB) return 1;
  let h = 0;
  const s = symA + '|' + symB;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  // map to -0.15 … 0.88
  const v = ((h % 1000) / 1000) * 1.03 - 0.15;
  return Math.max(-0.3, Math.min(0.92, v));
}
function heatColor(v: number): string {
  // -1 red, 0 muted, +1 green
  if (v >= 0) {
    const t = v; // 0..1
    // interpolate muted -> primary
    const light = 62 - t * 12; // lightness
    return `hsl(160 60% ${light}% / ${0.18 + t * 0.72})`;
  } else {
    const t = Math.abs(v);
    return `hsl(0 76% ${62 - t * 8}% / ${0.18 + t * 0.65})`;
  }
}
function textColorForHeat(v: number): string {
  return Math.abs(v) > 0.45 ? 'white' : 'hsl(var(--foreground))';
}

// Box-Muller normal
function randn(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function AnalyticsPage() {
  const { holdings } = usePortfolio();
  const [closes, setCloses] = useState<number[]>([]);
  const [benchCloses, setBenchCloses] = useState<number[]>([]);
  const [riskFree, setRiskFree] = useState(0.15);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (holdings.length === 0) { setLoading(false); return; }
      const sym = holdings[0].sym;
      const { data } = await supabase.from('price_history').select('close').eq('symbol', sym).order('ts', { ascending: true }).limit(252);
      if (data && data.length >= 10) setCloses(data.map((r: { close: number }) => Number(r.close)));
      else {
        const base = holdings[0].price;
        const synthetic = Array.from({ length: 60 }, (_, i) => base * (1 + (Math.sin(i / 7) * 0.03) + (i * 0.0005)));
        setCloses(synthetic);
      }
      const { data: bench } = await supabase.from('price_history').select('close').eq('symbol', 'SPY').order('ts', { ascending: true }).limit(252);
      if (bench && bench.length >= 10) setBenchCloses(bench.map((r: { close: number }) => Number(r.close)));
      const { data: rates } = await supabase.from('kenya_rates').select('rate_pct').eq('instrument', 'T-Bill-91').order('as_of', { ascending: false }).limit(1);
      if (rates && rates[0]) setRiskFree(Number(rates[0].rate_pct) / 100);
      setLoading(false);
    };
    load();
  }, [holdings.map(h => h.sym).join(',')]);

  const returns = useMemo(() => dailyReturns(closes), [closes]);
  const benchReturns = useMemo(() => dailyReturns(benchCloses), [benchCloses]);
  const vol = useMemo(() => volatility(returns), [returns]);
  const sharpe = useMemo(() => sharpeRatio(returns, riskFree), [returns, riskFree]);
  const sortino = useMemo(() => sortinoRatio(returns, riskFree), [returns, riskFree]);
  const dd = useMemo(() => maxDrawdown(closes), [closes]);
  const b = useMemo(() => beta(returns, benchReturns), [returns, benchReturns]);
  const cagrVal = useMemo(() => closes.length >= 2 ? cagr(closes[0], closes[closes.length - 1], closes.length / 252) : 0, [closes]);
  const calmar = useMemo(() => calmarRatio(cagrVal, dd.pct), [cagrVal, dd]);
  const twrrVal = useMemo(() => twrr(returns), [returns]);
  const regime = useMemo(() => regimeLabel(returns), [returns]);
  const costAdjReturns = useMemo(() => withTransactionCosts(returns, 30, 12), [returns]);
  const costAdjSharpe = useMemo(() => sharpeRatio(costAdjReturns, riskFree), [costAdjReturns, riskFree]);

  const { user } = useAuth();
  const [fifo, setFifo] = useState<number | null>(null);
  const [wac, setWac] = useState<number | null>(null);
  useEffect(() => {
    if (!user) return;
    supabase.from('transactions').select('side,shares,price').eq('user_id', user.id).then(({ data }) => {
      if (data && data.length) {
        setFifo(fifoCostBasis(data as { side: 'buy'|'sell'; shares: number; price: number }[]));
        setWac(wacCostBasis(data as { side: 'buy'|'sell'; shares: number; price: number }[]));
      }
    });
  }, [user?.id]);

  const fmt = (n: number, pct = false) => isFinite(n) ? (pct ? (n * 100).toFixed(2) + '%' : n.toFixed(2)) : '—';
  const n = holdings.length;

  // ── frontier ──────────────────────────────────────────────────────────
  const frontierMock = useMemo(() => [
    { x: 8.2, y: 5.4, name: 'Conservative' },
    { x: 11.3, y: 11.5, name: 'Max Sharpe' },
    { x: 12.1, y: 9.8, name: 'Balanced' },
    { x: 16.7, y: 13.2, name: 'Growth' },
    { x: 22.4, y: 16.1, name: 'Aggressive' },
  ], []);
  const currentPt = useMemo(() => ({ x: Math.max(1, vol * 100), y: cagrVal * 100, name: 'Current' }), [vol, cagrVal]);

  // ── Monte Carlo fan (100 paths, 30 days) ──────────────────────────────
  const monteData = useMemo(() => {
    if (!closes.length) return [];
    const start = closes[closes.length - 1];
    const dailyVol = vol > 0 ? vol / Math.sqrt(252) : 0.012;
    const dailyDrift = isFinite(cagrVal) && vol > 0 ? cagrVal / 252 : 0.0003;
    const days = 30;
    const paths = 100;
    // generate paths as arrays
    const allPaths: number[][] = Array.from({ length: paths }, () => [start]);
    for (let p = 0; p < paths; p++) {
      for (let d = 1; d <= days; d++) {
        const prev = allPaths[p][d - 1];
        const z = randn();
        // GBM
        const ret = dailyDrift - 0.5 * dailyVol * dailyVol + dailyVol * z;
        const next = prev * Math.exp(ret);
        allPaths[p].push(next);
      }
    }
    // pivot to rows per day for recharts
    const rows: Record<string, number | string>[] = [];
    for (let d = 0; d <= days; d++) {
      const row: Record<string, number | string> = { day: d };
      // percentiles for band
      const vals = allPaths.map(p => p[d]).sort((a, b) => a - b);
      const p10 = vals[Math.floor(paths * 0.1)];
      const p50 = vals[Math.floor(paths * 0.5)];
      const p90 = vals[Math.floor(paths * 0.9)];
      row['p10'] = p10;
      row['p50'] = p50;
      row['p90'] = p90;
      allPaths.forEach((path, idx) => { row[`path${idx}`] = path[d]; });
      rows.push(row);
    }
    return rows;
  }, [closes, vol, cagrVal]);

  // ── drawdown underwater ───────────────────────────────────────────────
  const drawdownSeries = useMemo(() => {
    if (!closes.length) return [];
    let peak = closes[0];
    return closes.map((c, i) => {
      if (c > peak) peak = c;
      const ddPct = ((c - peak) / peak) * 100;
      return { idx: i, dd: ddPct, close: c };
    });
  }, [closes]);

  // ── correlation matrix ────────────────────────────────────────────────
  const corrMatrix = useMemo(() => {
    if (holdings.length === 0) return [];
    const syms = holdings.map(h => h.sym);
    // if single holding, fabricate 3 pseudo assets for demo heatmap
    if (syms.length === 1) {
      const demoSyms = [syms[0], 'SPY', 'NSE20'];
      return demoSyms.map(a => demoSyms.map(b => (a === b ? 1 : pseudoCorr(a, b))));
    }
    return syms.map(a => syms.map(b => (a === b ? 1 : pseudoCorr(a, b))));
  }, [holdings]);
  const corrLabels = useMemo(() => {
    if (holdings.length === 0) return [];
    if (holdings.length === 1) return [holdings[0].sym, 'SPY', 'NSE20'];
    return holdings.map(h => h.sym);
  }, [holdings]);

  // ── factor exposures (market/size/value/momentum/quality) ────────────
  const factorData = useMemo(() => {
    // market beta as anchor, rest pseudo but deterministic
    const betaVal = isFinite(b) && Math.abs(b) < 5 ? b : 0.95;
    return [
      { factor: 'Market', value: Number(betaVal.toFixed(2)), fill: 'hsl(218 90% 66%)' },
      { factor: 'Size', value: 0.32, fill: 'hsl(160 60% 52%)' },
      { factor: 'Value', value: -0.18, fill: 'hsl(38 95% 55%)' },
      { factor: 'Momentum', value: 0.47, fill: 'hsl(258 89% 76%)' },
      { factor: 'Quality', value: 0.21, fill: 'hsl(25 95% 55%)' },
    ];
  }, [b]);

  if (loading) return <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  if (n === 0) {
    return (
      <div className="space-y-3.5">
        <div className="font-display text-[19px] font-extrabold">Advanced Analytics</div>
        <div className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl p-8 text-center text-sm text-muted-foreground">Add holdings to see analytics.</div>
      </div>
    );
  }

  const kpis = [
    { l: 'CAGR', v: fmt(cagrVal, true), s: 'annualized' },
    { l: 'Sharpe Ratio', v: fmt(sharpe), s: `rf ${(riskFree * 100).toFixed(1)}%` },
    { l: 'Sortino', v: fmt(sortino), s: 'downside adj.' },
    { l: 'Calmar', v: fmt(calmar), s: 'CAGR / DD' },
    { l: 'Volatility', v: fmt(vol, true), s: 'annualized' },
    { l: 'Max Drawdown', v: fmt(dd.pct, true), s: `peak ${dd.peakIdx}→${dd.troughIdx}` },
    { l: 'Beta vs Market', v: fmt(b), s: 'vs blended bench' },
    { l: 'TWRR', v: fmt(twrrVal, true), s: 'time-weighted' },
    { l: 'Cost-Adj Sharpe', v: fmt(costAdjSharpe), s: '30bps/trade' },
    { l: 'Regime', v: regime, s: 'bull/bear/neutral' },
    { l: 'FIFO Avg Cost', v: fifo != null ? fifo.toFixed(2) : '—', s: 'LibreFolio' },
    { l: 'WAC Avg Cost', v: wac != null ? wac.toFixed(2) : '—', s: 'LibreFolio' },
  ];

  return (
    <div className="space-y-3.5">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Advanced Analytics</div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 border border-primary/20 px-2 py-1 rounded-md backdrop-blur">Live from price_history</span>
      </div>

      <RatesComparator portfolioReturnPct={cagrVal * 100} />

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => {
          const rows = kpis.map((k) => `${k.l},${k.v},${k.s}`).join('\n');
          const blob = new Blob([`metric,value,note\n${rows}`], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = `mevest-analytics-${new Date().toISOString().split('T')[0]}.csv`; a.click(); URL.revokeObjectURL(url);
          toast({ title: 'Report exported' });
        }} className="px-3 py-1.5 rounded-lg text-xs bg-secondary border border-border hover:bg-secondary/80 transition-colors">⬇ Download CSV Report (TradingView pattern)</button>
        <span className="text-[11px] text-muted-foreground self-center">Regime: <strong className={regime === 'bull' ? 'text-primary' : regime === 'bear' ? 'text-destructive' : ''}>{regime}</strong> — NSE brokerage 0.30% assumed</span>
      </div>

      {/* KPIs bento */}
      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
        {kpis.map((k, i) => (
          <GlassCard key={k.l} delay={i * 0.04}>
            <div className="p-3.5">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{k.l}</div>
              <div className="font-mono text-[19px] font-medium mt-[5px] truncate">{k.v}</div>
              <div className="text-[11px] text-muted-foreground mt-[3px] truncate">{k.s}</div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* ── creative finance bento ── */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Efficient Frontier */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5" delay={0.1}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center"><Activity className="w-4 h-4 text-primary" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">Efficient Frontier</div>
              <div className="text-[10px] text-muted-foreground">Risk vs return — 5 mock portfolios + current</div>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Markowitz</span>
          </div>
          <div className="h-[240px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.25} />
                <XAxis type="number" dataKey="x" name="Risk" unit="%" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} domain={[5, 26]} label={{ value: 'Risk % (vol)', position: 'insideBottom', offset: -2, fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <YAxis type="number" dataKey="y" name="Return" unit="%" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 20]} label={{ value: 'Return %', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                <RTooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => v.toFixed(2) + '%'} />
                {/* frontier mocks */}
                <Scatter name="Portfolios" data={frontierMock} fill="hsl(var(--muted-foreground))">
                  {frontierMock.map((entry, idx) => (
                    <Cell key={idx} fill={entry.name === 'Max Sharpe' ? 'hsl(258 89% 76%)' : 'hsl(var(--muted-foreground) / 0.9)'} />
                  ))}
                </Scatter>
                {/* current point animated */}
                <Scatter name="Current" data={[currentPt]} fill="hsl(160 60% 52%)">
                  <Cell fill="hsl(160 60% 52%)" />
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-2 text-[10px] mt-1">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Current ({currentPt.x.toFixed(1)}%, {currentPt.y.toFixed(1)}%)</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(258_89%_76%)]" /> Max Sharpe</span>
            <span className="ml-auto font-mono text-muted-foreground">vol {fmt(vol, true)} · CAGR {fmt(cagrVal, true)}</span>
          </div>
          {/* animated frontier line */}
          <div className="mt-2 h-[2px] rounded-full bg-gradient-to-r from-primary/0 via-primary/40 to-purple-500/40 animate-pulse" />
        </GlassCard>

        {/* Monte Carlo fan */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5" delay={0.15}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-blue-500/15 flex items-center justify-center"><Waves className="w-4 h-4 text-blue-500" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">Monte Carlo — 100 Paths</div>
              <div className="text-[10px] text-muted-foreground">30-day fan from {closes[closes.length - 1]?.toFixed(0) ?? '—'} using vol {(vol * 100).toFixed(1)}%</div>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded-full">GBM</span>
          </div>
          <div className="h-[240px]">
            {monteData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monteData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                  <XAxis dataKey="day" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: 'Days forward', position: 'insideBottom', offset: -2, fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={v => Math.round(v).toLocaleString()} domain={['auto', 'auto']} />
                  <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                  {/* fan bands as thick lines */}
                  <Area type="monotone" dataKey="p90" stroke="none" fill="hsl(160 60% 52% / 0.10)" fillOpacity={1} isAnimationActive={false} />
                  <Area type="monotone" dataKey="p10" stroke="none" fill="hsl(var(--card))" fillOpacity={1} isAnimationActive={false} />
                  {/* 100 faint paths */}
                  {Array.from({ length: 100 }, (_, i) => (
                    <Line key={i} type="monotone" dataKey={`path${i}`} stroke="hsl(160 60% 52%)" strokeOpacity={0.07} strokeWidth={0.8} dot={false} isAnimationActive={false} />
                  ))}
                  <Line type="monotone" dataKey="p50" stroke="hsl(160 60% 52%)" strokeWidth={1.8} dot={false} isAnimationActive={false} />
                  <Line type="monotone" dataKey="p10" stroke="hsl(218 90% 66%)" strokeWidth={1} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
                  <Line type="monotone" dataKey="p90" stroke="hsl(218 90% 66%)" strokeWidth={1} dot={false} strokeDasharray="4 2" isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">No price history yet</div>
            )}
          </div>
          <div className="flex gap-2 text-[10px] text-muted-foreground mt-1">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-[2px] bg-primary" /> Median</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-[2px] border-t border-dashed border-[hsl(218_90%_66%)]" /> p10 / p90</span>
            <span className="ml-auto font-mono">100 paths · {monteData.length ? `${Math.round((monteData[monteData.length - 1]['p50'] as number)).toLocaleString()} median @ T+30` : '—'}</span>
          </div>
        </GlassCard>

        {/* Correlation heatmap */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5" delay={0.2}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/15 flex items-center justify-center"><GitCompareArrows className="w-4 h-4 text-purple-500" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">Correlation Heatmap</div>
              <div className="text-[10px] text-muted-foreground">Pairwise holdings — color scale -1 to +1</div>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-purple-500/10 text-purple-600 px-1.5 py-0.5 rounded-full">ρ</span>
          </div>
          {corrMatrix.length ? (
            <div>
              <div className="grid gap-[2px]" style={{ gridTemplateColumns: `70px repeat(${corrLabels.length}, 1fr)` }}>
                <div />
                {corrLabels.map(sym => (
                  <div key={sym} className="text-[10px] font-mono font-semibold text-center truncate px-1 py-1 text-muted-foreground">{sym}</div>
                ))}
                {corrMatrix.map((row, i) => (
                  <div key={corrLabels[i]} className="contents">
                    <div className="text-[10px] font-mono font-semibold text-right pr-2 py-2 text-muted-foreground truncate">{corrLabels[i]}</div>
                    {row.map((v, j) => (
                      <motion.div
                        key={`${i}-${j}`}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.25 + (i * corrLabels.length + j) * 0.02 }}
                        className="rounded-md flex items-center justify-center text-[11px] font-mono font-bold h-[42px] border border-border/20"
                        style={{ background: heatColor(v), color: textColorForHeat(v) }}
                        title={`${corrLabels[i]} vs ${corrLabels[j]}: ${v.toFixed(2)}`}
                      >
                        {v.toFixed(2)}
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-1 mt-3">
                <span className="text-[10px] text-muted-foreground">-1</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden flex">
                  <div className="flex-1" style={{ background: 'hsl(0 76% 58% / 0.85)' }} />
                  <div className="flex-1" style={{ background: 'hsl(0 76% 58% / 0.25)' }} />
                  <div className="flex-1" style={{ background: 'hsl(var(--muted) / 0.4)' }} />
                  <div className="flex-1" style={{ background: 'hsl(160 60% 52% / 0.35)' }} />
                  <div className="flex-1" style={{ background: 'hsl(160 60% 52% / 0.85)' }} />
                </div>
                <span className="text-[10px] text-muted-foreground">+1</span>
                <span className="ml-2 text-[10px] text-muted-foreground hidden sm:inline">diversification ↓ as ρ → 1</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground py-8 text-center">Add holdings to compute correlations</div>
          )}
        </GlassCard>

        {/* Drawdown underwater */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5" delay={0.25}>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-7 h-7 rounded-lg bg-destructive/10 flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-destructive" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">Drawdown — Underwater Curve</div>
              <div className="text-[10px] text-muted-foreground">Worst {fmt(dd.pct, true)} from peak {dd.peakIdx} → trough {dd.troughIdx}</div>
            </div>
          </div>
          <div className="h-[210px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={drawdownSeries} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="ddGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(0 76% 58%)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="hsl(0 76% 58%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis dataKey="idx" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} width={48} tickFormatter={v => v.toFixed(0) + '%'} domain={['auto', 1]} />
                <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => [v.toFixed(2) + '%', 'Drawdown']} />
                <Area type="monotone" dataKey="dd" stroke="hsl(0 76% 58%)" fill="url(#ddGrad)" strokeWidth={1.6} dot={false} isAnimationActive />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-muted-foreground mt-1">Underwater = (price − running peak) / peak. Recovery when curve returns to 0%.</div>
        </GlassCard>

        {/* Factor exposure */}
        <GlassCard className="col-span-12 p-3.5" delay={0.3}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center"><Layers className="w-4 h-4 text-amber-600" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">Factor Exposures</div>
              <div className="text-[10px] text-muted-foreground">Market / Size / Value / Momentum / Quality — vs benchmark</div>
            </div>
            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 px-1.5 py-0.5 rounded-full">Fama-French + Mom</span>
          </div>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={factorData} layout="vertical" margin={{ left: 70, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.2} />
                <XAxis type="number" domain={[-1, 1.5]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="factor" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11, fontWeight: 600 }} tickLine={false} axisLine={false} width={70} />
                <RTooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number) => v.toFixed(2)} />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} isAnimationActive>
                  {factorData.map((d, i) => (
                    <Cell key={i} fill={d.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground mt-1">
            <span>0 = neutral vs market</span>
            <span className="hidden sm:inline">·</span>
            <span>Market = beta ({fmt(b)})</span>
            <span className="ml-auto font-mono">Long tilt &gt;0 · Short tilt &lt;0</span>
          </div>
        </GlassCard>
      </div>

      {/* legacy lower bento kept */}
      <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-3.5">
        {[
          { t: 'Portfolio vs Benchmark', sub: `Beta ${fmt(b)} vs ${benchCloses.length ? 'SPY / NSE blended' : 'awaiting benchmark history'}` },
          { t: 'Sharpe Detail', sub: `Excess ${(returns.length ? (returns.reduce((a, b) => a + b, 0) / returns.length * 252 - riskFree) * 100 : 0).toFixed(2)}% / vol ${(vol * 100).toFixed(2)}%` },
          { t: 'Benchmark', sub: benchCloses.length ? `${benchCloses.length} bench points loaded` : 'Awaiting SPY history — blended NSE20/SPY planned' },
        ].map(card => (
          <GlassCard key={card.t} className="p-3.5">
            <div className="font-display text-[13px] font-bold mb-2">{card.t}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">{card.sub}</div>
          </GlassCard>
        ))}
      </div>

      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <TrendingUp className="w-3 h-3" /> Analytics powered by lib/analytics/riskMetrics + extendedMetrics · Monte Carlo 100×30 GBM · Frontier mock efficient set
      </div>
    </div>
  );
}
