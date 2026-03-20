import { useState, useMemo } from 'react';
import { MARKET, genLine, formatPct } from '@/data/market-data';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const SYMBOLS = [
  { val: 'AAPL', label: 'AAPL — Apple' }, { val: 'MSFT', label: 'MSFT — Microsoft' },
  { val: 'NVDA', label: 'NVDA — NVIDIA' }, { val: 'TSLA', label: 'TSLA — Tesla' },
  { val: 'AMZN', label: 'AMZN — Amazon' }, { val: 'GOOGL', label: 'GOOGL — Alphabet' },
  { val: 'META', label: 'META — Meta' }, { val: 'BTC', label: 'BTC — Bitcoin' },
  { val: 'ETH', label: 'ETH — Ethereum' }, { val: 'SOL', label: 'SOL — Solana' },
  { val: 'SPY', label: 'SPY — S&P 500 ETF' }, { val: 'QQQ', label: 'QQQ — NASDAQ ETF' },
];
const TFS = ['1D', '1W', '1M', '3M', '1Y'];

export default function ChartsPage() {
  const [sym, setSym] = useState('AAPL');
  const [tf, setTf] = useState('1W');
  const [inds, setInds] = useState<Record<string, boolean>>({ MA20: true, MA50: false, RSI: false, BB: false });

  const asset = MARKET[sym] || { price: 200, chgPct: 0, name: sym, mktcap: '—', vol: '—', pe: '—', sector: '—' };

  const chartData = useMemo(() => {
    const closes = genLine(asset.price * 0.88, 90, 0.002);
    const now = new Date();
    return closes.map((v, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (90 - i));
      const ma20 = i >= 19 ? +(closes.slice(i - 19, i + 1).reduce((a, b) => a + b) / 20).toFixed(2) : undefined;
      const ma50 = i >= 49 ? +(closes.slice(i - 49, i + 1).reduce((a, b) => a + b) / 50).toFixed(2) : undefined;
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: v,
        ma20: inds.MA20 ? ma20 : undefined,
        ma50: inds.MA50 ? ma50 : undefined,
        vol: Math.random() * 5e7 + 1e7,
      };
    });
  }, [sym, tf, inds, asset.price]);

  const rsi = (30 + Math.random() * 40).toFixed(1);
  const macd = (Math.random() * 4 - 2).toFixed(2);

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Market Charts</div>
        <div className="flex gap-2">
          <select value={sym} onChange={e => setSym(e.target.value)} className="px-[9px] py-[5px] rounded-md text-xs bg-card border border-border text-foreground outline-none">
            {SYMBOLS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
          <div className="flex gap-0.5">
            {TFS.map(t => (
              <button key={t} onClick={() => setTf(t)} className={`px-2 py-1 rounded-md text-[11px] font-mono ${tf === t ? 'bg-accent-dim text-primary' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '3fr 1fr' }}>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-[15px] py-3 border-b border-border flex items-center">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-[13px] font-bold">{sym}</span>
              <span className="font-mono text-lg font-medium">${asset.price.toLocaleString()}</span>
              <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${asset.chgPct >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
                {formatPct(asset.chgPct)}
              </span>
            </div>
            <div className="ml-auto flex gap-1.5">
              {['MA20', 'MA50', 'RSI', 'BB'].map(ind => (
                <button key={ind} onClick={() => setInds(prev => ({ ...prev, [ind]: !prev[ind] }))}
                  className={`px-[11px] py-[5px] rounded-md text-xs border ${inds[ind] ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
                  {ind}
                </button>
              ))}
            </div>
          </div>
          <div className="p-3.5">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs><linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} stopOpacity={0.1} /><stop offset="100%" stopColor={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} stopOpacity={0} /></linearGradient></defs>
                <XAxis dataKey="date" tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} interval={14} />
                <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} domain={['auto', 'auto']} />
                <Tooltip contentStyle={{ background: '#13151d', border: '1px solid rgba(128,128,128,0.15)', borderRadius: 8, fontSize: 12 }} />
                <Area type="monotone" dataKey="price" stroke={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                {inds.MA20 && <Area type="monotone" dataKey="ma20" stroke="#f5a623" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
                {inds.MA50 && <Area type="monotone" dataKey="ma50" stroke="#a78bfa" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
              </AreaChart>
            </ResponsiveContainer>
            <ResponsiveContainer width="100%" height={70}>
              <BarChart data={chartData}>
                <XAxis dataKey="date" hide />
                <YAxis tick={{ fill: '#4a5068', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => (v / 1e6).toFixed(0) + 'M'} width={60} />
                <Bar dataKey="vol" fill="rgba(91,156,246,0.3)" radius={2} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-2.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">OHLCV</span></div>
            <div className="p-3.5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-[7px]">
                {[['Open', (asset.price * 0.995).toFixed(2)], ['High', (asset.price * 1.012).toFixed(2)], ['Low', (asset.price * 0.988).toFixed(2)], ['Close', asset.price]].map(([k, v]) => (
                  <div key={k as string}><div className="text-[10px] text-muted-foreground">{k}</div><div className="text-[13px]">${v?.toLocaleString()}</div></div>
                ))}
                <div className="col-span-2"><div className="text-[10px] text-muted-foreground">Volume</div><div className="text-[13px]">{(Math.random() * 50 + 10).toFixed(1)}M</div></div>
              </div>
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Indicators</span></div>
            <div className="p-3.5 text-xs space-y-[7px]">
              {[['RSI (14)', rsi], ['MACD', macd], ['MA20', '$' + (chartData.slice(-1)[0]?.ma20 || '—')]].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Key Stats</span></div>
            <div className="p-3.5 text-xs space-y-1.5">
              {[['52W High', '$' + (asset.price * 1.12).toFixed(2)], ['52W Low', '$' + (asset.price * 0.78).toFixed(2)], ['Market Cap', asset.mktcap || '—'], ['P/E Ratio', String(asset.pe)], ['Volume', asset.vol || '—'], ['Sector', asset.sector || '—']].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
