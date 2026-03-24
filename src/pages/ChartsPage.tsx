import { useState, useMemo, useEffect } from 'react';
import { MARKET, MarketAsset, genLine, formatPct } from '@/data/market-data';
import { useRealtimeMarket } from '@/context/RealtimeMarketContext';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const SYMBOLS = [
  { val: 'AAPL', label: 'AAPL — Apple' }, { val: 'MSFT', label: 'MSFT — Microsoft' },
  { val: 'NVDA', label: 'NVDA — NVIDIA' }, { val: 'TSLA', label: 'TSLA — Tesla' },
  { val: 'AMZN', label: 'AMZN — Amazon' }, { val: 'GOOGL', label: 'GOOGL — Alphabet' },
  { val: 'META', label: 'META — Meta' }, { val: 'JPM', label: 'JPM — JPMorgan' },
  { val: 'V', label: 'V — Visa' }, { val: 'JNJ', label: 'JNJ — J&J' },
  { val: 'UNH', label: 'UNH — UnitedHealth' },
  { val: 'BTC', label: 'BTC — Bitcoin' }, { val: 'ETH', label: 'ETH — Ethereum' },
  { val: 'SOL', label: 'SOL — Solana' }, { val: 'DOGE', label: 'DOGE — Dogecoin' },
  { val: 'SPY', label: 'SPY — S&P 500 ETF' }, { val: 'QQQ', label: 'QQQ — NASDAQ ETF' },
  { val: 'GLD', label: 'GLD — Gold ETF' },
  { val: 'SCOM', label: 'SCOM — Safaricom' }, { val: 'EQTY', label: 'EQTY — Equity Group' },
  { val: 'KCB', label: 'KCB — KCB Group' },
  { val: 'AMD', label: 'AMD — AMD' }, { val: 'NFLX', label: 'NFLX — Netflix' },
  { val: 'COIN', label: 'COIN — Coinbase' }, { val: 'PLTR', label: 'PLTR — Palantir' },
];
const TFS = ['1D', '1W', '1M', '3M', '1Y'];

interface ChartsPageProps {
  initialSymbol?: string;
}

export default function ChartsPage({ initialSymbol }: ChartsPageProps) {
  const { prices, getAsset } = useRealtimeMarket();
  const [sym, setSym] = useState(initialSymbol || 'AAPL');
  const [tf, setTf] = useState('1M');
  const [inds, setInds] = useState<Record<string, boolean>>({ MA20: true, MA50: false, RSI: false, BB: false, MACD: false, FIB: false });

  useEffect(() => {
    if (initialSymbol) setSym(initialSymbol);
  }, [initialSymbol]);

  const liveAsset = getAsset(sym);
  const asset: MarketAsset = MARKET[sym] || { name: liveAsset?.name || sym, price: liveAsset?.price || 200, chg: liveAsset?.chg || 0, chgPct: liveAsset?.chgPct || 0, type: 'stock' as const, mktcap: '—', vol: '—', pe: '—', sector: liveAsset?.sector || '—', rsi: 50, signal: 'neutral' as const, cap: '—' };
  const livePrice = prices[sym]?.price || asset.price;
  const liveChgPct = prices[sym]?.chgPct ?? asset.chgPct;
  const prevPrice = prices[sym]?.prevPrice || livePrice;
  const priceFlash = livePrice > prevPrice ? 'price-up' : livePrice < prevPrice ? 'price-down' : '';

  const pts = tf === '1D' ? 24 : tf === '1W' ? 40 : tf === '1M' ? 30 : tf === '3M' ? 90 : 252;

  const chartData = useMemo(() => {
    const closes = genLine(livePrice * 0.88, pts, 0.002);
    const now = new Date();
    return closes.map((v, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (pts - i));
      const ma20 = i >= 19 ? +(closes.slice(i - 19, i + 1).reduce((a, b) => a + b) / 20).toFixed(2) : undefined;
      const ma50 = i >= 49 ? +(closes.slice(i - 49, i + 1).reduce((a, b) => a + b) / 50).toFixed(2) : undefined;
      let bbUpper: number | undefined, bbLower: number | undefined;
      if (inds.BB && i >= 19) {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b) / 20;
        const stdDev = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
        bbUpper = +(mean + 2 * stdDev).toFixed(2);
        bbLower = +(mean - 2 * stdDev).toFixed(2);
      }
      return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), price: v, ma20: inds.MA20 ? ma20 : undefined, ma50: inds.MA50 ? ma50 : undefined, bbUpper: inds.BB ? bbUpper : undefined, bbLower: inds.BB ? bbLower : undefined, vol: Math.random() * 5e7 + 1e7 };
    });
  }, [sym, tf, inds, livePrice, pts]);

  const rsiData = useMemo(() => {
    if (!inds.RSI) return [];
    const closes = chartData.map(d => d.price);
    return closes.map((_, i) => {
      if (i < 14) return { date: chartData[i]?.date, rsi: undefined };
      const gains: number[] = [], losses: number[] = [];
      for (let j = i - 13; j <= i; j++) {
        const diff = closes[j] - closes[j - 1];
        if (diff > 0) { gains.push(diff); losses.push(0); } else { gains.push(0); losses.push(Math.abs(diff)); }
      }
      const avgGain = gains.reduce((a, b) => a + b) / 14;
      const avgLoss = losses.reduce((a, b) => a + b) / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      return { date: chartData[i]?.date, rsi: +(100 - 100 / (1 + rs)).toFixed(1) };
    });
  }, [chartData, inds.RSI]);

  const macdData = useMemo(() => {
    if (!inds.MACD) return [];
    const closes = chartData.map(d => d.price);
    const ema = (data: number[], period: number) => { const k = 2 / (period + 1); const result = [data[0]]; for (let i = 1; i < data.length; i++) result.push(data[i] * k + result[i - 1] * (1 - k)); return result; };
    const ema12 = ema(closes, 12), ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine, 9);
    return macdLine.map((v, i) => ({ date: chartData[i]?.date, macd: +v.toFixed(2), signal: +signalLine[i].toFixed(2), histogram: +(v - signalLine[i]).toFixed(2) }));
  }, [chartData, inds.MACD]);

  const fibLevels = useMemo(() => {
    if (!inds.FIB) return [];
    const p = chartData.map(d => d.price);
    const high = Math.max(...p), low = Math.min(...p), diff = high - low;
    return [{ level: '0%', price: high }, { level: '23.6%', price: +(high - diff * 0.236).toFixed(2) }, { level: '38.2%', price: +(high - diff * 0.382).toFixed(2) }, { level: '50%', price: +(high - diff * 0.5).toFixed(2) }, { level: '61.8%', price: +(high - diff * 0.618).toFixed(2) }, { level: '100%', price: low }];
  }, [chartData, inds.FIB]);

  const ratingColors: Record<string, string> = { strong_buy: 'text-primary bg-accent-dim', buy: 'text-primary bg-accent-dim', hold: 'text-amber bg-amber-dim', sell: 'text-destructive bg-destructive-dim', strong_sell: 'text-destructive bg-destructive-dim' };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="font-display text-[19px] font-extrabold tracking-tight">Market Charts</div>
          <div className={`font-mono text-[10px] px-2 py-0.5 rounded-full border ${liveChgPct >= 0 ? 'text-primary border-primary/30 bg-primary/5' : 'text-destructive border-destructive/30 bg-destructive/5'}`}>
            ● Live
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={sym} onChange={e => setSym(e.target.value)} className="px-[9px] py-[5px] rounded-md text-xs bg-secondary border border-border text-foreground outline-none">
            {SYMBOLS.map(s => <option key={s.val} value={s.val}>{s.label}</option>)}
          </select>
          <div className="flex gap-0.5 bg-secondary rounded-lg p-[2px]">
            {TFS.map(t => (
              <button key={t} onClick={() => setTf(t)} className={`px-2.5 py-1 rounded-md text-[11px] font-mono transition-colors ${tf === t ? 'bg-primary/15 text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'}`}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: '3fr 1fr' }}>
        <div className="space-y-3.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="font-display text-[14px] font-bold">{sym}</span>
                <span className={`font-mono text-xl font-semibold tabular-nums ${priceFlash}`} key={livePrice}>
                  ${livePrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className={`font-mono text-[10px] font-bold px-[7px] py-0.5 rounded-md ${liveChgPct >= 0 ? 'text-primary bg-primary/10' : 'text-destructive bg-destructive/10'}`}>
                  {formatPct(liveChgPct)}
                </span>
              </div>
              <div className="ml-auto flex gap-1 flex-wrap">
                {['MA20', 'MA50', 'BB', 'RSI', 'MACD', 'FIB'].map(ind => (
                  <button key={ind} onClick={() => setInds(prev => ({ ...prev, [ind]: !prev[ind] }))}
                    className={`px-[9px] py-[4px] rounded-md text-[10px] border transition-colors ${inds[ind] ? 'bg-primary/10 border-primary/30 text-primary font-semibold' : 'bg-secondary border-border text-muted-foreground hover:text-foreground'}`}>
                    {ind}
                  </button>
                ))}
              </div>
            </div>
            <div className="p-3.5">
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={liveChgPct >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)'} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={liveChgPct >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(pts / 6)} />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  {fibLevels.map(f => <ReferenceLine key={f.level} y={f.price} stroke="hsl(258 89% 76%)" strokeDasharray="3 3" strokeOpacity={0.4} label={{ value: `${f.level} ($${f.price})`, position: 'right', fill: 'hsl(258 89% 76%)', fontSize: 9 }} />)}
                  {inds.BB && <Area type="monotone" dataKey="bbUpper" stroke="hsl(var(--blue))" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />}
                  {inds.BB && <Area type="monotone" dataKey="bbLower" stroke="hsl(var(--blue))" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />}
                  <Area type="monotone" dataKey="price" stroke={liveChgPct >= 0 ? 'hsl(160 60% 52%)' : 'hsl(0 76% 58%)'} fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                  {inds.MA20 && <Area type="monotone" dataKey="ma20" stroke="hsl(var(--amber))" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
                  {inds.MA50 && <Area type="monotone" dataKey="ma50" stroke="hsl(var(--purple))" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
                </AreaChart>
              </ResponsiveContainer>
              <ResponsiveContainer width="100%" height={50}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => (v / 1e6).toFixed(0) + 'M'} width={60} />
                  <Bar dataKey="vol" fill="hsl(var(--blue) / 0.25)" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {inds.RSI && rsiData.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-[15px] py-2.5 border-b border-border"><span className="font-display text-[12px] font-bold">RSI (14)</span></div>
              <div className="p-3.5">
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={rsiData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} width={30} ticks={[30, 50, 70]} />
                    <ReferenceLine y={70} stroke="hsl(var(--destructive))" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <ReferenceLine y={30} stroke="hsl(var(--primary))" strokeDasharray="3 3" strokeOpacity={0.4} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Line type="monotone" dataKey="rsi" stroke="hsl(var(--purple))" strokeWidth={1.5} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {inds.MACD && macdData.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-[15px] py-2.5 border-b border-border"><span className="font-display text-[12px] font-bold">MACD (12, 26, 9)</span></div>
              <div className="p-3.5">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={macdData.slice(26)}>
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 9 }} tickLine={false} axisLine={false} width={40} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="histogram" radius={1}>
                      {macdData.slice(26).map((d, i) => <rect key={i} fill={d.histogram >= 0 ? 'hsl(160 60% 52% / 0.5)' : 'hsl(0 76% 58% / 0.5)'} />)}
                    </Bar>
                    <Line type="monotone" dataKey="macd" stroke="hsl(var(--blue))" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="signal" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2.5">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">OHLCV</span></div>
            <div className="p-3.5 font-mono text-xs">
              <div className="grid grid-cols-2 gap-[7px]">
                {[['Open', (livePrice * 0.995).toFixed(2)], ['High', (livePrice * 1.012).toFixed(2)], ['Low', (livePrice * 0.988).toFixed(2)], ['Close', livePrice.toFixed(2)]].map(([k, v]) => (
                  <div key={k as string}><div className="text-[10px] text-muted-foreground">{k}</div><div className="text-[13px] tabular-nums">${v?.toLocaleString()}</div></div>
                ))}
                <div className="col-span-2"><div className="text-[10px] text-muted-foreground">Volume</div><div className="text-[13px] tabular-nums">{(Math.random() * 50 + 10).toFixed(1)}M</div></div>
              </div>
            </div>
          </div>

          {asset.analystRating && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Analyst Consensus</span></div>
              <div className="p-3.5 text-center">
                <span className={`text-xs font-bold px-3 py-1 rounded-md uppercase ${ratingColors[asset.analystRating] || 'bg-glass text-muted-foreground'}`}>
                  {asset.analystRating.replace('_', ' ')}
                </span>
                {asset.priceTarget && (
                  <div className="mt-2.5">
                    <div className="text-[10px] text-muted-foreground">Price Target</div>
                    <div className="font-mono text-lg font-medium tabular-nums">${asset.priceTarget}</div>
                    <span className={`font-mono text-[10px] ${asset.priceTarget > livePrice ? 'text-primary' : 'text-destructive'}`}>
                      ({((asset.priceTarget - livePrice) / livePrice * 100).toFixed(1)}% upside)
                    </span>
                  </div>
                )}
                {asset.morningstarRating && (
                  <div className="mt-2.5 flex justify-center gap-0.5">
                    {Array.from({ length: 5 }, (_, i) => (
                      <span key={i} className={`text-sm ${i < asset.morningstarRating! ? 'text-amber' : 'text-muted-foreground/20'}`}>★</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border"><span className="font-display text-[13px] font-bold">Fundamentals</span></div>
            <div className="p-3.5 text-xs space-y-1.5">
              {[
                ['Market Cap', asset.mktcap || '—'],
                ['P/E Ratio', String(asset.pe)],
                ['EPS', asset.eps ? `$${asset.eps}` : '—'],
                ['Revenue', asset.revenue || '—'],
                ['Beta', asset.beta?.toFixed(2) || '—'],
                ['Dividend', asset.dividend ? `$${asset.dividend} (${asset.divYield}%)` : '—'],
                ['52W High', '$' + (livePrice * 1.12).toFixed(2)],
                ['52W Low', '$' + (livePrice * 0.78).toFixed(2)],
                ['Sector', asset.sector || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono tabular-nums">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
