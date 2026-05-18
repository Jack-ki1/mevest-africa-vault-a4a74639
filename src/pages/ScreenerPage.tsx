import { useState, useMemo, useEffect } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatPct } from '@/data/market-data';
import { useWatchlist } from '@/context/WatchlistContext';
import { toast } from '@/hooks/use-toast';
import { Star, Globe, Loader2, X } from 'lucide-react';

interface ScreenerPageProps {
  onNavigate?: (page: string, sym?: string) => void;
}

interface DisplayAsset {
  sym: string;
  name: string;
  price: number;
  chgPct: number;
  type: string;
  exchange: string;
  country: string;
  sector: string;
  currency: string;
  isLive?: boolean;
}

type Filters = { type: string; exchange: string; perf: string; sector: string };

const PERF_CHIPS = [
  { val: 'all', label: 'All' },
  { val: 'gainers', label: '📈 Gainers' },
  { val: 'losers', label: '📉 Losers' },
  { val: 'most_active', label: '🔥 Active' },
];

function FreeTextFilter({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="relative flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-secondary border border-border focus-within:border-primary/40 transition-colors min-w-[150px]">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex-shrink-0">{label}:</span>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-transparent border-none outline-none text-[11px] text-foreground placeholder:text-muted-foreground/60 w-full min-w-0"
      />
      {value && (
        <button onClick={() => onChange('')} className="flex-shrink-0" aria-label={`Clear ${label}`}>
          <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
        </button>
      )}
    </div>
  );
}
export default function ScreenerPage({ onNavigate }: ScreenerPageProps) {
  const { allAssets, searchAssetsLive, getQuotesLive } = useRealtimeMarket();
  const [filters, setFilters] = useState<Filters>({ type: 'all', exchange: 'all', perf: 'all', sector: 'all' });
  const [sort, setSort] = useState('mktcap');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<DisplayAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();

  // Debounced live search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setLiveResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAssetsLive(searchQuery);
        if (results.length > 0) {
          const symbols = results.map(r => r.symbol).slice(0, 30);
          const quotes = await getQuotesLive(symbols);
          const displayResults: DisplayAsset[] = results.slice(0, 30).map(r => {
            const q = quotes[r.symbol];
            return {
              sym: r.symbol, name: r.name, price: q?.price ?? 0, chgPct: q?.changePercent ?? 0,
              type: r.type?.toLowerCase() || 'stock', exchange: r.exchange || '',
              country: '', sector: r.sector || r.industry || '', currency: q?.currency || 'USD', isLive: !!q,
            };
          });
          setLiveResults(displayResults);
        } else {
          setLiveResults([]);
        }
      } catch { setLiveResults([]); }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAssetsLive, getQuotesLive]);

  const data = useMemo(() => {
    let items: DisplayAsset[];

    if (searchQuery && searchQuery.length >= 2) {
      const localSyms = new Set<string>();
      const local = allAssets.filter(a => a.sym.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => {
        localSyms.add(a.sym);
        return { sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency };
      });
      const live = liveResults.filter(l => !localSyms.has(l.sym));
      items = [...local, ...live];
    } else {
      items = allAssets.map(a => ({ sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency }));
    }

    if (filters.type !== 'all') items = items.filter(a => a.type === filters.type);
    if (filters.exchange !== 'all') items = items.filter(a => a.exchange.toUpperCase().includes(filters.exchange));
    if (filters.sector !== 'all') items = items.filter(a => a.sector.toLowerCase().includes(filters.sector.toLowerCase()));
    if (filters.perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct);
    else if (filters.perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct);

    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);

    return items;
  }, [filters, sort, allAssets, searchQuery, liveResults]);

  const handleToggleWatchlist = (sym: string) => {
    if (isInWatchlist(sym)) { removeFromWatchlist(sym); toast({ title: `${sym} removed from watchlist` }); }
    else { addToWatchlist(sym); toast({ title: `${sym} added to watchlist` }); }
  };

  const visibleData = data.slice(0, visibleCount);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">Market Screener</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {data.length} assets found · Search any stock, ETF, crypto globally
            {isSearching && <span className="ml-2 text-primary">⟳ Searching...</span>}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative">
        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisibleCount(30); }}
          placeholder="🔍 Search globally — Samsung, Toyota, Alibaba, Bitcoin, Safaricom, any ticker..."
          className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all placeholder:text-muted-foreground/60" />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>

      {/* Filter dropdowns */}
      <div className="flex flex-wrap gap-2 items-center">
        <FilterDropdown label="Type" value={filters.type} options={ASSET_TYPES} onChange={v => setFilters(f => ({ ...f, type: v }))} />
        <FilterDropdown label="Exchange" value={filters.exchange} options={EXCHANGES} onChange={v => setFilters(f => ({ ...f, exchange: v }))} />
        <FilterDropdown label="Performance" value={filters.perf} options={PERFORMANCE} onChange={v => setFilters(f => ({ ...f, perf: v }))} />
        <FilterDropdown label="Sector" value={filters.sector} options={SECTORS} onChange={v => setFilters(f => ({ ...f, sector: v }))} />

        <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto px-3 py-2 rounded-lg text-[11px] bg-secondary border border-border text-foreground outline-none">
          <option value="mktcap">Sort: Default</option>
          <option value="chg_desc">% Change ↓</option>
          <option value="chg_asc">% Change ↑</option>
          <option value="price_desc">Price ↓</option>
          <option value="price_asc">Price ↑</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>

      {/* Results table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">
              {['', '#', 'Asset', 'Type', 'Price', '24h %', 'Exchange', 'Sector'].map(h => (
                <th key={h || 'star'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {visibleData.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {isSearching ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching global markets...</span> : 'No results found. Try a different search term or adjust filters.'}
                </td></tr>
              )}
              {visibleData.map((a, i) => (
                <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => onNavigate?.('markets', a.sym)}>
                  <td className="p-[10px] px-[11px]" onClick={e => { e.stopPropagation(); handleToggleWatchlist(a.sym); }}>
                    <Star className={`w-3.5 h-3.5 cursor-pointer transition-colors ${isInWatchlist(a.sym) ? 'fill-primary text-primary' : 'text-muted-foreground/40 hover:text-foreground'}`} />
                  </td>
                  <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="p-[10px] px-[11px]">
                    <div className="flex items-center gap-1">
                      <div className="font-bold text-[13px]">{a.sym}</div>
                      {a.isLive && <Globe className="w-2.5 h-2.5 text-primary" />}
                    </div>
                    <div className="text-[10px] text-muted-foreground max-w-[200px] truncate">{a.name}</div>
                  </td>
                  <td className="p-[10px] px-[11px]"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50 uppercase">{a.type}</span></td>
                  <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">
                    {a.price > 0 ? `${a.currency !== 'USD' ? '' : '$'}${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                  </td>
                  <td className="text-right p-[10px] px-[11px]">
                    {a.price > 0 ? (
                      <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                        {formatPct(a.chgPct)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="p-[10px] px-[11px] text-[10px] text-muted-foreground">{a.exchange}</td>
                  <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground border border-border/50">{a.sector || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Load more */}
        {visibleCount < data.length && (
          <div className="p-3 border-t border-border text-center">
            <button onClick={() => setVisibleCount(v => v + 30)}
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border text-foreground hover:bg-muted transition-colors">
              Load {Math.min(30, data.length - visibleCount)} more · {data.length - visibleCount} remaining
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
