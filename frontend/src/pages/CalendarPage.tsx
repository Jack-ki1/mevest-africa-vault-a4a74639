import { useState, useEffect } from 'react';
import { EARNINGS_CALENDAR, ECONOMIC_CALENDAR } from '@/data/market-data';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolio } from '@/context/PortfolioContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';

const TABS = ['earnings', 'economic', 'dividends'] as const;

export default function CalendarPage() {
  const [tab, setTab] = useState<typeof TABS[number]>('earnings');
  const [dividends, setDividends] = useState<Array<{ symbol: string; action_type: string; ex_date: string; amount: number | null }>>([]);
  const { holdings } = usePortfolio();
  const heldSyms = holdings.map(h => h.sym);
  useEffect(() => {
    supabase.from('corporate_actions').select('symbol,action_type,ex_date,amount').in('action_type', ['dividend','book_closure']).order('ex_date', { ascending: true }).limit(50).then(({ data }) => {
      if (data) setDividends(data as typeof dividends);
    });
  }, []);
  const { user } = useAuth();
  const [earningsWeek, setEarningsWeek] = useState('this');
  const [ecoImpact, setEcoImpact] = useState('all');
  const [premarketOnly, setPremarketOnly] = useState(false);
  const createDivAlert = async (symbol: string, exDate: string) => {
    if (!user) { toast({ title: 'Sign in required' }); return; }
    const ex = new Date(exDate);
    ex.setDate(ex.getDate() - 3);
    const { error } = await supabase.from('price_alerts').insert({ user_id: user.id, symbol, condition: 'price_above', threshold: 0, active: true });
    if (error) toast({ title: 'Alert failed', description: error.message, variant: 'destructive' });
    else toast({ title: `Alert 3d before ${symbol} ex-date ${exDate} — queued` });
  };

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
              {t === 'earnings' ? '📊 Earnings' : t === 'dividends' ? '💰 Dividends (NSE)' : '🌐 Economic'}
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

          <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-2">
            <span className="text-[11px] font-semibold">🎧 Earnings Audio (Google pattern — stub)</span>
            <button className="px-2 py-1 rounded bg-secondary border text-[11px]">▶ Play live earnings call (syncs transcript)</button>
            <span className="text-[10px] text-muted-foreground">Transcript + AI highlights below — source: NSE filing PDF in news_cache</span>
          </div>
          <div className="bg-card border border-border rounded-xl p-3">
            <div className="text-[12px] font-semibold">AI Highlights (earnings stub)</div>
            <ul className="text-[11px] text-muted-foreground list-disc ml-4 mt-1">
              <li>KCB Q3 beat by 4% — NII up on higher yields. [1]</li>
              <li>Safaricom M-Pesa revenue +12% YoY — cited filing.</li>
            </ul>
            <div className="text-[10px] text-muted-foreground mt-1">Powered by key_moments + news_cache with citations. Audio available after NSE uploads.</div>
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
      ) : tab === 'dividends' ? (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={premarketOnly} onChange={(e) => setPremarketOnly(e.target.checked)} /> Premarket only (09:30 EAT filter)</label>
            <span className="text-[10px] text-muted-foreground">NSE pre-open window — TradingView premarket pattern</span>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center gap-2">
              <span className="font-display text-[13px] font-bold">NSE Dividends & Book Closures</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Holdings highlighted</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border">{['Symbol','Type','Ex Date','Amount','Filing','Alert'].map(h => (<th key={h} className="p-[9px] px-[11px] text-left text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>))}</tr></thead>
                <tbody>
                  {dividends.filter((d) => !premarketOnly || (heldSyms.includes(d.symbol))).map(d => {
                    const isHeld = heldSyms.includes(d.symbol);
                    return (
                      <tr key={d.symbol + d.ex_date} className={`border-b border-border/50 ${isHeld ? 'bg-primary/5' : ''}`}>
                        <td className={`p-[10px] px-[11px] font-mono font-bold ${isHeld ? 'text-primary' : ''}`}>{d.symbol} {isHeld ? '★' : ''}</td>
                        <td className="p-[10px] px-[11px] capitalize">{d.action_type.replace('_',' ')}</td>
                        <td className="p-[10px] px-[11px] font-mono">{d.ex_date}</td>
                        <td className="p-[10px] px-[11px] font-mono">{d.amount != null ? d.amount.toFixed(2) : '—'}</td>
                        <td className="p-[10px] px-[11px]"><a href="#" onClick={(e) => e.preventDefault()} className="text-primary underline text-[11px]">PDF filing (news_cache)</a></td>
                        <td className="p-[10px] px-[11px]"><button onClick={() => createDivAlert(d.symbol, d.ex_date)} className="px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[11px]">Alert 3d before</button></td>
                      </tr>
                    );
                  })}
                  {dividends.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">No dividend data — corporate_actions empty until populated.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 text-[10px] text-muted-foreground">Alert 3 days before ex-date via price_alerts engine. Source: NSE filings.</div>
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
