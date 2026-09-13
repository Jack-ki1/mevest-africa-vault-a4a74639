import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

async function fetchFromFinnhub(symbol: string) {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return null;
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${key}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j.c !== 'number' || j.c <= 0) return null;
    return { open: j.o, high: j.h, low: j.l, close: j.c, volume: null as number | null, source: 'finnhub' as const };
  } catch { return null; }
}

async function fetchFromTwelveData(symbol: string) {
  const key = Deno.env.get('TWELVE_DATA_KEY');
  if (!key) return null;
  try {
    const r = await fetch(`https://api.twelvedata.com/quote?symbol=${symbol}&apikey=${key}`);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.close) return null;
    return { open: +j.open, high: +j.high, low: +j.low, close: +j.close, volume: j.volume ? Number(j.volume) : null, source: 'twelvedata' as const };
  } catch { return null; }
}

async function fetchFromYahoo(symbol: string) {
  const UA = 'Mozilla/5.0 (compatible; MevestSync/1.0)';
  try {
    const r = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`, { headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    return { open: meta.previousClose ?? meta.regularMarketPrice, high: meta.regularMarketDayHigh ?? meta.regularMarketPrice, low: meta.regularMarketDayLow ?? meta.regularMarketPrice, close: meta.regularMarketPrice, volume: meta.regularMarketVolume ?? null, source: 'yahoo' as const };
  } catch { return null; }
}

async function syncSymbol(symbol: string) {
  const isNSE = symbol.endsWith('.NR');
  // NSE: try Finnhub/Twelve then Yahoo; dedicated NSE provider would go here when vendor relationship exists
  const quote = isNSE
    ? (await fetchFromFinnhub(symbol)) ?? (await fetchFromTwelveData(symbol)) ?? (await fetchFromYahoo(symbol))
    : (await fetchFromFinnhub(symbol)) ?? (await fetchFromTwelveData(symbol)) ?? (await fetchFromYahoo(symbol));
  if (!quote) {
    console.warn(`[market-sync] all providers failed for ${symbol}`);
    return { symbol, ok: false };
  }
  const { error } = await supabase.from('price_history').upsert({
    symbol, ts: new Date().toISOString(), interval: '1d',
    open: quote.open, high: quote.high, low: quote.low, close: quote.close, volume: quote.volume,
    source: quote.source,
  });
  if (error) console.error(`[market-sync] upsert failed for ${symbol}`, error);
  // Trigger key-moments if change > threshold
  const changePct = quote.open ? ((quote.close - quote.open) / quote.open) * 100 : 0;
  if (Math.abs(changePct) > 2) {
    try {
      const kmUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/key-moments`;
      await fetch(kmUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-cron-secret': Deno.env.get('CRON_SECRET') || '' },
        body: JSON.stringify({ symbol, changePct }),
      });
    } catch { /* non-critical */ }
  }
  // Check alerts
  try {
    const alertUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/check-alerts`;
    await fetch(alertUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cron-secret': Deno.env.get('CRON_SECRET') || '' },
      body: JSON.stringify({ symbol, price: quote.close }),
    });
  } catch { /* non-critical */ }
  return { symbol, ok: true, source: quote.source };
}

Deno.serve(async (req) => {
  const cronSecret = req.headers.get('x-cron-secret');
  if (cronSecret !== Deno.env.get('CRON_SECRET')) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { data: symbols } = await supabase.from('symbols_meta').select('symbol');
  if (!symbols || symbols.length === 0) {
    return new Response(JSON.stringify({ synced: 0, msg: 'no symbols in symbols_meta' }), { headers: { 'Content-Type': 'application/json' } });
  }
  const results = await Promise.allSettled(symbols.map(s => syncSymbol(s.symbol)));
  const failures = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as { ok: boolean }).ok));
  return new Response(JSON.stringify({ synced: results.length, failed: failures.length }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
