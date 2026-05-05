import { useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { MARKET, FEAR_GREED, SECTOR_PERFORMANCE, formatMoney, formatPct } from '@/data/market-data';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Zap } from 'lucide-react';
import AiInsightsPanel from '@/components/AiInsightsPanel';

const COLORS = ['hsl(218 90% 66%)', 'hsl(160 60% 52%)', 'hsl(258 89% 76%)', 'hsl(38 95% 55%)', 'hsl(0 76% 58%)', 'hsl(25 95% 55%)'];
const TIMEFRAMES = [
  { key: '1W', days: 7 }, { key: '1M', days: 30 }, { key: '3M', days: 90 }, { key: '1Y', days: 365 }, { key: 'ALL', days: 730 },
];

export default function DashboardPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings } = usePortfolio();
  const { prices, allAssets, lastUpdate } = useRealtimeMarket();
  const [timeframe, setTimeframe] = useState('3M');
  const n = holdings.length;

  // Use real-time prices for holdings
  const enrichedHoldings = holdings.map(h => {
    const livePrice = prices[h.sym]?.price || h.price;
    return { ...h, price: livePrice };
  });

  const totalVal = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.price, 0) : 0;
  const totalCost = n ? enrichedHoldings.reduce((s, h) => s + h.shares * h.cost, 0) : 0;
  const totalPL = totalVal - totalCost;
  const dayChg = n ? enrichedHoldings.reduce((s, h) => {
    const p = prices[h.sym];
    return s + (p ? p.chg * h.shares : 0);
  }, 0) : 0;
  const dayChgPct = totalVal > 0 ? (dayChg / totalVal * 100) : 0;

  const stats = [
    { label: 'Portfolio Value', val: n ? formatMoney(totalVal) : null, chg: n ? formatPct(dayChgPct) : null, up: dayChgPct >= 0 },
    { label: 'Total Invested', val: n ? formatMoney(totalCost) : null, chg: 'Cost basis', up: true },
    { label: 'Total P&L', val: n ? formatMoney(totalPL) : null, chg: n ? formatPct(totalPL / totalCost * 100) : null, up: totalPL >= 0 },
    { label: "Today's P&L", val: n ? formatMoney(dayChg) : null, chg: n ? formatPct(dayChgPct) : null, up: dayChgPct >= 0 },
  ];

  const selectedDays = TIMEFRAMES.find(t => t.key === timeframe)?.days || 90;
  // NOTE: Real portfolio history requires a portfolio_snapshots table populated by
  // a daily cron — until that exists we anchor the chart on the current real value
  // and only plot a single live point. No fabricated random walk.
  const perfData = useMemo(() => {
    if (!n) return [];
    const now = new Date();
    return [{ date: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: totalVal }];
  }, [n, totalVal, selectedDays]);

  const allocData = useMemo(() => {
    if (!n) return [];
    const groups: Record<string, number> = {};
    enrichedHoldings.forEach(h => { groups[h.type] = (groups[h.type] || 0) + h.shares * h.price; });
    return Object.entries(groups).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [enrichedHoldings, n]);
  const allocTotal = allocData.reduce((a, b) => a + b.value, 0);

  // Use real-time data for market movers
  const liveAssets = allAssets.filter(a => ['stock', 'crypto', 'etf'].includes(a.type));
  const gainers = [...liveAssets].sort((a, b) => b.chgPct - a.chgPct).slice(0, 5);
  const losers = [...liveAssets].sort((a, b) => a.chgPct - b.chgPct).slice(0, 5);

  // Risk metrics intentionally show "—" until we compute them from real history.
  const riskMetrics = [
    { l: 'Sharpe', v: '—', c: 'text-muted-foreground' }, { l: 'Beta', v: '—', c: 'text-muted-foreground' },
    { l: 'Volatility', v: '—', c: 'text-muted-foreground' }, { l: 'Max DD', v: '—', c: 'text-muted-foreground' },
    { l: 'CAGR', v: '—', c: 'text-muted-foreground' }, { l: 'TWR', v: '—', c: 'text-muted-foreground' },
  ];


  const fg = FEAR_GREED;
  const fgColor = fg.value > 70 ? 'text-primary' : fg.value > 40 ? 'text-amber' : 'text-destructive';

  return (
    <div className="space-y-3.5">
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/20 transition-colors group">
            <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.8px]">{s.label}</div>
            {s.val ? (
              <>
                <div className="font-mono text-[22px] font-semibold text-foreground mt-[5px] mb-[3px] tracking-tight tabular-nums">{s.val}</div>
                <span className={`font-mono text-[10px] font-semibold inline-flex items-center gap-[3px] px-1.5 py-0.5 rounded-md ${s.up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{s.chg}</span>
              </>
            ) : (
              <>
                <div className="font-mono text-[22px] font-medium text-muted-foreground/40 mt-[5px] mb-[3px]">—</div>
                <span className="font-mono text-[10px] text-muted-foreground bg-muted/30 px-1.5 py-0.5 rounded-md">No holdings</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* AI Insights */}
      <AiInsightsPanel />

      {/* Chart + Allocation */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Portfolio Performance</span>
            <div className="ml-auto flex gap-0.5 bg-secondary rounded-lg p-[2px]">
              {TIMEFRAMES.map(tf => (
                <button key={tf.key} onClick={() => setTimeframe(tf.key)} className={`px-2 py-1 rounded-md text-[11px] font-mono transition-colors ${timeframe === tf.key ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tf.key}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3.5">
            {n === 0 ? <EmptyState icon="📊" title="No portfolio data yet" sub="Add your first holding to see performance charts and analytics." onAdd={onAddHolding} /> : (
              <div className="space-y-2">
                <div className="text-[10px] text-amber bg-amber/10 border border-amber/20 rounded-md px-2 py-1.5">
                  ⚠️ Historical performance tracking is coming soon. Showing current portfolio value only.
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={perfData}>
                    <defs><linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(160 60% 52%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(160 60% 52%)" stopOpacity={0} /></linearGradient></defs>
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => ['$' + Math.round(v).toLocaleString(), 'Value']} />
                    <Area type="monotone" dataKey="value" stroke="hsl(160 60% 52%)" fill="url(#perfGrad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Allocation</span></div>
            <div className="p-3.5">
              {n === 0 ? <EmptyState icon="🥧" title="No allocation" sub="Holdings will appear here once added." /> : (
                <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart><Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={3} strokeWidth={0}>{allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [(v / allocTotal * 100).toFixed(1) + '%']} /></PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-[5px]">
                    {allocData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} /><span className="text-[11px] text-muted-foreground">{d.name}</span></div>
                        <span className="font-mono text-[11px] tabular-nums">{(d.value / allocTotal * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Fear & Greed Index</span></div>
            <div className="p-3.5 text-center">
              <div className={`font-mono text-[36px] font-semibold ${fgColor}`}>{fg.value}</div>
              <div className={`text-xs font-semibold ${fgColor}`}>{fg.label}</div>
              <div className="mt-2 h-2 rounded-full bg-muted/30 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: fg.value + '%', background: fg.value > 60 ? 'hsl(160 60% 52%)' : fg.value > 40 ? 'hsl(38 95% 55%)' : 'hsl(0 76% 58%)' }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1"><span>Extreme Fear</span><span>Extreme Greed</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Movers with LIVE data */}
      <div className="grid grid-cols-3 max-lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Gainers</span>
            <Zap className="w-2.5 h-2.5 text-primary ml-auto fill-primary" />
          </div>
          <div className="p-1">
            {gainers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-muted/30 rounded-lg transition-colors">
                <div><div className="text-[12px] font-semibold">{a.sym}</div><div className="text-[10px] text-muted-foreground">{a.name}</div></div>
                <div className="text-right">
                  <div className="font-mono text-[11px] tabular-nums">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end"><ArrowUpRight className="w-3 h-3 text-primary" /><span className="font-mono text-[10px] font-semibold text-primary tabular-nums">{formatPct(a.chgPct)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <TrendingDown className="w-3.5 h-3.5 text-destructive mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Losers</span>
            <Zap className="w-2.5 h-2.5 text-destructive ml-auto fill-destructive" />
          </div>
          <div className="p-1">
            {losers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-muted/30 rounded-lg transition-colors">
                <div><div className="text-[12px] font-semibold">{a.sym}</div><div className="text-[10px] text-muted-foreground">{a.name}</div></div>
                <div className="text-right">
                  <div className="font-mono text-[11px] tabular-nums">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end"><ArrowDownRight className="w-3 h-3 text-destructive" /><span className="font-mono text-[10px] font-semibold text-destructive tabular-nums">{formatPct(a.chgPct)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden max-lg:col-span-2">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Sector Performance (1D)</span></div>
          <div className="p-2.5 space-y-[5px]">
            {SECTOR_PERFORMANCE.sort((a, b) => b.chg1d - a.chg1d).slice(0, 8).map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-[10px] w-[75px] text-right text-muted-foreground truncate">{s.name}</span>
                <div className="flex-1 h-[12px] bg-muted/20 rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm ${s.chg1d >= 0 ? 'bg-primary/40' : 'bg-destructive/40'}`} style={{ width: Math.min(Math.abs(s.chg1d) / 3 * 100, 100) + '%' }} />
                </div>
                <span className={`font-mono text-[10px] w-[42px] text-right font-semibold tabular-nums ${s.chg1d >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPct(s.chg1d)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Holdings + Risk */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Holdings</span>
            <span className="text-[10px] text-muted-foreground ml-auto">{n} position{n !== 1 ? 's' : ''}</span>
          </div>
          <div>
            {n === 0 ? <EmptyState icon="💼" title="No holdings added" sub="Start tracking your investments by adding your first holding." onAdd={onAddHolding} /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="border-b border-border">
                    <th className="text-left p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Asset</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Price</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">Value</th>
                    <th className="text-right p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px]">P&L%</th>
                  </tr></thead>
                  <tbody>
                    {enrichedHoldings.map(h => {
                      const mv = h.shares * h.price;
                      const pct = (h.price - h.cost) / h.cost * 100;
                      const up = pct >= 0;
                      const flash = prices[h.sym] && prices[h.sym].price > prices[h.sym].prevPrice ? 'price-up' : prices[h.sym] && prices[h.sym].price < prices[h.sym].prevPrice ? 'price-down' : '';
                      return (
                        <tr key={h.sym} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="p-[10px] px-[11px]">
                            <div className="flex items-center gap-[9px]">
                              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: h.color + '18', color: h.color }}>{h.sym.slice(0, 2)}</div>
                              <div><div className="text-[13px] font-semibold text-foreground">{h.sym}</div><div className="text-[10px] text-muted-foreground font-mono">{h.name}</div></div>
                            </div>
                          </td>
                          <td className={`text-right p-[10px] px-[11px] font-mono tabular-nums ${flash}`}>${h.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="text-right p-[10px] px-[11px] font-mono tabular-nums">{formatMoney(mv)}</td>
                          <td className="text-right p-[10px] px-[11px]">
                            <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded-md tabular-nums ${up ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(pct)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center"><span className="font-display text-[13px] font-bold">Risk Metrics</span><span className="ml-auto text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Coming Soon</span></div>
          <div className="p-3.5">
            {n === 0 ? <EmptyState icon="📐" title="Risk metrics" sub="Add holdings to compute Sharpe, Beta, drawdown and more." /> : (
              <>
                <div className="text-[10px] text-muted-foreground mb-2">Risk analytics require historical data we are still collecting.</div>
                <div className="grid grid-cols-3 gap-[9px]">
                  {riskMetrics.map(m => (
                    <div key={m.l} className="p-[9px] bg-secondary/50 rounded-lg border border-border/30">
                      <div className="text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.4px]">{m.l}</div>
                      <div className={`font-mono text-[15px] font-semibold mt-[3px] tabular-nums ${m.c}`}>{m.v}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Recent Activity</span></div>
        <div className="p-3.5 text-xs">
          {n === 0 ? <div className="text-center text-muted-foreground py-[18px]">No recent activity. Add holdings to begin.</div> : (
            enrichedHoldings.slice(0, 5).map(h => (
              <div key={h.sym} className="flex items-center gap-2 py-[7px] border-b border-border/30">
                <span className="font-mono text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm">BUY</span>
                <span className="font-semibold">{h.sym}</span>
                <span className="text-muted-foreground text-[11px] flex-1">{h.shares} shares @ ${h.cost.toLocaleString()}</span>
                <span className="text-[10px] text-muted-foreground">Manual</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, sub, onAdd }: { icon: string; title: string; sub: string; onAdd?: () => void }) {
  return (
    <div className="text-center py-10 px-5">
      <div className="text-4xl mb-3 opacity-30">{icon}</div>
      <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{sub}</div>
      {onAdd && <button onClick={onAdd} className="mt-3.5 px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">+ Add Holding</button>}
    </div>
  );
}
