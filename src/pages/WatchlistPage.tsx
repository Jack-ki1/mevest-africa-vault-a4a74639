import { useMemo } from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { MARKET, formatPct, genLine } from '@/data/market-data';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Star, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WatchlistPageProps {
  onNavigate?: (page: string, sym?: string) => void;
}

export default function WatchlistPage({ onNavigate }: WatchlistPageProps) {
  const { watchlist, removeFromWatchlist } = useWatchlist();

  const watchlistAssets = useMemo(() => {
    return watchlist
      .map(sym => {
        const asset = MARKET[sym];
        if (!asset) return null;
        return { sym, ...asset };
      })
      .filter(Boolean) as (typeof MARKET[string] & { sym: string })[];
  }, [watchlist]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">My Watchlist</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {watchlistAssets.length ? `${watchlistAssets.length} assets tracked` : 'Star assets from the Screener to add them here'}
          </div>
        </div>
      </div>

      {watchlistAssets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="text-4xl mb-3 opacity-40">⭐</div>
          <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">No watchlist items</div>
          <div className="text-xs text-muted-foreground leading-relaxed mb-4">Go to the Screener and star assets you want to track.</div>
          <button onClick={() => onNavigate?.('screener')} className="px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
            Open Screener
          </button>
        </div>
      ) : (
        <>
          {/* Cards grid */}
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3.5">
            {watchlistAssets.map(a => (
              <WatchlistCard key={a.sym} asset={a} onRemove={() => { removeFromWatchlist(a.sym); toast({ title: `${a.sym} removed from watchlist` }); }} onNavigate={onNavigate} />
            ))}
          </div>

          {/* Detail table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border">
              <span className="font-display text-[13px] font-bold">Watchlist Details</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Asset', 'Price', '24h %', 'Mkt Cap', 'RSI', 'P/E', 'Signal', 'Rating', 'Target', ''].map(h => (
                      <th key={h || 'del'} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %', 'Mkt Cap', 'RSI', 'P/E', 'Target'].includes(h) ? 'text-right' : h === 'Signal' || h === 'Rating' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {watchlistAssets.map(a => {
                    const ratingColors: Record<string, string> = { strong_buy: 'text-primary bg-accent-dim', buy: 'text-primary bg-accent-dim', hold: 'text-amber bg-amber-dim', sell: 'text-destructive bg-destructive-dim', strong_sell: 'text-destructive bg-destructive-dim' };
                    const ratingLabel = a.analystRating?.replace('_', ' ').toUpperCase() || '—';
                    return (
                      <tr key={a.sym} className="border-b border-border/50 hover:bg-glass cursor-pointer" onClick={() => onNavigate?.('charts', a.sym)}>
                        <td className="p-[10px] px-[11px]">
                          <div className="font-bold text-[13px]">{a.sym}</div>
                          <div className="text-[10px] text-muted-foreground">{a.name}</div>
                        </td>
                        <td className="text-right p-[10px] px-[11px] font-mono font-semibold">${typeof a.price === 'number' ? a.price.toLocaleString() : a.price}</td>
                        <td className="text-right p-[10px] px-[11px]">
                          <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${a.chgPct >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>{formatPct(a.chgPct)}</span>
                        </td>
                        <td className="text-right p-[10px] px-[11px] font-mono">{a.mktcap}</td>
                        <td className="text-right p-[10px] px-[11px] font-mono">{a.rsi}</td>
                        <td className="text-right p-[10px] px-[11px] font-mono">{a.pe}</td>
                        <td className="text-center p-[10px] px-[11px]">
                          <span className={`text-[10px] font-bold font-mono px-[7px] py-0.5 rounded-sm ${a.signal === 'bullish' ? 'bg-accent-dim text-primary' : a.signal === 'bearish' ? 'bg-destructive-dim text-destructive' : 'bg-glass text-muted-foreground'}`}>{a.signal.toUpperCase()}</span>
                        </td>
                        <td className="text-center p-[10px] px-[11px]">
                          <span className={`text-[10px] font-bold px-[7px] py-0.5 rounded-sm ${ratingColors[a.analystRating || ''] || 'bg-glass text-muted-foreground'}`}>{ratingLabel}</span>
                        </td>
                        <td className="text-right p-[10px] px-[11px] font-mono">
                          {a.priceTarget ? `$${a.priceTarget}` : '—'}
                        </td>
                        <td className="p-[10px] px-[11px]" onClick={e => { e.stopPropagation(); removeFromWatchlist(a.sym); toast({ title: `${a.sym} removed` }); }}>
                          <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function WatchlistCard({ asset, onRemove, onNavigate }: { asset: typeof MARKET[string] & { sym: string }; onRemove: () => void; onNavigate?: (page: string, sym?: string) => void }) {
  const sparkData = useMemo(() => {
    const data = genLine(asset.price * 0.92, 30, asset.chgPct >= 0 ? 0.003 : -0.003, 0.012);
    return data.map((v, i) => ({ i, v }));
  }, [asset.price, asset.chgPct]);

  const color = asset.chgPct >= 0 ? 'hsl(157 52% 60%)' : 'hsl(0 72% 60%)';
  const stars = asset.morningstarRating || 0;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/25 transition-colors cursor-pointer" onClick={() => onNavigate?.('charts', asset.sym)}>
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-border">
        <div>
          <div className="font-mono text-sm font-semibold text-foreground">{asset.sym}</div>
          <div className="text-[10px] text-muted-foreground">{asset.name}</div>
        </div>
        <div className="flex items-center gap-2">
          {stars > 0 && (
            <div className="flex gap-px">
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} className={`w-2.5 h-2.5 ${i < stars ? 'fill-amber text-amber' : 'text-muted-foreground/30'}`} />
              ))}
            </div>
          )}
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-glass">
            <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
          </button>
        </div>
      </div>
      <div className="px-3.5 py-2.5">
        <div className="flex items-baseline justify-between mb-1">
          <span className="font-mono text-base font-medium text-foreground">${typeof asset.price === 'number' ? asset.price.toLocaleString() : asset.price}</span>
          <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${asset.chgPct >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
            {formatPct(asset.chgPct)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={sparkData}>
            <defs>
              <linearGradient id={`wl-${asset.sym}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.15} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#wl-${asset.sym})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        {asset.priceTarget && (
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-muted-foreground">Target</span>
            <span className="font-mono font-semibold text-foreground">${asset.priceTarget}</span>
            <span className={`font-mono ${asset.priceTarget > asset.price ? 'text-primary' : 'text-destructive'}`}>
              ({((asset.priceTarget - asset.price) / asset.price * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
