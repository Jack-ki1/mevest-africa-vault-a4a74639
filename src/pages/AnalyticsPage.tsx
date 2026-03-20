import { useMemo } from 'react';
import { usePortfolio } from '@/context/PortfolioContext';
import { genLine } from '@/data/market-data';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPage() {
  const { holdings } = usePortfolio();
  const n = holdings.length;
  const totalVal = n ? holdings.reduce((s, h) => s + h.shares * h.price, 0) : 0;

  const kpis = [
    { l: 'CAGR', v: n ? '19.9%' : '—', s: '5-yr compound return', c: 'text-primary' },
    { l: 'Sharpe Ratio', v: n ? '1.84' : '—', s: 'Risk-adjusted return', c: 'text-primary' },
    { l: 'Max Drawdown', v: n ? '-18.4%' : '—', s: 'Peak-to-trough', c: 'text-destructive' },
    { l: 'Volatility', v: n ? '14.2%' : '—', s: 'Annualised std dev', c: 'text-amber' },
    { l: 'TWR', v: n ? '+32.1%' : '—', s: 'Time-weighted return', c: 'text-primary' },
    { l: 'MWR', v: n ? '+28.7%' : '—', s: 'Money-weighted return', c: 'text-primary' },
    { l: 'Calmar Ratio', v: n ? '1.08' : '—', s: 'CAGR / Max drawdown', c: 'text-primary' },
    { l: 'Sortino Ratio', v: n ? '2.31' : '—', s: 'Downside risk adj.', c: 'text-primary' },
  ];

  const benchData = useMemo(() => {
    if (!n) return [];
    const port = genLine(totalVal * 0.88, 90, 0.003);
    const bench = genLine(totalVal * 0.90, 90, 0.002);
    const now = new Date();
    return port.map((v, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (90 - i));
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), portfolio: v, sp500: bench[i] };
    });
  }, [n, totalVal]);

  const distData = ['-8%', '-6%', '-4%', '-2%', '0%', '2%', '4%', '6%', '8%'].map((l, i) => ({
    range: l, count: [2, 5, 12, 22, 34, 28, 18, 10, 4][i],
  }));

  const ddData = useMemo(() => {
    if (!n) return [];
    const now = new Date();
    let mx = 100, cv = 100;
    return Array.from({ length: 91 }, (_, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (90 - i));
      cv = cv * (1 + (Math.random() - 0.53) * 0.02);
      mx = Math.max(mx, cv);
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), dd: +((cv / mx - 1) * 100).toFixed(2) };
    });
  }, [n]);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const years = [2022, 2023, 2024, 2025];

  const syms = holdings.slice(0, 4).map(h => h.sym);
  const corrData = syms.map(() => syms.map(() => +(Math.random() * 0.6 + 0.4).toFixed(2)));
  syms.forEach((_, i) => corrData[i][i] = 1.00);

  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold tracking-tight">Advanced Analytics</div>

      {/* KPIs */}
      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
        {kpis.map(k => (
          <div key={k.l} className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{k.l}</div>
            <div className={`font-mono text-[19px] font-medium mt-[5px] ${k.v === '—' ? 'text-muted-foreground' : 'text-foreground'}`}>{k.v}</div>
            <div className="text-[11px] text-muted-foreground mt-[3px]">{k.s}</div>
          </div>
        ))}
      </div>

      {/* Bench + Distribution */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <span className="font-display text-[13px] font-bold">Portfolio vs Benchmark</span>
            <span className="text-[10px] text-muted-foreground ml-auto">S&P 500</span>
          </div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center py-10 text-muted-foreground text-xs">Add holdings to view</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={benchData}>
                  <defs>
                    <linearGradient id="benchGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#63d2aa" stopOpacity={0.15} /><stop offset="100%" stopColor="#63d2aa" stopOpacity={0} /></linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} interval={14} />
                  <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} />
                  <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} />
                  <Area type="monotone" dataKey="portfolio" stroke="#63d2aa" fill="url(#benchGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="sp500" stroke="#5b9cf6" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Return Distribution</span></div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center py-10 text-muted-foreground text-xs">No data</div> : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={distData}>
                  <XAxis dataKey="range" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <Bar dataKey="count" radius={3} fill="rgba(99,210,170,0.65)" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Drawdown + Beta + Correlation */}
      <div className="grid grid-cols-3 max-lg:grid-cols-2 gap-3.5">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Drawdown Chart</span></div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center py-8 text-muted-foreground text-xs">No data</div> : (
              <ResponsiveContainer width="100%" height={150}>
                <AreaChart data={ddData}>
                  <XAxis dataKey="date" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} interval={15} />
                  <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => v + '%'} />
                  <Area type="monotone" dataKey="dd" stroke="#f0616b" fill="rgba(240,97,107,0.1)" strokeWidth={1.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Beta vs Market</span></div>
          <div className="p-3.5">
            {n === 0 ? <div className="text-center py-8 text-muted-foreground text-xs">No holdings yet</div> : (
              <div className="text-center py-3">
                <div className="font-mono text-[44px] font-medium text-primary">0.87</div>
                <div className="text-[11px] text-muted-foreground mt-1">Portfolio Beta vs S&P 500</div>
                <div className="mt-2"><span className="font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded text-primary bg-accent-dim">Defensive</span></div>
                <div className="text-[11px] text-muted-foreground mt-2.5 leading-relaxed">13% lower systematic risk than the broader market.</div>
              </div>
            )}
          </div>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Correlation</span></div>
          <div className="p-3.5 text-[11px]">
            {n === 0 ? <div className="text-muted-foreground py-3">Add holdings to compute correlations.</div> : (
              <div className="overflow-x-auto">
                <table className="text-[10px] font-mono border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1" />
                      {syms.map(s => <th key={s} className="p-1 text-muted-foreground">{s}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {corrData.map((row, ri) => (
                      <tr key={ri}>
                        <td className="p-1 font-semibold text-muted-foreground">{syms[ri]}</td>
                        {row.map((v, ci) => (
                          <td key={ci} className={`p-1 text-center rounded-sm ${v > 0.8 ? 'bg-primary/20 text-primary' : v > 0.5 ? 'bg-chart-blue/20' : 'bg-glass'}`}>
                            {v.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-[15px] py-3 border-b border-border flex items-center">
          <span className="font-display text-[13px] font-bold">Monthly Returns Heatmap</span>
          <span className="text-[10px] text-muted-foreground ml-auto">2022 – 2025</span>
        </div>
        <div className="p-3.5">
          {n === 0 ? <div className="text-center py-10 text-muted-foreground text-xs">Add holdings to view monthly return heatmap.</div> : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-[11px] font-mono">
                <thead>
                  <tr>
                    <th className="p-1 px-2" />
                    {months.map(m => <th key={m} className="p-1 px-2 text-muted-foreground">{m}</th>)}
                    <th className="p-1 px-2 text-muted-foreground">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {years.map(y => {
                    const rs = months.map(() => +(Math.random() * 12 - 4).toFixed(1));
                    const ytd = rs.reduce((a, b) => a + b, 0).toFixed(1);
                    return (
                      <tr key={y}>
                        <td className="p-1 px-2 font-semibold text-muted-foreground">{y}</td>
                        {rs.map((r, i) => (
                          <td key={i} className={`p-1 px-2 text-center rounded-sm ${r > 0 ? 'text-primary' : 'text-destructive'}`}
                            style={{ background: r > 4 ? '#1a4a35' : r > 0 ? '#1a3a28' : r > -4 ? '#3a1a1a' : '#4a1010' }}>
                            {r > 0 ? '+' : ''}{r}%
                          </td>
                        ))}
                        <td className={`p-1 px-2 text-center font-bold ${parseFloat(ytd) > 0 ? 'text-primary' : 'text-destructive'}`}>
                          {parseFloat(ytd) > 0 ? '+' : ''}{ytd}%
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
    </div>
  );
}
