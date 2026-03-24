import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Sun, Moon, Zap } from 'lucide-react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { useTheme } from '@/context/ThemeContext';
import { formatPrice } from '@/data/market-data';

interface TopbarProps {
  title: string;
  onAddHolding: () => void;
  onNavigate?: (page: string, sym?: string) => void;
}

export default function Topbar({ title, onAddHolding, onNavigate }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { searchAssets, prices, tickerItems, lastUpdate } = useRealtimeMarket();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickerDupe = [...tickerItems, ...tickerItems];

  const results = useMemo(() => searchAssets(query), [query, searchAssets]);
  const showResults = focused && results.length > 0;

  const handleSelect = (sym: string) => {
    setQuery('');
    setFocused(false);
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

  const timeSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);

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
      <div className="flex items-center gap-[5px] text-[9px] font-bold tracking-wider flex-shrink-0 px-2 py-1 rounded-md bg-primary/10 border border-primary/20">
        <Zap className="w-2.5 h-2.5 text-primary fill-primary" />
        <span className="text-primary">LIVE</span>
      </div>

      {/* Search */}
      <div className="relative max-md:hidden">
        <div className="flex items-center gap-[7px] bg-secondary/80 border border-border rounded-lg px-[11px] h-8 min-w-[260px] focus-within:border-primary/50 focus-within:bg-secondary transition-all">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search any asset... (⌘K)"
            className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-sans"
          />
          {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
        </div>

        {showResults && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/20 min-w-[320px]">
            <div className="px-3 py-2 border-b border-border">
              <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">{results.length} results — Search any stock, crypto, ETF, forex or commodity</span>
            </div>
            {results.map(r => (
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
