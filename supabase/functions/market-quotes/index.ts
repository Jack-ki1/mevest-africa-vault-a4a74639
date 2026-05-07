const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

async function fetchJson(url: string, retries = 1): Promise<any> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': UA,
          'Accept': 'application/json,text/plain,*/*',
          'Accept-Language': 'en-US,en;q=0.9',
        },
      });
      if (res.ok) return await res.json();
      // consume body to release resources
      await res.text();
    } catch (_e) {
      // swallow and retry
    }
    if (i < retries) await new Promise(r => setTimeout(r, 400 * (i + 1)));
  }
  return null;
}

// Fetch a single symbol via the chart endpoint (no crumb required, server-IP friendly).
async function fetchQuoteViaChart(symbol: string): Promise<any | null> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d&includePrePost=false`;
  const data = await fetchJson(url);
  const r = data?.chart?.result?.[0];
  if (!r) return null;
  const m = r.meta || {};
  const price = m.regularMarketPrice ?? null;
  const prev = m.chartPreviousClose ?? m.previousClose ?? price;
  if (price == null) return null;
  const change = price - prev;
  const changePercent = prev ? (change / prev) * 100 : 0;
  return {
    symbol: m.symbol || symbol,
    name: m.shortName || m.longName || m.symbol || symbol,
    price,
    change,
    changePercent,
    volume: m.regularMarketVolume ?? 0,
    marketCap: 0,
    currency: m.currency || 'USD',
    exchange: m.exchangeName || m.fullExchangeName || '',
    type: m.instrumentType || 'EQUITY',
    prevClose: prev,
    open: m.regularMarketDayLow ?? 0,
    dayHigh: m.regularMarketDayHigh ?? 0,
    dayLow: m.regularMarketDayLow ?? 0,
    fiftyTwoWeekHigh: m.fiftyTwoWeekHigh ?? 0,
    fiftyTwoWeekLow: m.fiftyTwoWeekLow ?? 0,
    fiftyDayAvg: 0,
    twoHundredDayAvg: 0,
    pe: null,
    dividendYield: null,
    eps: null,
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { symbols, mode } = body;

    // Trending mode
    if (mode === 'trending') {
      const data = await fetchJson('https://query1.finance.yahoo.com/v1/finance/trending/US?count=25');
      const tickers = (data?.finance?.result?.[0]?.quotes || []).map((q: any) => q.symbol).slice(0, 25);
      return new Response(JSON.stringify({ trending: tickers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ quotes: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const limited = symbols.slice(0, 50);
    const quotes: Record<string, any> = {};

    // Try the batch quote endpoint first (faster when it works).
    const batchUrl = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(limited.join(','))}`;
    const batch = await fetchJson(batchUrl, 0);
    const batchResults = batch?.quoteResponse?.result;
    if (Array.isArray(batchResults) && batchResults.length > 0) {
      for (const q of batchResults) {
        quotes[q.symbol] = {
          symbol: q.symbol,
          name: q.shortName || q.longName || q.symbol,
          price: q.regularMarketPrice ?? 0,
          change: q.regularMarketChange ?? 0,
          changePercent: q.regularMarketChangePercent ?? 0,
          volume: q.regularMarketVolume ?? 0,
          marketCap: q.marketCap ?? 0,
          currency: q.currency || 'USD',
          exchange: q.exchange || '',
          type: q.quoteType || 'EQUITY',
          prevClose: q.regularMarketPreviousClose ?? 0,
          open: q.regularMarketOpen ?? 0,
          dayHigh: q.regularMarketDayHigh ?? 0,
          dayLow: q.regularMarketDayLow ?? 0,
          fiftyTwoWeekHigh: q.fiftyTwoWeekHigh ?? 0,
          fiftyTwoWeekLow: q.fiftyTwoWeekLow ?? 0,
          fiftyDayAvg: q.fiftyDayAverage ?? 0,
          twoHundredDayAvg: q.twoHundredDayAverage ?? 0,
          pe: q.trailingPE ?? null,
          dividendYield: q.dividendYield ?? q.trailingAnnualDividendYield ?? null,
          eps: q.epsTrailingTwelveMonths ?? null,
        };
      }
    }

    // Fallback: any symbol that wasn't returned, fetch via chart endpoint in parallel.
    const missing = limited.filter((s: string) => !quotes[s]);
    if (missing.length > 0) {
      const results = await Promise.all(missing.map((s: string) => fetchQuoteViaChart(s).catch(() => null)));
      results.forEach((q, i) => {
        if (q) quotes[missing[i]] = q;
      });
    }

    return new Response(JSON.stringify({ quotes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quotes error:', error);
    // Return 200 with empty quotes so the client falls back gracefully instead of crashing.
    return new Response(JSON.stringify({ quotes: {}, error: 'Quotes failed', fallback: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
