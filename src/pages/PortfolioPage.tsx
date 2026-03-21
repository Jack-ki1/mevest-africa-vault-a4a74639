import { useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatMoney, formatPct } from '@/data/market-data';
import { toast } from '@/hooks/use-toast';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const TABS = ['all', 'stock', 'cryptocurrency', 'etf', 'bond'];
const TAB_LABELS: Record<string, string> = { all: 'All', stock: 'Stocks', cryptocurrency: 'Crypto', etf: 'ETFs', bond: 'Bonds' };

export default function PortfolioPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings, removeHolding } = usePortfolio();
  const [filter, setFilter] = useState('all');
  const n = holdings.length;
  const totalVal = n ? holdings.reduce((s, h) => s + h.shares * h.price, 0) : 0;
  const totalCost = n ? holdings.reduce((s, h) => s + h.shares * h.cost, 0) : 0;
  const totalPL = totalVal - totalCost;

  const filtered = filter === 'all' ? holdings : holdings.filter(h => h.type === filter);

  const attrData = holdings.map(h => ({
    name: h.sym,
    pct: +((h.price - h.cost) / h.cost * 100).toFixed(2),
  }));

  const geos: Record<string, number> = {};
  holdings.forEach(h => { geos[h.country] = (geos[h.country] || 0) + h.shares * h.price; });
  const geoTotal = Object.values(geos).reduce((a, b) => a + b, 0);
  const geoColors: Record<string, string> = { US: '#5b9cf6', Global: '#f7931a', KE: '#63d2aa', UK: '#a78bfa', EU: '#f5a623' };

  const stats = [
    { l: 'Portfolio Value', v: n ? formatMoney(totalVal) : null, c: '+0.65%', up: true },
    { l: 'Total Invested', v: n ? formatMoney(totalCost) : null, c: 'Cost basis', up: true },
    { l: 'Total P&L', v: n ? formatMoney(totalPL) : null, c: n ? formatPct(totalPL / totalCost * 100) : null, up: totalPL >= 0 },
    { l: "Today's P&L", v: n ? formatMoney(totalVal * 0.0065) : null, c: '+0.65%', up: true },
  ];

  const exportCSV = () => {
    if (!n) { toast({ title: 'No data', description: 'Add holdings before exporting.' }); return; }
    const headers = 'Symbol,Name,Type,Shares,Avg Cost,Price,Value,P&L,P&L%';
    const rows = holdings.map(h => {
      const mv = h.shares * h.price;
      const pl = mv - h.shares * h.cost;
      const pct = ((h.price - h.cost) / h.cost * 100).toFixed(2);
      return `${h.sym},${h.name},${h.type},${h.shares},${h.cost},${h.price},${mv.toFixed(2)},${pl.toFixed(2)},${pct}%`;
    });
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mevest-portfolio-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'CSV exported', description: `${n} holdings exported successfully.` });
  };

  const exportJSON = () => {
    if (!n) { toast({ title: 'No data', description: 'Add holdings before exporting.' }); return; }
    const data = holdings.map(h => ({
      symbol: h.sym, name: h.name, type: h.type, shares: h.shares,
      avgCost: h.cost, currentPrice: h.price, marketValue: h.shares * h.price,
      pnl: h.shares * h.price - h.shares * h.cost,
      pnlPercent: +((h.price - h.cost) / h.cost * 100).toFixed(2),
    }));
    const blob = new Blob([JSON.stringify({ portfolio: data, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `mevest-portfolio-${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    toast({ title: 'JSON exported', description: `${n} holdings exported successfully.` });
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">My Portfolio</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {n ? `${n} positions across ${[...new Set(holdings.map(h => h.type))].length} asset classes` : 'Add holdings to get started'}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ CSV</button>
          <button onClick={exportJSON} className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-secondary border border-border text-muted-foreground hover:text-foreground">⬇ JSON</button>
          <button onClick={onAddHolding} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">+ Add Holding</button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
        {stats.map(s => (
          <div key={s.l} className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{s.l}</div>
            {s.v ? (
              <>
                <div className="font-mono text-lg font-medium text-foreground mt-[5px] mb-[3px]">{s.v}</div>
                <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded ${s.up ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>{s.c}</span>
              </>
            ) : (
              <div className="font-mono text-lg text-muted-foreground mt-[5px]">—</div>
            )}
          </div>
        ))}
      </div>

      {/* Holdings Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border">
          <div className="flex gap-0.5 bg-secondary rounded-lg p-[3px]">
            {TABS.map(t => (
              <button key={t} onClick={() => setFilter(t)} className={`px-[11px] py-[5px] rounded-md text-xs font-medium ${filter === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="text-center py-10 px-5">
              <div className="text-4xl mb-3 opacity-40">📭</div>
              <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">
                {filter === 'all' ? 'No holdings yet' : `No ${TAB_LABELS[filter]} holdings`}
              </div>
              <button onClick={onAddHolding} className="mt-3 px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">+ Add Holding</button>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  {['Asset', 'Type', 'Qty', 'Avg Cost', 'Price', 'Value', 'P&L', 'P&L%', 'Alloc', ''].map(h => (
                    <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['Qty', 'Avg Cost', 'Price', 'Value', 'P&L', 'P&L%'].includes(h) ? 'text-right' : h === 'Alloc' ? 'text-center' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(h => {
                  const mv = h.shares * h.price;
                  const pl = mv - h.shares * h.cost;
                  const pct = (h.price - h.cost) / h.cost * 100;
                  const alloc = (mv / totalVal * 100).toFixed(1);
                  const up = pl >= 0;
                  return (
                    <tr key={h.sym} className="border-b border-border/50 hover:bg-glass">
                      <td className="p-[10px] px-[11px]">
                        <div className="flex items-center gap-[9px]">
                          <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: h.color + '22', color: h.color }}>{h.sym.slice(0, 2)}</div>
                          <div><div className="text-[13px] font-semibold text-foreground">{h.sym}</div><div className="text-[10px] text-muted-foreground font-mono">{h.name}</div></div>
                        </div>
                      </td>
                      <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-glass text-muted-foreground border border-border">{h.type.toUpperCase()}</span></td>
                      <td className="text-right p-[10px] px-[11px] font-mono">{h.shares < 1 ? h.shares.toFixed(4) : h.shares}</td>
                      <td className="text-right p-[10px] px-[11px] font-mono">${h.cost.toLocaleString()}</td>
                      <td className="text-right p-[10px] px-[11px] font-mono">${h.price.toLocaleString()}</td>
                      <td className="text-right p-[10px] px-[11px] font-mono font-semibold">{formatMoney(mv)}</td>
                      <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[11px] ${up ? 'text-primary' : 'text-destructive'}`}>{up ? '+' : ''}{formatMoney(pl)}</span></td>
                      <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${up ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>{formatPct(pct)}</span></td>
                      <td className="text-center p-[10px] px-[11px] w-[70px]">
                        <div className="text-[10px] text-muted-foreground mb-0.5">{alloc}%</div>
                        <div className="h-[3px] bg-border rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: alloc + '%', background: h.color }} /></div>
                      </td>
                      <td className="p-[10px] px-[11px]">
                        <button onClick={() => { removeHolding(h.sym); toast({ title: `${h.sym} removed`, description: 'Holding removed from portfolio.' }); }} className="text-[11px] px-2 py-1 rounded-md bg-secondary border border-border text-muted-foreground hover:text-foreground">
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">P&L Attribution</span></div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center text-muted-foreground py-5 text-xs">No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={attrData}>
                  <XAxis dataKey="name" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
                  <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [(v > 0 ? '+' : '') + v.toFixed(2) + '%']} />
                  <Bar dataKey="pct" radius={4}>
                    {attrData.map((d, i) => <rect key={i} fill={d.pct >= 0 ? 'rgba(99,210,170,0.65)' : 'rgba(240,97,107,0.65)'} />)}
                  </Bar>
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
                  <div className="flex justify-between text-xs mb-[3px]"><span>{k}</span><span className="font-mono">{(v / geoTotal * 100).toFixed(1)}%</span></div>
                  <div className="h-[3px] bg-border rounded-sm overflow-hidden"><div className="h-full rounded-sm" style={{ width: (v / geoTotal * 100).toFixed(1) + '%', background: geoColors[k] || '#5b9cf6' }} /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
