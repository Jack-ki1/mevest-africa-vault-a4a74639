import { usePortfolio } from '@/context/PortfolioContext';

/**
 * Advanced Analytics page.
 *
 * NOTE: Previous versions of this page generated random walks, fabricated
 * Sharpe/Beta/Volatility numbers, and produced random correlation matrices and
 * monthly returns. Showing fabricated financial data to users is unacceptable
 * in any context — and dangerous in a regulated context. All metrics now show
 * "—" with a clear "Coming soon" badge until they are computed from actual
 * portfolio history (requires the planned `portfolio_snapshots` table and a
 * daily snapshot job).
 */
export default function AnalyticsPage() {
  const { holdings } = usePortfolio();
  const n = holdings.length;

  const kpis = [
    { l: 'CAGR', s: '5-yr compound return' },
    { l: 'Sharpe Ratio', s: 'Risk-adjusted return' },
    { l: 'Max Drawdown', s: 'Peak-to-trough' },
    { l: 'Volatility', s: 'Annualised std dev' },
    { l: 'TWR', s: 'Time-weighted return' },
    { l: 'MWR', s: 'Money-weighted return' },
    { l: 'Calmar Ratio', s: 'CAGR / Max drawdown' },
    { l: 'Sortino Ratio', s: 'Downside risk adj.' },
  ];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Advanced Analytics</div>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-amber bg-amber/10 border border-amber/20 px-2 py-1 rounded-md">Coming Soon</span>
      </div>

      <div className="bg-amber/5 border border-amber/20 rounded-xl p-3.5">
        <div className="text-xs text-foreground font-semibold mb-1">Analytics under construction</div>
        <div className="text-[11px] text-muted-foreground leading-relaxed">
          Risk metrics, drawdown charts, correlation matrices and monthly returns require historical
          portfolio snapshots and benchmark series we have not yet started recording. To avoid showing
          you fabricated data, every metric below is intentionally blank. This page will populate
          automatically once daily snapshots have been captured.
        </div>
      </div>

      <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
        {kpis.map(k => (
          <div key={k.l} className="bg-card border border-border rounded-xl p-3.5">
            <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{k.l}</div>
            <div className="font-mono text-[19px] font-medium mt-[5px] text-muted-foreground">—</div>
            <div className="text-[11px] text-muted-foreground mt-[3px]">{k.s}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 max-lg:grid-cols-1 gap-3.5">
        {[
          { t: 'Portfolio vs Benchmark', sub: 'Awaiting daily portfolio snapshots vs S&P 500.' },
          { t: 'Drawdown Chart', sub: 'Awaiting peak-to-trough series.' },
          { t: 'Monthly Returns Heatmap', sub: 'Awaiting per-month return calculations.' },
          { t: 'Correlation Matrix', sub: 'Awaiting historical price series for each holding.' },
          { t: 'Beta vs Market', sub: 'Awaiting benchmark regression.' },
          { t: 'Return Distribution', sub: 'Awaiting daily return histogram.' },
        ].map(card => (
          <div key={card.t} className="bg-card border border-border rounded-xl p-3.5">
            <div className="font-display text-[13px] font-bold mb-2">{card.t}</div>
            <div className="text-[11px] text-muted-foreground leading-relaxed">{card.sub}</div>
            {n === 0 && <div className="text-[10px] text-muted-foreground mt-2">Add holdings to begin tracking.</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
