import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/hooks/use-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

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
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    fees.forEach(f => { grouped[f.fee_type] = (grouped[f.fee_type] || 0) + Number(f.amount); });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [fees]);
  const PIE_COLORS: Record<string, string> = { brokerage: 'hsl(218 90% 66%)', management: 'hsl(160 60% 52%)', fx: 'hsl(38 95% 55%)', other: 'hsl(0 76% 58%)' };
  return (
    <div className="bg-card/70 backdrop-blur-xl border border-border/50 rounded-xl p-3.5 shadow-[0_4px_24px_hsl(var(--foreground)/0.04)]">
      <div className="font-display text-[13px] font-bold">Fees Tracker</div>
      <div className="text-[11px] text-muted-foreground">TER drag: {drag.toFixed(2)}% · Total fees KES {totalFees.toLocaleString()}</div>
      <div className="flex gap-2 mt-2">
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="KES amount" type="number" className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs" />
        <select value={type} onChange={(e) => setType(e.target.value)} className="bg-secondary border border-border rounded-lg px-2 py-1.5 text-xs">
          <option value="brokerage">Brokerage (0.3% NSE)</option><option value="management">Management</option><option value="fx">FX</option><option value="other">Other</option>
        </select>
        <button onClick={add} className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Add</button>
      </div>
      {pieData.length > 0 && (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-[88px] h-[88px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={24} outerRadius={38} paddingAngle={3} strokeWidth={0}>
                  {pieData.map((e, i) => <Cell key={e.name} fill={PIE_COLORS[e.name] ?? `hsl(${i * 60} 70% 60%)`} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1">
            {pieData.map(d => (
              <div key={d.name} className="flex items-center justify-between text-[11px]">
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-sm" style={{ background: PIE_COLORS[d.name] ?? 'hsl(0 0% 50%)' }} />{d.name}</span>
                <span className="font-mono">KES {d.value.toLocaleString()} · {(d.value / totalFees * 100).toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="mt-2 space-y-1 max-h-24 overflow-auto">
        {fees.map((f) => <div key={f.id} className="flex justify-between text-xs bg-secondary rounded px-2 py-1"><span>{f.fee_type}</span><span className="font-mono">KES {Number(f.amount).toLocaleString()}</span></div>)}
        {!fees.length && <div className="text-[11px] text-muted-foreground">No fees logged — add brokerage from last trade.</div>}
      </div>
    </div>
  );
}
