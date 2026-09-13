import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Target } from 'lucide-react';

export default function GoalsTracker() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<{ id: string; title: string; target_amount: number; current_amount: number }[]>([]);
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  useEffect(() => {
    if (!user) return;
    supabase.from('investment_goals').select('id,title,target_amount,current_amount').eq('user_id', user.id).then(({ data }) => { if (data) setGoals(data as typeof goals); });
  }, [user?.id]);
  const add = async () => {
    if (!user || !title || !target) return;
    const { data, error } = await supabase.from('investment_goals').insert({ user_id: user.id, title, target_amount: parseFloat(target), currency: 'KES' }).select().single();
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setGoals((g) => [...g, data as typeof goals[0]]); setTitle(''); setTarget(''); }
  };
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="font-display text-[13px] font-bold flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-primary" /> Goal Tracker — M-Pesa framing (KES 1 min, like Ziidi)</div>
      <div className="flex gap-2 mt-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Shamba by Dec 2027" className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" />
        <input value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Target KES" type="number" className="w-28 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" />
        <button onClick={add} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Add Goal</button>
      </div>
      <div className="mt-3 space-y-2">
        {goals.map((g) => {
          const pct = Math.min(100, (Number(g.current_amount) / Number(g.target_amount)) * 100);
          return (
            <div key={g.id} className="bg-secondary rounded-lg p-2">
              <div className="flex justify-between text-xs"><span className="font-semibold">{g.title}</span><span className="font-mono">{pct.toFixed(0)}%</span></div>
              <div className="h-2 bg-muted/30 rounded-full overflow-hidden mt-1"><div className="h-full bg-primary rounded-full" style={{ width: pct + '%' }} /></div>
              <div className="text-[10px] text-muted-foreground mt-1">KES {Number(g.current_amount).toLocaleString()} / KES {Number(g.target_amount).toLocaleString()} · <button onClick={async () => {
                const addAmt = 1000;
                await supabase.from('investment_goals').update({ current_amount: Number(g.current_amount) + addAmt }).eq('id', g.id);
                setGoals((prev) => prev.map((x) => x.id === g.id ? { ...x, current_amount: Number(x.current_amount) + addAmt } : x));
              }} className="text-primary underline">+ KES 1,000 via M-Pesa (mock)</button></div>
            </div>
          );
        })}
        {!goals.length && <div className="text-[11px] text-muted-foreground">No goals yet — create "KES 500k for land" and track progress.</div>}
      </div>
    </div>
  );
}
