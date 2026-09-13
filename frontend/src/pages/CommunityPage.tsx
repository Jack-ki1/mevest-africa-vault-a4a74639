import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
interface RecordRow { user_id: string; display_name: string; ytd_return_pct: number | null; }
interface Idea { id: string; symbol: string; title: string; body: string; sentiment: string | null; created_at: string; }
export default function CommunityPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [ideaForm, setIdeaForm] = useState({ symbol: '', title: '', body: '' });
  const [showIdea, setShowIdea] = useState(false);
  useEffect(() => {
    supabase.from('public_track_records').select('user_id,display_name,ytd_return_pct').eq('opted_in', true).order('ytd_return_pct', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setRows(data as RecordRow[]);
    });
    supabase.from('ideas').select('id,symbol,title,body,sentiment,created_at').order('created_at', { ascending: false }).limit(20).then(({ data }) => { if (data) setIdeas(data as Idea[]); });
  }, []);
  const publishIdea = async () => {
    if (!user) { toast({ title: 'Sign in required' }); return; }
    if (!ideaForm.symbol || !ideaForm.title) { toast({ title: 'Symbol + title required' }); return; }
    const { data, error } = await supabase.from('ideas').insert({ user_id: user.id, symbol: ideaForm.symbol.toUpperCase(), title: ideaForm.title, body: ideaForm.body }).select().single();
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setIdeas((prev) => [data as Idea, ...prev]); setIdeaForm({ symbol: '', title: '', body: '' }); setShowIdea(false); toast({ title: 'Idea published ✓' }); }
  };
  return (
    <div className="space-y-3.5">
      <div className="font-display text-[19px] font-extrabold">Community — Verified Track Records</div>
      <div className="text-xs text-muted-foreground">Opt-in, pseudonymous, computed from real portfolio_snapshots (never self-reported). No cost basis or absolute values shown.</div>
      <div className="flex gap-1">
        {['all','nse','us','blended'].map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`px-2 py-1 rounded-lg text-xs capitalize border ${filter === f ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-secondary border-border'}`}>{f}</button>
        ))}
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full text-xs">
          <thead><tr className="border-b border-border"><th className="text-left p-3 text-[10px] uppercase text-muted-foreground">#</th><th className="text-left p-3">Handle</th><th className="text-right p-3">YTD Return</th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.user_id} className="border-b border-border/30">
                <td className="p-3 font-mono text-muted-foreground">{i + 1}</td>
                <td className="p-3 font-semibold">{r.display_name} <span className="text-[10px] text-muted-foreground">— watchlist share (weights only) on click</span></td>
                <td className={`p-3 text-right font-mono font-bold ${Number(r.ytd_return_pct) >= 0 ? 'text-primary' : 'text-destructive'}`}>{r.ytd_return_pct != null ? Number(r.ytd_return_pct).toFixed(2) + '%' : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No opted-in track records yet. Enable in Settings.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bg-card border border-border rounded-xl p-3.5">
        <div className="flex items-center justify-between">
          <div className="font-display text-[13px] font-bold">Ideas Stream — TradingView pattern (lite)</div>
          <button onClick={() => setShowIdea(!showIdea)} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">💡 Publish Idea</button>
        </div>
        {showIdea && (
          <div className="mt-3 space-y-2 bg-secondary rounded-lg p-3">
            <input value={ideaForm.symbol} onChange={(e) => setIdeaForm({ ...ideaForm, symbol: e.target.value })} placeholder="Symbol e.g. SCOM.NR" className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs" />
            <input value={ideaForm.title} onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })} placeholder="Title — e.g. SCOM breakout above 30" className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs" />
            <textarea value={ideaForm.body} onChange={(e) => setIdeaForm({ ...ideaForm, body: e.target.value })} placeholder="Body — thesis with citations..." className="w-full bg-card border border-border rounded-lg px-3 py-1.5 text-xs h-20" />
            <button onClick={publishIdea} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Publish</button>
          </div>
        )}
        <div className="mt-3 space-y-2">
          {ideas.map((it) => (
            <div key={it.id} className="bg-secondary rounded-lg p-3">
              <div className="flex items-center gap-2"><span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{it.symbol}</span><span className="text-xs font-semibold">{it.title}</span><span className="ml-auto text-[10px] text-muted-foreground">{new Date(it.created_at).toLocaleDateString()}</span></div>
              <div className="text-xs text-muted-foreground mt-1">{it.body}</div>
              <div className="flex gap-2 mt-2 text-[11px]"><button className="text-primary">👍 Like</button><button className="text-muted-foreground">💬 Comment</button><span className="ml-auto text-muted-foreground">Not financial advice</span></div>
            </div>
          ))}
          {!ideas.length && <div className="text-xs text-muted-foreground text-center py-4">No ideas yet — publish the first one from Markets → 💡 Publish Idea.</div>}
        </div>
      </div>
    </div>
  );
}
