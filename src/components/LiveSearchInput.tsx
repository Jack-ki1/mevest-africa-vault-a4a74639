import { useState, useEffect, useRef } from 'react';
import { Search, Globe, Loader2, X } from 'lucide-react';
import { marketApi, SearchResult } from '@/lib/api/market';

interface LiveSearchInputProps {
  onSelect: (symbol: string, name: string, exchange?: string) => void;
  placeholder?: string;
  className?: string;
  value?: string;
  onValueChange?: (val: string) => void;
  showDropdown?: boolean;
  autoFocus?: boolean;
  size?: 'sm' | 'md';
}

export default function LiveSearchInput({
  onSelect,
  placeholder = 'Search any stock, ETF, crypto globally...',
  className = '',
  value: externalValue,
  onValueChange,
  showDropdown = true,
  autoFocus = false,
  size = 'md',
}: LiveSearchInputProps) {
  const [query, setQuery] = useState(externalValue || '');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (externalValue !== undefined) setQuery(externalValue);
  }, [externalValue]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query || query.length < 1) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await marketApi.search(query);
        setResults(res.slice(0, 20));
      } catch {
        setResults([]);
      }
      setLoading(false);
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

  const handleChange = (val: string) => {
    setQuery(val);
    onValueChange?.(val);
  };

  const handleSelect = (r: SearchResult) => {
    setQuery(r.symbol);
    onValueChange?.(r.symbol);
    setResults([]);
    setFocused(false);
    onSelect(r.symbol, r.name, r.exchange);
  };

  const isOpen = focused && showDropdown && (results.length > 0 || loading);
  const isSm = size === 'sm';

  return (
    <div className={`relative ${className}`}>
      <div className={`flex items-center gap-2 bg-muted border border-border rounded-lg px-3 ${isSm ? 'h-9' : 'h-10'} focus-within:border-primary/50 transition-colors`}>
        <Search className={`${isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} text-muted-foreground flex-shrink-0`} />
        <input
          ref={inputRef}
          value={query}
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`bg-transparent border-none outline-none ${isSm ? 'text-xs' : 'text-[13px]'} text-foreground placeholder:text-muted-foreground w-full`}
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />}
        {query && !loading && (
          <button onClick={() => { handleChange(''); setResults([]); }} className="flex-shrink-0">
            <X className="w-3 h-3 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/20 max-h-[340px] overflow-y-auto">
          {loading && results.length === 0 && (
            <div className="px-3 py-4 text-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-1" />
              <span className="text-[10px] text-muted-foreground">Searching global markets...</span>
            </div>
          )}
          {results.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-b border-border bg-muted/30 flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-primary" />
                <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider">
                  {results.length} Global Results
                </span>
              </div>
              {results.map(r => (
                <button
                  key={`${r.symbol}-${r.exchange}`}
                  onMouseDown={() => handleSelect(r)}
                  className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/50 text-left border-b border-border/30 last:border-0 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-[9px] font-bold font-mono text-primary border border-primary/20 flex-shrink-0">
                      {r.symbol.slice(0, 3)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-foreground truncate">{r.symbol}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{r.name} · {r.exchange}</div>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border/50 uppercase flex-shrink-0 ml-2">
                    {r.type || 'EQUITY'}
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
