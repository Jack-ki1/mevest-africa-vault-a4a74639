import { useState, useMemo } from 'react';
import { ALL_NEWS } from '@/data/market-data';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const FILTERS = ['all', 'markets', 'crypto', 'tech', 'macro', 'africa'];

export default function NewsFeedPage() {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? ALL_NEWS : ALL_NEWS.filter(n => n.tags.some(t => t.toLowerCase() === filter));

  const sentData = [
    { name: 'Bullish', value: 62, color: 'rgba(99,210,170,0.75)' },
    { name: 'Bearish', value: 24, color: 'rgba(240,97,107,0.75)' },
    { name: 'Neutral', value: 14, color: 'rgba(74,80,104,0.5)' },
  ];

  const trending = [
    ['NVDA', '$42B', true], ['BTC', '$38B', true], ['TSLA', '$38B', false], ['AAPL', '$28B', true], ['ETH', '$18B', true],
  ] as const;

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Financial News</div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-[11px] py-[5px] rounded-md text-xs border capitalize ${filter === f ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
              {f === 'all' ? 'All' : f}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        {/* Headlines */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Latest Headlines</span>
            <div className="ml-auto flex items-center gap-[5px] text-[10px] font-semibold text-primary">
              <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />LIVE
            </div>
          </div>
          <div className="p-3.5">
            {filtered.map((n, i) => (
              <div key={i} className="py-[11px] border-b border-border last:border-b-0 cursor-pointer hover:opacity-80 transition-opacity">
                <div className="flex items-center gap-1.5 mb-[3px]">
                  <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-[0.5px]">{n.src}</span>
                  <span className="text-[10px] text-muted-foreground">• {n.time}</span>
                  <span className="text-[10px] px-[5px] py-px rounded-sm bg-accent-dim text-primary">{n.tags[0]}</span>
                  <span className={`ml-auto text-[10px] font-semibold ${n.sent === 'bullish' ? 'text-primary' : 'text-destructive'}`}>● {n.sent}</span>
                </div>
                <div className="text-[13px] text-foreground leading-relaxed">{n.headline}</div>
              </div>
            ))}
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
                  <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} />
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
              <span className="font-display text-[13px] font-bold">Trending Tickers</span>
              <div className="ml-auto w-1.5 h-1.5 bg-destructive rounded-full" />
            </div>
            <div className="p-3.5">
              {trending.map(([sym, vol, up]) => (
                <div key={sym} className="flex items-center justify-between py-[7px] border-b border-border text-xs last:border-b-0">
                  <span className="font-mono font-semibold">{sym}</span>
                  <span className="text-muted-foreground">{vol}</span>
                  <span className={up ? 'text-primary' : 'text-destructive'}>{up ? '▲' : '▼'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
