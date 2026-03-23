import { useState, useMemo, useEffect } from 'react';
import { MARKET, genLine, formatPct } from '@/data/market-data';
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

const SYMBOLS = [
  { val: 'AAPL', label: 'AAPL — Apple' }, { val: 'MSFT', label: 'MSFT — Microsoft' },
  { val: 'NVDA', label: 'NVDA — NVIDIA' }, { val: 'TSLA', label: 'TSLA — Tesla' },
  { val: 'AMZN', label: 'AMZN — Amazon' }, { val: 'GOOGL', label: 'GOOGL — Alphabet' },
  { val: 'META', label: 'META — Meta' }, { val: 'JPM', label: 'JPM — JPMorgan' },
  { val: 'V', label: 'V — Visa' }, { val: 'JNJ', label: 'JNJ — J&J' },
  { val: 'UNH', label: 'UNH — UnitedHealth' },
  { val: 'BTC', label: 'BTC — Bitcoin' }, { val: 'ETH', label: 'ETH — Ethereum' },
  { val: 'SOL', label: 'SOL — Solana' },
  { val: 'SPY', label: 'SPY — S&P 500 ETF' }, { val: 'QQQ', label: 'QQQ — NASDAQ ETF' },
  { val: 'SCOM', label: 'SCOM — Safaricom' }, { val: 'EQTY', label: 'EQTY — Equity Group' },
  { val: 'KCB', label: 'KCB — KCB Group' },
];
const TFS = ['1D', '1W', '1M', '3M', '1Y'];

interface ChartsPageProps {
  initialSymbol?: string;
}

export default function ChartsPage({ initialSymbol }: ChartsPageProps) {
  const [sym, setSym] = useState(initialSymbol || 'AAPL');
  const [tf, setTf] = useState('1M');
  const [inds, setInds] = useState<Record<string, boolean>>({ MA20: true, MA50: false, RSI: false, BB: false, MACD: false, FIB: false });
  const [chartType, setChartType] = useState<'area' | 'candle'>('area');

  useEffect(() => {
    if (initialSymbol && MARKET[initialSymbol]) setSym(initialSymbol);
  }, [initialSymbol]);

  const asset = MARKET[sym] || { price: 200, chgPct: 0, name: sym, mktcap: '—', vol: '—', pe: '—', sector: '—', rsi: 50 };
  const pts = tf === '1D' ? 24 : tf === '1W' ? 40 : tf === '1M' ? 30 : tf === '3M' ? 90 : 252;

  const chartData = useMemo(() => {
    const closes = genLine(asset.price * 0.88, pts, 0.002);
    const now = new Date();
    return closes.map((v, i) => {
      const d = new Date(now); d.setDate(d.getDate() - (pts - i));
      const ma20 = i >= 19 ? +(closes.slice(i - 19, i + 1).reduce((a, b) => a + b) / 20).toFixed(2) : undefined;
      const ma50 = i >= 49 ? +(closes.slice(i - 49, i + 1).reduce((a, b) => a + b) / 50).toFixed(2) : undefined;

      // Bollinger Bands (20-period, 2 std dev)
      let bbUpper: number | undefined, bbLower: number | undefined, bbMiddle: number | undefined;
      if (inds.BB && i >= 19) {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b) / 20;
        const stdDev = Math.sqrt(slice.reduce((a, b) => a + (b - mean) ** 2, 0) / 20);
        bbMiddle = +mean.toFixed(2);
        bbUpper = +(mean + 2 * stdDev).toFixed(2);
        bbLower = +(mean - 2 * stdDev).toFixed(2);
      }

      return {
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        price: v,
        ma20: inds.MA20 ? ma20 : undefined,
        ma50: inds.MA50 ? ma50 : undefined,
        bbUpper: inds.BB ? bbUpper : undefined,
        bbLower: inds.BB ? bbLower : undefined,
        vol: Math.random() * 5e7 + 1e7,
      };
    });
  }, [sym, tf, inds, asset.price, pts]);

  // RSI data
  const rsiData = useMemo(() => {
    if (!inds.RSI) return [];
    const closes = chartData.map(d => d.price);
    return closes.map((_, i) => {
      if (i < 14) return { date: chartData[i]?.date, rsi: undefined };
      const gains: number[] = [], losses: number[] = [];
      for (let j = i - 13; j <= i; j++) {
        const diff = closes[j] - closes[j - 1];
        if (diff > 0) { gains.push(diff); losses.push(0); }
        else { gains.push(0); losses.push(Math.abs(diff)); }
      }
      const avgGain = gains.reduce((a, b) => a + b) / 14;
      const avgLoss = losses.reduce((a, b) => a + b) / 14;
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      return { date: chartData[i]?.date, rsi: +(100 - 100 / (1 + rs)).toFixed(1) };
    });
  }, [chartData, inds.RSI]);

  // MACD data
  const macdData = useMemo(() => {
    if (!inds.MACD) return [];
    const closes = chartData.map(d => d.price);
    const ema = (data: number[], period: number) => {
      const k = 2 / (period + 1);
      const result = [data[0]];
      for (let i = 1; i < data.length; i++) {
        result.push(data[i] * k + result[i - 1] * (1 - k));
      }
      return result;
    };
    const ema12 = ema(closes, 12);
    const ema26 = ema(closes, 26);
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    const signalLine = ema(macdLine, 9);
    return macdLine.map((v, i) => ({
      date: chartData[i]?.date,
      macd: +v.toFixed(2),
      signal: +signalLine[i].toFixed(2),
      histogram: +(v - signalLine[i]).toFixed(2),
    }));
  }, [chartData, inds.MACD]);

  // Fibonacci levels
  const fibLevels = useMemo(() => {
    if (!inds.FIB) return [];
    const prices = chartData.map(d => d.price);
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    const diff = high - low;
    return [
      { level: '0%', price: high },
      { level: '23.6%', price: +(high - diff * 0.236).toFixed(2) },
      { level: '38.2%', price: +(high - diff * 0.382).toFixed(2) },
      { level: '50%', price: +(high - diff * 0.5).toFixed(2) },
      { level: '61.8%', price: +(high - diff * 0.618).toFixed(2) },
      { level: '100%', price: low },
    ];
  }, [chartData, inds.FIB]);

  const ratingColors: Record<string, string> = { strong_buy: 'text-primary bg-accent-dim', buy: 'text-primary bg-accent-dim', hold: 'text-amber bg-amber-dim', sell: 'text-destructive bg-destructive-dim', strong_sell: 'text-destructive bg-destructive-dim' };

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="font-display text-[19px] font-extrabold tracking-tight">Market Charts</div>
        <div className="flex gap-2 flex-wrap">
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
        <div className="space-y-3.5">
          {/* Main chart */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-[15px] py-3 border-b border-border flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-[13px] font-bold">{sym}</span>
                <span className="font-mono text-lg font-medium">${asset.price.toLocaleString()}</span>
                <span className={`font-mono text-[10px] font-semibold px-[7px] py-0.5 rounded ${asset.chgPct >= 0 ? 'text-primary bg-accent-dim' : 'text-destructive bg-destructive-dim'}`}>
                  {formatPct(asset.chgPct)}
                </span>
              </div>
              <div className="ml-auto flex gap-1 flex-wrap">
                {['MA20', 'MA50', 'BB', 'RSI', 'MACD', 'FIB'].map(ind => (
                  <button key={ind} onClick={() => setInds(prev => ({ ...prev, [ind]: !prev[ind] }))}
                    className={`px-[9px] py-[4px] rounded-md text-[10px] border ${inds[ind] ? 'bg-accent-dim border-primary/30 text-primary' : 'bg-card border-border text-muted-foreground hover:text-foreground'}`}>
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
                      <stop offset="0%" stopColor={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} stopOpacity={0.1} />
                      <stop offset="100%" stopColor={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="bbFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b9cf6" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#5b9cf6" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} interval={Math.floor(pts / 6)} />
                  <YAxis tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => '$' + Math.round(v).toLocaleString()} width={60} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 12, color: 'hsl(var(--foreground))' }} />
                  {/* Fibonacci reference lines */}
                  {fibLevels.map(f => (
                    <ReferenceLine key={f.level} y={f.price} stroke="hsl(258 89% 76%)" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: `${f.level} ($${f.price})`, position: 'right', fill: 'hsl(258 89% 76%)', fontSize: 9 }} />
                  ))}
                  {inds.BB && <Area type="monotone" dataKey="bbUpper" stroke="#5b9cf6" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />}
                  {inds.BB && <Area type="monotone" dataKey="bbLower" stroke="#5b9cf6" fill="none" strokeWidth={1} strokeDasharray="4 4" dot={false} connectNulls />}
                  <Area type="monotone" dataKey="price" stroke={asset.chgPct >= 0 ? '#63d2aa' : '#f0616b'} fill="url(#priceGrad)" strokeWidth={2} dot={false} />
                  {inds.MA20 && <Area type="monotone" dataKey="ma20" stroke="#f5a623" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
                  {inds.MA50 && <Area type="monotone" dataKey="ma50" stroke="#a78bfa" fill="none" strokeWidth={1.5} dot={false} connectNulls />}
                </AreaChart>
              </ResponsiveContainer>
              {/* Volume */}
              <ResponsiveContainer width="100%" height={50}>
                <BarChart data={chartData}>
                  <XAxis dataKey="date" hide />
                  <YAxis tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} tickFormatter={v => (v / 1e6).toFixed(0) + 'M'} width={60} />
                  <Bar dataKey="vol" fill="rgba(91,156,246,0.3)" radius={2} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* RSI panel */}
          {inds.RSI && rsiData.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-[15px] py-2.5 border-b border-border"><span className="font-display text-[12px] font-bold">RSI (14)</span></div>
              <div className="p-3.5">
                <ResponsiveContainer width="100%" height={100}>
                  <LineChart data={rsiData}>
                    <XAxis dataKey="date" hide />
                    <YAxis domain={[0, 100]} tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} width={30} ticks={[30, 50, 70]} />
                    <ReferenceLine y={70} stroke="hsl(0 72% 60%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <ReferenceLine y={30} stroke="hsl(157 52% 60%)" strokeDasharray="3 3" strokeOpacity={0.5} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Line type="monotone" dataKey="rsi" stroke="#a78bfa" strokeWidth={1.5} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* MACD panel */}
          {inds.MACD && macdData.length > 0 && (
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-[15px] py-2.5 border-b border-border"><span className="font-display text-[12px] font-bold">MACD (12, 26, 9)</span></div>
              <div className="p-3.5">
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={macdData.slice(26)}>
                    <XAxis dataKey="date" hide />
                    <YAxis tick={{ fill: 'hsl(228 12% 52%)', fontSize: 9 }} tickLine={false} axisLine={false} width={40} />
                    <ReferenceLine y={0} stroke="hsl(var(--border))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.15)', borderRadius: 8, fontSize: 11, color: 'hsl(var(--foreground))' }} />
                    <Bar dataKey="histogram" radius={1}>
                      {macdData.slice(26).map((d, i) => (
                        <rect key={i} fill={d.histogram >= 0 ? 'rgba(99,210,170,0.5)' : 'rgba(240,97,107,0.5)'} />
                      ))}
                    </Bar>
                    <Line type="monotone" dataKey="macd" stroke="#5b9cf6" strokeWidth={1.5} dot={false} />
                    <Line type="monotone" dataKey="signal" stroke="#f0616b" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
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

          {/* Analyst Rating */}
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
                    <div className="font-mono text-lg font-medium">${asset.priceTarget}</div>
                    <span className={`font-mono text-[10px] ${asset.priceTarget > asset.price ? 'text-primary' : 'text-destructive'}`}>
                      ({((asset.priceTarget - asset.price) / asset.price * 100).toFixed(1)}% upside)
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
                ['52W High', '$' + (asset.price * 1.12).toFixed(2)],
                ['52W Low', '$' + (asset.price * 0.78).toFixed(2)],
                ['Sector', asset.sector || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between"><span className="text-muted-foreground">{k}</span><span className="font-mono">{v}</span></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
