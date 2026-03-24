import { useState, useMemo } from 'react';
import { useRealtimeMarket, UniversalAsset } from '@/context/RealtimeMarketContext';
import { formatPct } from '@/data/market-data';
import { useWatchlist } from '@/context/WatchlistContext';
import { toast } from '@/hooks/use-toast';
import { Star, Search } from 'lucide-react';

type ScFilters = { type: string; cap: string; signal: string; perf: string; country: string };

interface ScreenerPageProps {
  onNavigate?: (page: string, sym?: string) => void;
}

export default function ScreenerPage({ onNavigate }: ScreenerPageProps) {
  const { allAssets, searchAssets } = useRealtimeMarket();
  const [filters, setFilters] = useState<ScFilters>({ type: 'all', cap: 'all', signal: 'all', perf: 'all', country: 'all' });
  const [sort, setSort] = useState('mktcap');
  const [searchQuery, setSearchQuery] = useState('');
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  const data = useMemo(() => {
    let items = searchQuery ? searchAssets(searchQuery) : [...allAssets];
    if (filters.type !== 'all') items = items.filter(a => a.type === filters.type);
    if (filters.country !== 'all') items = items.filter(a => a.country === filters.country);
    if (filters.perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct).slice(0, 10);
    else if (filters.perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct).slice(0, 10);
    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [filters, sort, allAssets, searchQuery, searchAssets]);

  const setFilter = (group: keyof ScFilters, val: string) => setFilters(prev => ({ ...prev, [group]: val }));

  const handleToggleWatchlist = (sym: string) => {
    if (isInWatchlist(sym)) { removeFromWatchlist(sym); toast({ title: `${sym} removed`, description: 'Removed from watchlist.' }); }
    else { addToWatchlist(sym); toast({ title: `${sym} added`, description: 'Added to watchlist.' }); }
  };

  const filterRow = (label: string, group: keyof ScFilters, options: { val: string; label: string }[]) => (
    <div className="flex gap-1.5 flex-wrap items-center mb-2">
      <span className="text-[9px] text-muted-foreground font-bold tracking-wider">{label}:</span>
      {options.map(o => (
        <button key={o.val} onClick={() => setFilter(group, o.val)}
          className={`px-[10px] py-[4px] rounded-md text-[11px] border transition-colors ${filters[group] === o.val ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">Market Screener</div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.length} assets · Search any stock, crypto, ETF, forex or commodity</div>
        </div>
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search any investment... AAPL, Bitcoin, Gold, EUR/USD, Safaricom..."
          className="bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
        />
        {searchQuery && <button onClick={() => setSearchQuery('')} className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded bg-secondary">Clear</button>}
      </div>

      <div className="bg-card border border-border rounded-xl p-3.5">
        {filterRow('TYPE', 'type', [{ val: 'all', label: 'All' }, { val: 'stock', label: 'Stocks' }, { val: 'crypto', label: 'Crypto' }, { val: 'etf', label: 'ETFs' }, { val: 'bond', label: 'Bonds' }, { val: 'commodity', label: 'Commodities' }, { val: 'forex', label: 'Forex' }])}
        {filterRow('COUNTRY', 'country', [{ val: 'all', label: 'All' }, { val: 'US', label: '🇺🇸 US' }, { val: 'KE', label: '🇰🇪 Kenya' }, { val: 'GLOBAL', label: '🌐 Global' }, { val: 'EU', label: '🇪🇺 Europe' }, { val: 'GB', label: '🇬🇧 UK' }, { val: 'ZA', label: '🇿🇦 SA' }, { val: 'NG', label: '🇳🇬 Nigeria' }])}
        <div className="flex gap-1.5 flex-wrap items-center">
          <span className="text-[9px] text-muted-foreground font-bold tracking-wider">PERFORMANCE:</span>
          {[{ val: 'all', label: 'All' }, { val: 'gainers', label: 'Top Gainers' }, { val: 'losers', label: 'Top Losers' }].map(o => (
            <button key={o.val} onClick={() => setFilter('perf', o.val)}
              className={`px-[10px] py-[4px] rounded-md text-[11px] border transition-colors ${filters.perf === o.val ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}>
              {o.label}
            </button>
          ))}
          <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto px-[9px] py-[5px] rounded-md text-xs bg-secondary border border-border text-foreground outline-none">
            <option value="mktcap">Sort: Default</option>
            <option value="chg_desc">Sort: % Change ↓</option>
            <option value="chg_asc">Sort: % Change ↑</option>
            <option value="name">Sort: Name A-Z</option>
          </select>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              {['', '#', 'Asset', 'Type', 'Price', '24h %', 'Exchange', 'Country', 'Sector'].map(h => (
                <th key={h || 'star'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.map((a, i) => {
                const flash = 'prices' in a ? '' : '';
                return (
                  <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => onNavigate?.('charts', a.sym)}>
                    <td className="p-[10px] px-[11px]" onClick={e => { e.stopPropagation(); handleToggleWatchlist(a.sym); }}>
                      <Star className={`w-3.5 h-3.5 cursor-pointer transition-colors ${isInWatchlist(a.sym) ? 'fill-primary text-primary' : 'text-muted-foreground/40 hover:text-foreground'}`} />
                    </td>
                    <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="p-[10px] px-[11px]">
                      <div className="font-bold text-[13px]">{a.sym}</div>
                      <div className="text-[10px] text-muted-foreground">{a.name}</div>
                    </td>
                    <td className="p-[10px] px-[11px]"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50 uppercase">{a.type}</span></td>
                    <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">{a.currency !== 'USD' ? '' : '$'}{typeof a.price === 'number' ? a.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : a.price}</td>
                    <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(a.chgPct)}</span></td>
                    <td className="p-[10px] px-[11px] text-[10px] text-muted-foreground">{a.exchange}</td>
                    <td className="p-[10px] px-[11px] text-[10px] text-muted-foreground">{a.country}</td>
                    <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50">{a.sector}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
