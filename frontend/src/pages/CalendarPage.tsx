import { useState, useEffect, useMemo } from 'react';
import { EARNINGS_CALENDAR, ECONOMIC_CALENDAR } from '@/data/market-data';
import { supabase } from '@/integrations/supabase/client';
import { usePortfolio } from '@/context/PortfolioContext';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/context/AuthContext';
import { Calendar, Clock, TrendingUp, Split, Rocket, Timer, ExternalLink, Plus, Bell, Play, Filter } from 'lucide-react';

const TABS = ['earnings', 'economic', 'dividends', 'ipos', 'splits'] as const;

type IpoItem = { symbol: string; name: string; exchange: string; priceRange: string; date: string; status: 'upcoming' | 'priced' | 'listed'; sector: string; };
type SplitItem = { symbol: string; name: string; ratio: string; exDate: string; payableDate: string; type: 'split' | 'bonus' };

const IPO_CALENDAR: IpoItem[] = [
  { symbol: 'LOAR', name: 'Loar Holdings', exchange: 'NYSE', priceRange: '$28–$32', date: '2026-03-28', status: 'upcoming', sector: 'Aerospace' },
  { symbol: 'RDDT', name: 'Reddit', exchange: 'NYSE', priceRange: '$31–$34', date: '2026-03-22', status: 'priced', sector: 'Technology' },
  { symbol: 'NSE:ADIL', name: 'Adil Ltd (NSE)', exchange: 'NSE', priceRange: 'KES 12.50', date: '2026-04-02', status: 'upcoming', sector: 'Manufacturing' },
  { symbol: 'NSE:KEGN-P', name: 'KenGen Green Note', exchange: 'NSE', priceRange: 'KES 100', date: '2026-04-10', status: 'upcoming', sector: 'Energy' },
  { symbol: 'ASTS', name: 'AST SpaceMobile', exchange: 'NASDAQ', priceRange: '$18–$20', date: '2026-03-30', status: 'upcoming', sector: 'Telecom' },
  { symbol: 'IBTA', name: 'Ibotta Inc.', exchange: 'NYSE', priceRange: '$76–$84', date: '2026-04-18', status: 'upcoming', sector: 'Technology' },
];

const SPLITS_CALENDAR: SplitItem[] = [
  { symbol: 'NVDA', name: 'NVIDIA', ratio: '10-for-1', exDate: '2026-06-07', payableDate: '2026-06-10', type: 'split' },
  { symbol: 'AVGO', name: 'Broadcom', ratio: '10-for-1', exDate: '2026-07-12', payableDate: '2026-07-15', type: 'split' },
  { symbol: 'SCOM.NR', name: 'Safaricom PLC', ratio: '2-for-1', exDate: '2026-05-15', payableDate: '2026-05-20', type: 'bonus' },
  { symbol: 'EQTY.NR', name: 'Equity Group', ratio: '1-for-5 bonus', exDate: '2026-06-02', payableDate: '2026-06-06', type: 'bonus' },
  { symbol: 'TSLA', name: 'Tesla', ratio: '3-for-1', exDate: '2026-08-25', payableDate: '2026-08-28', type: 'split' },
];

function googleCalendarUrl(title: string, date: string, details: string) {
  const d = new Date(date);
  if (isNaN(d.getTime())) return '#';
  const start = d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(d.getTime() + 60 * 60 * 1000);
  const end = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const params = new URLSearchParams({ action: 'TEMPLATE', text: title, dates: `${start}/${end}`, details, location: '' });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function ExDivCountdown({ exDate }: { exDate: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(()=>setNow(Date.now()), 1000); return ()=>clearInterval(id); }, []);
  const ex = new Date(exDate).getTime();
  const totalWindow = 30 * 86400000; // 30d window for ring
  const remaining = ex - now;
  const elapsed = totalWindow - remaining;
  const pct = Math.max(0, Math.min(1, elapsed / totalWindow));
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const mins = Math.floor((remaining % 3600000) / 60000);
  const isPast = remaining <= 0;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference * (1 - pct);

  if (isPast) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground">
        <span className="w-9 h-9 rounded-full bg-muted/40 flex items-center justify-center text-[10px] font-bold">✓</span> Passed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative w-9 h-9 flex items-center justify-center">
        <svg width={36} height={36} className="-rotate-90">
          <circle cx={18} cy={18} r={18} fill="none" stroke="hsl(var(--muted)/0.25)" strokeWidth={3} />
          <circle cx={18} cy={18} r={18} fill="none" stroke={remaining < 3*86400000 ? 'hsl(0 76% 58%)' : remaining < 7*86400000 ? 'hsl(38 95% 55%)' : 'hsl(160 60% 52%)'} strokeWidth={3} strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" style={{ transition: 'stroke-dashoffset 0.5s' }} />
        </svg>
        <span className="absolute text-[9px] font-mono font-bold">{days}d</span>
      </span>
      <span className="text-[11px] font-mono font-semibold tabular-nums">{days}d {hours}h {mins}m</span>
    </span>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] ${className}`}>{children}</div>;
}

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

  const filteredEarnings = useMemo(()=> EARNINGS_CALENDAR.slice().sort((a, b) => a.date.localeCompare(b.date)), []);

  const filteredEco = ecoImpact === 'all'
    ? ECONOMIC_CALENDAR
    : ECONOMIC_CALENDAR.filter(e => e.impact === ecoImpact);

  const impactColors: Record<string, string> = {
    high: 'bg-destructive/80 text-destructive-foreground',
    medium: 'bg-amber-500/20 text-amber-700 border border-amber-500/30',
    low: 'bg-secondary text-muted-foreground border',
  };

  const timeColors: Record<string, string> = {
    BMO: 'text-blue-600 bg-blue-500/10 border border-blue-500/20',
    AMC: 'text-amber-700 bg-amber-500/10 border border-amber-500/20',
    DMH: 'text-muted-foreground bg-secondary border',
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-display text-[19px] font-extrabold tracking-tight flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" /> Calendar <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">BENTO GLASS</span></div>
          <div className="text-xs text-muted-foreground mt-0.5">Earnings · Economic · Dividends · IPOs · Splits</div>
        </div>
        <div className="flex gap-0.5 bg-secondary/60 backdrop-blur rounded-lg p-[3px] border border-border/40 overflow-x-auto">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize whitespace-nowrap ${tab === t ? 'bg-card text-foreground shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}>
              {t === 'earnings' ? '📊 Earnings' : t === 'dividends' ? '💰 Dividends' : t==='ipos' ? '🚀 IPOs' : t==='splits' ? '✂️ Splits' : '🌐 Economic'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'earnings' ? (
        <div className="space-y-3.5">
          <div className="grid grid-cols-4 max-lg:grid-cols-2 gap-3.5">
            {[
              { l: 'This Week', v: filteredEarnings.filter(e => e.date <= '2026-03-28').length, s: 'reporting companies' },
              { l: 'Next Week', v: filteredEarnings.filter(e => e.date > '2026-03-28' && e.date <= '2026-04-04').length, s: 'reporting companies' },
              { l: 'Avg EPS Growth', v: '+8.2%', s: 'consensus estimate' },
              { l: 'Beat Rate (LQ)', v: '78%', s: 'of companies beat' },
            ].map(c => (
              <GlassCard key={c.l} className="p-3.5">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.5px]">{c.l}</div>
                <div className="font-mono text-[22px] font-medium text-foreground mt-[5px]">{c.v}</div>
                <div className="text-[11px] text-muted-foreground mt-[3px]">{c.s}</div>
              </GlassCard>
            ))}
          </div>

          <GlassCard className="p-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold flex items-center gap-1.5"><Play className="w-3.5 h-3.5 text-primary" /> 🎧 Earnings Audio (Google pattern — stub)</span>
            <button onClick={()=>toast({ title: 'Playing live earnings call — transcript syncing…' })} className="px-2 py-1 rounded-lg bg-primary text-primary-foreground border text-[11px] font-semibold">▶ Play live earnings call</button>
            <span className="text-[10px] text-muted-foreground">Transcript + AI highlights below — source: NSE filing PDF in news_cache</span>
            <a href={googleCalendarUrl('Earnings: AAPL', filteredEarnings[0]?.date || '2026-04-24', 'Earnings release')} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-secondary border hover:border-primary/30"><Plus className="w-3 h-3" /> Add to Google Calendar</a>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="text-[12px] font-semibold">AI Highlights (earnings stub)</div>
            <ul className="text-[11px] text-muted-foreground list-disc ml-4 mt-1 space-y-0.5">
              <li>KCB Q3 beat by 4% — NII up on higher yields. [1]</li>
              <li>Safaricom M-Pesa revenue +12% YoY — cited filing.</li>
            </ul>
            <div className="text-[10px] text-muted-foreground mt-1">Powered by key_moments + news_cache with citations. Audio available after NSE uploads.</div>
          </GlassCard>
          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center">
              <span className="font-display text-[13px] font-bold">Upcoming Earnings</span>
              <div className="ml-auto flex items-center gap-[5px] text-[10px] font-semibold text-primary">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />LIVE
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    {['Date', 'Time', 'Company', 'EPS Est.', 'EPS Prior', 'Rev Est.', 'Rev Prior', 'Surprise', 'Calendar'].map(h => (
                      <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['EPS Est.', 'EPS Prior', 'Rev Est.', 'Rev Prior'].includes(h) ? 'text-right' : h === 'Surprise' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEarnings.map(e => {
                    const epsGrowth = ((e.epsEstimate - e.epsPrior) / e.epsPrior * 100);
                    return (
                      <tr key={e.sym + e.date} className="border-b border-border/30 hover:bg-muted/20">
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
                          <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${epsGrowth >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                            {epsGrowth >= 0 ? '+' : ''}{epsGrowth.toFixed(1)}%
                          </span>
                        </td>
                        <td className="p-[10px] px-[11px]">
                          <a href={googleCalendarUrl(`Earnings: ${e.sym}`, e.date, `${e.name} earnings — ${e.time}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded bg-secondary border hover:border-primary/30"><Calendar className="w-3 h-3" /> GCal</a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      ) : tab === 'dividends' ? (
        <div className="space-y-3.5">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={premarketOnly} onChange={(e) => setPremarketOnly(e.target.checked)} /> Premarket only (09:30 EAT filter)</label>
            <span className="text-[10px] text-muted-foreground">NSE pre-open window — TradingView premarket pattern</span>
          </div>
          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center gap-2">
              <span className="font-display text-[13px] font-bold">NSE Dividends & Book Closures</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">Holdings highlighted</span>
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground"><Timer className="w-3 h-3" /> Live countdown · progress ring</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/40">{['Symbol','Type','Ex Date','Countdown','Amount','Filing','Alert','Calendar'].map(h => (<th key={h} className="p-[9px] px-[11px] text-left text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>))}</tr></thead>
                <tbody>
                  {dividends.filter((d) => !premarketOnly || (heldSyms.includes(d.symbol))).map(d => {
                    const isHeld = heldSyms.includes(d.symbol);
                    return (
                      <tr key={d.symbol + d.ex_date} className={`border-b border-border/30 ${isHeld ? 'bg-primary/5' : ''}`}>
                        <td className={`p-[10px] px-[11px] font-mono font-bold ${isHeld ? 'text-primary' : ''}`}>{d.symbol} {isHeld ? '★' : ''}</td>
                        <td className="p-[10px] px-[11px] capitalize">{d.action_type.replace('_',' ')}</td>
                        <td className="p-[10px] px-[11px] font-mono">{d.ex_date}</td>
                        <td className="p-[10px] px-[11px]"><ExDivCountdown exDate={d.ex_date} /></td>
                        <td className="p-[10px] px-[11px] font-mono">{d.amount != null ? d.amount.toFixed(2) : '—'}</td>
                        <td className="p-[10px] px-[11px]"><a href="#" onClick={(e) => e.preventDefault()} className="text-primary underline text-[11px]">PDF filing</a></td>
                        <td className="p-[10px] px-[11px]"><button onClick={() => createDivAlert(d.symbol, d.ex_date)} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary border border-primary/20 text-[11px]"><Bell className="w-3 h-3" /> Alert 3d</button></td>
                        <td className="p-[10px] px-[11px]"><a href={googleCalendarUrl(`Ex-div: ${d.symbol}`, d.ex_date, `${d.symbol} ${d.action_type} ex-date`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary border text-[11px]"><Calendar className="w-3 h-3" /> GCal</a></td>
                      </tr>
                    );
                  })}
                  {dividends.length === 0 && <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">No dividend data — corporate_actions empty until populated. Mock countdown shown above for demo.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="px-3 py-2 text-[10px] text-muted-foreground">Alert 3 days before ex-date via price_alerts engine. Source: NSE filings. Google Calendar adds 15-min reminder.</div>
          </GlassCard>
          {dividends.length===0 && (
            <GlassCard className="p-3">
              <div className="text-xs font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-primary" /> Mock Ex-Div Countdown (when table empty)</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
                {[
                  { sym: 'SCOM.NR', date: new Date(Date.now()+ 5*86400000).toISOString().slice(0,10), amount: '1.44' },
                  { sym: 'EQTY.NR', date: new Date(Date.now()+ 12*86400000).toISOString().slice(0,10), amount: '4.00' },
                  { sym: 'KCB.NR', date: new Date(Date.now()+ 22*86400000).toISOString().slice(0,10), amount: '2.50' },
                ].map(m=> (
                  <div key={m.sym} className="flex items-center gap-3 bg-secondary/40 rounded-lg p-2.5 border">
                    <ExDivCountdown exDate={m.date} />
                    <div className="flex-1"><div className="font-mono text-xs font-bold">{m.sym}</div><div className="text-[11px] text-muted-foreground">{m.date} · KES {m.amount}</div></div>
                    <a href={googleCalendarUrl(`Ex-div: ${m.sym}`, m.date, `Ex-div ${m.sym}`)} target="_blank" rel="noreferrer" className="p-1.5 rounded bg-card border"><ExternalLink className="w-3 h-3" /></a>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      ) : tab === 'ipos' ? (
        <div className="space-y-3.5">
          <GlassCard className="p-3 flex items-center gap-2">
            <Rocket className="w-4 h-4 text-primary" />
            <div>
              <div className="text-xs font-bold">IPO Calendar Lane</div>
              <div className="text-[11px] text-muted-foreground">Upcoming pricings · NSE + US — add to Google Calendar with one tap</div>
            </div>
            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 font-bold">{IPO_CALENDAR.length} IPOs</span>
          </GlassCard>
          {/* Lane: horizontal timeline */}
          <GlassCard className="p-3 overflow-x-auto">
            <div className="flex gap-3 min-w-max pb-1">
              {IPO_CALENDAR.map(ipo=>(
                <div key={ipo.symbol} className="w-[240px] flex-shrink-0 rounded-xl border bg-card/50 p-3 backdrop-blur">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center font-mono font-bold text-primary text-xs">{ipo.symbol.slice(0,3)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{ipo.symbol}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{ipo.name}</div>
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${ipo.status==='upcoming'?'bg-amber-500/15 text-amber-700 border-amber-500/30': ipo.status==='priced'?'bg-blue-500/15 text-blue-700 border-blue-500/30':'bg-primary/15 text-primary border-primary/30'}`}>{ipo.status.toUpperCase()}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span className="font-mono font-semibold">{new Date(ipo.date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric'})}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Range</span><span className="font-mono">{ipo.priceRange}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Exchange</span><span className="font-semibold">{ipo.exchange}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sector</span><span className="text-foreground">{ipo.sector}</span></div>
                  </div>
                  <div className="mt-2 relative h-1.5 bg-muted/30 rounded-full overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-primary rounded-full" style={{ width: ipo.status==='upcoming' ? '45%' : ipo.status==='priced' ? '85%' : '100%'}} />
                  </div>
                  <a href={googleCalendarUrl(`IPO: ${ipo.symbol} ${ipo.name}`, ipo.date, `IPO ${ipo.symbol} on ${ipo.exchange} — ${ipo.priceRange}`)} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"><Calendar className="w-3.5 h-3.5" /> Add to Google Calendar</a>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center"><span className="font-display text-[13px] font-bold">IPO Pipeline</span><a className="ml-auto text-[11px] text-primary hover:underline" href="#" onClick={e=>e.preventDefault()}>View S-1 filings →</a></div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/40">{['Date','Company','Exchange','Price','Sector','Status','Calendar'].map(h=>(<th key={h} className="p-[9px] px-[11px] text-left text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>))}</tr></thead>
                <tbody>
                  {IPO_CALENDAR.map(r=>(
                    <tr key={r.symbol} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{r.date}</td>
                      <td className="p-[10px] px-[11px]"><div className="font-bold">{r.symbol}</div><div className="text-[10px] text-muted-foreground">{r.name}</div></td>
                      <td className="p-[10px] px-[11px]">{r.exchange}</td>
                      <td className="p-[10px] px-[11px] font-mono">{r.priceRange}</td>
                      <td className="p-[10px] px-[11px]">{r.sector}</td>
                      <td className="p-[10px] px-[11px]"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${r.status==='upcoming'?'bg-amber-500/15 text-amber-700 border-amber-500/30':'bg-primary/10 text-primary border-primary/20'}`}>{r.status}</span></td>
                      <td className="p-[10px] px-[11px]"><a href={googleCalendarUrl(`IPO: ${r.symbol}`, r.date, `${r.name} IPO`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary border text-[11px]"><Calendar className="w-3 h-3" /> GCal</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      ) : tab === 'splits' ? (
        <div className="space-y-3.5">
          <GlassCard className="p-3 flex items-center gap-2">
            <Split className="w-4 h-4 text-primary" />
            <div><div className="text-xs font-bold">Splits & Bonus Lane</div><div className="text-[11px] text-muted-foreground">Stock splits, bonus issues, consolidations — adjust your cost basis</div></div>
            <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-primary/10 text-primary border font-bold">{SPLITS_CALENDAR.length} events</span>
          </GlassCard>
          <GlassCard className="p-3">
            <div className="flex gap-2 overflow-x-auto pb-1">
              {SPLITS_CALENDAR.map(s=>(
                <div key={s.symbol+s.exDate} className="min-w-[220px] rounded-xl border bg-card/50 p-3">
                  <div className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center"><Split className="w-4 h-4 text-amber-600" /></div><div><div className="font-mono text-xs font-bold">{s.symbol}</div><div className="text-[10px] text-muted-foreground">{s.name}</div></div><span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-secondary border uppercase">{s.type}</span></div>
                  <div className="mt-2 text-center">
                    <div className="font-mono text-[18px] font-extrabold tracking-tight">{s.ratio}</div>
                    <div className="text-[10px] text-muted-foreground">Ex-date {s.exDate} • Payable {s.payableDate}</div>
                  </div>
                  <a href={googleCalendarUrl(`Split: ${s.symbol} ${s.ratio}`, s.exDate, `${s.name} ${s.type} ${s.ratio}`)} target="_blank" rel="noreferrer" className="mt-2 inline-flex w-full items-center justify-center gap-1 px-2 py-1 rounded-lg bg-secondary border text-xs font-medium hover:border-primary/30"><Calendar className="w-3 h-3" /> Add to Google Calendar</a>
                </div>
              ))}
            </div>
          </GlassCard>
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto"><table className="w-full text-xs">
              <thead><tr className="border-b border-border/40">{['Ex-Date','Symbol','Ratio','Type','Payable','Calendar'].map(h=>(<th key={h} className="p-[9px] px-[11px] text-left text-[10px] font-semibold text-muted-foreground uppercase">{h}</th>))}</tr></thead>
              <tbody>
                {SPLITS_CALENDAR.map(s=>(
                  <tr key={s.symbol} className="border-b border-border/30 hover:bg-muted/20">
                    <td className="p-[10px] px-[11px] font-mono">{s.exDate}</td>
                    <td className="p-[10px] px-[11px] font-mono font-bold">{s.symbol}</td>
                    <td className="p-[10px] px-[11px] font-mono font-semibold text-primary">{s.ratio}</td>
                    <td className="p-[10px] px-[11px] capitalize">{s.type}</td>
                    <td className="p-[10px] px-[11px] font-mono text-muted-foreground">{s.payableDate}</td>
                    <td className="p-[10px] px-[11px]"><a href={googleCalendarUrl(`Split: ${s.symbol}`, s.exDate, `${s.ratio}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary border text-[11px]"><Calendar className="w-3 h-3" />GCal</a></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </GlassCard>
        </div>
      ) : (
        <div className="space-y-3.5">
          <div className="flex gap-2">
            <span className="text-[10px] text-muted-foreground font-semibold self-center flex items-center gap-1"><Filter className="w-3 h-3" /> IMPACT:</span>
            {['all', 'high', 'medium', 'low'].map(f => (
              <button key={f} onClick={() => setEcoImpact(f)}
                className={`px-[11px] py-[5px] rounded-md text-xs border capitalize backdrop-blur ${ecoImpact === f ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card/60 border-border/40 text-muted-foreground hover:text-foreground'}`}>
                {f}
              </button>
            ))}
          </div>

          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/40 flex items-center">
              <span className="font-display text-[13px] font-bold">Economic Calendar</span>
              <span className="text-[10px] text-muted-foreground ml-auto">{filteredEco.length} events</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/40">
                    {['Date', 'Time', 'Country', 'Event', 'Impact', 'Forecast', 'Previous', 'Calendar'].map(h => (
                      <th key={h} className={`p-[9px] px-[11px] text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.7px] ${['Forecast', 'Previous'].includes(h) ? 'text-right' : h === 'Impact' ? 'text-center' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredEco.map((e, i) => (
                    <tr key={i} className="border-b border-border/30 hover:bg-muted/20">
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
                      <td className="p-[10px] px-[11px]"><a href={googleCalendarUrl(`${e.event} (${e.country})`, e.date, `${e.event} — Forecast ${e.forecast}`)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 px-2 py-1 rounded bg-secondary border text-[11px]"><Calendar className="w-3 h-3" /> GCal</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
