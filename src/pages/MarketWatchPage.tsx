import { useState, useMemo } from 'react';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { MARKET_REGIONS, genLine, formatPrice } from '@/data/market-data';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { Zap } from 'lucide-react';

const REGIONS = [
  { val: 'us', label: '🇺🇸 US Markets' },
  { val: 'crypto', label: '🌐 Crypto' },
  { val: 'africa', label: '🌍 African Markets' },
  { val: 'europe', label: '🇪🇺 European Markets' },
  { val: 'commodities', label: '🛢 Commodities' },
  { val: 'bonds', label: '🏛 Govt Bonds / Bills' },
];

export default function MarketWatchPage() {
  const { prices } = useRealtimeMarket();
  const [region, setRegion] = useState('us');
  const items = MARKET_REGIONS[region] || [];

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="font-display text-[19px] font-extrabold tracking-tight">Market Watch</div>
            <div className="flex items-center gap-1 text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
              <Zap className="w-2.5 h-2.5 fill-primary" />LIVE
            </div>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">Real-time charts across global markets</div>
        </div>
        <select value={region} onChange={e => setRegion(e.target.value)} className="px-[9px] py-[5px] rounded-md text-xs bg-secondary border border-border text-foreground outline-none">
          {REGIONS.map(r => <option key={r.val} value={r.val}>{r.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-3 max-lg:grid-cols-2 max-sm:grid-cols-1 gap-3.5">
        {items.map(item => (
          <MarketCard key={item.key} item={item} />
        ))}
      </div>
    </div>
  );
}

function MarketCard({ item }: { item: { sym: string; key: string; price: number; chg: number } }) {
  const sparkData = useMemo(() => {
    const data = genLine(item.price * 0.92, 40, item.chg >= 0 ? 0.003 : -0.003, 0.012);
    return data.map((v, i) => ({ i, v }));
  }, [item.price, item.chg]);

  const color = item.chg >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)';

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/25 transition-colors">
      <div className="px-3.5 py-3 flex items-center justify-between border-b border-border">
        <div>
          <div className="font-mono text-sm font-semibold text-foreground">{item.sym}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-base font-medium text-foreground tabular-nums">{formatPrice(item.price)}</div>
          <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md tabular-nums ${item.chg >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
            {item.chg >= 0 ? '+' : ''}{item.chg.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="px-3.5 py-2.5">
        <ResponsiveContainer width="100%" height={80}>
          <AreaChart data={sparkData}>
            <defs><linearGradient id={`spark-${item.key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity={0.15} /><stop offset="100%" stopColor={color} stopOpacity={0} /></linearGradient></defs>
            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#spark-${item.key})`} strokeWidth={1.8} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
