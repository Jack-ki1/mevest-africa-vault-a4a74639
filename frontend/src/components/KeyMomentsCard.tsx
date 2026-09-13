import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, TrendingDown, Smile, Frown, Meh } from 'lucide-react';

interface KeyMoment { id: string; symbol: string; change_pct: number; summary: string; sources: { title: string; url: string; sentiment?: string }[]; generated_at: string; }

export default function KeyMomentsCard({ symbols }: { symbols: string[] }) {
  const [moments, setMoments] = useState<KeyMoment[]>([]);
  useEffect(() => {
    if (!symbols.length) return;
    const load = async () => {
      const { data } = await supabase.from('key_moments').select('*').in('symbol', symbols).order('generated_at', { ascending: false }).limit(5);
      if (data) setMoments(data as KeyMoment[]);
    };
    load();
    const ch = supabase.channel('key_moments').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'key_moments' }, payload => {
      const m = payload.new as KeyMoment;
      if (symbols.includes(m.symbol)) setMoments(prev => [m, ...prev].slice(0, 5));
    }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [symbols.join(',')]);
  if (moments.length === 0) return null;
  return (
    <div className="space-y-2">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Key Moments — AI explains the move</div>
      {moments.map(m => (
        <div key={m.id} className="bg-card border border-border rounded-xl p-3.5">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono font-bold text-xs">{m.symbol}</span>
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded ${Number(m.change_pct) >= 0 ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>
              {Number(m.change_pct) >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}{Number(m.change_pct).toFixed(2)}%
            </span>
            <span className="text-[10px] text-muted-foreground ml-auto">{new Date(m.generated_at).toLocaleTimeString()}</span>
          </div>
          <p className="text-xs leading-relaxed text-foreground">{m.summary}</p>
          <div className="flex items-center gap-1 mt-1">
            {Number(m.change_pct) > 2 ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary flex items-center gap-1"><Smile className="w-3 h-3" /> FinBERT positive</span> : Number(m.change_pct) < -2 ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-destructive/10 text-destructive flex items-center gap-1"><Frown className="w-3 h-3" /> FinBERT negative</span> : <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground flex items-center gap-1"><Meh className="w-3 h-3" /> neutral</span>}
            <span className="text-[10px] text-muted-foreground">Sentiment badge — ProsusAI/finbert via sentiment-sync (HF fallback)</span>
          </div>
          {m.sources && m.sources.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {m.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground hover:text-primary flex items-center gap-1">[{i + 1}] {s.title.slice(0, 40)} {s.sentiment === 'positive' ? <span className="text-primary">●</span> : s.sentiment === 'negative' ? <span className="text-destructive">●</span> : null}</a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
