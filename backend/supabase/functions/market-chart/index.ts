const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',').map(o => o.trim()).filter(Boolean);
function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowAll = ALLOWED_ORIGINS.includes('*');
  const ok = allowAll || (origin && ALLOWED_ORIGINS.includes(origin));
  return {
    'Access-Control-Allow-Origin': allowAll ? '*' : (ok ? origin! : ALLOWED_ORIGINS[0] || ''),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

async function fetchFinnhubChart(symbol: string, range: string): Promise<{ points: Array<{ t:number;o:number| null;h:number| null;l:number| null;c:number| null;v:number| null }>; currency:string; exchange:string } | null> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return null;
  try {
    const now = Math.floor(Date.now()/1000);
    const rangeDays: Record<string, number> = { '1d':1,'5d':5,'1mo':30,'3mo':90,'6mo':180,'1y':365,'5y':1825 };
    const days = rangeDays[range] || 30;
    const from = now - days*24*3600;
    const resolution = days <= 5 ? '15' : days <= 30 ? 'D' : days <= 180 ? 'D' : 'W';
    const url = `https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(symbol)}&resolution=${resolution}&from=${from}&to=${now}&token=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json() as { s:string; t?:number[]; o?:number[]; h?:number[]; l?:number[]; c?:number[]; v?:number[] };
    if (j.s !== 'ok' || !j.t || !j.c) return null;
    const points = j.t.map((t,i)=> ({ t: t*1000, o: j.o?.[i] ?? null, h: j.h?.[i] ?? null, l: j.l?.[i] ?? null, c: j.c?.[i] ?? null, v: j.v?.[i] ?? null })).filter(p=> p.c !== null);
    return { points, currency: 'USD', exchange: '' };
  } catch { return null; }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { symbol, range, interval } = await req.json();
    if (!symbol) {
      return new Response(JSON.stringify({ error: 'Symbol required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const r = range || '1mo';
    const i = interval || '1d';
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${r}&interval=${i}&includePrePost=false`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.chart?.result?.[0];
      if (result) {
        const timestamps = result.timestamp || [];
        const quote = result.indicators?.quote?.[0] || {};
        const points = timestamps.map((t: number, idx: number) => ({
          t: t * 1000,
          o: quote.open?.[idx] ?? null,
          h: quote.high?.[idx] ?? null,
          l: quote.low?.[idx] ?? null,
          c: quote.close?.[idx] ?? null,
          v: quote.volume?.[idx] ?? null,
        })).filter((p: { c:number|null }) => p.c !== null);

        if (points.length > 0) {
          return new Response(JSON.stringify({
            symbol,
            currency: result.meta?.currency || 'USD',
            exchange: result.meta?.exchangeName || '',
            points,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Fallback to Finnhub
    const fb = await fetchFinnhubChart(symbol, r);
    if (fb) {
      return new Response(JSON.stringify({ symbol, currency: fb.currency, exchange: fb.exchange, points: fb.points }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Chart data failed' }), {
      status: response.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Chart error:', error);
    return new Response(JSON.stringify({ error: 'Chart failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
