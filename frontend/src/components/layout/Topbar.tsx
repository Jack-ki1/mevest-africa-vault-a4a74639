import { Sun, Moon, Wifi, Zap, Menu } from 'lucide-react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { useTheme } from '@/context/ThemeContext';
import LiveSearchInput from '@/components/LiveSearchInput';

interface TopbarProps {
  title: string;
  onAddHolding: () => void;
  onNavigate?: (page: string, sym?: string) => void;
  onMenuToggle?: () => void;
}

export default function Topbar({ title, onAddHolding, onNavigate, onMenuToggle }: TopbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { tickerItems, isLive } = useRealtimeMarket();
  const tickerDupe = [...tickerItems, ...tickerItems];

  const handleSelect = (sym: string) => {
    onNavigate?.('markets', sym);
  };

  return (
    <header className="h-[52px] bg-card/50 backdrop-blur-sm border-b border-border flex items-center px-3 md:px-[18px] gap-2 md:gap-[10px] flex-shrink-0">
      {/* Hamburger (mobile) */}
      <button onClick={onMenuToggle} className="md:hidden w-8 h-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:text-foreground flex-shrink-0">
        <Menu className="w-4 h-4" />
      </button>

      <div className="font-display font-bold text-[14px] md:text-[16px] tracking-tight flex-shrink-0 text-foreground">{title}</div>

      {/* Ticker */}
      <div className="flex-1 overflow-hidden relative max-md:hidden">
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
      <div className={`flex items-center gap-[5px] text-[9px] font-bold tracking-wider flex-shrink-0 px-2 py-1 rounded-md border max-md:hidden ${isLive ? 'bg-primary/10 border-primary/20' : 'bg-muted border-border'}`}>
        {isLive ? <Wifi className="w-2.5 h-2.5 text-primary" /> : <Zap className="w-2.5 h-2.5 text-muted-foreground" />}
        <span className={isLive ? 'text-primary' : 'text-muted-foreground'}>{isLive ? 'LIVE' : 'SIM'}</span>
      </div>

      {/* Search */}
      <div className="max-md:hidden">
        <LiveSearchInput
          onSelect={handleSelect}
          placeholder="Search any stock globally... (⌘K)"
          className="min-w-[280px]"
          size="sm"
        />
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
        className="inline-flex items-center gap-1.5 px-2 md:px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity flex-shrink-0 shadow-sm shadow-primary/20"
      >
        + <span className="max-md:hidden">Add Holding</span>
      </button>
    </header>
  );
}
