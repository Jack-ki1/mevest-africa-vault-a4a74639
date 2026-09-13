import { useMemo, useState, useEffect } from 'react';
import { useWatchlist } from '@/context/WatchlistContext';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { formatPct, genLine } from '@/data/market-data';
import { MARKET } from '@/data/market-data';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Star, Trash2, Zap, Bell, BellRing, StickyNote, ArrowUpDown, Trophy, Sparkles } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';

interface WatchlistPageProps { onNavigate?: (page: string, sym?: string) => void; }

type AlertCfg = { target: number; direction: 'above' | 'below' };
function GlassCard({ children, className='' }: {children:React.ReactNode;className?:string}){
  return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} whileHover={{y:-2}} transition={{type:'spring',stiffness:300,damping:20}} className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_4px_24px_hsl(var(--foreground)/0.04)] ${className}`}>{children}</motion.div>;
}
function hashScore(sym:string){ let h=0; for(let i=0;i<sym.length;i++) h=(h*31+sym.charCodeAt(i))%1000; return ((h%400)/100)-2; }
function aiScore(chgPct:number, sym:string){ return chgPct*0.6 + hashScore(sym); }
function badgeFor(s:number){ if(s>=3) return {label:'Strong Buy',cls:'bg-primary text-primary-foreground'}; if(s>=1) return {label:'Buy',cls:'bg-primary/15 text-primary border border-primary/20'}; if(s>-1) return {label:'Hold',cls:'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20'}; if(s>-3) return {label:'Sell',cls:'bg-destructive/10 text-destructive border border-destructive/20'}; return {label:'Strong Sell',cls:'bg-destructive text-destructive-foreground'}; }

export default function WatchlistPage({ onNavigate }: WatchlistPageProps) {
  const { watchlist, removeFromWatchlist } = useWatchlist();
  const { prices, getAsset } = useRealtimeMarket();
  const [notes, setNotes] = useState<Record<string,string>>(()=>{ try{ return JSON.parse(localStorage.getItem('mev_notes')||'{}');}catch{return{};} });
  const [alerts, setAlerts] = useState<Record<string,AlertCfg>>(()=>{ try{ return JSON.parse(localStorage.getItem('mev_alerts')||'{}');}catch{return{};} });
  const [alertModal, setAlertModal] = useState<string|null>(null);
  const [alertDraft, setAlertDraft] = useState<AlertCfg>({target:0,direction:'above'});
  const [sortByAi, setSortByAi]=useState(false);
  const [noteEdit, setNoteEdit]=useState<string|null>(null);

  useEffect(()=>{ localStorage.setItem('mev_notes', JSON.stringify(notes)); },[notes]);
  useEffect(()=>{ localStorage.setItem('mev_alerts', JSON.stringify(alerts)); },[alerts]);

  const openAlert=(sym:string, price:number)=>{ const ex=alerts[sym]; setAlertDraft(ex? {...ex}: {target:Math.round(price), direction:'above'}); setAlertModal(sym); };

  const saveAlert=()=>{
    if(!alertModal) return;
    if(!alertDraft.target || alertDraft.target<=0){ toast({title:'Enter a valid target price'}); return; }
    setAlerts(a=>({...a,[alertModal]:alertDraft}));
    toast({title:`Alert set for ${alertModal}`, description:`Notify when price goes ${alertDraft.direction} $${alertDraft.target}`});
    setAlertModal(null);
  };

  const watchlistAssets = useMemo(() => {
    const arr = watchlist.map(sym => {
        const liveAsset = getAsset(sym);
        const marketAsset = MARKET[sym];
        if (!liveAsset && !marketAsset) return null;
        const p = prices[sym];
        const score = aiScore(p?.chgPct ?? liveAsset?.chgPct ?? marketAsset?.chgPct ?? 0, sym);
        return {
          sym, name: liveAsset?.name || marketAsset?.name || sym,
          price: p?.price || liveAsset?.price || marketAsset?.price || 0,
          chgPct: p?.chgPct ?? liveAsset?.chgPct ?? marketAsset?.chgPct ?? 0,
          chg: p?.chg ?? liveAsset?.chg ?? marketAsset?.chg ?? 0,
          prevPrice: p?.prevPrice || 0,
          mktcap: liveAsset?.mktcap || marketAsset?.mktcap || '—',
          sector: liveAsset?.sector || marketAsset?.sector || '—',
          exchange: liveAsset?.exchange || '—',
          type: liveAsset?.type || marketAsset?.type || 'stock',
          analystRating: marketAsset?.analystRating,
          priceTarget: marketAsset?.priceTarget,
          morningstarRating: marketAsset?.morningstarRating,
          signal: marketAsset?.signal || 'neutral',
          rsi: marketAsset?.rsi, pe: marketAsset?.pe,
          ai: score,
        };
      }).filter(Boolean) as Array<NonNullable<ReturnType<typeof getAsset>> & { price:number;chgPct:number;chg:number;prevPrice:number;ai:number }>;
    if(sortByAi) arr.sort((a,b)=>b.ai-a.ai);
    return arr;
  }, [watchlist, prices, getAsset, sortByAi]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[19px] font-extrabold tracking-tight">My Watchlist</div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full"><Zap className="w-2.5 h-2.5 fill-primary" />LIVE</div>
            {sortByAi && <span className="text-[9px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Sparkles className="w-3 h-3"/>AI Sorted</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">{watchlistAssets.length ? `${watchlistAssets.length} assets tracked · Prices update in real-time` : 'Star assets from the Screener to add them here'}</div>
        </div>
        {watchlistAssets.length>0 && <button onClick={()=>setSortByAi(v=>!v)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${sortByAi?'bg-primary text-primary-foreground border-primary':'bg-card border-border hover:border-primary/30'}`}><ArrowUpDown className="w-3.5 h-3.5"/>Sort by AI score</button>}
      </div>

      {watchlistAssets.length === 0 ? (
        <GlassCard className="p-10 text-center">
          <div className="text-4xl mb-3 opacity-30">⭐</div>
          <div className="font-display text-[15px] font-bold text-muted-foreground mb-1.5">No watchlist items</div>
          <div className="text-xs text-muted-foreground leading-relaxed mb-4">Go to the Screener and star assets you want to track.</div>
          <button onClick={() => onNavigate?.('screener')} className="px-[13px] py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground hover:opacity-90 shadow-sm shadow-primary/20">Open Screener</button>
        </GlassCard>
      ) : (
        <>
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3.5">
            {watchlistAssets.map(a => (
              <WatchlistCard key={a.sym} asset={a} note={notes[a.sym]||''} hasAlert={!!alerts[a.sym]} onBell={()=>openAlert(a.sym,a.price)} onRemove={() => { removeFromWatchlist(a.sym); toast({ title: `${a.sym} removed from watchlist` }); }} onNavigate={onNavigate} />
            ))}
          </div>

          <GlassCard className="overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border/50 flex items-center flex-wrap gap-2">
              <span className="font-display text-[13px] font-bold">Watchlist Details</span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">— notes saved locally · bell sets price alert</span>
              <Zap className="w-2.5 h-2.5 text-primary ml-auto fill-primary" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-border/50">
                  {['Asset','Price','24h %','AI Score','Note','Alert','Mkt Cap',''].map(h => (
                    <th key={h||'del'} className={`p-[9px] px-[11px] text-[9px] font-bold text-muted-foreground uppercase tracking-[0.7px] ${['Price','24h %'].includes(h) ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {watchlistAssets.map(a => {
                    const flash = a.price > a.prevPrice ? 'price-up' : a.price < a.prevPrice ? 'price-down' : '';
                    const b=badgeFor(a.ai);
                    return (
                      <tr key={a.sym} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="p-[10px] px-[11px] cursor-pointer" onClick={() => onNavigate?.('markets', a.sym)}>
                          <div className="font-bold text-[13px]">{a.sym}</div>
                          <div className="text-[10px] text-muted-foreground max-w-[140px] truncate">{a.name}</div>
                        </td>
                        <td className={`text-right p-[10px] px-[11px] font-mono font-semibold tabular-nums ${flash}`}>${typeof a.price === 'number' ? a.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : a.price}</td>
                        <td className="text-right p-[10px] px-[11px]"><span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${a.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(a.chgPct)}</span></td>
                        <td className="p-[10px] px-[11px]"><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${b.cls}`}>{b.label}</span><span className="ml-1 font-mono text-[10px] text-muted-foreground">{a.ai.toFixed(1)}</span></td>
                        <td className="p-[10px] px-[11px] min-w-[160px]">
                          {noteEdit===a.sym ? (
                            <div className="flex gap-1">
                              <textarea value={notes[a.sym]||''} onChange={e=>setNotes(n=>({...n,[a.sym]:e.target.value}))} placeholder="Add note…" className="w-full min-h-[36px] bg-secondary border border-border rounded-md px-2 py-1 text-[11px] outline-none focus:border-primary resize-none" rows={2} autoFocus />
                              <button onClick={()=>setNoteEdit(null)} className="text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground h-fit">Done</button>
                            </div>
                          ) : (
                            <button onClick={()=>setNoteEdit(a.sym)} className="flex items-center gap-1 text-left w-full group">
                              <StickyNote className="w-3 h-3 text-muted-foreground group-hover:text-foreground shrink-0" />
                              <span className={`text-[11px] truncate max-w-[120px] ${notes[a.sym]?'text-foreground':'text-muted-foreground'}`}>{notes[a.sym]||'Add note…'}</span>
                            </button>
                          )}
                        </td>
                        <td className="p-[10px] px-[11px] text-center">
                          <button onClick={()=>openAlert(a.sym,a.price)} className={`p-1.5 rounded-lg border ${alerts[a.sym]?'bg-amber-500/15 border-amber-500/30 text-amber-600':'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}>
                            {alerts[a.sym]? <BellRing className="w-3.5 h-3.5"/> : <Bell className="w-3.5 h-3.5"/>}
                          </button>
                          {alerts[a.sym] && <div className="text-[9px] font-mono text-amber-600 mt-0.5">{alerts[a.sym].direction==='above'?'≥':'≤'} ${alerts[a.sym].target}</div>}
                        </td>
                        <td className="p-[10px] px-[11px] font-mono text-muted-foreground tabular-nums">{a.mktcap}</td>
                        <td className="p-[10px] px-[11px]"><button onClick={e => { e.stopPropagation(); removeFromWatchlist(a.sym); toast({ title: `${a.sym} removed` }); }}><Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive cursor-pointer" /></button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </>
      )}

      <AnimatePresence>
        {alertModal && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={()=>setAlertModal(null)}>
            <motion.div initial={{scale:0.96,y:8}} animate={{scale:1,y:0}} exit={{scale:0.96,opacity:0}} onClick={e=>e.stopPropagation()} className="bg-card border border-border rounded-xl p-4 w-full max-w-sm shadow-xl">
              <div className="flex items-center gap-2 mb-3"><BellRing className="w-4 h-4 text-primary"/><span className="font-display text-sm font-bold">Price Alert — {alertModal}</span></div>
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Price</label>
                  <input type="number" value={alertDraft.target} onChange={e=>setAlertDraft(d=>({...d,target:Number(e.target.value)}))} className="mt-1 w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-primary" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Trigger when price goes</label>
                  <div className="mt-1 flex gap-2">
                    {(['above','below'] as const).map(dir=>(
                      <button key={dir} onClick={()=>setAlertDraft(d=>({...d,direction:dir}))} className={`flex-1 py-2 rounded-lg text-xs font-semibold border capitalize ${alertDraft.direction===dir?'bg-primary text-primary-foreground border-primary':'bg-secondary border-border'}`}>{dir}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={()=>setAlertModal(null)} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-secondary border border-border">Cancel</button>
                  <button onClick={saveAlert} className="flex-1 py-2 rounded-lg text-xs font-semibold bg-primary text-primary-foreground">Save Alert</button>
                  {alerts[alertModal] && <button onClick={()=>{ setAlerts(a=>{const n={...a}; delete n[alertModal!]; return n;}); setAlertModal(null); toast({title:'Alert removed'});}} className="px-3 py-2 rounded-lg text-xs font-medium text-destructive border border-destructive/20">Remove</button>}
                </div>
                <p className="text-[10px] text-muted-foreground">Local only — stored in browser. Future: push notifications via Supabase.</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface WatchlistAsset { sym: string; name: string; price: number; chgPct: number; chg: number; prevPrice: number; mktcap?: string; sector?: string; exchange?: string; type?: string; priceTarget?: number; analystRating?: string; morningstarRating?: number; signal?: string; rsi?: number | string; pe?: number | string; ai:number; }
function WatchlistCard({ asset, onRemove, onNavigate, note, hasAlert, onBell }: { asset: WatchlistAsset; onRemove: () => void; onNavigate?: (page: string, sym?: string) => void; note:string; hasAlert:boolean; onBell:()=>void }) {
  const sparkData = useMemo(() => {
    const data = genLine(asset.price * 0.92, 30, asset.chgPct >= 0 ? 0.003 : -0.003, 0.012);
    return data.map((v, i) => ({ i, v }));
  }, [asset.price, asset.chgPct]);
  const color = asset.chgPct >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)';
  const flash = asset.price > asset.prevPrice ? 'price-up' : asset.price < asset.prevPrice ? 'price-down' : '';
  const b=badgeFor(asset.ai);
  return (
    <div className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden hover:border-primary/25 transition-colors cursor-pointer shadow-[0_4px_24px_hsl(var(--foreground)/0.04)]" onClick={() => onNavigate?.('markets', asset.sym)}>
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-border/50">
        <div>
          <div className="font-mono text-sm font-semibold text-foreground flex items-center gap-1.5">{asset.sym} <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${b.cls}`}>{b.label}</span></div>
          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">{asset.name} · <span className="font-mono">{asset.ai.toFixed(1)} AI</span></div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={e=>{e.stopPropagation(); onBell();}} className={`p-1.5 rounded-lg border ${hasAlert?'bg-amber-500/15 border-amber-500/30 text-amber-600':'hover:bg-muted/30 border-transparent text-muted-foreground'}`}>{hasAlert?<BellRing className="w-3 h-3"/>:<Bell className="w-3 h-3"/>}</button>
          <button onClick={e => { e.stopPropagation(); onRemove(); }} className="p-1 rounded hover:bg-muted/30"><Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" /></button>
        </div>
      </div>
      <div className="px-3.5 py-2.5">
        <div className="flex items-baseline justify-between mb-1">
          <span className={`font-mono text-base font-semibold text-foreground tabular-nums ${flash}`}>${typeof asset.price === 'number' ? asset.price.toLocaleString(undefined, { minimumFractionDigits: 2 }) : asset.price}</span>
          <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${asset.chgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>{formatPct(asset.chgPct)}</span>
        </div>
        <ResponsiveContainer width="100%" height={50}>
          <AreaChart data={sparkData}>
            <defs><linearGradient id={`wl-${asset.sym}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.15} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#wl-${asset.sym})`} strokeWidth={1.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
        {note && <div className="mt-1.5 text-[11px] text-muted-foreground bg-secondary/50 rounded-md px-2 py-1 truncate flex items-center gap-1"><StickyNote className="w-3 h-3 shrink-0"/>{note}</div>}
        {asset.priceTarget && (
          <div className="flex items-center justify-between mt-1 text-[10px]">
            <span className="text-muted-foreground">Target</span>
            <span className="font-mono font-semibold text-foreground tabular-nums">${asset.priceTarget}</span>
            <span className={`font-mono tabular-nums ${asset.priceTarget > asset.price ? 'text-primary' : 'text-destructive'}`}>({((asset.priceTarget - asset.price) / asset.price * 100).toFixed(1)}%)</span>
          </div>
        )}
      </div>
    </div>
  );
}
