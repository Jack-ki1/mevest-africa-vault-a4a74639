import { useState, useEffect } from 'react';
import { ALL_NEWS } from '@/data/market-data';
import { marketApi, NewsItem as LiveNewsItem } from '@/lib/api/market';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wifi, ExternalLink, RefreshCw } from 'lucide-react';

const FILTERS = ['all', 'markets', 'crypto', 'tech', 'macro', 'africa'];

export default function NewsFeedPage() {
  const [filter, setFilter] = useState('all');
  const [liveNews, setLiveNews] = useState<LiveNewsItem[]>([]);
  const [trendingSymbols, setTrendingSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLive, setHasLive] = useState(false);

  // Fetch live news
  useEffect(() => {
    setLoading(true);
    marketApi.getNews(filter === 'all' ? 'general' : filter).then(data => {
      if (data.news.length > 0) {
        setLiveNews(data.news);
        setTrendingSymbols(data.trending);
        setHasLive(true);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const fallbackFiltered = filter === 'all' ? ALL_NEWS : ALL_NEWS.filter(n => n.tags.some(t => t.toLowerCase() === filter));

  const sentData = [
    { name: 'Bullish', value: 62, color: 'hsl(160 60% 52%)' },
    { name: 'Bearish', value: 24, color: 'hsl(0 76% 58%)' },
    { name: 'Neutral', value: 14, color: 'hsl(220 14% 35%)' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="font-display text-[19px] font-extrabold tracking-tight">Financial News</div>
          {hasLive && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Wifi className="w-2.5 h-2.5" /> LIVE
            </div>
          )}
          {loading && <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />}
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-[11px] py-[5px] rounded-md text-xs border capitalize ${filter === f ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Headlines */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">
              {hasLive ? 'Live Headlines' : 'Latest Headlines'}
            </span>
            <div className="ml-auto flex items-center gap-[5px] text-[10px] font-semibold text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />LIVE
            </div>
          </div>
          <div className="p-3.5">
            {/* Live news */}
            {hasLive && liveNews.map((n, i) => (
              <a
                key={i}
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block py-[11px] border-b border-border last:border-b-0 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="flex items-center gap-1.5 mb-[3px]">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{n.publisher}</span>
                  <span className="text-[10px] text-muted-foreground">
                    • {n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : ''}
                  </span>
                  {n.relatedTickers.length > 0 && (
                    <span className="text-[10px] px-[5px] py-px rounded-sm bg-primary/10 text-primary">{n.relatedTickers[0]}</span>
                  )}
                  <ExternalLink className="w-3 h-3 text-muted-foreground ml-auto" />
                </div>
                <div className="text-[13px] text-foreground leading-relaxed">{n.title}</div>
                {n.thumbnail && (
                  <img src={n.thumbnail} alt="" className="mt-2 rounded-lg max-h-[100px] object-cover" />
                )}
              </a>
            ))}

            {/* Fallback news */}
            {!hasLive && fallbackFiltered.map((n, i) => (
              <div key={i} className="py-[11px] border-b border-border last:border-b-0 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 mb-[3px]">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{n.src}</span>
                  <span className="text-[10px] text-muted-foreground">• {n.time}</span>
                  <span className="text-[10px] px-[5px] py-px rounded-sm bg-primary/10 text-primary">{n.tags[0]}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${n.sent === 'bullish' ? 'text-primary' : 'text-destructive'}`}>● {n.sent}</span>
                </div>
                <div className="text-[13px] text-foreground leading-relaxed">{n.headline}</div>
              </div>
            ))}

            {!hasLive && fallbackFiltered.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No news for this category</div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-3.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Market Sentiment</span></div>
            <div className="p-3.5">
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={sentData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={3} strokeWidth={0}>
                    {sentData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2.5 space-y-[5px]">
                {sentData.map(d => (
                  <div key={d.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: d.color }} /><span className="text-[11px] text-muted-foreground">{d.name}</span></div>
                    <span className="font-mono text-[11px]">{d.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center">
              <span className="font-display text-[13px] font-bold">
                {trendingSymbols.length > 0 ? 'Trending Now' : 'Trending Tickers'}
              </span>
              {trendingSymbols.length > 0 && <Wifi className="ml-auto w-3 h-3 text-primary" />}
            </div>
            <div className="p-3.5">
              {trendingSymbols.length > 0 ? (
                trendingSymbols.slice(0, 8).map(sym => (
                  <div key={sym} className="flex items-center justify-between py-[7px] border-b border-border text-xs last:border-b-0">
                    <span className="font-mono font-semibold">{sym}</span>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">TRENDING</span>
                  </div>
                ))
              ) : (
                [['NVDA', '$42B', true], ['BTC', '$38B', true], ['TSLA', '$38B', false], ['AAPL', '$28B', true], ['ETH', '$18B', true]].map(([sym, vol, up]) => (
                  <div key={sym as string} className="flex items-center justify-between py-[7px] border-b border-border text-xs last:border-b-0">
                    <span className="font-mono font-semibold">{sym}</span>
                    <span className="text-muted-foreground">{vol}</span>
                    <span className={up ? 'text-primary' : 'text-destructive'}>{up ? '▲' : '▼'}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
