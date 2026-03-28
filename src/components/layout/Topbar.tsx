import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Search, X, Sun, Moon, Zap, Globe, Wifi } from 'lucide-react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { useTheme } from '@/context/ThemeContext';
import { formatPrice } from '@/data/market-data';
import { SearchResult } from '@/lib/api/market';

interface TopbarProps {
  title: string;
  onAddHolding: () => void;
  onNavigate?: (page: string, sym?: string) => void;
}

export default function Topbar({ title, onAddHolding, onNavigate }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { searchAssets, searchAssetsLive, prices, tickerItems, lastUpdate, isLive } = useRealtimeMarket();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [liveResults, setLiveResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const tickerDupe = [...tickerItems, ...tickerItems];

  // Local instant results
  const localResults = useMemo(() => searchAssets(query), [query, searchAssets]);

  // Live API search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 2) {
      setLiveResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const results = await searchAssetsLive(query);
      setLiveResults(results);
      setSearching(false);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, searchAssetsLive]);

  const showResults = focused && (localResults.length > 0 || liveResults.length > 0 || searching);

  const handleSelect = (sym: string) => {
    setQuery('');
    setFocused(false);
    setLiveResults([]);
    onNavigate?.('charts', sym);
  };

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFocused(false); setQuery(''); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="h-[52px] bg-card/50 backdrop-blur-sm border-b border-border flex items-center px-[18px] gap-[10px] flex-shrink-0">
      <div className="font-display font-bold text-[16px] tracking-tight flex-shrink-0 text-foreground">{title}</div>

      {/* Ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-12 bg-gradient-to-r from-transparent to-card/50 pointer-events-none z-10" />
        <div className="absolute left-0 top-0 h-full w-4 bg-gradient-to-l from-transparent to-card/50 pointer-events-none z-10" />
        <div className="flex gap-[22px] animate-scroll-tick w-max hover:[animation-play-state:paused]">
          {tickerDupe.map((item, i) => (
            <div key={i} className="flex items-center gap-[5px] font-mono text-[10.5px] whitespace-nowrap">
              <span className="text-muted-foreground font-medium">{item.sym}</span>
              <span className="text-foreground font-semibold tabular-nums">
                {item.p >= 1000 ? item.p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : item.p >= 1 ? item.p.toFixed(2) : item.p.toFixed(4)}
              </span>
              <span className={`font-semibold tabular-nums ${item.c >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {item.c >= 0 ? '▲' : '▼'}{Math.abs(item.c).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live badge */}
      <div className={`flex items-center gap-[5px] text-[9px] font-bold tracking-wider flex-shrink-0 px-2 py-1 rounded-md border ${isLive ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'}`}>
        {isLive ? <Wifi className="w-2.5 h-2.5 text-primary" /> : <Zap className="w-2.5 h-2.5 text-muted-foreground" />}
        <span className={isLive ? 'text-primary' : 'text-muted-foreground'}>{isLive ? 'LIVE' : 'SIM'}</span>
      </div>

      {/* Search */}
      <div className="relative max-md:hidden">
        <div className="flex items-center gap-[7px] bg-secondary/80 border border-border rounded-lg px-[11px] h-8 min-w-[280px] focus-within:border-primary/50 focus-within:bg-secondary transition-all">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search any stock globally... (⌘K)"
            className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-sans"
          />
          {query && <button onClick={() => { setQuery(''); setLiveResults([]); }}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
        </div>

        {showResults && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/20 min-w-[380px] max-h-[420px] overflow-y-auto">
            {/* Local results */}
            {localResults.length > 0 && (
              <>
                <div className="px-3 py-2 border-b border-border bg-muted/30">
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">Quick Results</span>
                </div>
                {localResults.slice(0, 5).map(r => (
                  <button
                    key={r.sym}
                    onMouseDown={() => handleSelect(r.sym)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 text-left border-b border-border/30 last:border-0 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-bold font-mono text-primary border border-primary/20">
                        {r.sym.slice(0, 3)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{r.sym}</div>
                        <div className="text-[10px] text-muted-foreground">{r.name} · {r.exchange}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-xs tabular-nums">{r.currency !== 'USD' ? '' : '$'}{formatPrice(r.price)}</div>
                      <span className={`font-mono text-[10px] font-semibold tabular-nums ${r.chgPct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                        {r.chgPct >= 0 ? '+' : ''}{r.chgPct.toFixed(2)}%
                      </span>
                    </div>
                  </button>
                ))}
              </>
            )}

            {/* Live API results */}
            {(liveResults.length > 0 || searching) && (
              <>
                <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-1.5">
                  <Globe className="w-3 h-3 text-primary" />
                  <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                    {searching ? 'Searching global markets...' : `${liveResults.length} Global Results`}
                  </span>
                </div>
                {searching && (
                  <div className="px-3 py-4 text-center">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                )}
                {liveResults.map(r => (
                  <button
                    key={r.symbol}
                    onMouseDown={() => handleSelect(r.symbol)}
                    className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 text-left border-b border-border/30 last:border-0 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-accent/50 flex items-center justify-center text-[9px] font-bold font-mono text-foreground border border-border">
                        {r.symbol.slice(0, 3)}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-foreground">{r.symbol}</div>
                        <div className="text-[10px] text-muted-foreground">{r.name} · {r.exchange}</div>
                      </div>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50 uppercase">{r.type}</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all flex-shrink-0"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </button>

      <button
        onClick={onAddHolding}
        className="inline-flex items-center gap-1.5 px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0 shadow-sm shadow-primary/20"
      >
        + Add Holding
      </button>
    </header>
  );
}
