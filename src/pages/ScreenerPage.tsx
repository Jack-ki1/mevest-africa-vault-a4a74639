import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRealtimeMarket, UniversalAsset } from '@/context/RealtimeMarketContext';
import { formatPct } from '@/data/market-data';
import { useWatchlist } from '@/context/WatchlistContext';
import { toast } from '@/hooks/use-toast';
import { Star, Search, Globe, Loader2 } from 'lucide-react';
import LiveSearchInput from '@/components/LiveSearchInput';
import { SearchResult, QuoteData } from '@/lib/api/market';

type ScFilters = { type: string; cap: string; signal: string; perf: string; country: string };

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

export default function ScreenerPage({ onNavigate }: ScreenerPageProps) {
  const { allAssets, searchAssets, searchAssetsLive, getQuotesLive } = useRealtimeMarket();
  const [filters, setFilters] = useState<ScFilters>({ type: 'all', cap: 'all', signal: 'all', perf: 'all', country: 'all' });
  const [sort, setSort] = useState('mktcap');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<DisplayAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
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
          // Get quotes for the found symbols
          const symbols = results.map(r => r.symbol).slice(0, 20);
          const quotes = await getQuotesLive(symbols);

          const displayResults: DisplayAsset[] = results.slice(0, 20).map(r => {
            const q = quotes[r.symbol];
            return {
              sym: r.symbol,
              name: r.name,
              price: q?.price ?? 0,
              chgPct: q?.changePercent ?? 0,
              type: r.type?.toLowerCase() || 'stock',
              exchange: r.exchange || '',
              country: '',
              sector: r.sector || r.industry || '',
              currency: q?.currency || 'USD',
              isLive: !!q,
            };
          });
          setLiveResults(displayResults);
        } else {
          setLiveResults([]);
        }
      } catch {
        setLiveResults([]);
      }
      setIsSearching(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAssetsLive, getQuotesLive]);

  // Combine local + live results
  const data = useMemo(() => {
    let items: DisplayAsset[];

    if (searchQuery && searchQuery.length >= 2) {
      // Show local results first, then live results
      const local = searchAssets(searchQuery).map(a => ({
        sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct,
        type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency,
      }));
      const localSyms = new Set(local.map(l => l.sym));
      const live = liveResults.filter(l => !localSyms.has(l.sym));
      items = [...local, ...live];
    } else {
      items = allAssets.map(a => ({
        sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct,
        type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency,
      }));
    }

    if (filters.type !== 'all') items = items.filter(a => a.type === filters.type);
    if (filters.country !== 'all') items = items.filter(a => a.country === filters.country);
    if (filters.perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct).slice(0, 20);
    else if (filters.perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct).slice(0, 20);
    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
  }, [filters, sort, allAssets, searchQuery, searchAssets, liveResults]);

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
          <div className="text-xs text-muted-foreground mt-0.5">
            {data.length} assets · Search any stock, ETF, crypto, commodity or forex globally
            {isSearching && <span className="ml-2 text-primary">⟳ Searching...</span>}
          </div>
        </div>
      </div>

      {/* Search bar */}
      <LiveSearchInput
        onSelect={(sym) => { setSearchQuery(sym); }}
        placeholder="Search globally... Samsung, Toyota, Alibaba, any Korean stock, Indian ETF..."
        className="w-full"
        value={searchQuery}
        onValueChange={setSearchQuery}
        showDropdown={false}
      />

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
              {['', '#', 'Asset', 'Type', 'Price', '24h %', 'Exchange', 'Sector'].map(h => (
                <th key={h || 'star'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {data.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">
                  {isSearching ? 'Searching global markets...' : 'No results found. Try a different search term.'}
                </td></tr>
              )}
              {data.map((a, i) => (
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
                    <div className="text-[10px] text-muted-foreground">{a.name}</div>
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
      </div>
    </div>
  );
}
