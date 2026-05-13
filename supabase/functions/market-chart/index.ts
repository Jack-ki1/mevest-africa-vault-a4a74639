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

    if (!response.ok) {
      return new Response(JSON.stringify({ error: 'Chart data failed' }), {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) {
      return new Response(JSON.stringify({ error: 'No data' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const timestamps = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const points = timestamps.map((t: number, idx: number) => ({
      t: t * 1000,
      o: quote.open?.[idx] ?? null,
      h: quote.high?.[idx] ?? null,
      l: quote.low?.[idx] ?? null,
      c: quote.close?.[idx] ?? null,
      v: quote.volume?.[idx] ?? null,
    })).filter((p: any) => p.c !== null);

    return new Response(JSON.stringify({
      symbol,
      currency: result.meta?.currency || 'USD',
      exchange: result.meta?.exchangeName || '',
      points,
    }), {
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
