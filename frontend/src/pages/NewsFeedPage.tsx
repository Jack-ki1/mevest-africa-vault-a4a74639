import { useState, useEffect, useMemo } from 'react';
import { ALL_NEWS } from '@/data/market-data';
import { marketApi, NewsItem as LiveNewsItem } from '@/lib/api/market';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Wifi, ExternalLink, RefreshCw, Bookmark, BookmarkCheck, Sparkles, ShieldCheck, Filter, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const FILTERS = ['all', 'markets', 'crypto', 'tech', 'macro', 'africa'] as const;
const SENTIMENT_FILTERS = ['all', 'bullish', 'bearish'] as const;

type UnifiedNews = {
  id: string;
  publisher: string;
  title: string;
  headline: string;
  link?: string;
  publishedAt?: string;
  time: string;
  thumbnail?: string;
  relatedTickers: string[];
  tags: string[];
  sent: 'bullish' | 'bearish';
  sourceReliability: number; // 0-100
};

const MOCK_SUMMARIES: Record<string, string> = {
  default: 'Fed signals dovish pivot as core inflation cools; risk assets bid.',
};

function mockSummary(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('nvidia') || t.includes('ai chip')) return 'NVIDIA demand stays strong; analysts lift price targets on AI momentum.';
  if (t.includes('bitcoin') || t.includes('etf')) return 'BTC holds above $67k as ETF inflows accelerate — institutional bid remains.';
  if (t.includes('tesla')) return 'Tesla deliveries miss estimates, pressuring shares on demand concerns.';
  if (t.includes('reserve') || t.includes('rate cut') || t.includes('federal')) return 'Fed dovish tone lifts equities; rate-cut bets pull yields lower.';
  if (t.includes('safaricom') || t.includes('nse') || t.includes('kenya')) return 'NSE rally led by banks; foreign inflows support Nairobi blue chips.';
  if (t.includes('ethereum') || t.includes('pectra')) return 'Ethereum Pectra upgrade set for Q3 — validator UX improvement in focus.';
  if (t.includes('gold') || t.includes('jpmorgan')) return 'Safe-haven bid lifts gold; bank earnings steady despite rates.';
  return title.slice(0, 110) + ' — key takeaway: watch volume and follow-through.';
}

function reliabilityColor(score: number) {
  if (score >= 80) return 'bg-primary/15 text-primary border-primary/30';
  if (score >= 60) return 'bg-amber-500/15 text-amber-700 border-amber-500/30';
  return 'bg-destructive/10 text-destructive border-destructive/30';
}

function getReliability(publisher: string, idx: number): number {
  const map: Record<string, number> = { Bloomberg: 92, Reuters: 94, FT: 88, WSJ: 90, CNBC: 82, CoinDesk: 76, 'Business Daily': 79, 'Ethereum.org': 71, MarketWatch: 84 };
  if (map[publisher] != null) return map[publisher];
  return 70 + ((idx * 7) % 25);
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] ${className}`}>{children}</div>;
}

export default function NewsFeedPage() {
  const [filter, setFilter] = useState<typeof FILTERS[number]>('all');
  const [sentFilter, setSentFilter] = useState<typeof SENTIMENT_FILTERS[number]>('all');
  const [liveNews, setLiveNews] = useState<LiveNewsItem[]>([]);
  const [trendingSymbols, setTrendingSymbols] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLive, setHasLive] = useState(false);
  const [summaries, setSummaries] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem('mevest_news_bookmarks');
      return raw ? JSON.parse(raw) as string[] : [];
    } catch { return []; }
  });

  useEffect(() => {
    try { localStorage.setItem('mevest_news_bookmarks', JSON.stringify(bookmarks)); } catch (_e) { /* storage unavailable */ }
  }, [bookmarks]);

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter(x=>x!==id) : [...prev, id];
      toast({ title: exists ? 'Removed bookmark' : 'Bookmarked ✓', description: id.slice(0, 60) });
      return next;
    });
  };

  const handleSummarize = (id: string, title: string) => {
    if (summaries[id]) return;
    // mock async
    setSummaries(prev => ({ ...prev, [id]: 'Summarizing…' }));
    setTimeout(() => {
      setSummaries(prev => ({ ...prev, [id]: mockSummary(title) }));
    }, 450);
  };

  // Fetch live news
  useEffect(() => {
    setLoading(true);
    marketApi.getNews(filter === 'all' ? 'general' : filter).then(data => {
      if (data.news.length > 0) {
        setLiveNews(data.news);
        setTrendingSymbols(data.trending);
        setHasLive(true);
      } else {
        setHasLive(false);
        setLiveNews([]);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [filter]);

  const fallbackUnified: UnifiedNews[] = useMemo(() => {
    return ALL_NEWS.map((n, i) => ({
      id: `fallback-${i}-${n.headline.slice(0,20)}`,
      publisher: n.src,
      title: n.headline,
      headline: n.headline,
      link: undefined,
      publishedAt: undefined,
      time: n.time,
      thumbnail: undefined,
      relatedTickers: [n.tags[0] ?? 'MARKETS'],
      tags: n.tags,
      sent: n.sent,
      sourceReliability: getReliability(n.src, i),
    }));
  }, []);

  const liveUnified: UnifiedNews[] = useMemo(() => {
    return liveNews.map((n, i) => ({
      id: `live-${i}-${n.title.slice(0,20)}`,
      publisher: n.publisher,
      title: n.title,
      headline: n.title,
      link: n.link,
      publishedAt: n.publishedAt,
      time: n.publishedAt ? new Date(n.publishedAt).toLocaleDateString() : '',
      thumbnail: n.thumbnail,
      relatedTickers: n.relatedTickers,
      tags: n.relatedTickers,
      sent: (n.title.toLowerCase().includes('miss') || n.title.toLowerCase().includes('pressure') || n.title.toLowerCase().includes('drop') ? 'bearish' : 'bullish') as 'bullish'|'bearish',
      sourceReliability: getReliability(n.publisher, i),
    }));
  }, [liveNews]);

  const baseList = hasLive ? liveUnified : fallbackUnified;

  const topicFiltered = filter === 'all' ? baseList : baseList.filter(n => n.tags.some(t => t.toLowerCase() === filter));
  const sentDataFiltered = sentFilter === 'all' ? topicFiltered : topicFiltered.filter(n => n.sent === sentFilter);

  const bookmarkedNews = baseList.filter(n => bookmarks.includes(n.id));

  const sentData = [
    { name: 'Bullish', value: 62, color: 'hsl(160 60% 52%)' },
    { name: 'Bearish', value: 24, color: 'hsl(0 76% 58%)' },
    { name: 'Neutral', value: 14, color: 'hsl(220 14% 35%)' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="font-display text-[19px] font-extrabold tracking-tight">Financial News</div>
          <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full backdrop-blur">BENTO GLASS</span>
          {hasLive && (
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Wifi className="w-2.5 h-2.5" /> LIVE
            </div>
          )}
          {loading && <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />}
          {bookmarks.length>0 && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 border border-amber-500/20 font-semibold">{bookmarks.length} bookmarked</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-[11px] py-[5px] rounded-full text-xs border capitalize backdrop-blur ${filter === f ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      {/* Sentiment filter */}
      <GlassCard className="p-2.5 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-bold flex items-center gap-1.5"><Filter className="w-3.5 h-3.5 text-primary" /> Sentiment:</span>
        <div className="flex gap-1">
          {SENTIMENT_FILTERS.map(s=>(
            <button key={s} onClick={()=>setSentFilter(s)} className={`px-3 py-1 rounded-full text-xs font-semibold capitalize border inline-flex items-center gap-1 ${sentFilter===s ? (s==='bullish'?'bg-primary text-primary-foreground border-primary': s==='bearish'?'bg-destructive text-destructive-foreground border-destructive':'bg-foreground text-background border-foreground') : 'bg-secondary/60 border-border/40 text-muted-foreground'}`}>
              {s==='bullish' ? <TrendingUp className="w-3 h-3" /> : s==='bearish' ? <TrendingDown className="w-3 h-3" /> : <span className="w-3 h-3 rounded-full bg-muted-foreground/30" />}
              {s}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground ml-1">{sentDataFiltered.length} articles</span>
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:block">AI summarizer + reliability badge + localStorage bookmarks</span>
      </GlassCard>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Headlines */}
        <GlassCard className="overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border/40 flex items-center">
            <span className="font-display text-[13px] font-bold">
              {hasLive ? 'Live Headlines' : 'Latest Headlines'}
            </span>
            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-secondary border text-muted-foreground">{sentDataFiltered.length} shown</span>
            <div className="ml-auto flex items-center gap-[5px] text-[10px] font-semibold text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />LIVE
            </div>
          </div>
          <div className="p-3.5">
            {sentDataFiltered.map((n) => {
              const isBookmarked = bookmarks.includes(n.id);
              const summary = summaries[n.id];
              return (
                <div key={n.id} className="py-3 border-b border-border/40 last:border-b-0 group">
                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{n.publisher}</span>
                    <span className="text-[10px] text-muted-foreground">• {n.time}</span>
                    {n.relatedTickers.length > 0 && (
                      <span className="text-[10px] px-[5px] py-px rounded bg-primary/10 text-primary border border-primary/20">{n.relatedTickers[0]}</span>
                    )}
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border inline-flex items-center gap-1 ${n.sent==='bullish'?'bg-primary/10 text-primary border-primary/20':'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${n.sent==='bullish'?'bg-primary':'bg-destructive'}`} /> {n.sent}
                    </span>
                    <span className={`ml-auto inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${reliabilityColor(n.sourceReliability)}`}>
                      <ShieldCheck className="w-3 h-3" /> {n.sourceReliability}
                    </span>
                  </div>

                  {n.link ? (
                    <a href={n.link} target="_blank" rel="noopener noreferrer" className="block text-[13px] text-foreground leading-relaxed hover:text-primary transition-colors">{n.title} <ExternalLink className="inline w-3 h-3 text-muted-foreground ml-1" /></a>
                  ) : (
                    <div className="text-[13px] text-foreground leading-relaxed">{n.headline}</div>
                  )}

                  {n.thumbnail && (
                    <img src={n.thumbnail} alt="" className="mt-2 rounded-lg max-h-[100px] object-cover border border-border/40" />
                  )}

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button onClick={()=>handleSummarize(n.id, n.title)} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-secondary/60 border border-border/40 hover:border-primary/30 hover:bg-primary/5 transition-colors">
                      <Sparkles className="w-3 h-3 text-primary" /> {summary ? 'AI Summary' : 'Summarize'}
                    </button>
                    <button onClick={()=>toggleBookmark(n.id)} className={`inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border transition-colors ${isBookmarked?'bg-amber-500/15 text-amber-700 border-amber-500/30':'bg-card/60 border-border/40 hover:border-amber-500/30'}`}>
                      {isBookmarked ? <BookmarkCheck className="w-3 h-3" /> : <Bookmark className="w-3 h-3" />} {isBookmarked?'Saved':'Bookmark'}
                    </button>
                    {n.link && <a href={n.link} target="_blank" rel="noreferrer" className="text-[11px] px-2 py-1 rounded-lg bg-card/60 border border-border/40 hover:border-primary/30 inline-flex items-center gap-1">Open <ExternalLink className="w-3 h-3" /></a>}
                  </div>

                  {summary && (
                    <div className="mt-2 text-xs leading-relaxed bg-primary/5 border border-primary/20 rounded-lg px-2.5 py-2 flex gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground"><span className="font-semibold text-primary">AI Summary:</span> {summary}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {sentDataFiltered.length === 0 && (
              <div className="py-8 text-center text-muted-foreground">No news for this filter</div>
            )}
          </div>
        </GlassCard>

        {/* Sidebar */}
        <div className="space-y-3.5">
          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40"><span className="font-display text-[13px] font-bold">Market Sentiment</span></div>
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
              <div className="mt-3 flex gap-1">
                {SENTIMENT_FILTERS.map(s=>(
                  <button key={s} onClick={()=>setSentFilter(s)} className={`flex-1 py-1 rounded text-[10px] font-semibold capitalize border ${sentFilter===s?'bg-primary text-primary-foreground border-primary':'bg-secondary/60 border-border/40 text-muted-foreground'}`}>{s}</button>
                ))}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center">
              <span className="font-display text-[13px] font-bold flex items-center gap-1"><Bookmark className="w-3.5 h-3.5 text-primary" /> Bookmarks</span>
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary border">{bookmarkedNews.length}</span>
            </div>
            <div className="p-3.5">
              {bookmarkedNews.length===0 ? (
                <div className="text-xs text-muted-foreground text-center py-4">No bookmarks yet. Tap <Bookmark className="inline w-3 h-3" /> on any article.</div>
              ) : (
                <div className="space-y-2">
                  {bookmarkedNews.slice(0,8).map(n=>(
                    <div key={n.id} className="flex gap-2 p-2 rounded-lg bg-secondary/40 border">
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-semibold line-clamp-2 leading-snug">{n.title}</div>
                        <div className="text-[10px] text-muted-foreground">{n.publisher} • {n.time}</div>
                      </div>
                      <button onClick={()=>toggleBookmark(n.id)} className="flex-shrink-0 w-7 h-7 rounded bg-card border flex items-center justify-center hover:bg-destructive/10"><BookmarkCheck className="w-3.5 h-3.5 text-amber-600" /></button>
                    </div>
                  ))}
                  {bookmarkedNews.length>8 && <div className="text-[10px] text-muted-foreground text-center">+{bookmarkedNews.length-8} more</div>}
                </div>
              )}
            </div>
          </GlassCard>

          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center">
              <span className="font-display text-[13px] font-bold">
                {trendingSymbols.length > 0 ? 'Trending Now' : 'Trending Tickers'}
              </span>
              {trendingSymbols.length > 0 && <Wifi className="ml-auto w-3 h-3 text-primary" />}
            </div>
            <div className="p-3.5">
              {trendingSymbols.length > 0 ? (
                trendingSymbols.slice(0, 8).map(sym => (
                  <div key={sym} className="flex items-center justify-between py-[7px] border-b border-border/40 text-xs last:border-b-0">
                    <span className="font-mono font-semibold">{sym}</span>
                    <span className="text-[9px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">TRENDING</span>
                  </div>
                ))
              ) : (
                [['NVDA', '$42B', true], ['BTC', '$38B', true], ['TSLA', '$38B', false], ['AAPL', '$28B', true], ['ETH', '$18B', true]].map(([sym, vol, up]) => (
                  <div key={sym as string} className="flex items-center justify-between py-[7px] border-b border-border/40 text-xs last:border-b-0">
                    <span className="font-mono font-semibold">{sym}</span>
                    <span className="text-muted-foreground">{vol}</span>
                    <span className={up ? 'text-primary' : 'text-destructive'}>{up ? '▲' : '▼'}</span>
                  </div>
                ))
              )}
              <div className="mt-3 text-[10px] text-muted-foreground flex items-center gap-1"><ShieldCheck className="w-3 h-3" /> Reliability 0-100 weighs publisher history, citations, corrections.</div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
