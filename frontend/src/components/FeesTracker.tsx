import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';

export default function FeesTracker({ totalValue }: { totalValue: number }) {
  const { user } = useAuth();
  const [fees, setFees] = useState<{ id: string; amount: number; fee_type: string }[]>([]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('brokerage');
  useEffect(() => {
    if (!user) return;
    supabase.from('fees_ledger').select('id,amount,fee_type').eq('user_id', user.id).then(({ data }) => { if (data) setFees(data as typeof fees); });
  }, [user?.id]);
  const add = async () => {
    if (!user || !amount) return;
    const val = parseFloat(amount);
    if (!val) return;
    const { data, error } = await supabase.from('fees_ledger').insert({ user_id: user.id, fee_type: type, amount: val, currency: 'KES' }).select().single();
    if (error) toast({ title: 'Failed', description: error.message, variant: 'destructive' });
    else { setFees((f) => [...f, data as typeof fees[0]]); setAmount(''); }
  };
  const totalFees = fees.reduce((a, b) => a + Number(b.amount), 0);
  const drag = totalValue ? (totalFees / totalValue) * 100 : 0;
  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="font-display text-[13px] font-bold">Fees Tracker</div>
      <div className="text-[11px] text-muted-foreground">TER drag: {drag.toFixed(2)}% · Total fees KES {totalFees.toLocaleString()}</div>
      <div className="flex gap-2 mt-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="KES amount" type="number" className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs">
          <option value="brokerage">Brokerage (0.3% NSE)</option><option value="management">Management</option><option value="fx">FX</option><option value="other">Other</option>
        </select>
        <button onClick={add} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Add</button>
      </div>
      <div className="mt-2 space-y-1 max-h-24 overflow-auto">
        {fees.map((f) => <div key={f.id} className="flex justify-between text-xs bg-secondary rounded px-2 py-1"><span>{f.fee_type}</span><span className="font-mono">KES {Number(f.amount).toLocaleString()}</span></div>)}
        {!fees.length && <div className="text-[11px] text-muted-foreground">No fees logged — add brokerage from last trade.</div>}
      </div>
    </div>
  );
}
