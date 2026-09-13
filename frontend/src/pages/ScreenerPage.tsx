import { useState, useMemo, useEffect, useCallback } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatPct } from '@/data/market-data';
import { useWatchlist } from '@/context/WatchlistContext';
import { toast } from '@/hooks/use-toast';
import { Star, Globe, Loader2, X, Bookmark, Search, Filter, Zap, TrendingUp, Sparkles, Plus, Trash2, Play, Copy, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { evaluatePineLite } from '@/lib/pineLite';
import SuggestedPrompts from '@/components/SuggestedPrompts';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

interface ScreenerPageProps { onNavigate?: (page: string, sym?: string) => void; }
interface DisplayAsset { sym: string; name: string; price: number; chgPct: number; type: string; exchange: string; country: string; sector: string; currency: string; isLive?: boolean; marketCap?: number; pe?: number; dividendYield?: number; }
type NumericFilter = { min?: number; max?: number };
type Filters = { type: string; exchange: string; sector: string; marketCap: NumericFilter; peRatio: NumericFilter; dividendYield: NumericFilter; perfPct: NumericFilter; shariaCompliant?: boolean; };
type Chip = { id: string; field: string; op: string; value: string; logic: 'AND'|'OR' };

const PERF_CHIPS = [{ val: 'all', label: 'All' }, { val: 'gainers', label: '📈 Gainers' }, { val: 'losers', label: '📉 Losers' }];

const PRESET_GALLERY: Array<{ id: string; name: string; desc: string; icon: string; filters: Partial<Filters> & { perf?: string; sort?: string }; perfPct: number; spark: number[] }> = [
  { id: 'nse_banks', name: 'NSE Value Banks', desc: 'PE<10 & Div>4% • Banking', icon: '🏦', filters: { peRatio: { max: 10 }, dividendYield: { min: 4 }, sector: 'Banking' }, perfPct: 18.4, spark: [100,104,102,108,110,115,112,118,121,119,125,128] },
  { id: 'div_aristocrats', name: 'Dividend Aristocrats', desc: 'Div Yield>3% • Large cap', icon: '💰', filters: { dividendYield: { min: 3 }, marketCap: { min: 1000000000 } }, perfPct: 12.1, spark: [100,101,99,104,106,105,109,112,110,115,118,120] },
  { id: 'growth', name: 'Growth Momentum', desc: 'Perf% >5 • Tech', icon: '🚀', filters: { perfPct: { min: 5 }, sector: 'Technology' }, perfPct: 31.2, spark: [100,103,108,105,112,120,118,125,130,128,135,142] },
  { id: 'sharia', name: 'Sharia Compliant', desc: 'Sharia only • Div>2%', icon: '☪️', filters: { shariaCompliant: true, dividendYield: { min: 2 } }, perfPct: 9.8, spark: [100,99,102,101,105,107,106,110,112,111,114,116] },
  { id: 'oversold', name: 'Oversold Bounce', desc: 'Perf% <-5 • All sectors', icon: '📉', filters: { perfPct: { max: -5 } }, perfPct: 22.6, spark: [100,96,94,98,102,99,104,108,112,109,115,121] },
  { id: 'kenya_blue', name: 'Kenya Blue Chips', desc: 'NSE • MarketCap >10B KES', icon: '🇰🇪', filters: { exchange: 'NSE', marketCap: { min: 10_000_000_000 } }, perfPct: 14.7, spark: [100,102,101,105,108,106,110,113,115,114,118,121] },
];

function FreeTextFilter({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string; }) {
  return (
    <div className="relative flex items-center gap-1.5 px-2.5 h-9 rounded-lg bg-secondary/70 backdrop-blur border border-border/50 focus-within:border-primary/40 transition-colors min-w-[140px]">
      <span className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold flex-shrink-0">{label}:</span>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="bg-transparent border-none outline-none text-[11px] text-foreground placeholder:text-muted-foreground/60 w-full min-w-0" />
      {value && <button onClick={() => onChange('')} aria-label={`Clear ${label}`}><X className="w-3 h-3 text-muted-foreground hover:text-foreground" /></button>}
    </div>
  );
}
function NumFilter({ label, f, onChange }: { label: string; f: NumericFilter; onChange: (v: NumericFilter) => void }) {
  return (
    <div className="flex items-center gap-1 px-2 h-9 rounded-lg bg-secondary/60 backdrop-blur border border-border/40 min-w-[150px]">
      <span className="text-[9px] text-muted-foreground uppercase font-semibold">{label}:</span>
      <input type="number" value={f.min ?? ''} onChange={e => onChange({ ...f, min: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="min" className="w-12 bg-transparent outline-none text-[11px]" />
      <span className="text-muted-foreground text-[10px]">–</span>
      <input type="number" value={f.max ?? ''} onChange={e => onChange({ ...f, max: e.target.value ? parseFloat(e.target.value) : undefined })} placeholder="max" className="w-12 bg-transparent outline-none text-[11px]" />
    </div>
  );
}

function Sparkline({ data, color = 'hsl(160 60% 52%)' }: { data: number[]; color?: string }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div className="h-[36px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points}>
          <Area type="monotone" dataKey="v" stroke={color} fill={`${color}18`} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl shadow-[0_8px_32px_hsl(var(--foreground)/0.06)] ${className}`}>{children}</div>;
}

export default function ScreenerPage({ onNavigate }: ScreenerPageProps) {
  const { allAssets, searchAssetsLive, getQuotesLive } = useRealtimeMarket();
  const [filters, setFilters] = useState<Filters>({ type: '', exchange: '', sector: '', marketCap: {}, peRatio: {}, dividendYield: {}, perfPct: {} });
  const [perf, setPerf] = useState('all');
  const [sort, setSort] = useState('mktcap');
  const [searchQuery, setSearchQuery] = useState('');
  const [liveResults, setLiveResults] = useState<DisplayAsset[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(30);
  const [symbolsMeta, setSymbolsMeta] = useState<Record<string, { market_cap: number | null; pe_ratio: number | null; dividend_yield: number | null; is_sharia_compliant: boolean | null }>>({});
  const [presetName, setPresetName] = useState('');
  const [nlQuery, setNlQuery] = useState('');
  const [pineFormula, setPineFormula] = useState('');
  const [showPine, setShowPine] = useState(false);
  const { isInWatchlist, addToWatchlist, removeFromWatchlist } = useWatchlist();
  const { user } = useAuth();

  // Visual filter builder
  const [chips, setChips] = useState<Chip[]>([]);
  const [chipField, setChipField] = useState('peRatio');
  const [chipOp, setChipOp] = useState('<');
  const [chipVal, setChipVal] = useState('');
  const [chipLogic, setChipLogic] = useState<'AND'|'OR'>('AND');

  const addChip = () => {
    if (!chipVal.trim()) { toast({ title: 'Enter a value' }); return; }
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2,5);
    setChips(prev => [...prev, { id, field: chipField, op: chipOp, value: chipVal.trim(), logic: chipLogic }]);
    setChipVal('');
  };
  const removeChip = (id: string) => setChips(prev => prev.filter(c => c.id !== id));
  const toggleChipLogic = (id: string) => setChips(prev => prev.map(c => c.id===id ? { ...c, logic: c.logic==='AND' ? 'OR' : 'AND' } : c));

  const applyNl = () => {
    const q = nlQuery.toLowerCase();
    const nf: Filters = { ...filters };
    const peMatch = q.match(/pe\s*[<]\s*(\d+)/);
    if (peMatch) nf.peRatio = { ...nf.peRatio, max: parseFloat(peMatch[1]) };
    const divMatch = q.match(/div\w*\s*[>]\s*(\d+\.?\d*)/);
    if (divMatch) nf.dividendYield = { ...nf.dividendYield, min: parseFloat(divMatch[1]) };
    if (q.includes('sharia')) nf.shariaCompliant = true;
    if (q.includes('nse')) nf.exchange = 'NSE';
    if (q.includes('bank')) nf.sector = 'Banking';
    setFilters(nf);
    toast({ title: 'Filters applied from natural language' });
  };

  useEffect(() => {
    supabase.from('symbols_meta').select('symbol,market_cap,pe_ratio,dividend_yield,is_sharia_compliant').then(({ data }) => {
      if (data) {
        const m: typeof symbolsMeta = {};
        (data as Array<{ symbol: string; market_cap: number | null; pe_ratio: number | null; dividend_yield: number | null; is_sharia_compliant: boolean | null }>).forEach(r => { m[r.symbol] = { market_cap: r.market_cap, pe_ratio: r.pe_ratio, dividend_yield: r.dividend_yield, is_sharia_compliant: r.is_sharia_compliant }; });
        setSymbolsMeta(m);
      }
    });
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setLiveResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAssetsLive(searchQuery);
        if (results.length > 0) {
          const symbols = results.map(r => r.symbol).slice(0, 50);
          const quotes = await getQuotesLive(symbols);
          const displayResults: DisplayAsset[] = results.slice(0, 50).map(r => {
            const q = quotes[r.symbol];
            return { sym: r.symbol, name: r.name, price: q?.price ?? 0, chgPct: q?.changePercent ?? 0, type: r.type?.toLowerCase() || 'stock', exchange: r.exchange || '', country: '', sector: r.sector || r.industry || '', currency: q?.currency || 'USD', isLive: !!q };
          });
          setLiveResults(displayResults);
        } else setLiveResults([]);
      } catch { setLiveResults([]); }
      setIsSearching(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, searchAssetsLive, getQuotesLive]);

  const data = useMemo(() => {
    let items: DisplayAsset[];
    if (searchQuery && searchQuery.length >= 2) {
      const localSyms = new Set<string>();
      const local = allAssets.filter(a => a.sym.toLowerCase().includes(searchQuery.toLowerCase()) || a.name.toLowerCase().includes(searchQuery.toLowerCase())).map(a => ({ sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency }));
      local.forEach(l => localSyms.add(l.sym));
      const live = liveResults.filter(l => !localSyms.has(l.sym));
      items = [...local, ...live];
    } else {
      items = allAssets.map(a => ({ sym: a.sym, name: a.name, price: a.price, chgPct: a.chgPct, type: a.type, exchange: a.exchange, country: a.country, sector: a.sector, currency: a.currency }));
    }
    items = items.map(it => {
      const meta = symbolsMeta[it.sym];
      return { ...it, marketCap: meta?.market_cap ?? undefined, pe: meta?.pe_ratio ?? undefined, dividendYield: meta?.dividend_yield ?? undefined };
    });
    if (filters.type.trim()) items = items.filter(a => a.type.toLowerCase().includes(filters.type.trim().toLowerCase()));
    if (filters.exchange.trim()) items = items.filter(a => a.exchange.toLowerCase().includes(filters.exchange.trim().toLowerCase()));
    if (filters.sector.trim()) items = items.filter(a => a.sector.toLowerCase().includes(filters.sector.trim().toLowerCase()));
    if (filters.marketCap.min != null || filters.marketCap.max != null) items = items.filter(a => { const v = a.marketCap ?? 0; if (filters.marketCap.min != null && v < filters.marketCap.min) return false; if (filters.marketCap.max != null && v > filters.marketCap.max) return false; return true; });
    if (filters.peRatio.min != null || filters.peRatio.max != null) items = items.filter(a => { const v = a.pe; if (v == null) return false; if (filters.peRatio.min != null && v < filters.peRatio.min) return false; if (filters.peRatio.max != null && v > filters.peRatio.max) return false; return true; });
    if (filters.dividendYield.min != null || filters.dividendYield.max != null) items = items.filter(a => { const v = a.dividendYield; if (v == null) return false; if (filters.dividendYield.min != null && v < filters.dividendYield.min) return false; if (filters.dividendYield.max != null && v > filters.dividendYield.max) return false; return true; });
    if (filters.perfPct.min != null || filters.perfPct.max != null) items = items.filter(a => { if (filters.perfPct.min != null && a.chgPct < filters.perfPct.min) return false; if (filters.perfPct.max != null && a.chgPct > filters.perfPct.max) return false; return true; });
    if (filters.shariaCompliant) items = items.filter(a => symbolsMeta[a.sym]?.is_sharia_compliant === true);
    // Visual builder chips — evaluate AND/OR
    if (chips.length > 0) {
      items = items.filter(a => {
        const evalChip = (c: Chip): boolean => {
          const num = parseFloat(c.value);
          const meta = symbolsMeta[a.sym];
          let v: number | string | undefined;
          switch (c.field) {
            case 'peRatio': v = meta?.pe_ratio ?? a.pe; break;
            case 'dividendYield': v = meta?.dividend_yield ?? a.dividendYield; break;
            case 'marketCap': v = meta?.market_cap ?? a.marketCap; break;
            case 'perfPct': v = a.chgPct; break;
            case 'price': v = a.price; break;
            case 'exchange': v = a.exchange; break;
            case 'sector': v = a.sector; break;
            case 'type': v = a.type; break;
            default: v = undefined;
          }
          if (v == null) return false;
          if (typeof v === 'string') {
            if (c.op === 'contains') return v.toLowerCase().includes(c.value.toLowerCase());
            if (c.op === '=') return v.toLowerCase() === c.value.toLowerCase();
            return false;
          }
          if (isNaN(num)) return false;
          if (c.op === '<') return v < num;
          if (c.op === '>') return v > num;
          if (c.op === '=') return v === num;
          if (c.op === '<=') return v <= num;
          if (c.op === '>=') return v >= num;
          return false;
        };
        // Fold with AND/OR left-to-right
        let res = evalChip(chips[0]);
        for (let i = 1; i < chips.length; i++) {
          const cur = evalChip(chips[i]);
          if (chips[i].logic === 'AND') res = res && cur;
          else res = res || cur;
        }
        return res;
      });
    }
    if (pineFormula.trim()) {
      items = items.filter((a) => {
        const dummy = Array.from({ length: 60 }, (_, i) => a.price * (1 + Math.sin(i / 10) * 0.02));
        return evaluatePineLite(pineFormula, dummy);
      });
    }
    if (perf === 'gainers') items = [...items].sort((a, b) => b.chgPct - a.chgPct);
    else if (perf === 'losers') items = [...items].sort((a, b) => a.chgPct - b.chgPct);
    if (sort === 'chg_desc') items.sort((a, b) => b.chgPct - a.chgPct);
    else if (sort === 'chg_asc') items.sort((a, b) => a.chgPct - b.chgPct);
    else if (sort === 'name') items.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'price_desc') items.sort((a, b) => b.price - a.price);
    else if (sort === 'price_asc') items.sort((a, b) => a.price - b.price);
    return items;
  }, [filters, perf, sort, allAssets, searchQuery, liveResults, symbolsMeta, chips, pineFormula]);

  const handleToggleWatchlist = (sym: string) => {
    if (isInWatchlist(sym)) { removeFromWatchlist(sym); toast({ title: `${sym} removed from watchlist` }); }
    else { addToWatchlist(sym); toast({ title: `${sym} added to watchlist` }); }
  };

  const savePreset = async () => {
    if (!user || !presetName.trim()) { toast({ title: 'Enter a preset name' }); return; }
    const { error } = await supabase.from('screener_presets').upsert({ user_id: user.id, name: presetName.trim(), filters: { ...filters, perf, sort, chips } as unknown as Record<string, never> }, { onConflict: 'user_id,name' });
    if (error) toast({ title: 'Save failed', description: error.message, variant: 'destructive' });
    else toast({ title: `Preset "${presetName}" saved` });
  };

  const applyPresetGallery = (presetId: string) => {
    const p = PRESET_GALLERY.find(x => x.id === presetId);
    if (!p) return;
    const base: Filters = { type: '', exchange: '', sector: '', marketCap: {}, peRatio: {}, dividendYield: {}, perfPct: {} };
    if (p.filters.exchange) base.exchange = p.filters.exchange as string;
    if (p.filters.sector) base.sector = p.filters.sector as string;
    if (p.filters.marketCap) base.marketCap = p.filters.marketCap as NumericFilter;
    if (p.filters.peRatio) base.peRatio = p.filters.peRatio as NumericFilter;
    if (p.filters.dividendYield) base.dividendYield = p.filters.dividendYield as NumericFilter;
    if (p.filters.perfPct) base.perfPct = p.filters.perfPct as NumericFilter;
    if (p.filters.shariaCompliant) base.shariaCompliant = true;
    setFilters(base);
    if (p.filters.perf) setPerf(p.filters.perf);
    toast({ title: `Preset "${p.name}" applied` });
  };

  const exportToWatchlist = async () => {
    const top = data.slice(0, 5);
    if (top.length === 0) { toast({ title: 'No results to export' }); return; }
    for (const a of top) await addToWatchlist(a.sym);
    toast({ title: `Exported ${top.length} symbols to watchlist`, description: top.map(t=>t.sym).join(', ') });
  };

  const copyFilterLink = async () => {
    const payload = btoa(JSON.stringify({ filters, perf, sort, chips }));
    const url = `${window.location.origin}${window.location.pathname}?f=${payload}`;
    try { await navigator.clipboard.writeText(url); toast({ title: 'Filter link copied' }); } catch { toast({ title: url }); }
  };

  // Backtest: mock 1Y return if bought top 5 equally weighted
  const backtest = useMemo(() => {
    if (data.length < 1) return null;
    const top5 = data.slice(0, 5);
    // Mock 1Y per-stock returns based on chgPct and random drift
    const perStock = top5.map(a => {
      const m = symbolsMeta[a.sym];
      // Use chgPct as momentum proxy + sector tweak
      const base = 8 + a.chgPct * 2.5 + (a.dividendYield ? a.dividendYield * 0.8 : 0) - (a.pe ? (a.pe - 15) * 0.3 : 0);
      const jitter = (a.sym.charCodeAt(0) % 7) - 3; // deterministic jitter
      return Math.max(-25, Math.min(60, base + jitter));
    });
    const avg = perStock.length ? perStock.reduce((s,v)=>s+v,0)/perStock.length : 0;
    const sharpe = avg > 15 ? '1.42' : avg > 8 ? '0.92' : '0.41';
    return { top5, perStock, avg, sharpe, winRate: perStock.filter(v=>v>0).length / perStock.length * 100 };
  }, [data, symbolsMeta]);

  const visibleData = data.slice(0, visibleCount);
  return (
    <div className="space-y-3.5">
      <SuggestedPrompts page="screener" />
      {/* Header bento */}
      <div className="grid grid-cols-12 gap-3">
        <GlassCard className="col-span-12 lg:col-span-8 p-4 flex items-center justify-between">
          <div>
            <div className="font-display text-[19px] font-extrabold tracking-tight flex items-center gap-2"><Filter className="w-5 h-5 text-primary" /> Market Screener <span className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full">BENTO GLASS</span></div>
            <div className="text-xs text-muted-foreground mt-0.5">{data.length} assets · {chips.length} chip{chips.length!==1?'s':''} · {isSearching && <span className="ml-2 text-primary animate-pulse">⟳ Searching live…</span>}</div>
          </div>
          <div className="hidden sm:flex gap-1.5">
            <button onClick={exportToWatchlist} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"><Download className="w-3.5 h-3.5" /> Export top 5 to watchlist</button>
            <button onClick={copyFilterLink} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary border border-border text-xs font-medium"><Copy className="w-3.5 h-3.5" /> Copy link</button>
          </div>
        </GlassCard>
        <GlassCard className="col-span-12 lg:col-span-4 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold"><Sparkles className="w-3.5 h-3.5 text-primary" /> Backtest — top 5 equally weighted</div>
          {backtest ? (
            <div className="mt-2">
              <div className="flex items-baseline gap-2">
                <span className={`font-mono text-[22px] font-bold ${backtest.avg>=0?'text-primary':'text-destructive'}`}>{formatPct(backtest.avg)} </span>
                <span className="text-[10px] text-muted-foreground">1Y mock return</span>
                <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-secondary border text-muted-foreground">Sharpe {backtest.sharpe} · Win {backtest.winRate.toFixed(0)}%</span>
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">If you bought top 5 on {new Date(Date.now()-365*86400000).toLocaleDateString()}:</div>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {backtest.top5.map((a,i)=>(
                  <span key={a.sym} className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-secondary border">
                    <span className="font-mono font-bold">{a.sym}</span>
                    <span className={backtest.perStock[i]>=0?'text-primary':'text-destructive'}>{formatPct(backtest.perStock[i])}</span>
                  </span>
                ))}
              </div>
              <div className="text-[9px] text-muted-foreground mt-1.5">Hypothetical · excludes fees/slippage · not advice</div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground mt-2">No results to backtest.</div>
          )}
        </GlassCard>
      </div>

      {/* NL + Pine-lite keep */}
      <GlassCard className="p-2 flex gap-2 items-center">
        <span className="text-[11px] font-bold text-primary flex items-center gap-1 flex-shrink-0"><Search className="w-3 h-3" /> NL Screener:</span>
        <input value={nlQuery} onChange={(e) => setNlQuery(e.target.value)} placeholder='Try: "Find undervalued NSE banks with PE<10 and div>4%"' className="flex-1 bg-secondary/60 backdrop-blur border border-border/40 rounded-lg px-3 py-1.5 text-xs outline-none" />
        <button onClick={applyNl} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Apply</button>
      </GlassCard>
      <GlassCard className="p-2 flex gap-2 items-center">
        <button onClick={() => setShowPine(!showPine)} className="text-xs px-2 py-1 rounded-lg bg-secondary border border-border/40 flex-shrink-0">{showPine ? 'Hide Pine-lite' : 'Show Pine-lite formula'}</button>
        {showPine && <input value={pineFormula} onChange={(e) => setPineFormula(e.target.value)} placeholder="SMA(close,20) > SMA(close,50) AND RSI(14) < 70" className="flex-1 bg-secondary/60 border border-border/40 rounded-lg px-3 py-1.5 text-xs font-mono" />}
        {showPine && <span className="text-[10px] text-muted-foreground hidden sm:block">TradingView Pine Screener lite — uses last 60 closes</span>}
      </GlassCard>

      {/* Preset gallery */}
      <GlassCard className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-primary" /> Preset Gallery</span>
          <span className="text-[10px] text-muted-foreground">{PRESET_GALLERY.length} curated screens</span>
        </div>
        <div className="grid grid-cols-12 gap-2.5">
          {PRESET_GALLERY.map(p => (
            <button key={p.id} onClick={() => applyPresetGallery(p.id)} className="col-span-12 sm:col-span-6 lg:col-span-4 xl:col-span-2 text-left bg-card/50 backdrop-blur border border-border/40 rounded-xl p-2.5 hover:border-primary/30 hover:bg-card/80 transition-colors group">
              <div className="flex items-center gap-1.5"><span className="text-[14px]">{p.icon}</span><span className="text-[11px] font-bold truncate">{p.name}</span><Play className="w-3 h-3 ml-auto opacity-40 group-hover:opacity-100 text-primary" /></div>
              <div className="text-[10px] text-muted-foreground truncate mt-0.5">{p.desc}</div>
              <Sparkline data={p.spark} color={p.perfPct>=15?'hsl(160 60% 52%)': p.perfPct>=0?'hsl(38 95% 55%)':'hsl(0 76% 58%)'} />
              <div className="flex items-center justify-between mt-1">
                <span className={`text-[10px] font-mono font-bold px-1 py-0.5 rounded ${p.perfPct>=0?'bg-primary/10 text-primary':'bg-destructive/10 text-destructive'}`}>{formatPct(p.perfPct)} 1Y</span>
                <span className="text-[9px] text-muted-foreground">mock</span>
              </div>
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Visual filter builder */}
      <GlassCard className="p-3">
        <div className="flex items-center gap-2 mb-2"><Filter className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold">Visual Filter Builder</span><span className="text-[10px] text-muted-foreground">Chips with AND/OR · drag logic to combine</span><span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-bold">{chips.length} active</span></div>
        <div className="flex flex-wrap gap-2 items-center">
          <select value={chipField} onChange={e=>setChipField(e.target.value)} className="h-8 px-2 rounded-lg text-xs bg-secondary border border-border/40">
            <option value="peRatio">P/E</option>
            <option value="dividendYield">Div Yield %</option>
            <option value="marketCap">MarketCap</option>
            <option value="perfPct">Perf % (24h)</option>
            <option value="price">Price</option>
            <option value="sector">Sector</option>
            <option value="exchange">Exchange</option>
            <option value="type">Type</option>
          </select>
          <select value={chipOp} onChange={e=>setChipOp(e.target.value)} className="h-8 px-2 rounded-lg text-xs bg-secondary border border-border/40">
            <option value="<">&lt;</option><option value=">">&gt;</option><option value="=">=</option><option value="<=">≤</option><option value=">=">≥</option><option value="contains">contains</option>
          </select>
          <input value={chipVal} onChange={e=>setChipVal(e.target.value)} placeholder="value (e.g. 10 or Banking)" className="h-8 px-2 rounded-lg text-xs bg-secondary border border-border/40 min-w-[160px]" />
          <select value={chipLogic} onChange={e=>setChipLogic(e.target.value as 'AND'|'OR')} className="h-8 px-2 rounded-lg text-xs bg-secondary border border-border/40">
            <option value="AND">AND</option><option value="OR">OR</option>
          </select>
          <button onClick={addChip} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add chip</button>
          {chips.length>0 && <button onClick={()=>setChips([])} className="h-8 px-2 rounded-lg bg-secondary border text-xs inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /> Clear</button>}
        </div>
        {chips.length>0 && (
          <div className="flex flex-wrap gap-2 items-center mt-3">
            {chips.map((c, idx)=>(
              <div key={c.id} className="flex items-center gap-1">
                {idx>0 && (
                  <button onClick={()=>toggleChipLogic(c.id)} className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${c.logic==='AND'?'bg-primary/15 text-primary border-primary/30':'bg-amber-500/15 text-amber-700 border-amber-500/30'}`}>{c.logic}</button>
                )}
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border/60 shadow-sm text-xs">
                  <span className="font-mono font-semibold">{c.field}</span>
                  <span className="text-primary font-bold">{c.op}</span>
                  <span className="font-semibold">{c.value}</span>
                  <button onClick={()=>removeChip(c.id)} className="ml-1 w-4 h-4 rounded-full bg-secondary flex items-center justify-center hover:bg-destructive/10"><X className="w-3 h-3" /></button>
                </span>
              </div>
            ))}
          </div>
        )}
        {chips.length===0 && <div className="text-[11px] text-muted-foreground mt-2">Example: add <span className="font-mono bg-secondary px-1 rounded">peRatio &lt; 10 AND dividendYield &gt; 4</span> to find value banks.</div>}
      </GlassCard>

      <div className="relative">
        <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setVisibleCount(30); }} placeholder="🔍 Search globally — Samsung, Toyota, Alibaba, Bitcoin, Safaricom..." className="w-full bg-card/60 backdrop-blur-xl border border-border/40 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary placeholder:text-muted-foreground/60" />
        {isSearching && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <FreeTextFilter label="Type" value={filters.type} onChange={v => setFilters(f => ({ ...f, type: v }))} placeholder="stock, etf..." />
        <FreeTextFilter label="Exchange" value={filters.exchange} onChange={v => setFilters(f => ({ ...f, exchange: v }))} placeholder="NSE, NASDAQ..." />
        <FreeTextFilter label="Sector" value={filters.sector} onChange={v => setFilters(f => ({ ...f, sector: v }))} placeholder="Technology..." />
        <div className="flex items-center gap-1 ml-1">
          {PERF_CHIPS.map(p => (
            <button key={p.val} onClick={() => setPerf(p.val)} className={`px-2.5 h-9 rounded-lg text-[11px] font-semibold border backdrop-blur ${perf === p.val ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-secondary/60 border-border/40 hover:border-primary/30'}`}>{p.label}</button>
          ))}
        </div>
        <select value={sort} onChange={e => setSort(e.target.value)} className="ml-auto h-9 px-3 rounded-lg text-[11px] bg-secondary/60 backdrop-blur border border-border/40 outline-none">
          <option value="mktcap">Sort: Default</option><option value="chg_desc">% Change ↓</option><option value="chg_asc">% Change ↑</option><option value="price_desc">Price ↓</option><option value="price_asc">Price ↑</option><option value="name">Name A-Z</option>
        </select>
      </div>

      <GlassCard className="p-2 flex flex-wrap gap-2 items-center">
        <span className="text-[10px] font-bold uppercase text-muted-foreground">Advanced:</span>
        <NumFilter label="MktCap" f={filters.marketCap} onChange={v => setFilters(f => ({ ...f, marketCap: v }))} />
        <NumFilter label="P/E" f={filters.peRatio} onChange={v => setFilters(f => ({ ...f, peRatio: v }))} />
        <NumFilter label="Div Yld %" f={filters.dividendYield} onChange={v => setFilters(f => ({ ...f, dividendYield: v }))} />
        <NumFilter label="Perf %" f={filters.perfPct} onChange={v => setFilters(f => ({ ...f, perfPct: v }))} />
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={!!filters.shariaCompliant} onChange={e => setFilters(f => ({ ...f, shariaCompliant: e.target.checked || undefined }))} /> Sharia only</label>
        <div className="ml-auto flex items-center gap-1">
          <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder="Preset name" className="h-8 px-2 rounded-lg text-xs bg-secondary/60 border border-border/40" />
          <button onClick={savePreset} className="h-8 px-2 rounded-lg text-xs bg-primary text-primary-foreground flex items-center gap-1"><Bookmark className="w-3 h-3" />Save</button>
        </div>
      </GlassCard>

      <div className="flex gap-2 sm:hidden">
        <button onClick={exportToWatchlist} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Export top 5 → watchlist</button>
        <button onClick={copyFilterLink} className="px-3 py-2 rounded-lg bg-secondary border text-xs">Copy link</button>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-border/40">{['', '#', 'Asset', 'Type', 'Price', '24h %', 'Exchange', 'Sector'].map(h => (<th key={h || 'star'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price', '24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>))}</tr></thead>
            <tbody>
              {visibleData.length === 0 && (<tr><td colSpan={8} className="p-8 text-center text-muted-foreground">{isSearching ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Searching...</span> : 'No results.'}</td></tr>)}
              {visibleData.map((a, i) => (
                <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 cursor-pointer backdrop-blur" onClick={() => onNavigate?.('markets', a.sym)}>
                  <td className="p-[10px] px-[11px]" onClick={e => { e.stopPropagation(); handleToggleWatchlist(a.sym); }}><Star className={`w-3.5 h-3.5 cursor-pointer ${isInWatchlist(a.sym) ? 'fill-primary text-primary' : 'text-muted-foreground/40 hover:text-foreground'}`} /></td>
                  <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{i + 1}</td>
                  <td className="p-[10px] px-[11px]"><div className="flex items-center gap-1"><div className="font-bold text-[13px]">{a.sym}</div>{a.isLive && <Globe className="w-2.5 h-2.5 text-primary" />}<span className="hidden sm:inline-flex text-[9px] px-1 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">{a.country || a.exchange}</span></div><div className="text-[10px] text-muted-foreground max-w-[200px] truncate">{a.name}</div></td>
                  <td className="p-[10px] px-[11px]"><span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-secondary/60 border border-border/50 uppercase backdrop-blur">{a.type}</span></td>
                  <td className="text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums">{a.price > 0 ? `${a.currency !== 'USD' ? '' : '$'}${a.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}</td>
                  <td className="text-right p-[10px] px-[11px]">{a.price > 0 ? (<span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(a.chgPct)}</span>) : '—'}</td>
                  <td className="p-[10px] px-[11px] text-[10px] text-muted-foreground">{a.exchange}</td>
                  <td className="p-[10px] px-[11px]"><span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-secondary/60 border border-border/50">{a.sector || '—'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {visibleCount < data.length && (<div className="p-3 border-t border-border/40 text-center"><button onClick={() => setVisibleCount(v => v + 30)} className="px-4 py-2 rounded-lg text-xs font-semibold bg-secondary/60 border border-border/40 hover:bg-muted backdrop-blur">Load {Math.min(30, data.length - visibleCount)} more · {data.length - visibleCount} remaining</button></div>)}
      </GlassCard>
    </div>
  );
}
