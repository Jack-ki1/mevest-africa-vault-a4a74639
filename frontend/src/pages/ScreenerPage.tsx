import { useState, useMemo, useEffect } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatPct } from '@/data/market-data';
import { useWatchlist } from '@/context/WatchlistContext';
import { toast } from '@/hooks/use-toast';
import { Star, Globe, Loader2, X, Bookmark } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

interface ScreenerPageProps { onNavigate?: (page: string, sym?: string) => void; }
interface DisplayAsset { sym: string; name: string; price: number; chgPct: number; type: string; exchange: string; country: string; sector: string; currency: string; isLive?: boolean; marketCap?: number; pe?: number; dividendYield?: number; }
type NumericFilter = { min?: number; max?: number };
type Filters = { type: string; exchange: string; sector: string; marketCap: NumericFilter; peRatio: NumericFilter; dividendYield: NumericFilter; perfPct: NumericFilter; shariaCompliant?: boolean; };

const PERF_CHIPS = [{ val: 'all', label: 'All' }, { val: 'gainers', label: '📈 Gainers' }, { val: 'losers', label: '📉 Losers' }];

function FreeTextFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; }) {
  return (
    <div className="relative flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-secondary border border-border focus-within:border-primary/40 transition-colors min-w-[150px]">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex-shrink-0">{label}:</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-transparent border-none outline-none text-[11px] text-foreground placeholder:text-muted-foreground/60 w-full min-w-0" />
      {value && <button onClick={() => onChange('')} aria-label={`Clear ${label}`}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
    </div>
  );
}
function NumFilter({ label, f, onChange }: { label: string; f: NumericFilter; onChange: (v: NumericFilter) => void }) {
  return (
    <div className="flex items-center gap-1 px-2 h-9 rounded-lg bg-secondary border border-border min-w-[160px]">
      <span className="text-[9px] text-muted-foreground uppercase font-semibold">{label}:</span>
      <input type="number" value={f.min ?? ''} onChange={e => onChange({ ...f, min: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="min" className="w-14 bg-transparent outline-none text-[11px]" />
      <span className="text-muted-foreground">–</span>
      <input type="number" value={f.max ?? ''} onChange={e => onChange({ ...f, max: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="max" className="w-14 bg-transparent outline-none text-[11px]" />
    </div>
  );
}

export default function ScreenerPage({ onNavigate }: ScreenerPageProps) {
  const { allAssets, searchAssetsLive, getQuotesLive } = useRealtimeMarket();
  const [filters, setFilters] = useState<Filters>({ type: '', exchange: '', sector: '', marketCap: {}, peRatio: {}, dividendYield: {}, perfPct: {} });
  const [perf, setPerf] = useState('all');
  const [sort, setSort] = useState('mktcap');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<DisplayAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [symbolsMeta, setSymbolsMeta] = useState<Record<string, { market_cap: number | null; pe_ratio: number | null; dividend_yield: number | null; is_sharia_compliant: boolean | null }>>({});
  const [presetName, setPresetName] = useState('');
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { user } = useAuth();

  useEffect(() => {
    supabase.from('symbols_meta').select('symbol,market_cap,pe_ratio,dividend_yield,is_sharia_compliant').then(({ data }) => {
      if (data) {
        const m: typeof symbolsMeta = {};
        (data as Array<{ symbol: string; market_cap: number | null; pe_ratio: number | null; dividend_yield: number | null; is_sharia_compliant: boolean | null }>).forEach(r => { m[r.symbol] = { market_cap: r.market_cap, pe_ratio: r.pe_ratio, dividend_yield: r.dividend_yield, is_sharia_compliant: r.is_sharia_compliant }; });
        setSymbolsMeta(m);
      }
    });
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setLiveResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAssetsLive(searchQuery);
        if (results.length > 0) {
          const symbols = results.map(r => r.symbol).slice(0, 50);
          const quotes = await getQuotesLive(symbols);
          const displayResults: DisplayAsset[] = results.slice(0, 50).map(r => {
            const q = quotes[r.symbol];
            return { sym: r.symbol, name: r.name, price: q?.price ?? 0, chgPct: q?.changePercent ?? 0, type: r.type?.toLowerCase() || 'stock', exchange: r.exchange || '', country: '', sector: r.sector || r.industry || '', currency: q?.currency || 'USD', isLive: !!q };
          });
          setLiveResults(displayResults);
        } else setLiveResults([]);
      } catch { setLiveResults([]); }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAssetsLive, getQuotesLive]);

  const data = useMemo(() => {
    let items: DisplayAsset[];
    if (searchQuery && searchQuery.length >= 2) {
      const localSyms = new Set<string>();
      const local = allAssets.filter(a => a.sym.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => ({ sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency }));
      local.forEach(l => localSyms.add(l.sym));
      const live = liveResults.filter(l => !localSyms.has(l.sym));
      items = [...local, ...live];
    } else {
      items = allAssets.map(a => ({ sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency }));
    }
    // Enrich with symbols_meta
    items = items.map(it => {
      const meta = symbolsMeta[it.sym];
      return { ...it, marketCap: meta?.market_cap ?? undefined, pe: meta?.pe_ratio ?? undefined, dividendYield: meta?.dividend_yield ?? undefined };
    });
    if (filters.type.trim()) items = items.filter(a => a.type.toLowerCase().includes(filters.type.trim().toLowerCase()));
    if (filters.exchange.trim()) items = items.filter(a => a.exchange.toLowerCase().includes(filters.exchange.trim().toLowerCase()));
    if (filters.sector.trim()) items = items.filter(a => a.sector.toLowerCase().includes(filters.sector.trim().toLowerCase()));
    if (filters.marketCap.min != null || filters.marketCap.max != null) items = items.filter(a => { const v = a.marketCap ?? 0; if (filters.marketCap.min != null && v < filters.marketCap.min) return false; if (filters.marketCap.max != null && v > filters.marketCap.max) return false; return true; });
    if (filters.peRatio.min != null || filters.peRatio.max != null) items = items.filter(a => { const v = a.pe; if (v == null) return false; if (filters.peRatio.min != null && v < filters.peRatio.min) return false; if (filters.peRatio.max != null && v > filters.peRatio.max) return false; return true; });
    if (filters.dividendYield.min != null || filters.dividendYield.max != null) items = items.filter(a => { const v = a.dividendYield; if (v == null) return false; if (filters.dividendYield.min != null && v < filters.dividendYield.min) return false; if (filters.dividendYield.max != null && v > filters.dividendYield.max) return false; return true; });
    if (filters.perfPct.min != null || filters.perfPct.max != null) items = items.filter(a => { if (filters.perfPct.min != null && a.chgPct < filters.perfPct.min) return false; if (filters.perfPct.max != null && a.chgPct > filters.perfPct.max) return false; return true; });
    if (filters.shariaCompliant) items = items.filter(a => symbolsMeta[a.sym]?.is_sharia_compliant === true);
    if (perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct);
    else if (perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct);
    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    return items;
  }, [filters, perf, sort, allAssets, searchQuery, liveResults, symbolsMeta]);

  const handleToggleWatchlist = (sym: string) => {
    if (isInWatchlist(sym)) { removeFromWatchlist(sym); toast({ title: `${sym} removed from watchlist` }); }
    else { addToWatchlist(sym); toast({ title: `${sym} added to watchlist` }); }
  };

  const savePreset = async () => {
    if (!user || !presetName.trim()) { toast({ title: 'Enter a preset name' }); return; }
    const { error } = await supabase.from('screener_presets').upsert({ user_id: user.id, name: presetName.trim(), filters: { ...filters, perf, sort } as unknown as Record<string, never> }, { onConflict: 'user_id,name' });
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: `Preset "${presetName}" saved` });
  };

  const visibleData = data.slice(0, visibleCount);
  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold">Market Screener</div>
          <div className="text-xs text-muted-foreground mt-0.5">{data.length} assets · Search any stock, ETF, crypto globally {isSearching && <span className="ml-2 text-primary">⟳ Searching...</span>}</div>
        </div>
      </div>
      <div className="relative">
        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisibleCount(30); }} placeholder="🔍 Search globally — Samsung, Toyota, Alibaba, Bitcoin, Safaricom..." className="w-full bg-card border border-border rounded-xl px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60" />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <FreeTextFilter label="Type" value={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} placeholder="stock, etf..." />
        <FreeTextFilter label="Exchange" value={filters.exchange} onChange={v => setFilters(f => ({ ...f, exchange: v }))} placeholder="NSE, NASDAQ..." />
        <FreeTextFilter label="Sector" value={filters.sector} onChange={v => setFilters(f => ({ ...f, sector: v }))} placeholder="Technology..." />
        <div className="flex items-center gap-1 ml-1">
          {PERF_CHIPS.map(p => (
            <button key={p.val} onClick={() => setPerf(p.val)} className={`px-2.5 h-9 rounded-lg text-[11px] font-semibold border ${perf === p.val ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-secondary border-border hover:border-primary/30'}`}>{p.label}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto h-9 px-3 rounded-lg text-[11px] bg-secondary border border-border outline-none">
          <option value="mktcap">Sort: Default</option><option value="chg_desc">% Change ↓</option><option value="chg_asc">% Change ↑</option><option value="price_desc">Price ↓</option><option value="price_asc">Price ↑</option><option value="name">Name A-Z</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2 items-center bg-card border border-border rounded-xl p-2">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Advanced:</span>
        <NumFilter label="MktCap" f={filters.marketCap} onChange={v => setFilters(f => ({ ...f, marketCap: v }))} />
        <NumFilter label="P/E" f={filters.peRatio} onChange={v => setFilters(f => ({ ...f, peRatio: v }))} />
        <NumFilter label="Div Yld %" f={filters.dividendYield} onChange={v => setFilters(f => ({ ...f, dividendYield: v }))} />
        <NumFilter label="Perf %" f={filters.perfPct} onChange={v => setFilters(f => ({ ...f, perfPct: v }))} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!filters.shariaCompliant} onChange={e => setFilters(f => ({ ...f, shariaCompliant: e.target.checked || undefined }))} /> Sharia only</label>
        <div className="ml-auto flex items-center gap-1">
          <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" className="h-8 px-2 rounded-lg text-xs bg-secondary border border-border" />
          <button onClick={savePreset} className="h-8 px-2 rounded-lg text-xs bg-primary text-primary-foreground flex items-center gap-1"><Bookmark className="w-3 h-3" />Save</button>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border">{['', '#', 'Asset', 'Type', 'Price', '24h %', 'Exchange', 'Sector'].map(h => (<th key={h || 'star'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>))}</tr></thead>
            <tbody>
              {visibleData.length === 0 && (<tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{isSearching ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching...</span> : 'No results.'}</td></tr>)}
              {visibleData.map((a, i) => (
                <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer" onClick={() => onNavigate?.('markets', a.sym)}>
                  <td className="p-[10px] px-[11px]" onClick={e => { e.stopPropagation(); handleToggleWatchlist(a.sym); }}><Star className={`w-3.5 h-3.5 cursor-pointer ${isInWatchlist(a.sym) ? 'fill-primary text-primary' : 'text-muted-foreground/40 hover:text-foreground'}`} /></td>
                  <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="p-[10px] px-[11px]"><div className="flex items-center gap-1"><div className="font-bold text-[13px]">{a.sym}</div>{a.isLive && <Globe className="w-2.5 h-2.5 text-primary" />}</div><div className="text-[10px] text-muted-foreground max-w-[200px] truncate">{a.name}</div></td>
                  <td className="p-[10px] px-[11px]"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary border border-border/50 uppercase">{a.type}</span></td>
                  <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">{a.price > 0 ? `${a.currency !== 'USD' ? '' : '$'}${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className="text-right p-[10px] px-[11px]">{a.price > 0 ? (<span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(a.chgPct)}</span>) : '—'}</td>
                  <td className="p-[10px] px-[11px] text-[10px] text-muted-foreground">{a.exchange}</td>
                  <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary border border-border/50">{a.sector || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleCount < data.length && (<div className="p-3 border-t border-border text-center"><button onClick={() => setVisibleCount(v => v + 30)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border hover:bg-muted">Load {Math.min(30, data.length - visibleCount)} more · {data.length - visibleCount} remaining</button></div>)}
      </div>
    </div>
  );
}
