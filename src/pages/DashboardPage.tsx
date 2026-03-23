import { useState, useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { MARKET, FEAR_GREED, SECTOR_PERFORMANCE, formatMoney, formatPct, genLine } from '@/data/market-data';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';

const COLORS = ['#5b9cf6', '#63d2aa', '#a78bfa', '#f5a623', '#f0616b', '#fb8c5a'];
const TIMEFRAMES = [
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '1Y', days: 365 },
  { key: 'ALL', days: 730 },
];

export default function DashboardPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings } = usePortfolio();
  const [timeframe, setTimeframe] = useState('3M');
  const n = holdings.length;
  const totalVal = n ? holdings.reduce((s, h) => s + h.shares * h.price, 0) : 0;
  const totalCost = n ? holdings.reduce((s, h) => s + h.shares * h.cost, 0) : 0;
  const totalPL = totalVal - totalCost;
  const dayChg = totalVal * 0.0065;

  const stats = [
    { label: 'Portfolio Value', val: n ? formatMoney(totalVal) : null, chg: n ? '+0.65%' : null, up: true },
    { label: 'Total Invested', val: n ? formatMoney(totalCost) : null, chg: 'Cost basis', up: true },
    { label: 'Total P&L', val: n ? formatMoney(totalPL) : null, chg: n ? formatPct(totalPL / totalCost * 100) : null, up: totalPL >= 0 },
    { label: "Today's P&L", val: n ? formatMoney(dayChg) : null, chg: n ? '+0.65%' : null, up: true },
  ];

  const selectedDays = TIMEFRAMES.find(t => t.key === timeframe)?.days || 90;

  const perfData = useMemo(() => {
    if (!n) return [];
    const data = genLine(totalVal * 0.88, selectedDays, 0.003);
    const now = new Date();
    return data.map((v, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (selectedDays - i));
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: v };
    });
  }, [n, totalVal, selectedDays]);

  const allocData = useMemo(() => {
    if (!n) return [];
    const groups: Record<string, number> = {};
    holdings.forEach(h => { groups[h.type] = (groups[h.type] || 0) + h.shares * h.price; });
    return Object.entries(groups).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [holdings, n]);

  const allocTotal = allocData.reduce((a, b) => a + b.value, 0);

  // Market movers
  const allAssets = Object.entries(MARKET).map(([sym, a]) => ({ sym, ...a }));
  const gainers = [...allAssets].sort((a, b) => b.chgPct - a.chgPct).slice(0, 5);
  const losers = [...allAssets].sort((a, b) => a.chgPct - b.chgPct).slice(0, 5);

  const riskMetrics = [
    { l: 'Sharpe', v: '1.84', c: 'text-primary' },
    { l: 'Beta', v: '0.87', c: 'text-primary' },
    { l: 'Volatility', v: '14.2%', c: 'text-amber' },
    { l: 'Max DD', v: '-18.4%', c: 'text-destructive' },
    { l: 'CAGR', v: '19.9%', c: 'text-primary' },
    { l: 'TWR', v: '+32.1%', c: 'text-primary' },
  ];

  // Fear & Greed gauge
  const fg = FEAR_GREED;
  const fgColor = fg.value > 70 ? 'text-primary' : fg.value > 50 ? 'text-amber' : fg.value > 30 ? 'text-amber' : 'text-destructive';

  return (
    <div className="space-y-3.5">
      {/* Stats */}
      <div className="grid grid-cols-4 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3.5">
        {stats.map(s => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-3.5 hover:border-primary/20 transition-colors">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{s.label}</div>
            {s.val ? (
              <>
                <div className="font-mono text-[22px] font-medium text-foreground mt-[5px] mb-[3px] tracking-tight">{s.val}</div>
                <span className={`font-mono text-[11px] inline-flex items-center gap-[3px] px-1.5 py-0.5 rounded ${s.up ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>{s.chg}</span>
              </>
            ) : (
              <>
                <div className="font-mono text-[22px] font-medium text-muted-foreground mt-[5px] mb-[3px]">—</div>
                <span className="font-mono text-[11px] text-muted-foreground bg-glass px-1.5 py-0.5 rounded">No holdings</span>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Chart + Allocation */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Portfolio Performance</span>
            <div className="ml-auto flex gap-0.5 bg-secondary rounded-lg p-[3px]">
              {TIMEFRAMES.map(tf => (
                <button key={tf.key} onClick={() => setTimeframe(tf.key)} className={`px-2 py-1 rounded-md text-[11px] font-mono ${timeframe === tf.key ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tf.key}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3.5">
            {n === 0 ? (
              <EmptyState icon="📊" title="No portfolio data yet" sub="Add your first holding to see performance charts and analytics." onAdd={onAddHolding} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={perfData}>
                  <defs><linearGradient id="perfGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#63d2aa" stopOpacity={0.15} /><stop offset="100%" stopColor="#63d2aa" stopOpacity={0} /></linearGradient></defs>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(selectedDays / 6)} />
                  <YAxis tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => ['$' + Math.round(v).toLocaleString(), 'Value']} />
                  <Area type="monotone" dataKey="value" stroke="#63d2aa" fill="url(#perfGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="space-y-3.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Allocation</span></div>
            <div className="p-3.5">
              {n === 0 ? (
                <EmptyState icon="🥧" title="No allocation" sub="Holdings will appear here once added." />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={110}>
                    <PieChart>
                      <Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={30} outerRadius={48} paddingAngle={3} strokeWidth={0}>
                        {allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} formatter={(v: number) => [(v / allocTotal * 100).toFixed(1) + '%']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-2 space-y-[5px]">
                    {allocData.map((d, i) => (
                      <div key={d.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-sm" style={{ background: COLORS[i % COLORS.length] }} />
                          <span className="text-[11px] text-muted-foreground">{d.name}</span>
                        </div>
                        <span className="font-mono text-[11px]">{(d.value / allocTotal * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Fear & Greed */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Fear & Greed Index</span></div>
            <div className="p-3.5 text-center">
              <div className={`font-mono text-[36px] font-medium ${fgColor}`}>{fg.value}</div>
              <div className={`text-xs font-semibold ${fgColor}`}>{fg.label}</div>
              <div className="mt-2 h-2 rounded-full bg-glass overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: fg.value + '%', background: fg.value > 60 ? 'hsl(157 52% 60%)' : fg.value > 40 ? 'hsl(36 91% 55%)' : 'hsl(0 72% 60%)' }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>Extreme Fear</span><span>Extreme Greed</span>
              </div>
              <div className="mt-2 flex justify-between text-[10px]">
                <span className="text-muted-foreground">Previous: <span className="font-mono text-foreground">{fg.previous}</span></span>
                <span className="text-muted-foreground">1W Ago: <span className="font-mono text-foreground">{fg.oneWeekAgo}</span></span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Market Movers + Sector Performance */}
      <div className="grid grid-cols-3 max-lg:grid-cols-2 gap-3.5">
        {/* Gainers */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <TrendingUp className="w-3.5 h-3.5 text-primary mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Gainers</span>
          </div>
          <div className="p-1">
            {gainers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-glass rounded-lg">
                <div>
                  <div className="text-[12px] font-semibold">{a.sym}</div>
                  <div className="text-[10px] text-muted-foreground">{a.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px]">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end">
                    <ArrowUpRight className="w-3 h-3 text-primary" />
                    <span className="font-mono text-[10px] font-semibold text-primary">{formatPct(a.chgPct)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Losers */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <TrendingDown className="w-3.5 h-3.5 text-destructive mr-1.5" />
            <span className="font-display text-[13px] font-bold">Top Losers</span>
          </div>
          <div className="p-1">
            {losers.map(a => (
              <div key={a.sym} className="flex items-center justify-between px-3 py-[7px] hover:bg-glass rounded-lg">
                <div>
                  <div className="text-[12px] font-semibold">{a.sym}</div>
                  <div className="text-[10px] text-muted-foreground">{a.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-[11px]">${a.price.toLocaleString()}</div>
                  <div className="flex items-center gap-0.5 justify-end">
                    <ArrowDownRight className="w-3 h-3 text-destructive" />
                    <span className="font-mono text-[10px] font-semibold text-destructive">{formatPct(a.chgPct)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sector Performance */}
        <div className="bg-card border border-border rounded-xl overflow-hidden max-lg:col-span-2">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Sector Performance (1D)</span></div>
          <div className="p-2.5 space-y-[5px]">
            {SECTOR_PERFORMANCE.sort((a, b) => b.chg1d - a.chg1d).slice(0, 8).map(s => (
              <div key={s.name} className="flex items-center gap-2">
                <span className="text-[10px] w-[75px] text-right text-muted-foreground truncate">{s.name}</span>
                <div className="flex-1 h-[12px] bg-glass rounded-sm overflow-hidden">
                  <div className={`h-full rounded-sm ${s.chg1d >= 0 ? 'bg-primary/50' : 'bg-destructive/50'}`} style={{ width: Math.min(Math.abs(s.chg1d) / 3 * 100, 100) + '%' }} />
                </div>
                <span className={`font-mono text-[10px] w-[42px] text-right font-semibold ${s.chg1d >= 0 ? 'text-primary' : 'text-destructive'}`}>{formatPct(s.chg1d)}</span>
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
            {n === 0 ? (
              <EmptyState icon="💼" title="No holdings added" sub="Start tracking your investments by adding your first holding." onAdd={onAddHolding} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px]">Asset</th>
                      <th className="text-right p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px]">Price</th>
                      <th className="text-right p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px]">Value</th>
                      <th className="text-right p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px]">P&L%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map(h => {
                      const mv = h.shares * h.price;
                      const pct = (h.price - h.cost) / h.cost * 100;
                      const up = pct >= 0;
                      return (
                        <tr key={h.sym} className="border-b border-border/50 hover:bg-glass">
                          <td className="p-[10px] px-[11px]">
                            <div className="flex items-center gap-[9px]">
                              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center text-[11px] font-bold font-mono" style={{ background: h.color + '22', color: h.color }}>
                                {h.sym.slice(0, 2)}
                              </div>
                              <div>
                                <div className="text-[13px] font-semibold text-foreground">{h.sym}</div>
                                <div className="text-[10px] text-muted-foreground font-mono">{h.name}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-right p-[10px] px-[11px] font-mono">${h.price.toLocaleString()}</td>
                          <td className="text-right p-[10px] px-[11px] font-mono">{formatMoney(mv)}</td>
                          <td className="text-right p-[10px] px-[11px]">
                            <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${up ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
                              {formatPct(pct)}
                            </span>
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
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Risk Metrics</span></div>
          <div className="p-3.5">
            {n === 0 ? (
              <EmptyState icon="📐" title="Risk metrics" sub="Add holdings to compute Sharpe, Beta, drawdown and more." />
            ) : (
              <div className="grid grid-cols-3 gap-[9px]">
                {riskMetrics.map(m => (
                  <div key={m.l} className="p-[9px] bg-secondary rounded-lg">
                    <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.4px]">{m.l}</div>
                    <div className={`font-mono text-[15px] font-medium mt-[3px] ${m.c}`}>{m.v}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Activity */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Recent Activity</span></div>
        <div className="p-3.5 text-xs">
          {n === 0 ? (
            <div className="text-center text-muted-foreground py-[18px]">No recent activity. Add holdings to begin.</div>
          ) : (
            holdings.slice(0, 5).map(h => (
              <div key={h.sym} className="flex items-center gap-2 py-[7px] border-b border-border">
                <span className="font-mono text-[10px] font-bold text-primary bg-accent-dim px-1.5 py-0.5 rounded-sm">BUY</span>
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
      <div className="text-4xl mb-3 opacity-40">{icon}</div>
      <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">{title}</div>
      <div className="text-xs text-muted-foreground leading-relaxed">{sub}</div>
      {onAdd && (
        <button onClick={onAdd} className="mt-3.5 px-[13px] py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:opacity-90">
          + Add Holding
        </button>
      )}
    </div>
  );
}
