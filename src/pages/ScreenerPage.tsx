import { useState, useMemo } from 'react';
import { MARKET, formatPct } from '@/data/market-data';

type ScFilters = { type: string; cap: string; signal: string; perf: string };

export default function ScreenerPage() {
  const [filters, setFilters] = useState<ScFilters>({ type: 'all', cap: 'all', signal: 'all', perf: 'all' });
  const [sort, setSort] = useState('mktcap');

  const data = useMemo(() => {
    let items = Object.entries(MARKET).map(([sym, a]) => ({ sym, ...a }));
    if (filters.type !== 'all') items = items.filter(a => a.type === filters.type);
    if (filters.cap !== 'all') {
      const capMap: Record<string, string[]> = { mega: ['mega'], large: ['mega', 'large'], mid: ['mega', 'large', 'mid'], small: ['small'] };
      items = items.filter(a => (capMap[filters.cap] || []).includes(a.cap));
    }
    if (filters.signal !== 'all') items = items.filter(a => a.signal === filters.signal);
    if (filters.perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct).slice(0, 5);
    else if (filters.perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct).slice(0, 5);

    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    return items;
  }, [filters, sort]);

  const setFilter = (group: keyof ScFilters, val: string) => setFilters(prev => ({ ...prev, [group]: val }));

  const filterRow = (label: string, group: keyof ScFilters, options: { val: string; label: string }[]) => (
    <div className="flex gap-2 flex-wrap items-center mb-2.5">
      <span className="text-[10px] text-muted-foreground font-semibold">{label}:</span>
      {options.map(o => (
        <button key={o.val} onClick={() => setFilter(group, o.val)}
          className={`px-[11px] py-[5px] rounded-md text-xs border transition-colors ${filters[group] === o.val ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  const sigClasses: Record<string, string> = {
    bullish: 'bg-accent-dim text-primary', bearish: 'bg-destructive-dim text-destructive',
    overbought: 'bg-amber-dim text-amber', oversold: 'bg-chart-blue/10 text-chart-blue', neutral: 'bg-glass text-muted-foreground',
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Market Screener</div>
        <div className="text-xs text-muted-foreground">{data.length} assets matching filters</div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3.5">
        {filterRow('ASSET TYPE', 'type', [{ val: 'all', label: 'All' }, { val: 'stock', label: 'Stocks' }, { val: 'crypto', label: 'Crypto' }, { val: 'etf', label: 'ETFs' }, { val: 'bond', label: 'Bonds' }])}
        {filterRow('MARKET CAP', 'cap', [{ val: 'all', label: 'All' }, { val: 'mega', label: 'Mega (>$200B)' }, { val: 'large', label: 'Large (>$10B)' }, { val: 'mid', label: 'Mid (>$2B)' }, { val: 'small', label: 'Small' }])}
        {filterRow('SIGNAL', 'signal', [{ val: 'all', label: 'All' }, { val: 'bullish', label: 'Bullish' }, { val: 'bearish', label: 'Bearish' }, { val: 'overbought', label: 'RSI Overbought' }, { val: 'oversold', label: 'RSI Oversold' }, { val: 'neutral', label: 'Neutral' }])}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-[10px] text-muted-foreground font-semibold">PERFORMANCE:</span>
          {[{ val: 'all', label: 'All' }, { val: 'gainers', label: 'Top Gainers' }, { val: 'losers', label: 'Top Losers' }].map(o => (
            <button key={o.val} onClick={() => setFilter('perf', o.val)}
              className={`px-[11px] py-[5px] rounded-md text-xs border ${filters.perf === o.val ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
              {o.label}
            </button>
          ))}
          <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto px-[9px] py-[5px] rounded-md text-xs bg-card border border-border text-foreground outline-none">
            <option value="mktcap">Sort: Mkt Cap ↓</option>
            <option value="chg_desc">Sort: % Change ↓</option>
            <option value="chg_asc">Sort: % Change ↑</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border">
                {['#', 'Asset', 'Type', 'Price', '24h %', 'Mkt Cap', 'Volume', 'RSI', 'P/E', 'Sector', 'Signal'].map(h => (
                  <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %', 'Mkt Cap', 'Volume', 'RSI', 'P/E'].includes(h) ? 'text-right' : h === 'Signal' ? 'text-center' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((a, i) => (
                <tr key={a.sym} className="border-b border-border/50 hover:bg-glass">
                  <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{i + 1}</td>
                  <td className="p-[10px] px-[11px]">
                    <div className="font-bold text-[13px]">{a.sym}</div>
                    <div className="text-[10px] text-muted-foreground">{a.name}</div>
                  </td>
                  <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-glass text-muted-foreground border border-border">{a.type.toUpperCase()}</span></td>
                  <td className="text-right p-[10px] px-[11px] font-mono font-semibold">${typeof a.price === 'number' ? a.price.toLocaleString() : a.price}</td>
                  <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${a.chgPct >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>{formatPct(a.chgPct)}</span></td>
                  <td className="text-right p-[10px] px-[11px] font-mono">{a.mktcap}</td>
                  <td className="text-right p-[10px] px-[11px] font-mono">{a.vol}</td>
                  <td className="text-right p-[10px] px-[11px] font-mono">{a.rsi}</td>
                  <td className="text-right p-[10px] px-[11px] font-mono">{a.pe}</td>
                  <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-sm bg-glass text-muted-foreground border border-border">{a.sector}</span></td>
                  <td className="text-center p-[10px] px-[11px]"><span className={`text-[10px] font-bold font-mono px-[7px] py-0.5 rounded-sm ${sigClasses[a.signal] || 'bg-glass text-muted-foreground'}`}>{a.signal.toUpperCase()}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
