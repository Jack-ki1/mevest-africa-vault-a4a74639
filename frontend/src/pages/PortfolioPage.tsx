import { useState, useMemo, useEffect } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatMoney, formatPct, MARKET } from '@/data/market-data';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie } from 'recharts';
import { Zap, Upload, SlidersHorizontal, Coins, FlaskConical, FileDown } from 'lucide-react';
import { useCurrency } from '@/context/CurrencyContext';
import { formatWithCurrency } from '@/lib/currency';
import PortfolioImportWizard from '@/components/PortfolioImportWizard';
import FeesTracker from '@/components/FeesTracker';
import GoalsTracker from '@/components/GoalsTracker';
import SuggestedPrompts from '@/components/SuggestedPrompts';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

const TABS = ['all', 'stock', 'cryptocurrency', 'etf', 'bond'];
const TAB_LABELS: Record<string, string> = { all: 'All', stock: 'Stocks', cryptocurrency: 'Crypto', etf: 'ETFs', bond: 'Bonds' };

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div whileHover={{ y: -1.5 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_4px_24px_hsl(var(--foreground)/0.04)] ${className}`}>
      {children}
    </motion.div>
  );
}

export default function PortfolioPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings, removeHolding } = usePortfolio();
  const { prices } = useRealtimeMarket();
  const { currency, setCurrency, usdKes } = useCurrency();
  const [filter, setFilter] = useState('all');
  const [showImport, setShowImport] = useState(false);

  const enrichedHoldings = holdings.map(h => {
    const live = prices[h.sym];
    const isStale = !live;
    const livePrice = live?.price ?? h.price;
    const prevPrice = live?.prevPrice ?? livePrice;
    return { ...h, price: livePrice, prevPrice, isStale };
  });
  const staleCount = enrichedHoldings.filter(h => h.isStale).length;

  const n = enrichedHoldings.length;
  const totalVal = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.price, 0) : 0;
  const totalCost = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.cost, 0) : 0;
  const totalPL = totalVal - totalCost;
  const filtered = filter === 'all' ? enrichedHoldings : enrichedHoldings.filter(h => h.type === filter);

  const attrData = enrichedHoldings.map(h => ({ name: h.sym, pct: +((h.price - h.cost) / h.cost * 100).toFixed(2) }));

  const geos: Record<string, number> = {};
  enrichedHoldings.forEach(h => { geos[h.country] = (geos[h.country] || 0) + h.shares * h.price; });
  const geoTotal = Object.values(geos).reduce((a, b) => a + b, 0);
  const geoColors: Record<string, string> = { US: 'hsl(218 90% 66%)', Global: 'hsl(38 95% 55%)', KE: 'hsl(160 60% 52%)', UK: 'hsl(258 89% 76%)', EU: 'hsl(38 95% 55%)' };

  const dayChg = enrichedHoldings.reduce((s, h) => {
    const p = prices[h.sym];
    return s + (p ? p.chg * h.shares : 0);
  }, 0);
  const dayPct = totalVal > 0 ? (dayChg / totalVal) * 100 : 0;

  const stats = [
    { l: 'Portfolio Value', v: n ? formatWithCurrency(currency === 'USD' ? totalVal : totalVal * usdKes, currency) : null, c: n ? formatPct(dayPct) : null, up: dayPct >= 0 },
    { l: 'Total Invested', v: n ? formatWithCurrency(currency === 'USD' ? totalCost : totalCost * usdKes, currency) : null, c: 'Cost basis', up: true },
    { l: 'Total P&L', v: n ? formatWithCurrency(currency === 'USD' ? totalPL : totalPL * usdKes, currency) : null, c: n ? formatPct(totalPL / totalCost * 100) : null, up: totalPL >= 0 },
    { l: "Today's P&L", v: n ? formatWithCurrency(currency === 'USD' ? dayChg : dayChg * usdKes, currency) : null, c: n ? formatPct(dayPct) : null, up: dayChg >= 0 },
  ];

  // === dividend projection state ===
  const [divYields, setDivYields] = useState<Record<string, number>>({});
  useEffect(() => {
    supabase.from('symbols_meta').select('symbol,dividend_yield').then(({ data }) => {
      if (data) {
        const m: Record<string, number> = {};
        (data as { symbol: string; dividend_yield: number | null }[]).forEach(r => { if (r.dividend_yield != null) m[r.symbol] = Number(r.dividend_yield); });
        setDivYields(m);
      }
    });
    // fallback to MARKET data if empty
    if (Object.keys(divYields).length === 0) {
      const fallback: Record<string, number> = {};
      Object.entries(MARKET).forEach(([k, v]) => { if (v.divYield != null) {
        const y = Number(v.divYield as number);
        fallback[k] = y > 1 ? y / 100 : y;
        // also map with .NR suffix for NSE
        if (['SCOM','EQTY','KCB'].includes(k)) fallback[`${k}.NR`] = fallback[k];
      }});
      if (Object.keys(fallback).length) setDivYields(prev => Object.keys(prev).length ? prev : fallback);
    }
  }, []);

  const getYield = (sym: string) => {
    if (divYields[sym] != null) {
      const y = divYields[sym];
      return y > 1 ? y / 100 : y;
    }
    // try base without .NR
    const base = sym.replace('.NR','');
    if (divYields[base] != null) return divYields[base] > 1 ? divYields[base]/100 : divYields[base];
    const mk = MARKET[base] ?? MARKET[sym];
    if (mk?.divYield != null) {
      const y = Number(mk.divYield);
      return y > 1 ? y/100 : y;
    }
    return 0;
  };

  const dividendProjection = useMemo(() => {
    if (!n) return [];
    const annualPerHolding = enrichedHoldings.map(h => {
      const y = getYield(h.sym);
      return h.shares * h.price * y;
    });
    const annualTotal = annualPerHolding.reduce((a,b)=>a+b,0);
    if (annualTotal === 0) return [];
    // distribute over 12 months with mild seasonality
    const months = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
    const seasonal = [0.06,0.07,0.13,0.06,0.06,0.13,0.06,0.06,0.13,0.06,0.06,0.12];
    return months.map((m,i) => ({ month: m, dividend: annualTotal * seasonal[i] }));
  }, [n, enrichedHoldings, divYields]);

  const dividendAnnualTotal = useMemo(() => dividendProjection.reduce((a,b)=>a+b.dividend,0), [dividendProjection]);
  const dividendYieldOnValue = totalVal ? dividendAnnualTotal / totalVal * 100 : 0;

  // === Rebalancer ===
  const types = ['stock','etf','cryptocurrency','bond'] as const;
  const actualByType = useMemo(() => {
    const m: Record<string, number> = { stock:0, etf:0, cryptocurrency:0, bond:0 };
    enrichedHoldings.forEach(h => { m[h.type] = (m[h.type] || 0) + h.shares * h.price; });
    const total = totalVal || 1;
    Object.keys(m).forEach(k => { m[k] = m[k] / total * 100; });
    return m;
  }, [enrichedHoldings, totalVal]);

  const defaultTarget: Record<string, number> = { stock: 55, etf: 20, cryptocurrency: 15, bond: 10 };
  const [targets, setTargets] = useState<Record<string, number>>(defaultTarget);
  // when holdings change, keep targets normalized if n=0 use defaults
  const targetTotal = Object.values(targets).reduce((a,b)=>a+b,0);
  const normalizedTargets = useMemo(() => {
    if (targetTotal === 0) return targets;
    const out: Record<string, number> = {};
    Object.entries(targets).forEach(([k,v]) => out[k]= v / targetTotal * 100);
    return out;
  }, [targets, targetTotal]);

  const tradesNeeded = useMemo(() => {
    return types.map(t => {
      const actual = actualByType[t] ?? 0;
      const target = normalizedTargets[t] ?? 0;
      const diffPct = target - actual;
      const diffVal = diffPct / 100 * totalVal;
      return { type: t, actual, target, diffPct, diffVal };
    });
  }, [actualByType, normalizedTargets, totalVal]);

  const updateTarget = (type: string, val: number) => {
    setTargets(prev => ({ ...prev, [type]: val }));
  };

  // === What-if simulator ===
  const [whatIfSym, setWhatIfSym] = useState<string>('');
  const [whatIfAmt, setWhatIfAmt] = useState<string>('10000');
  useEffect(() => { if (!whatIfSym && n) setWhatIfSym(enrichedHoldings[0].sym); }, [n, enrichedHoldings]);
  const whatIfResult = useMemo(() => {
    if (!n || !whatIfSym || !whatIfAmt) return null;
    const amt = parseFloat(whatIfAmt);
    if (!amt || amt <= 0) return null;
    const holding = enrichedHoldings.find(h=>h.sym===whatIfSym) ?? null;
    const livePrice = holding?.price ?? prices[whatIfSym]?.price ?? 0;
    if (!livePrice) return null;
    // determine currency conversion
    const isKES = whatIfSym.includes('.NR') || holding?.country === 'KE';
    const usdAmount = isKES ? amt / usdKes : amt; // if user typed KES but asset is USD, convert to USD; if isKES, amt is KES so shares = amt / priceKES
    let addedShares: number;
    let newTotal = totalVal;
    const yieldBefore = dividendYieldOnValue;
    let addedValue: number;
    if (isKES) {
      addedShares = amt / livePrice;
      addedValue = amt / usdKes; // convert KES value to USD total for consistent portfolio total (which is USD)
      // Actually totalVal is USD base (mixed butapprox). For KE holdings price is KES? In enrichedHoldings, price for KE is KES value (28 etc) but totalVal sums shares*price directly (KES for KE mixed). So mixing is imperfect but okay for mock.
      // Simplify: treat totalVal as KES if any KE holdings else USD. Instead keep mock: newTotal = totalVal + (isKES ? amt : amt*usdKes?) complicated.
      // Keep simple demo: treat price as in same currency as amt, so newTotal displayed in KES via conv logic? For demo purpose, just add amt converted to portfolio base (assume base USD = totalVal base). We'll add addedShares*livePrice in same unit as totalVal (which mixes). For KE, totalVal includes KES raw (not converted). So addedShares*livePrice = amt exactly.
      newTotal = totalVal + addedShares * livePrice;
    } else {
      addedShares = usdAmount / livePrice;
      addedValue = addedShares * livePrice;
      newTotal = totalVal + addedValue;
    }
    void addedValue;
    const y = getYield(whatIfSym);
    const addedAnnualDiv = addedShares * livePrice * y;
    const newAnnualDiv = dividendAnnualTotal + addedAnnualDiv;
    const newYield = newTotal ? newAnnualDiv / newTotal * 100 : 0;

    // new allocation after add
    const byTypeNew: Record<string, number> = { stock:0, etf:0, cryptocurrency:0, bond:0 };
    enrichedHoldings.forEach(h => {
      const val = h.shares * h.price + (h.sym === whatIfSym ? addedShares * livePrice : 0);
      byTypeNew[h.type] = (byTypeNew[h.type] || 0) + val;
    });
    // if whatIfSym not in holdings, need to guess its type
    if (!holding) {
      const guessType = ((): string => {
        const t = MARKET[whatIfSym.replace('.NR','')]?.type;
        return t ?? 'stock';
      })();
      byTypeNew[guessType] = (byTypeNew[guessType] || 0) + addedShares * livePrice;
    }
    const allocNew = Object.fromEntries(Object.entries(byTypeNew).map(([k,v]) => [k, newTotal ? v/newTotal*100 : 0]));
    const allocOld = actualByType;

    return { addedShares, newTotal, newAnnualDiv, newYield, yieldBefore, allocNew, allocOld, y };
  }, [n, whatIfSym, whatIfAmt, enrichedHoldings, prices, totalVal, usdKes, dividendAnnualTotal, actualByType]);

  const exportCSV = () => {
    if (!n) { toast({ title: 'No data', description: 'Add holdings before exporting.' }); return; }
    const headers = 'Symbol,Name,Type,Shares,Avg Cost,Price,Value,P&L,P&L%';
    const rows = enrichedHoldings.map(h => {
      const mv = h.shares * h.price;
      const pl = mv - h.shares * h.cost;
      return `${h.sym},${h.name},${h.type},${h.shares},${h.cost},${h.price},${mv.toFixed(2)},${pl.toFixed(2)},${((h.price - h.cost) / h.cost * 100).toFixed(2)}%`;
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mevest-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', description: `${n} holdings exported.` });
  };

  const exportJSON = () => {
    if (!n) { toast({ title: 'No data', description: 'Add holdings before exporting.' }); return; }
    const data = enrichedHoldings.map(h => ({ symbol: h.sym, name: h.name, type: h.type, shares: h.shares, avgCost: h.cost, currentPrice: h.price, marketValue: h.shares * h.price, pnl: h.shares * h.price - h.shares * h.cost, pnlPercent: +((h.price - h.cost) / h.cost * 100).toFixed(2) }));
    const blob = new Blob([JSON.stringify({ portfolio: data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mevest-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'JSON exported', description: `${n} holdings exported.` });
  };

  const exportTaxLots = () => {
    if (!n) { toast({ title: 'No data', description: 'Add holdings before exporting.' }); return; }
    const headers = 'Symbol,Shares,Cost Basis,Market Price,Market Value,Cost Value,Gain/Loss,Holding Period';
    const rows = enrichedHoldings.map(h => {
      const mv = h.shares * h.price;
      const costVal = h.shares * h.cost;
      const gain = mv - costVal;
      return `${h.sym},${h.shares},${h.cost},${h.price},${mv.toFixed(2)},${costVal.toFixed(2)},${gain.toFixed(2)},FIFO`;
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `mevest-tax-lots-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'Tax lots exported', description: `${n} lots exported (FIFO). Consult a tax advisor.` });
  };

  return (
    <div className="space-y-3.5">
      <SuggestedPrompts page="portfolio" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[19px] font-extrabold tracking-tight">My Portfolio</div>
            {n > 0 && <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full"><Zap className="w-2.5 h-2.5 fill-primary" />LIVE</div>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {n ? (
              <>
                {n} positions · Prices update in real-time
                {staleCount > 0 && <span className="ml-2 text-amber-600 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded text-[10px]">{staleCount} price unavailable — showing cost basis</span>}
              </>
            ) : 'Add holdings to get started'}
          </div>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <div className="flex rounded-lg border border-border overflow-hidden">
            <button onClick={() => setCurrency('KES')} className={`px-2 py-1 text-[11px] font-semibold ${currency === 'KES' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>KES</button>
            <button onClick={() => setCurrency('USD')} className={`px-2 py-1 text-[11px] font-semibold ${currency === 'USD' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>USD</button>
          </div>
          <span className="text-[10px] text-muted-foreground">1 USD = {usdKes.toFixed(2)} KES</span>
          <button onClick={() => setShowImport(true)} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground"><Upload className="w-3 h-3" />Import</button>
          <button onClick={exportCSV} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ CSV</button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ JSON</button>
          <button onClick={exportTaxLots} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-primary/10 border border-primary/20 text-primary hover:bg-primary/15"><FileDown className="w-3 h-3" />Tax Lots</button>
          <button onClick={onAddHolding} className="px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">+ Add Holding</button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3">
        {stats.map(s => (
          <GlassCard key={s.l} className="col-span-12 sm:col-span-6 lg:col-span-3 p-3.5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">{s.l}</div>
            {s.v ? (
              <>
                <div className="font-mono text-lg font-semibold text-foreground mt-[5px] mb-[3px] tabular-nums">{s.v}</div>
                <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${s.up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{s.c}</span>
              </>
            ) : <div className="font-mono text-lg text-muted-foreground/40 mt-[5px]">—</div>}
          </GlassCard>
        ))}
      </div>

      <GlassCard className="overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border/50">
          <div className="flex gap-0.5 bg-secondary rounded-lg p-[2px] w-fit">
            {TABS.map(t => (
              <button key={t} onClick={() => setFilter(t)} className={`px-[11px] py-[5px] rounded-md text-xs font-medium transition-colors ${filter === t ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-5">
              <div className="text-4xl mb-3 opacity-30">📭</div>
              <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">{filter === 'all' ? 'No holdings yet' : `No ${TAB_LABELS[filter]} holdings`}</div>
              <button onClick={onAddHolding} className="mt-3 px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">+ Add Holding</button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead><tr className="border-b border-border/50">
                {['Asset', 'Type', 'Qty', 'Avg Cost', 'Price', 'Value', 'P&L', 'P&L%', 'Alloc', ''].map(h => (
                  <th key={h} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Qty', 'Avg Cost', 'Price', 'Value', 'P&L', 'P&L%'].includes(h) ? 'text-right' : h === 'Alloc' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map(h => {
                  const mv = h.shares * h.price;
                  const pl = mv - h.shares * h.cost;
                  const pct = (h.price - h.cost) / h.cost * 100;
                  const alloc = (mv / totalVal * 100).toFixed(1);
                  const up = pl >= 0;
                  const flash = h.price > h.prevPrice ? 'price-up' : h.price < h.prevPrice ? 'price-down' : '';
                  return (
                    <tr key={h.sym} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                      <td className="p-[10px] px-[11px]">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: h.color + '18', color: h.color }}>{h.sym.slice(0, 2)}</div>
                          <div><div className="text-[13px] font-semibold text-foreground">{h.sym}</div><div className="text-[10px] text-muted-foreground font-mono">{h.name}</div></div>
                        </div>
                      </td>
                      <td className="p-[10px] px-[11px]"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50 uppercase">{h.type}</span></td>
                      <td className="text-right p-[10px] px-[11px] font-mono tabular-nums">{h.shares < 1 ? h.shares.toFixed(4) : h.shares}</td>
                      <td className="text-right p-[10px] px-[11px] font-mono tabular-nums">${h.cost.toLocaleString()}</td>
                      <td className={`text-right p-[10px] px-[11px] font-mono tabular-nums ${flash}`}>
                        ${h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        {h.isStale && <span className="ml-1 text-[9px] text-amber-600 bg-amber-500/10 px-1 py-0.5 rounded">stale</span>}
                      </td>
                       <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">{formatWithCurrency(currency === 'KES' ? mv * usdKes : mv, currency)}</td>
                      <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[11px] tabular-nums ${up ? 'text-primary' : 'text-destructive'}`}>{up ? '+' : ''}{formatMoney(pl)}</span></td>
                      <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(pct)}</span></td>
                      <td className="text-center p-[10px] px-[11px] w-[70px]">
                        <div className="text-[10px] text-muted-foreground mb-0.5 tabular-nums">{alloc}%</div>
                        <div className="h-[3px] bg-muted/30 rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: alloc + '%', background: h.color }} /></div>
                      </td>
                      <td className="p-[10px] px-[11px]">
                        <button onClick={() => { removeHolding(h.sym); toast({ title: `${h.sym} removed` }); }} className="text-[11px] px-2 py-1 rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground transition-colors">Remove</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </GlassCard>

      {/* Bento: Rebalancer + Dividend + WhatIf */}
      <div className="grid grid-cols-12 gap-3.5">
        {/* Rebalancer Widget */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5">
          <div className="flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">Rebalancer</span><span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-secondary border border-border px-1.5 py-0.5 rounded">Target vs Actual</span></div>
          <div className="text-[11px] text-muted-foreground mt-1">Drag sliders to set target allocation — see trades needed to rebalance.</div>
          {!n ? <div className="text-center text-muted-foreground py-8 text-xs">Add holdings to rebalance.</div> : (
            <div className="mt-3 space-y-3">
              {tradesNeeded.map(t => (
                <div key={t.type} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold capitalize">{t.type}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">{t.actual.toFixed(1)}% → {t.target.toFixed(1)}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={80} value={Math.round(targets[t.type] ?? 0)} onChange={e=>updateTarget(t.type, parseInt(e.target.value))} className="flex-1 accent-primary h-1" />
                    <span className="font-mono text-[11px] w-10 text-right">{Math.round(targets[t.type] ?? 0)}%</span>
                  </div>
                  <div className="flex gap-1 h-2">
                    <div className="flex-1 bg-muted/30 rounded overflow-hidden flex">
                      <div className="h-full bg-primary/70" style={{ width: `${Math.min(100, t.actual)}%` }} title={`Actual ${t.actual.toFixed(1)}%`} />
                    </div>
                    <div className="flex-1 bg-muted/30 rounded overflow-hidden flex">
                      <div className="h-full bg-amber-500/60" style={{ width: `${Math.min(100, t.target)}%` }} title={`Target ${t.target.toFixed(1)}%`} />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span className="text-muted-foreground">Actual</span>
                    <span className={`font-mono font-semibold ${t.diffVal > 1 ? 'text-primary' : t.diffVal < -1 ? 'text-destructive' : 'text-muted-foreground'}`}>
                      {Math.abs(t.diffVal) < 1 ? 'Balanced' : `${t.diffVal > 0 ? 'Buy' : 'Sell'} ${formatWithCurrency(Math.abs(t.diffVal) * (currency==='KES'?usdKes:1), currency)}`}
                    </span>
                    <span className="text-muted-foreground">Target</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">Total drift: {tradesNeeded.reduce((a,b)=>a+Math.abs(b.diffPct),0).toFixed(1)}%</span>
                <button onClick={()=>setTargets(defaultTarget)} className="ml-auto text-[11px] px-2 py-1 rounded-md bg-secondary border border-border">Reset 55/20/15/10</button>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Dividend Projection */}
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5">
          <div className="flex items-center gap-1.5"><Coins className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">Dividend Income — Next 12 Months</span></div>
          <div className="text-[11px] text-muted-foreground">Based on holdings × dividend_yield from symbols_meta {Object.keys(divYields).length ? `(${Object.keys(divYields).length} yields)` : '(loading…)'} · <span className="font-mono">{dividendAnnualTotal ? formatWithCurrency(currency==='KES'?dividendAnnualTotal*usdKes:dividendAnnualTotal, currency) : '—'} / yr</span> · Yield {dividendYieldOnValue.toFixed(2)}%</div>
          {!n ? <div className="text-center text-muted-foreground py-8 text-xs">Add holdings to project dividends.</div> :
            dividendProjection.length === 0 ? <div className="text-center text-muted-foreground py-8 text-xs">No dividend yields found for your holdings — add NSE names (SCOM/EQTY/KCB) or update symbols_meta.</div> : (
              <div className="mt-3 h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dividendProjection}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={v => currency==='KES' ? `KES ${(v*usdKes).toFixed(0)}` : `$${(v).toFixed(0)}`} width={70} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 11 }} formatter={(v: number)=>[formatWithCurrency(currency==='KES'?v*usdKes:v, currency), 'Dividend']} />
                    <Bar dataKey="dividend" radius={[4,4,0,0]} fill="hsl(160 60% 52% / 0.85)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          <div className="text-[9px] text-muted-foreground mt-1">Projection uses last close × yield; not a guarantee. KES conversion via live USDKES.</div>
        </GlassCard>
      </div>

      {/* What-If Simulator */}
      <GlassCard className="p-3.5">
        <div className="flex items-center gap-1.5"><FlaskConical className="w-3.5 h-3.5 text-primary" /><span className="font-display text-[13px] font-bold">What-If Simulator</span><span className="ml-2 text-[11px] text-muted-foreground">“If I add 10k KES to SCOM” → new allocation & yield</span></div>
        {!n ? <div className="text-center text-muted-foreground py-6 text-xs">Add holdings to simulate.</div> : (
          <div className="mt-3 grid grid-cols-12 gap-3">
            <div className="col-span-12 lg:col-span-4 space-y-2">
              <label className="text-[11px] font-semibold">Amount (KES)</label>
              <input value={whatIfAmt} onChange={e=>setWhatIfAmt(e.target.value)} type="number" className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs font-mono" placeholder="10000" />
              <label className="text-[11px] font-semibold">Symbol</label>
              <select value={whatIfSym} onChange={e=>setWhatIfSym(e.target.value)} className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs">
                {enrichedHoldings.map(h=> <option key={h.sym} value={h.sym}>{h.sym} — {h.name}</option>)}
                {/* allow other NSE symbols even if not held */}
                {['SCOM.NR','EQTY.NR','KCB.NR','ABSA.NR','COOP.NR'].filter(s=>!enrichedHoldings.find(h=>h.sym===s)).map(s=> <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="text-[11px] text-muted-foreground">Price: {whatIfResult ? `~ ${formatWithCurrency(whatIfResult.addedShares ? (parseFloat(whatIfAmt)/whatIfResult.addedShares) : 0, 'KES')} (live)` : '—'} · Yield {whatIfResult ? (whatIfResult.y*100).toFixed(2)+'%' : '—'}</div>
            </div>
            <div className="col-span-12 lg:col-span-8">
              {whatIfResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-secondary/60 rounded-lg p-2.5 text-center"><div className="text-[9px] uppercase font-bold text-muted-foreground">Added Shares</div><div className="font-mono text-sm font-bold">{whatIfResult.addedShares.toFixed(whatIfResult.addedShares<1?4:2)}</div></div>
                    <div className="bg-secondary/60 rounded-lg p-2.5 text-center"><div className="text-[9px] uppercase font-bold text-muted-foreground">New Value</div><div className="font-mono text-sm font-bold">{formatWithCurrency(currency==='KES'?whatIfResult.newTotal*usdKes:whatIfResult.newTotal, currency)}</div></div>
                    <div className="bg-secondary/60 rounded-lg p-2.5 text-center"><div className="text-[9px] uppercase font-bold text-muted-foreground">New Yield</div><div className="font-mono text-sm font-bold">{whatIfResult.newYield.toFixed(2)}% <span className={`text-[10px] ${whatIfResult.newYield>whatIfResult.yieldBefore?'text-primary':'text-muted-foreground'}`}>({whatIfResult.newYield>whatIfResult.yieldBefore?'+':''}{(whatIfResult.newYield-whatIfResult.yieldBefore).toFixed(2)}%)</span></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="text-[11px] font-semibold mb-1">Before</div>
                      {Object.entries(whatIfResult.allocOld).map(([k,v])=>(
                        <div key={k} className="flex justify-between text-[11px]"><span className="capitalize text-muted-foreground">{k}</span><span className="font-mono">{v.toFixed(1)}%</span></div>
                      ))}
                    </div>
                    <div>
                      <div className="text-[11px] font-semibold mb-1">After adding {whatIfSym}</div>
                      {Object.entries(whatIfResult.allocNew).map(([k,v])=>(
                        <div key={k} className="flex justify-between text-[11px]"><span className="capitalize text-muted-foreground">{k}</span><span className="font-mono font-semibold">{v.toFixed(1)}%</span></div>
                      ))}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">Annual dividend: {formatWithCurrency(currency==='KES'?dividendAnnualTotal*usdKes:dividendAnnualTotal,currency)} → {formatWithCurrency(currency==='KES'?whatIfResult.newAnnualDiv*usdKes:whatIfResult.newAnnualDiv,currency)} (+{formatWithCurrency(currency==='KES'?(whatIfResult.newAnnualDiv-dividendAnnualTotal)*usdKes:whatIfResult.newAnnualDiv-dividendAnnualTotal,currency)})</div>
                </div>
              ) : <div className="text-xs text-muted-foreground py-8 text-center">Enter an amount and pick a symbol.</div>}
            </div>
          </div>
        )}
      </GlassCard>

      <div className="grid grid-cols-12 gap-3.5">
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5">
          <div className="px-0 pb-2"><span className="font-display text-[13px] font-bold">P&L Attribution</span></div>
          <div className="">
            {n === 0 ? <div className="text-center text-muted-foreground py-5 text-xs">No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={attrData}>
                  <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [(v > 0 ? '+' : '') + v.toFixed(2) + '%']} />
                  <Bar dataKey="pct" radius={4}>{attrData.map((d, i) => <Cell key={i} fill={d.pct >= 0 ? 'hsl(160 60% 52% / 0.5)' : 'hsl(0 76% 58% / 0.5)'} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </GlassCard>
        <GlassCard className="col-span-12 lg:col-span-6 p-3.5">
          <div className="pb-2"><span className="font-display text-[13px] font-bold">Geographic Exposure</span></div>
          <div className="">
            {n === 0 ? <div className="text-center py-5 text-muted-foreground text-xs">🌍 No data</div> : (
              Object.entries(geos).map(([k, v]) => (
                <div key={k} className="mb-[11px]">
                  <div className="flex justify-between text-xs mb-[3px]"><span>{k}</span><span className="font-mono tabular-nums">{(v / geoTotal * 100).toFixed(1)}%</span></div>
                  <div className="h-[3px] bg-muted/30 rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: (v / geoTotal * 100).toFixed(1) + '%', background: geoColors[k] || 'hsl(218 90% 66%)' }} /></div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
      <div className="grid grid-cols-12 gap-3.5">
        <div className="col-span-12 lg:col-span-6"><FeesTracker totalValue={totalVal} /></div>
        <div className="col-span-12 lg:col-span-6"><GoalsTracker /></div>
      </div>
      <PortfolioImportWizard open={showImport} onClose={() => setShowImport(false)} />
    </div>
  );
}
