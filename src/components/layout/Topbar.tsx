import { Search } from 'lucide-react';
import { TICKER_ITEMS } from '@/data/market-data';

interface TopbarProps {
  title: string;
  onAddHolding: () => void;
}

export default function Topbar({ title, onAddHolding }: TopbarProps) {
  const tickerDupe = [...TICKER_ITEMS, ...TICKER_ITEMS];

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
      <div className="flex items-center gap-[7px] bg-card border border-border rounded-lg px-[11px] h-8 min-w-[180px] focus-within:border-primary transition-colors max-md:hidden">
        <Search className="w-3 h-3 text-muted-foreground" />
        <input
          placeholder="Search assets..."
          className="bg-transparent border-none outline-none text-xs text-foreground placeholder:text-muted-foreground w-full font-sans"
        />
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
