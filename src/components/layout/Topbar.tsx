import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X, Sun, Moon } from 'lucide-react';
import { TICKER_ITEMS, MARKET } from '@/data/market-data';
import { useTheme } from '@/context/ThemeContext';

interface TopbarProps {
  title: string;
  onAddHolding: () => void;
  onNavigate?: (page: string, sym?: string) => void;
}

export default function Topbar({ title, onAddHolding, onNavigate }: TopbarProps) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const tickerDupe = [...TICKER_ITEMS, ...TICKER_ITEMS];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return Object.entries(MARKET)
      .filter(([sym, a]) => sym.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.sector.toLowerCase().includes(q))
      .slice(0, 6)
      .map(([sym, a]) => ({ sym, ...a }));
  }, [query]);

  const showResults = focused && results.length > 0;

  const handleSelect = (sym: string) => {
    setQuery('');
    setFocused(false);
    onNavigate?.('charts', sym);
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setFocused(false); setQuery(''); }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); inputRef.current?.focus(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <header className="h-[54px] bg-secondary border-b border-border flex items-center px-[18px] gap-[10px] flex-shrink-0">
      <div className="font-display font-bold text-[17px] tracking-tight flex-shrink-0">{title}</div>

      {/* Ticker */}
      <div className="flex-1 overflow-hidden relative">
        <div className="absolute right-0 top-0 h-full w-10 bg-gradient-to-r from-transparent to-secondary pointer-events-none z-10" />
        <div className="flex gap-[22px] animate-scroll-tick w-max hover:[animation-play-state:paused]">
          {tickerDupe.map((item, i) => (
            <div key={i} className="flex items-center gap-[5px] font-mono text-[11px] whitespace-nowrap">
              <span className="text-muted-foreground">{item.sym}</span>
              <span className="text-foreground font-medium">
                {item.p >= 1000 ? item.p.toLocaleString('en-US', { maximumFractionDigits: 0 }) : item.p >= 1 ? item.p.toFixed(2) : item.p.toFixed(4)}
              </span>
              <span className={item.c >= 0 ? 'text-primary' : 'text-destructive'}>
                {item.c >= 0 ? '▲' : '▼'}{Math.abs(item.c).toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Live badge */}
      <div className="flex items-center gap-[5px] text-[10px] font-semibold text-primary flex-shrink-0">
        <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />
        LIVE
      </div>

      {/* Search */}
      <div className="relative max-md:hidden">
        <div className="flex items-center gap-[7px] bg-card border border-border rounded-lg px-[11px] h-8 min-w-[220px] focus-within:border-primary transition-colors">
          <Search className="w-3 h-3 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search assets... (⌘K)"
            className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-sans"
          />
          {query && <button onClick={() => setQuery('')}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
        </div>

        {showResults && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg overflow-hidden z-50 shadow-lg">
            {results.map(r => (
              <button
                key={r.sym}
                onMouseDown={() => handleSelect(r.sym)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-glass text-left border-b border-border/50 last:border-0"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center text-[10px] font-bold font-mono text-primary">
                    {r.sym.slice(0, 2)}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-foreground">{r.sym}</div>
                    <div className="text-[10px] text-muted-foreground">{r.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-xs">${typeof r.price === 'number' ? r.price.toLocaleString() : r.price}</div>
                  <span className={`font-mono text-[10px] ${r.chgPct >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {r.chgPct >= 0 ? '+' : ''}{r.chgPct.toFixed(2)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={onAddHolding}
        className="inline-flex items-center gap-1.5 px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0"
      >
        + Add Holding
      </button>
    </header>
  );
}
