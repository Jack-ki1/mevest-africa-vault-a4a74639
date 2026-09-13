import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Rate { instrument: string; rate_pct: number; as_of: string; }

export default function RatesComparator({ portfolioReturnPct }: { portfolioReturnPct?: number }) {
  const [rates, setRates] = useState<Rate[]>([]);
  useEffect(() => {
    supabase.from('kenya_rates').select('instrument,rate_pct,as_of').order('as_of', { ascending: false }).limit(10).then(({ data }) => {
      if (data) {
        const seen = new Map<string, Rate>();
        (data as Rate[]).forEach(r => { if (!seen.has(r.instrument)) seen.set(r.instrument, r); });
        setRates(Array.from(seen.values()));
      }
    });
  }, []);
  const get = (inst: string) => rates.find(r => r.instrument === inst)?.rate_pct;
  const tb91 = get('T-Bill-91');
  const tb364 = get('T-Bill-364');
  const mmf = get('MMF-Average');

  return (
    <div className="bg-card border border-border rounded-xl p-3.5">
      <div className="font-display text-[13px] font-bold mb-2">Yield Comparator — NSE vs Risk-Free</div>
      <div className="grid grid-cols-4 max-sm:grid-cols-2 gap-2 text-center">
        <div className="bg-secondary rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Portfolio (1Y)</div>
          <div className="font-mono text-sm font-bold">{portfolioReturnPct != null ? portfolioReturnPct.toFixed(1) + '%' : '—'}</div>
          <div className="text-[10px] text-muted-foreground">annualized</div>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">91-Day T-Bill</div>
          <div className="font-mono text-sm font-bold">{tb91 != null ? tb91.toFixed(2) + '%' : '—'}</div>
          <div className="text-[10px] text-muted-foreground">risk-free (CBK)</div>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">364-Day T-Bill</div>
          <div className="font-mono text-sm font-bold">{tb364 != null ? tb364.toFixed(2) + '%' : '—'}</div>
          <div className="text-[10px] text-muted-foreground">CBK</div>
        </div>
        <div className="bg-secondary rounded-lg p-2">
          <div className="text-[10px] text-muted-foreground uppercase font-semibold">Top MMF</div>
          <div className="font-mono text-sm font-bold">{mmf != null ? mmf.toFixed(2) + '%' : '—'}</div>
          <div className="text-[10px] text-muted-foreground">avg (CMA)</div>
        </div>
      </div>
      <div className="text-[10px] text-muted-foreground mt-2">Source: CBK weekly T-Bill auction + CMA MMF filings. Portfolio return computed from price_history.</div>
    </div>
  );
}
