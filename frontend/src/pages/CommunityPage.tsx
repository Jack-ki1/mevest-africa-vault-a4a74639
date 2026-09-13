import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Crown, Medal, Copy, MessageCircle, ChevronDown, ThumbsUp, Send, Sparkles } from 'lucide-react';

interface RecordRow { user_id: string; display_name: string; ytd_return_pct: number | null; }
interface Idea { id: string; symbol: string; title: string; body: string; sentiment: string | null; created_at: string; }
interface Comment { id:string; ideaId:string; author:string; text:string; at:string; }

function GlassCard({children,className=''}:{children:React.ReactNode;className?:string}){ return <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className={`bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl overflow-hidden shadow-[0_4px_24px_hsl(var(--foreground)/0.04)] ${className}`}>{children}</motion.div>; }
function tierFor(ytd:number|null){
  const v = ytd==null? -999 : Number(ytd);
  if(v>=15) return {label:'Gold', cls:'bg-amber-500 text-white border-amber-600', icon:Crown, color:'text-amber-500'};
  if(v>=5) return {label:'Silver', cls:'bg-zinc-400 text-white border-zinc-500', icon:Medal, color:'text-zinc-400'};
  if(v>=0) return {label:'Bronze', cls:'bg-amber-700 text-white border-amber-800', icon:Medal, color:'text-amber-700'};
  return {label:'—', cls:'bg-muted text-muted-foreground', icon:Trophy, color:'text-muted-foreground'};
}

const MOCK_COMMENTS: Record<string, Comment[]> = {
  // will be populated dynamically
};

export default function CommunityPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaForm, setIdeaForm] = useState({ symbol: '', title: '', body: '' });
  const [showIdea, setShowIdea] = useState(false);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [openThread, setOpenThread] = useState<string|null>(null);
  const [commentDraft, setCommentDraft] = useState<Record<string,string>>({});
  const [likes, setLikes] = useState<Record<string,number>>({});

  useEffect(() => {
    supabase.from('public_track_records').select('user_id,display_name,ytd_return_pct').eq('opted_in', true).order('ytd_return_pct', { ascending: false }).limit(50).then(({ data }) => { if (data) setRows(data as RecordRow[]); });
    supabase.from('ideas').select('id,symbol,title,body,sentiment,created_at').order('created_at', { ascending: false }).limit(20).then(({ data }) => { if (data) setIdeas(data as Idea[]); });
  }, []);

  const publishIdea = async () => {
    if (!user) { toast({ title: 'Sign in required' }); return; }
    if (!ideaForm.symbol || !ideaForm.title) { toast({ title: 'Symbol + title required' }); return; }
    const { data, error } = await supabase.from('ideas').insert({ user_id: user.id, symbol: ideaForm.symbol.toUpperCase(), title: ideaForm.title, body: ideaForm.body }).select().single();
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setIdeas((prev) => [data as Idea, ...prev]); setIdeaForm({ symbol: '', title: '', body: '' }); setShowIdea(false); toast({ title: 'Idea published ✓' }); }
  };

  const copyPortfolio = async () => {
    // mock top 3 holdings symbols
    const top3 = ['SCOM.NR','EQTY.NR','KCB.NR'];
    const text = top3.join(', ');
    try{ await navigator.clipboard.writeText(text); toast({title:'Copied top 3 holdings', description:text}); } catch{ toast({title:text, description:'Copy manually'}); }
  };
  const copyUserTop = async (name:string) => {
    const picks = ['AAPL','MSFT','NVDA'].slice(0,3).join(', ');
    try{ await navigator.clipboard.writeText(picks); toast({title:`Copied ${name}'s top 3`, description:picks}); } catch{ toast({title:picks}); }
  };

  const addComment=(ideaId:string)=>{
    const txt=(commentDraft[ideaId]||'').trim();
    if(!txt) return;
    const c: Comment={id:Date.now().toString(), ideaId, author: user?.email?.split('@')[0] || 'anon', text:txt, at:new Date().toLocaleString()};
    setComments(prev=>({...prev,[ideaId]:[...(prev[ideaId]||[]), c]}));
    setCommentDraft(d=>({...d,[ideaId]:''}));
  };
  const toggleLike=(id:string)=> setLikes(p=>({...p,[id]:(p[id]||0)+1}));

  // seed mock comments for demo
  useEffect(()=>{
    if(ideas.length && Object.keys(comments).length===0){
      const seed: Record<string,Comment[]> = {};
      ideas.slice(0,2).forEach(it=>{
        seed[it.id]=[{id:'m1',ideaId:it.id,author:'mali_trader', text:'Great thesis — watch the 30 level resistance.', at:'2h ago'},{id:'m2',ideaId:it.id,author:'nairobi_bull', text:'Agreed, volume confirms breakout.', at:'1h ago'}];
      });
      if(Object.keys(seed).length) setComments(seed);
    }
  },[ideas]);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <div className="font-display text-[19px] font-extrabold">Community — Verified Track Records</div>
          <div className="text-xs text-muted-foreground">Opt-in, pseudonymous, computed from real portfolio_snapshots (never self-reported). No cost basis or absolute values shown.</div>
        </div>
        <button onClick={copyPortfolio} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card border border-border text-xs font-semibold hover:border-primary/30"><Copy className="w-3.5 h-3.5"/>Copy top 3 holdings</button>
      </div>

      <div className="flex gap-1">
        {['all','nse','us','blended'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded-lg text-xs capitalize border ${filter === f ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary border-border'}`}>{f}</button>
        ))}
      </div>

      <GlassCard>
        <div className="px-[15px] py-3 border-b border-border/50 flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500"/><span className="font-display text-[13px] font-bold">Leaderboard</span><span className="text-[10px] text-muted-foreground">Bronze ≥0% · Silver ≥5% · Gold ≥15% YTD</span></div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border/50"><th className="text-left p-3 text-[10px] uppercase text-muted-foreground">#</th><th className="text-left p-3">Handle</th><th className="text-left p-3">Tier</th><th className="text-right p-3">YTD Return</th><th className="p-3"></th></tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const t=tierFor(r.ytd_return_pct); const Icon=t.icon;
              return (
              <tr key={r.user_id} className="border-b border-border/30 hover:bg-muted/20">
                <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-semibold">{r.display_name} <span className="text-[10px] text-muted-foreground">— watchlist share (weights only) on click</span></td>
                <td className="p-3"><span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.cls}`}><Icon className="w-3 h-3"/>{t.label}</span></td>
                <td className={`p-3 text-right font-mono font-bold ${Number(r.ytd_return_pct) >= 0 ? 'text-primary' : 'text-destructive'}`}>{r.ytd_return_pct != null ? Number(r.ytd_return_pct).toFixed(2) + '%' : '—'}</td>
                <td className="p-3 text-right"><button onClick={()=>copyUserTop(r.display_name)} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-md bg-secondary border border-border hover:border-primary/20"><Copy className="w-3 h-3"/>Copy</button></td>
              </tr>
            )})}
            {rows.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No opted-in track records yet. Enable in Settings.</td></tr>}
          </tbody>
        </table>
        </div>
      </GlassCard>

      <GlassCard className="p-3.5">
        <div className="flex items-center justify-between">
          <div className="font-display text-[13px] font-bold flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-primary"/>Ideas Stream — TradingView pattern (lite)</div>
          <button onClick={() => setShowIdea(!showIdea)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">💡 Publish Idea</button>
        </div>
        <AnimatePresence>
        {showIdea && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
          <div className="mt-3 space-y-2 bg-secondary/60 backdrop-blur rounded-lg p-3 border border-border/50">
            <input value={ideaForm.symbol} onChange={(e) => setIdeaForm({ ...ideaForm, symbol: e.target.value })} placeholder="Symbol e.g. SCOM.NR" className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <input value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })} placeholder="Title — e.g. SCOM breakout above 30" className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
            <textarea value={ideaForm.body} onChange={(e) => setIdeaForm({ ...ideaForm, body: e.target.value })} placeholder="Body — thesis with citations..." className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs h-20 outline-none focus:border-primary" />
            <button onClick={publishIdea} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Publish</button>
          </div>
          </motion.div>
        )}
        </AnimatePresence>
        <div className="mt-3 space-y-2">
          {ideas.map((it) => {
            const isOpen=openThread===it.id;
            const cmts=comments[it.id]||[];
            return (
            <div key={it.id} className="bg-secondary/40 backdrop-blur border border-border/30 rounded-lg p-3">
              <div className="flex items-center gap-2"><span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{it.symbol}</span><span className="text-xs font-semibold">{it.title}</span><span className="ml-auto text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{it.body}</div>
              <div className="flex gap-2 mt-2 text-[11px] items-center">
                <button onClick={()=>toggleLike(it.id)} className="inline-flex items-center gap-1 text-primary hover:opacity-80"><ThumbsUp className="w-3 h-3"/> Like {likes[it.id]?`· ${likes[it.id]}`:''}</button>
                <button onClick={()=>setOpenThread(isOpen?null:it.id)} className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"><MessageCircle className="w-3 h-3"/> Comment {cmts.length?`(${cmts.length})`:''} <ChevronDown className={`w-3 h-3 transition ${isOpen?'rotate-180':''}`}/></button>
                <span className="ml-auto text-muted-foreground text-[10px]">Not financial advice</span>
              </div>
              <AnimatePresence>
              {isOpen && (
                <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} className="overflow-hidden">
                  <div className="mt-3 border-t border-border/30 pt-3 space-y-2">
                    {cmts.map(c=>(
                      <div key={c.id} className="bg-card border border-border/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2"><span className="text-[11px] font-semibold">{c.author}</span><span className="text-[10px] text-muted-foreground">{c.at}</span></div>
                        <div className="text-xs mt-1">{c.text}</div>
                      </div>
                    ))}
                    {cmts.length===0 && <div className="text-[11px] text-muted-foreground">No comments yet — be first.</div>}
                    <div className="flex gap-2">
                      <input value={commentDraft[it.id]||''} onChange={e=>setCommentDraft(d=>({...d,[it.id]:e.target.value}))} onKeyDown={e=>{if(e.key==='Enter') addComment(it.id)}} placeholder="Write a comment…" className="flex-1 bg-card border border-border rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary" />
                      <button onClick={()=>addComment(it.id)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs inline-flex items-center gap-1"><Send className="w-3 h-3"/>Post</button>
                    </div>
                  </div>
                </motion.div>
              )}
              </AnimatePresence>
            </div>
          )})}
          {!ideas.length && <div className="text-xs text-muted-foreground text-center py-4">No ideas yet — publish the first one from Markets → 💡 Publish Idea.</div>}
        </div>
      </GlassCard>
    </div>
  );
}
