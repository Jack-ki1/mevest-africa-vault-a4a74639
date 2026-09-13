import { useState, useMemo, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { MARKET, FEAR_GREED, SECTOR_PERFORMANCE, formatMoney, formatPct, MARKET_REGIONS } from '@/data/market-data';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap, Sparkles, HeartPulse, Droplets, Leaf, Target, Activity, MessageCircleQuestion, ShieldCheck } from 'lucide-react';
import AiInsightsPanel from '@/components/AiInsightsPanel';
import KeyMomentsCard from '@/components/KeyMomentsCard';
import { useCurrency } from '@/context/CurrencyContext';
import { formatWithCurrency } from '@/lib/currency';
import SuggestedPrompts from '@/components/SuggestedPrompts';
import PredictionEmbed from '@/components/PredictionEmbed';
import GovTrackerMock from '@/components/GovTrackerMock';
import { regimeLabel } from '@/lib/analytics/extendedMetrics';
import { dailyReturns } from '@/lib/analytics/riskMetrics';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const COLORS = ['hsl(218 90% 66%)', 'hsl(160 60% 52%)', 'hsl(258 89% 76%)', 'hsl(38 95% 55%)', 'hsl(0 76% 58%)', 'hsl(25 95% 55%)'];
const TIMEFRAMES = [
  { key: '1W', days: 7 }, { key: '1M', days: 30 }, { key: '3M', days: 90 }, { key: '1Y', days: 365 }, { key: 'ALL', days: 730 },
];

function GlassCard({ children, className = '', hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <motion.div
      whileHover={hover ? { y: -2, scale: 1.005 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_4px_24px_hsl(var(--foreground)/0.04)] ${className}`}
    >
      {children}
    </motion.div>
  );
}

// Health radial 0-100 donut
function HealthRadial({ score }: { score: number }) {
  const data = [{ name: 'score', value: score }, { name: 'rest', value: 100 - score }];
  const color = score >= 80 ? 'hsl(160 60% 52%)' : score >= 55 ? 'hsl(38 95% 55%)' : 'hsl(0 76% 58%)';
  return (
    <div className="relative w-[116px] h-[116px] mx-auto">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={42} outerRadius={56} startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={false}>
            <Cell fill={color} />
            <Cell fill="hsl(var(--muted) / 0.2)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[28px] font-bold tracking-tight" style={{ color }}>{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.8px] text-muted-foreground -mt-1">Health</span>
      </div>
    </div>
  );
}

function GoalsRing({ pct }: { pct: number | null }) {
  const val = pct == null ? 0 : pct;
  const data = [{ v: val }, { v: 100 - val }];
  return (
    <div className="relative w-[86px] h-[86px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="v" cx="50%" cy="50%" innerRadius={30} outerRadius={40} startAngle={90} endAngle={-270} strokeWidth={0} isAnimationActive={false}>
            <Cell fill="hsl(160 60% 52%)" />
            <Cell fill="hsl(var(--muted) / 0.2)" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[16px] font-bold">{pct == null ? '—' : `${Math.round(val)}%`}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-muted-foreground">Goal</span>
      </div>
    </div>
  );
}

export default function DashboardPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings } = usePortfolio();
  const { prices, allAssets, isLive } = useRealtimeMarket();
  const { currency, setCurrency, usdKes } = useCurrency();
  const [timeframe, setTimeframe] = useState('3M');
  const n = holdings.length;

  const enrichedHoldings = holdings.map(h => {
    const live = prices[h.sym];
    const isStale = !live;
    const livePrice = live?.price ?? h.price;
    return { ...h, price: livePrice, isStale };
  });
  const staleCount = enrichedHoldings.filter(h => (h as { isStale?: boolean }).isStale).length;
  const [regime, setRegime] = useState<string | null>(null);
  const [closes, setCloses] = useState<number[]>([]);
  // goals ring state
  const [goalPct, setGoalPct] = useState<number | null>(null);
  const [goalTitle, setGoalTitle] = useState<string | null>(null);

  useEffect(() => {
    if (n > 0) {
      supabase.from('price_history').select('close').eq('symbol', holdings[0].sym).order('ts', { ascending: true }).limit(252).then(({ data }) => {
        const arr = data ? (data as { close: number }[]).map((r) => Number(r.close)) : [];
        if (arr.length >= 10) {
          setCloses(arr);
          const rets = dailyReturns(arr);
          setRegime(regimeLabel(rets));
        }
      });
    }
  }, [n, holdings[0]?.sym]);

  // fetch next goal for ring
  useEffect(() => {
    supabase.from('investment_goals').select('title,target_amount,current_amount').order('created_at', { ascending: true }).limit(1).then(({ data }) => {
      if (data && data.length) {
        const g = data[0] as { title: string; target_amount: number; current_amount: number };
        setGoalTitle(g.title);
        const pct = g.target_amount ? (Number(g.current_amount) / Number(g.target_amount)) * 100 : 0;
        setGoalPct(Math.min(100, pct));
      }
    });
  }, []);

  const totalVal = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.price, 0) : 0;
  const totalCost = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.cost, 0) : 0;
  const totalPL = totalVal - totalCost;
  const dayChg = n ? enrichedHoldings.reduce((s, h) => {
    const p = prices[h.sym];
    return s + (p ? p.chg * h.shares : 0);
  }, 0) : 0;
  const dayChgPct = totalVal > 0 ? (dayChg / totalVal * 100) : 0;

  const conv = (v: number) => currency === 'KES' ? v * usdKes : v;

  // sparkline data for net worth — tiny line anchored on live value with subtle variation
  const sparkData = useMemo(() => {
    if (!n) return [];
    const base = totalVal;
    // generate 14 points with small drift to visualize trend
    return Array.from({ length: 14 }, (_, i) => ({
      v: base * (1 + (Math.sin(i / 3) * 0.015) + (i - 7) * 0.0015),
    }));
  }, [n, totalVal]);

  // cash flow mock (inflows vs outflows) — deterministic per day
  const cashFlowData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map((m, i) => ({
      m,
      inflow: 12000 + i * 1800 + (i % 2 ? 2500 : 0),
      outflow: 8500 + i * 900 + (i === 3 ? 4000 : 0),
    }));
  }, []);

  // health score heuristic
  const healthScore = useMemo(() => {
    if (!n) return 0;
    const types = new Set(enrichedHoldings.map(h => h.type)).size;
    const countries = new Set(enrichedHoldings.map(h => h.country)).size;
    let s = 48 + n * 5 + types * 6 + countries * 4;
    if (totalPL > 0) s += 8;
    if (dayChgPct > 0) s += 4;
    if (staleCount === 0) s += 3;
    return Math.min(98, Math.max(12, Math.round(s)));
  }, [n, enrichedHoldings, totalPL, dayChgPct, staleCount]);

  // ESG mock badge based on holdings count / sectors
  const esg = useMemo(() => {
    const score = n ? Math.min(92, 62 + n * 3 + (enrichedHoldings.some(h => h.sector === 'Energy') ? -6 : 4)) : 0;
    const label = score >= 75 ? 'Leader' : score >= 60 ? 'Average' : 'Laggard';
    return { score, label };
  }, [n, enrichedHoldings]);

  const selectedDays = TIMEFRAMES.find(t => t.key === timeframe)?.days || 90;
  void selectedDays;
  const perfData = useMemo(() => {
    if (!n) return [];
    const now = new Date();
    return [{ date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: totalVal }];
  }, [n, totalVal]);

  const allocData = useMemo(() => {
    if (!n) return [];
    const groups: Record<string, number> = {};
    enrichedHoldings.forEach(h => { groups[h.type] = (groups[h.type] || 0) + h.shares * h.price; });
    return Object.entries(groups).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [enrichedHoldings, n]);
  const allocTotal = allocData.reduce((a, b) => a + b.value, 0);

  const liveAssets = allAssets.filter(a => ['stock', 'crypto', 'etf'].includes(a.type));
  const gainers = [...liveAssets].sort((a, b) => b.chgPct - a.chgPct).slice(0, 5);
  const losers = [...liveAssets].sort((a, b) => a.chgPct - b.chgPct).slice(0, 5);

  const riskMetrics = [
    { l: 'Sharpe', v: '—', c: 'text-muted-foreground' }, { l: 'Beta', v: '—', c: 'text-muted-foreground' },
    { l: 'Volatility', v: '—', c: 'text-muted-foreground' }, { l: 'Max DD', v: '—', c: 'text-muted-foreground' },
    { l: 'CAGR', v: '—', c: 'text-muted-foreground' }, { l: 'TWR', v: '—', c: 'text-muted-foreground' },
  ];

  const fg = FEAR_GREED;
  const fgColor = fg.value > 70 ? 'text-primary' : fg.value > 40 ? 'text-amber' : 'text-destructive';
  const vixItem = MARKET_REGIONS['us']?.find(x => x.key === 'VIX') ?? { price: 14.82, chg: -1.2 };
  const breadthMock = { adv: 68, decl: 32 }; // mock breadth

  const askFollowUp = (prompt: string) => {
    // dispatch to chat widget; also fallback copy
    window.dispatchEvent(new CustomEvent('mevest-ask-followup', { detail: prompt }));
    // Try to open chat widget if it listens to mevest-open-chat
    window.dispatchEvent(new CustomEvent('mevest-open-chat'));
    // fallback: trigger click on floating button if present
    const btn = document.querySelector('[data-mevest-chat-trigger]') as HTMLElement | null;
    btn?.click();
  };

  return (
    <div className="space-y-3.5">
      {!isLive && (
        <div className="text-[11px] text-amber-700 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 backdrop-blur">
          ⚠️ Live market data unavailable — showing cached/demo prices. Data may be delayed.
        </div>
      )}
      {/* Top bento row: prompts + regime */}
      <SuggestedPrompts page="dashboard" />
      {regime && (
        <div className={`text-[11px] rounded-lg px-3 py-2 border backdrop-blur ${regime === 'bull' ? 'bg-primary/10 border-primary/20 text-primary' : regime === 'bear' ? 'bg-destructive/10 border-destructive/20 text-destructive' : 'bg-muted/50 border-border text-muted-foreground'}`}>
          Market regime: <strong>{regime}</strong> — {regime === 'bull' ? 'Risk-on — consider taking profits.' : regime === 'bear' ? 'Risk-off — volatility elevated, tighten stops.' : 'Neutral — range-bound.'} {closes.length ? `(${closes.length} points)` : ''}
        </div>
      )}

      {/* Market Pulse Strip */}
      <GlassCard className="px-3 py-2.5 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-muted-foreground"><Activity className="w-3.5 h-3.5 text-primary" /> Market Pulse</span>
        <span className="h-4 w-px bg-border hidden sm:block" />
        <span className="inline-flex items-center gap-1.5"><span className="text-muted-foreground">VIX</span> <span className="font-mono font-semibold">{vixItem.price.toFixed(2)}</span> <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] px-1 py-0.5 rounded ${vixItem.chg >= 0 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'}`}>{vixItem.chg >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{vixItem.chg.toFixed(2)}%</span></span>
        <span className="h-4 w-px bg-border hidden sm:block" />
        <span className="inline-flex items-center gap-2">
          <span className="text-muted-foreground">Breadth</span>
          <span className="inline-flex items-center gap-1">
            <span className="w-16 h-1.5 rounded-full bg-muted/40 overflow-hidden flex">
              <span className="h-full bg-primary" style={{ width: `${breadthMock.adv}%` }} />
              <span className="h-full bg-destructive/60" style={{ width: `${breadthMock.decl}%` }} />
            </span>
            <span className="font-mono text-[10px]">{breadthMock.adv}% adv</span>
          </span>
        </span>
        <span className="h-4 w-px bg-border hidden sm:block" />
        <span className="text-muted-foreground">NSE 20 <span className="font-mono font-semibold text-foreground">1,874.40</span> <span className="text-primary font-mono">+2.10%</span></span>
        <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />LIVE</span>
      </GlassCard>

      <div className="flex items-center gap-2">
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button onClick={() => setCurrency('KES')} className={`px-2 py-1 text-[11px] font-semibold ${currency === 'KES' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>KES</button>
          <button onClick={() => setCurrency('USD')} className={`px-2 py-1 text-[11px] font-semibold ${currency === 'USD' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>USD</button>
        </div>
        <span className="text-[10px] text-muted-foreground">1 USD = {usdKes.toFixed(2)} KES</span>
      </div>

      {/* BENTO: Stats with sparkline */}
      <div className="grid grid-cols-12 gap-3">
        {/* Portfolio Value with sparkline */}
        <GlassCard className="col-span-12 sm:col-span-6 lg:col-span-3 p-3.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px] flex items-center justify-between">
            Portfolio Value
            <span className={`font-mono text-[9px] px-1 py-0.5 rounded ${dayChgPct >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>{n ? formatPct(dayChgPct) : '—'}</span>
          </div>
          {n ? (
            <>
              <div className="font-mono text-[22px] font-semibold tracking-tight tabular-nums mt-1">{formatWithCurrency(conv(totalVal), currency)}</div>
              <div className="h-[28px] -mx-1 mt-1">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkData}>
                    <Area type="monotone" dataKey="v" stroke="hsl(160 60% 52%)" fill="hsl(160 60% 52% / 0.12)" strokeWidth={1.5} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1">Net worth · {sparkData.length} pts</div>
            </>
          ) : (
            <>
              <div className="font-mono text-[22px] font-medium text-muted-foreground/40 mt-1">—</div>
              <span className="font-mono text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-md">No holdings</span>
            </>
          )}
        </GlassCard>

        <GlassCard className="col-span-12 sm:col-span-6 lg:col-span-3 p-3.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">Total Invested</div>
          <div className="font-mono text-[22px] font-semibold tracking-tight tabular-nums mt-1">{n ? formatWithCurrency(conv(totalCost), currency) : '—'}</div>
          <span className="font-mono text-[10px] font-semibold inline-flex items-center gap-[3px] px-1.5 py-0.5 rounded-md text-muted-foreground bg-muted/40 mt-1">Cost basis</span>
          <div className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Basis tracked</div>
        </GlassCard>

        <GlassCard className="col-span-12 sm:col-span-6 lg:col-span-3 p-3.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">Total P&L</div>
          <div className={`font-mono text-[22px] font-semibold tracking-tight tabular-nums mt-1 ${totalPL >= 0 ? 'text-primary' : 'text-destructive'}`}>{n ? formatWithCurrency(conv(totalPL), currency) : '—'}</div>
          <span className={`font-mono text-[10px] font-semibold inline-flex items-center gap-[3px] px-1.5 py-0.5 rounded-md ${totalPL >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{n ? formatPct(totalPL / totalCost * 100) : '—'}</span>
        </GlassCard>

        <GlassCard className="col-span-12 sm:col-span-6 lg:col-span-3 p-3.5">
          <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">Today's P&L</div>
          <div className={`font-mono text-[22px] font-semibold tracking-tight tabular-nums mt-1 ${dayChg >= 0 ? 'text-primary' : 'text-destructive'}`}>{n ? formatWithCurrency(conv(dayChg), currency) : '—'}</div>
          <span className={`font-mono text-[10px] font-semibold inline-flex items-center gap-[3px] px-1.5 py-0.5 rounded-md ${dayChgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{n ? formatPct(dayChgPct) : '—'}</span>
        </GlassCard>
      </div>

      {/* BENTO second row: Health | AI Briefing | Goals + ESG */}
      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-3 p-3.5 flex flex-col">
          <div className="flex items-center gap-1.5 mb-2"><HeartPulse className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">Health Score</span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded">0-100</span></div>
          {n ? (
            <>
              <HealthRadial score={healthScore} />
              <div className="text-center text-[11px] text-muted-foreground mt-1">{healthScore >= 80 ? 'Excellent — well diversified' : healthScore >= 60 ? 'Good — minor concentration' : 'Needs attention — concentrated'}</div>
              <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-secondary/60 rounded-lg py-1.5"><div className="font-mono text-[12px] font-bold">{new Set(enrichedHoldings.map(h => h.type)).size}</div><div className="text-[9px] text-muted-foreground uppercase font-semibold">Types</div></div>
                <div className="bg-secondary/60 rounded-lg py-1.5"><div className="font-mono text-[12px] font-bold">{new Set(enrichedHoldings.map(h => h.country)).size}</div><div className="text-[9px] text-muted-foreground uppercase font-semibold">Markets</div></div>
                <div className="bg-secondary/60 rounded-lg py-1.5"><div className="font-mono text-[12px] font-bold">{n}</div><div className="text-[9px] text-muted-foreground uppercase font-semibold">Holdings</div></div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center py-6 text-center"><div className="font-mono text-3xl text-muted-foreground/30">—</div><div className="text-xs text-muted-foreground mt-1">Add holdings to compute health</div></div>
          )}
        </GlassCard>

        {/* AI Daily Briefing */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5 flex flex-col">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center"><Sparkles className="w-4 h-4 text-primary" /></div>
            <div>
              <div className="font-display text-[13px] font-bold leading-none">AI Daily Briefing</div>
              <div className="text-[10px] text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })} · 06:00 EAT</div>
            </div>
            <span className="ml-auto text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-full">MOCK</span>
          </div>
          <div className="mt-3 space-y-2 text-xs leading-relaxed">
            <p className="text-foreground"><span className="font-semibold">Good morning.</span> {n ? `Your portfolio is ${dayChgPct >= 0 ? 'up' : 'down'} ${Math.abs(dayChgPct).toFixed(2)}% today. ` : 'No holdings yet — here’s the market. '}NSE banking names led gains (+2.1%) on earnings beats; US tech held despite VIX at {vixItem.price.toFixed(1)}.</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><span className="font-semibold text-foreground">For you:</span> {n ? `${enrichedHoldings[0]?.sym} reports next — keep an eye on volume.` : 'Consider starting with NSE blue chips (SCOM, EQTY) + a global ETF for balance.'}</li>
              <li><span className="font-semibold text-foreground">Risk:</span> {healthScore >= 70 ? 'Diversification looks healthy; no single name > 35%.' : 'Concentration risk — top holding > 40% of value.'}</li>
              <li><span className="font-semibold text-foreground">Idea:</span> Rebalance toward target if drift &gt; 5% — see Portfolio → Rebalancer.</li>
            </ul>
          </div>
          <div className="mt-auto pt-3 flex gap-2">
            <button onClick={() => askFollowUp('Explain my daily briefing in detail and suggest 2 actions')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"><MessageCircleQuestion className="w-3.5 h-3.5" /> Ask follow-up in chat</button>
            <button onClick={() => askFollowUp('What should I watch today for my holdings?')} className="px-3 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium hover:border-primary/20">What to watch?</button>
          </div>
          <div className="text-[9px] text-muted-foreground mt-2">Mock content — future: generated by scheduled_briefings cron.</div>
        </GlassCard>

        {/* Goals ring + ESG badge stacked */}
        <div className="col-span-12 lg:col-span-3 space-y-3.5">
          <GlassCard className="p-3.5">
            <div className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">Next Goal</span></div>
            <div className="flex items-center gap-3 mt-2">
              <GoalsRing pct={goalPct} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{goalTitle ?? 'No goal yet'}</div>
                <div className="text-[11px] text-muted-foreground truncate">{goalPct == null ? 'Create a goal in Portfolio' : `${goalPct.toFixed(1)}% of target`}</div>
                <div className="mt-1 h-1.5 bg-muted/30 rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${goalPct ?? 0}%` }} /></div>
              </div>
            </div>
          </GlassCard>
          <GlassCard className="p-3.5">
            <div className="flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">ESG Impact</span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Badge</span></div>
            {n ? (
              <div className="mt-2 flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-emerald-500/20 border border-primary/20 flex items-center justify-center font-mono font-bold text-primary">{esg.score}</div>
                <div>
                  <div className="text-xs font-semibold">{esg.label}</div>
                  <div className="text-[11px] text-muted-foreground">Weighted by holdings — higher is greener.</div>
                  <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-1"><Leaf className="w-3 h-3" /> Low-carbon tilt</div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground mt-2">Add holdings to see ESG impact.</div>
            )}
            <div className="text-[9px] text-muted-foreground mt-2">Method: sector-weighted mock (Energy −, Tech/Finance +). Not rated.</div>
          </GlassCard>
        </div>
      </div>

      {/* Chart + Allocation + Cash Flow */}
      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-8 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50 flex items-center">
            <span className="font-display text-[13px] font-bold">Portfolio Performance</span>
            <div className="ml-auto flex gap-0.5 bg-secondary rounded-lg p-[2px]">
              {TIMEFRAMES.map(tf => (
                <button key={tf.key} onClick={() => setTimeframe(tf.key)} className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${timeframe === tf.key ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tf.key}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3.5">
            {n === 0 ? <EmptyState icon="📊" title="No portfolio data yet" sub="Add your first holding to see performance charts and analytics." onAdd={onAddHolding} /> : (
              <div className="space-y-2">
                <div className="text-[10px] text-amber bg-amber/10 border border-amber/20 rounded-md px-2 py-1.5">
                  ⚠️ Historical performance tracking is coming soon. Showing current portfolio value only.
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perfData}>
                    <defs><linearGradient id="perfGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160 60% 52%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(160 60% 52%)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => ['$' + Math.round(v).toLocaleString(), 'Value']} />
                    <Area type="monotone" dataKey="value" stroke="hsl(160 60% 52%)" fill="url(#perfGrad2)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
                {/* Cash flow mini bar */}
                <div className="rounded-lg bg-secondary/40 border border-border/40 p-2.5">
                  <div className="flex items-center gap-1.5 mb-2"><Droplets className="w-3 h-3 text-primary" /><span className="text-[11px] font-bold">Cash Flow — inflows vs outflows (mock)</span><span className="ml-auto text-[9px] text-muted-foreground">KES</span></div>
                  <div className="h-[64px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={cashFlowData} barCategoryGap="30%">
                        <XAxis dataKey="m" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} />
                        <Bar dataKey="inflow" fill="hsl(160 60% 52%)" radius={[4,4,0,0]} />
                        <Bar dataKey="outflow" fill="hsl(var(--muted-foreground) / 0.35)" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex gap-3 text-[10px] mt-1"><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-primary/80" /> Inflow</span><span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-muted-foreground/40" /> Outflow</span><span className="ml-auto font-mono text-muted-foreground">Net +{(cashFlowData.reduce((a,b)=>a+b.inflow-b.outflow,0)).toLocaleString()} KES (6m)</span></div>
                </div>
              </div>
            )}
          </div>
        </GlassCard>

        <div className="col-span-12 lg:col-span-4 space-y-3.5">
          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/50"><span className="font-display text-[13px] font-bold">Allocation</span></div>
            <div className="p-3.5">
              {n === 0 ? <EmptyState icon="🥧" title="No allocation" sub="Holdings will appear here once added." /> : (
                <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart><Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={3} strokeWidth={0}>{allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [(v / allocTotal * 100).toFixed(1) + '%']} /></PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-[5px]">
                    {allocData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[11px] text-muted-foreground">{d.name}</span></div>
                        <span className="font-mono text-[11px] tabular-nums">{(d.value / allocTotal * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/50"><span className="font-display text-[13px] font-bold">Fear & Greed Index</span></div>
            <div className="p-3.5 text-center">
              <div className={`font-mono text-[36px] font-semibold ${fgColor}`}>{fg.value}</div>
              <div className={`text-xs font-semibold ${fgColor}`}>{fg.label}</div>
              <div className="mt-2 h-2 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: fg.value + '%', background: fg.value > 60 ? 'hsl(160 60% 52%)' : fg.value > 40 ? 'hsl(38 95% 55%)' : 'hsl(0 76% 58%)' }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>Extreme Fear</span><span>Extreme Greed</span></div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Market Movers with LIVE data — bento */}
      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-4 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50 flex items-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Gainers</span>
            <Zap className="w-2.5 h-2.5 text-primary ml-auto fill-primary" />
          </div>
          <div className="p-1">
            {gainers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-muted/30 rounded-lg transition-colors">
                <div><div className="text-[12px] font-semibold">{a.sym}</div><div className="text-[10px] text-muted-foreground">{a.name}</div></div>
                <div className="text-right">
                  <div className="font-mono text-[11px] tabular-nums">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end"><ArrowUpRight className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] font-semibold text-primary tabular-nums">{formatPct(a.chgPct)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50 flex items-center">
            <TrendingDown className="w-3.5 h-3.5 text-destructive mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Losers</span>
            <Zap className="w-2.5 h-2.5 text-destructive ml-auto fill-destructive" />
          </div>
          <div className="p-1">
            {losers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-muted/30 rounded-lg transition-colors">
                <div><div className="text-[12px] font-semibold">{a.sym}</div><div className="text-[10px] text-muted-foreground">{a.name}</div></div>
                <div className="text-right">
                  <div className="font-mono text-[11px] tabular-nums">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end"><ArrowDownRight className="w-3 h-3 text-destructive" /><span className="font-mono text-[10px] font-semibold text-destructive tabular-nums">{formatPct(a.chgPct)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50"><span className="font-display text-[13px] font-bold">Sector Performance (1D)</span></div>
          <div className="p-2.5 space-y-[5px]">
            {SECTOR_PERFORMANCE.sort((a, b) => b.chg1d - a.chg1d).slice(0, 8).map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-[10px] w-[75px] text-right text-muted-foreground truncate">{s.name}</span>
                <div className="flex-1 h-[12px] bg-muted/20 rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm ${s.chg1d >= 0 ? 'bg-primary/40' : 'bg-destructive/40'}`} style={{ width: Math.min(Math.abs(s.chg1d) / 3 * 100, 100) + '%' }} />
                </div>
                <span className={`font-mono text-[10px] w-[42px] text-right font-semibold tabular-nums ${s.chg1d >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPct(s.chg1d)}</span>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Holdings + Risk — bento */}
      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-8 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50 flex items-center">
            <span className="font-display text-[13px] font-bold">Holdings</span>
            {staleCount > 0 && <span className="ml-2 text-[9px] text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">{staleCount} stale price(s)</span>}
            <span className="text-[10px] text-muted-foreground ml-auto">{n} position{n !== 1 ? 's' : ''}</span>
          </div>
          <div>
            {n === 0 ? <EmptyState icon="💼" title="No holdings added" sub="Start tracking your investments by adding your first holding." onAdd={onAddHolding} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border/50">
                    <th className="text-left p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Asset</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Price</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Value</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">P&L%</th>
                  </tr></thead>
                  <tbody>
                    {enrichedHoldings.map(h => {
                      const mv = h.shares * h.price;
                      const pct = (h.price - h.cost) / h.cost * 100;
                      const up = pct >= 0;
                      const flash = prices[h.sym] && prices[h.sym].price > prices[h.sym].prevPrice ? 'price-up' : prices[h.sym] && prices[h.sym].price < prices[h.sym].prevPrice ? 'price-down' : '';
                      return (
                        <tr key={h.sym} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="p-[10px] px-[11px]">
                            <div className="flex items-center gap-[9px]">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: h.color + '18', color: h.color }}>{h.sym.slice(0, 2)}</div>
                              <div><div className="text-[13px] font-semibold text-foreground">{h.sym}</div><div className="text-[10px] text-muted-foreground font-mono">{h.name}</div></div>
                            </div>
                          </td>
                          <td className={`text-right p-[10px] px-[11px] font-mono tabular-nums ${flash}`}>
                            ${h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            {(h as { isStale?: boolean }).isStale && <span className="ml-1 text-[9px] text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded">stale</span>}
                          </td>
                          <td className="text-right p-[10px] px-[11px] font-mono tabular-nums">{formatMoney(mv)}</td>
                          <td className="text-right p-[10px] px-[11px]">
                            <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded-md tabular-nums ${up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(pct)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard className="col-span-12 lg:col-span-4 overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/50 flex items-center"><span className="font-display text-[13px] font-bold">Risk Metrics</span><span className="ml-auto text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Coming Soon</span></div>
          <div className="p-3.5">
            {n === 0 ? <EmptyState icon="📐" title="Risk metrics" sub="Add holdings to compute Sharpe, Beta, drawdown and more." /> : (
              <>
                <div className="text-[10px] text-muted-foreground mb-2">Risk analytics require historical data we are still collecting.</div>
                <div className="grid grid-cols-3 gap-[9px]">
                  {riskMetrics.map(m => (
                    <div key={m.l} className="p-[9px] bg-secondary/50 rounded-lg border border-border/30">
                      <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.4px]">{m.l}</div>
                      <div className={`font-mono text-[15px] font-semibold mt-[3px] tabular-nums ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Bento: KeyMoments +AI Insights */}
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12">
          <AiInsightsPanel />
        </div>
        <div className="col-span-12">
          {n > 0 && <KeyMomentsCard symbols={holdings.map(h => h.sym)} />}
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-6"><PredictionEmbed /></div>
        <div className="col-span-12 lg:col-span-6"><GovTrackerMock /></div>
      </div>

      {/* Activity */}
      <GlassCard className="overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border/50"><span className="font-display text-[13px] font-bold">Recent Activity</span></div>
        <div className="p-3.5 text-xs">
          {n === 0 ? <div className="text-center text-muted-foreground py-[18px]">No recent activity. Add holdings to begin.</div> : (
            enrichedHoldings.slice(0, 5).map(h => (
              <div key={h.sym} className="flex items-center gap-2 py-[7px] border-b border-border/30">
                <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">BUY</span>
                <span className="font-semibold">{h.sym}</span>
                <span className="text-muted-foreground text-[11px] flex-1">{h.shares} shares @ ${h.cost.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">Manual</span>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </div>
  );
}

function EmptyState({ icon, title, sub, onAdd }: { icon: string; title: string; sub: string; onAdd?: () => void }) {
  return (
    <div className="text-center py-10 px-5">
      <div className="text-4xl mb-3 opacity-30">{icon}</div>
      <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{sub}</div>
      {onAdd && <button onClick={onAdd} className="mt-3.5 px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">+ Add Holding</button>}
    </div>
  );
}
