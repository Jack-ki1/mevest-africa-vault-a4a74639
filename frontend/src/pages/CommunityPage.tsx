import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
interface RecordRow { user_id: string; display_name: string; ytd_return_pct: number | null; }
export default function CommunityPage() {
  const [rows, setRows] = useState<RecordRow[]>([]);
  const [filter, setFilter] = useState('all');
  useEffect(() => {
    supabase.from('public_track_records').select('user_id,display_name,ytd_return_pct').eq('opted_in', true).order('ytd_return_pct', { ascending: false }).limit(50).then(({ data }) => {
      if (data) setRows(data as RecordRow[]);
    });
  }, []);
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
                <td className="p-3 font-semibold">{r.display_name}</td>
                <td className={`p-3 text-right font-mono font-bold ${Number(r.ytd_return_pct) >= 0 ? 'text-primary' : 'text-destructive'}`}>{r.ytd_return_pct != null ? Number(r.ytd_return_pct).toFixed(2) + '%' : '—'}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No opted-in track records yet. Enable in Settings.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
