import { useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatMoney, formatPct } from '@/data/market-data';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Zap } from 'lucide-react';

const TABS = ['all', 'stock', 'cryptocurrency', 'etf', 'bond'];
const TAB_LABELS: Record<string, string> = { all: 'All', stock: 'Stocks', cryptocurrency: 'Crypto', etf: 'ETFs', bond: 'Bonds' };

export default function PortfolioPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings, removeHolding } = usePortfolio();
  const { prices } = useRealtimeMarket();
  const [filter, setFilter] = useState('all');

  // Enrich with live prices — track stale vs live
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

  // Today's P&L from live prices: sum(shares * change)
  const dayChg = enrichedHoldings.reduce((s, h) => {
    const p = prices[h.sym];
    return s + (p ? p.chg * h.shares : 0);
  }, 0);
  const dayPct = totalVal > 0 ? (dayChg / totalVal) * 100 : 0;

  const stats = [
    { l: 'Portfolio Value', v: n ? formatMoney(totalVal) : null, c: n ? formatPct(dayPct) : null, up: dayPct >= 0 },
    { l: 'Total Invested', v: n ? formatMoney(totalCost) : null, c: 'Cost basis', up: true },
    { l: 'Total P&L', v: n ? formatMoney(totalPL) : null, c: n ? formatPct(totalPL / totalCost * 100) : null, up: totalPL >= 0 },
    { l: "Today's P&L", v: n ? formatMoney(dayChg) : null, c: n ? formatPct(dayPct) : null, up: dayChg >= 0 },
  ];

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

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
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
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ CSV</button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ JSON</button>
          <button onClick={onAddHolding} className="px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">+ Add Holding</button>
        </div>
      </div>

      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3">
        {stats.map(s => (
          <div key={s.l} className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">{s.l}</div>
            {s.v ? (
              <>
                <div className="font-mono text-lg font-semibold text-foreground mt-[5px] mb-[3px] tabular-nums">{s.v}</div>
                <span className={`font-mono text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${s.up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{s.c}</span>
              </>
            ) : <div className="font-mono text-lg text-muted-foreground/40 mt-[5px]">—</div>}
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border">
          <div className="flex gap-0.5 bg-secondary rounded-lg p-[2px]">
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
              <thead><tr className="border-b border-border">
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
                      <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">{formatMoney(mv)}</td>
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
      </div>

      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">P&L Attribution</span></div>
          <div className="p-3.5">
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
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Geographic Exposure</span></div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center py-5 text-muted-foreground text-xs">🌍 No data</div> : (
              Object.entries(geos).map(([k, v]) => (
                <div key={k} className="mb-[11px]">
                  <div className="flex justify-between text-xs mb-[3px]"><span>{k}</span><span className="font-mono tabular-nums">{(v / geoTotal * 100).toFixed(1)}%</span></div>
                  <div className="h-[3px] bg-muted/30 rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: (v / geoTotal * 100).toFixed(1) + '%', background: geoColors[k] || 'hsl(218 90% 66%)' }} /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
