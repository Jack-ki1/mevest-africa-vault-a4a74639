import { useState } from 'react';
import { EARNINGS_CALENDAR, ECONOMIC_CALENDAR } from '@/data/market-data';

const TABS = ['earnings', 'economic'] as const;

export default function CalendarPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('earnings');
  const [earningsWeek, setEarningsWeek] = useState('this');
  const [ecoImpact, setEcoImpact] = useState('all');

  const filteredEarnings = EARNINGS_CALENDAR.sort((a, b) => a.date.localeCompare(b.date));

  const filteredEco = ecoImpact === 'all'
    ? ECONOMIC_CALENDAR
    : ECONOMIC_CALENDAR.filter(e => e.impact === ecoImpact);

  const impactColors: Record<string, string> = {
    high: 'bg-destructive/80 text-destructive-foreground',
    medium: 'bg-amber/60 text-amber-foreground',
    low: 'bg-glass text-muted-foreground',
  };

  const timeColors: Record<string, string> = {
    BMO: 'text-chart-blue bg-chart-blue/10',
    AMC: 'text-amber bg-amber-dim',
    DMH: 'text-muted-foreground bg-glass',
  };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight">Calendar</div>
          <div className="text-xs text-muted-foreground mt-0.5">Earnings releases & economic events</div>
        </div>
        <div className="flex gap-0.5 bg-secondary rounded-lg p-[3px]">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize ${tab === t ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'earnings' ? '📊 Earnings' : '🌐 Economic'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'earnings' ? (
        <div className="space-y-3.5">
          {/* Summary cards */}
          <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
            {[
              { l: 'This Week', v: filteredEarnings.filter(e => e.date <= '2026-03-28').length, s: 'reporting companies' },
              { l: 'Next Week', v: filteredEarnings.filter(e => e.date > '2026-03-28' && e.date <= '2026-04-04').length, s: 'reporting companies' },
              { l: 'Avg EPS Growth', v: '+8.2%', s: 'consensus estimate' },
              { l: 'Beat Rate (LQ)', v: '78%', s: 'of companies beat' },
            ].map(c => (
              <div key={c.l} className="bg-card border border-border rounded-xl p-3.5">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{c.l}</div>
                <div className="font-mono text-[22px] font-medium text-foreground mt-[5px]">{c.v}</div>
                <div className="text-[11px] text-muted-foreground mt-[3px]">{c.s}</div>
              </div>
            ))}
          </div>

          {/* Earnings table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center">
              <span className="font-display text-[13px] font-bold">Upcoming Earnings</span>
              <div className="ml-auto flex items-center gap-[5px] text-[10px] font-semibold text-primary">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse-dot" />LIVE
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Time', 'Company', 'EPS Est.', 'EPS Prior', 'Rev Est.', 'Rev Prior', 'Surprise Potential'].map(h => (
                      <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['EPS Est.', 'EPS Prior', 'Rev Est.', 'Rev Prior'].includes(h) ? 'text-right' : h === 'Surprise Potential' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEarnings.map(e => {
                    const epsGrowth = ((e.epsEstimate - e.epsPrior) / e.epsPrior * 100);
                    return (
                      <tr key={e.sym + e.date} className="border-b border-border/50 hover:bg-glass">
                        <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                        <td className="p-[10px] px-[11px]">
                          <span className={`text-[10px] font-bold px-[7px] py-0.5 rounded-sm ${timeColors[e.time]}`}>{e.time}</span>
                        </td>
                        <td className="p-[10px] px-[11px]">
                          <div className="font-bold text-[13px]">{e.sym}</div>
                          <div className="text-[10px] text-muted-foreground">{e.name}</div>
                        </td>
                        <td className="text-right p-[10px] px-[11px] font-mono font-semibold">${e.epsEstimate.toFixed(2)}</td>
                        <td className="text-right p-[10px] px-[11px] font-mono text-muted-foreground">${e.epsPrior.toFixed(2)}</td>
                        <td className="text-right p-[10px] px-[11px] font-mono font-semibold">{e.revenueEstimate}</td>
                        <td className="text-right p-[10px] px-[11px] font-mono text-muted-foreground">{e.revenuePrior}</td>
                        <td className="text-center p-[10px] px-[11px]">
                          <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${epsGrowth >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
                            {epsGrowth >= 0 ? '+' : ''}{epsGrowth.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Filters */}
          <div className="flex gap-2">
            <span className="text-[10px] text-muted-foreground font-semibold self-center">IMPACT:</span>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setEcoImpact(f)}
                className={`px-[11px] py-[5px] rounded-md text-xs border capitalize ${ecoImpact === f ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>

          {/* Economic events table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center">
              <span className="font-display text-[13px] font-bold">Economic Calendar</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{filteredEco.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    {['Date', 'Time', 'Country', 'Event', 'Impact', 'Forecast', 'Previous'].map(h => (
                      <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['Forecast', 'Previous'].includes(h) ? 'text-right' : h === 'Impact' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEco.map((e, i) => (
                    <tr key={i} className="border-b border-border/50 hover:bg-glass">
                      <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</td>
                      <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{e.time}</td>
                      <td className="p-[10px] px-[11px]">
                        <span className="text-[13px]">{e.flag}</span>
                        <span className="ml-1.5 font-semibold">{e.country}</span>
                      </td>
                      <td className="p-[10px] px-[11px] font-semibold text-foreground">{e.event}</td>
                      <td className="text-center p-[10px] px-[11px]">
                        <span className={`text-[10px] font-bold px-[7px] py-0.5 rounded-sm uppercase ${impactColors[e.impact]}`}>{e.impact}</span>
                      </td>
                      <td className="text-right p-[10px] px-[11px] font-mono font-semibold">{e.forecast}</td>
                      <td className="text-right p-[10px] px-[11px] font-mono text-muted-foreground">{e.previous}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
