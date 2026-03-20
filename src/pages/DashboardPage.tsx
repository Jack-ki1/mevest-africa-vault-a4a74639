import { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { formatMoney, formatPct, genLine } from '@/data/market-data';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#5b9cf6', '#63d2aa', '#a78bfa', '#f5a623', '#f0616b', '#fb8c5a'];

export default function DashboardPage({ onAddHolding }: { onAddHolding: () => void }) {
  const { holdings } = usePortfolio();
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

  const perfData = useMemo(() => {
    if (!n) return [];
    const data = genLine(totalVal * 0.88, 90, 0.003);
    const now = new Date();
    return data.map((v, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (90 - i));
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), value: v };
    });
  }, [n, totalVal]);

  const allocData = useMemo(() => {
    if (!n) return [];
    const groups: Record<string, number> = {};
    holdings.forEach(h => { groups[h.type] = (groups[h.type] || 0) + h.shares * h.price; });
    return Object.entries(groups).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }));
  }, [holdings, n]);

  const allocTotal = allocData.reduce((a, b) => a + b.value, 0);

  const riskMetrics = [
    { l: 'Sharpe', v: '1.84', c: 'text-primary' },
    { l: 'Beta', v: '0.87', c: 'text-primary' },
    { l: 'Volatility', v: '14.2%', c: 'text-amber' },
    { l: 'Max DD', v: '-18.4%', c: 'text-destructive' },
    { l: 'CAGR', v: '19.9%', c: 'text-primary' },
    { l: 'TWR', v: '+32.1%', c: 'text-primary' },
  ];

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
              {['1W', '1M', '3M', '1Y', 'ALL'].map(tf => (
                <button key={tf} className={`px-2 py-1 rounded-md text-[11px] font-mono ${tf === '3M' ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {tf}
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
                  <XAxis dataKey="date" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} />
                  <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => ['$' + Math.round(v).toLocaleString(), 'Value']} />
                  <Area type="monotone" dataKey="value" stroke="#63d2aa" fill="url(#perfGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Allocation</span></div>
          <div className="p-3.5">
            {n === 0 ? (
              <EmptyState icon="🥧" title="No allocation" sub="Holdings will appear here once added." />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={allocData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} strokeWidth={0}>
                      {allocData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [(v / allocTotal * 100).toFixed(1) + '%']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2.5 space-y-[5px]">
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
