import { useMemo } from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatPct, genLine } from '@/data/market-data';
import { MARKET } from '@/data/market-data';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Star, Trash2, Zap } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface WatchlistPageProps {
  onNavigate?: (page: string, sym?: string) => void;
}

export default function WatchlistPage({ onNavigate }: WatchlistPageProps) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { prices, getAsset } = useRealtimeMarket();

  const watchlistAssets = useMemo(() => {
    return watchlist
      .map(sym => {
        const liveAsset = getAsset(sym);
        const marketAsset = MARKET[sym];
        if (!liveAsset && !marketAsset) return null;
        const p = prices[sym];
        return {
          sym,
          name: liveAsset?.name || marketAsset?.name || sym,
          price: p?.price || liveAsset?.price || marketAsset?.price || 0,
          chgPct: p?.chgPct ?? liveAsset?.chgPct ?? marketAsset?.chgPct ?? 0,
          chg: p?.chg ?? liveAsset?.chg ?? marketAsset?.chg ?? 0,
          prevPrice: p?.prevPrice || 0,
          mktcap: liveAsset?.mktcap || marketAsset?.mktcap || '—',
          sector: liveAsset?.sector || marketAsset?.sector || '—',
          exchange: liveAsset?.exchange || '—',
          type: liveAsset?.type || marketAsset?.type || 'stock',
          analystRating: marketAsset?.analystRating,
          priceTarget: marketAsset?.priceTarget,
          morningstarRating: marketAsset?.morningstarRating,
          signal: marketAsset?.signal || 'neutral',
          rsi: marketAsset?.rsi,
          pe: marketAsset?.pe,
        };
      })
      .filter(Boolean) as any[];
  }, [watchlist, prices, getAsset]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[19px] font-extrabold tracking-tight">My Watchlist</div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5 fill-primary" />LIVE
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {watchlistAssets.length ? `${watchlistAssets.length} assets tracked · Prices update in real-time` : 'Star assets from the Screener to add them here'}
          </div>
        </div>
      </div>

      {watchlistAssets.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center">
          <div className="text-4xl mb-3 opacity-30">⭐</div>
          <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">No watchlist items</div>
          <div className="text-xs text-muted-foreground leading-relaxed mb-4">Go to the Screener and star assets you want to track.</div>
          <button onClick={() => onNavigate?.('screener')} className="px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">Open Screener</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3.5">
            {watchlistAssets.map(a => (
              <WatchlistCard key={a.sym} asset={a} onRemove={() => { removeFromWatchlist(a.sym); toast({ title: `${a.sym} removed from watchlist` }); }} onNavigate={onNavigate} />
            ))}
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center">
              <span className="font-display text-[13px] font-bold">Watchlist Details</span>
              <Zap className="w-2.5 h-2.5 text-primary ml-auto fill-primary" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">
                  {['Asset', 'Price', '24h %', 'Mkt Cap', 'Sector', 'Exchange', ''].map(h => (
                    <th key={h || 'del'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {watchlistAssets.map(a => {
                    const flash = a.price > a.prevPrice ? 'price-up' : a.price < a.prevPrice ? 'price-down' : '';
                    return (
                      <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer transition-colors" onClick={() => onNavigate?.('markets', a.sym)}>
                        <td className="p-[10px] px-[11px]">
                          <div className="font-bold text-[13px]">{a.sym}</div>
                          <div className="text-[10px] text-muted-foreground">{a.name}</div>
                        </td>
                        <td className={`text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums ${flash}`}>${typeof a.price === 'number' ? a.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : a.price}</td>
                        <td className="text-right p-[10px] px-[11px]">
                          <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(a.chgPct)}</span>
                        </td>
                        <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{a.mktcap}</td>
                        <td className="p-[10px] px-[11px] text-muted-foreground">{a.sector}</td>
                        <td className="p-[10px] px-[11px] text-muted-foreground">{a.exchange}</td>
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

function WatchlistCard({ asset, onRemove, onNavigate }: { asset: any; onRemove: () => void; onNavigate?: (page: string, sym?: string) => void }) {
  const sparkData = useMemo(() => {
    const data = genLine(asset.price * 0.92, 30, asset.chgPct >= 0 ? 0.003 : -0.003, 0.012);
    return data.map((v, i) => ({ i, v }));
  }, [asset.price, asset.chgPct]);

  const color = asset.chgPct >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)';
  const flash = asset.price > asset.prevPrice ? 'price-up' : asset.price < asset.prevPrice ? 'price-down' : '';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/25 transition-colors cursor-pointer" onClick={() => onNavigate?.('markets', asset.sym)}>
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-border">
        <div>
          <div className="font-mono text-sm font-semibold text-foreground">{asset.sym}</div>
          <div className="text-[10px] text-muted-foreground">{asset.name}</div>
        </div>
        <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-muted/30">
          <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
        </button>
      </div>
      <div className="px-3.5 py-2.5">
        <div className="flex items-baseline justify-between mb-1">
          <span className={`font-mono text-base font-semibold text-foreground tabular-nums ${flash}`}>${typeof asset.price === 'number' ? asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : asset.price}</span>
          <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${asset.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
            {formatPct(asset.chgPct)}
          </span>
        </div>
        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={sparkData}>
            <defs><linearGradient id={`wl-${asset.sym}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.15} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#wl-${asset.sym})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        {asset.priceTarget && (
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-muted-foreground">Target</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">${asset.priceTarget}</span>
            <span className={`font-mono tabular-nums ${asset.priceTarget > asset.price ? 'text-primary' : 'text-destructive'}`}>
              ({((asset.priceTarget - asset.price) / asset.price * 100).toFixed(1)}%)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
