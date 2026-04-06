const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchWithRetry(url: string, retries = 2): Promise<Response> {
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (res.ok) return res;
      if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    } catch {
      if (i < retries) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new Error('Fetch failed after retries');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { symbols, mode } = body;

    // Trending mode
    if (mode === 'trending') {
      const res = await fetchWithRetry('https://query2.finance.yahoo.com/v1/finance/trending/US?count=25');
      const data = await res.json();
      const tickers = (data.finance?.result?.[0]?.quotes || []).map((q: any) => q.symbol).slice(0, 25);
      return new Response(JSON.stringify({ trending: tickers }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return new Response(JSON.stringify({ quotes: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const syms = symbols.slice(0, 50).join(',');
    const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(syms)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,marketCap,shortName,longName,currency,exchange,quoteType,regularMarketPreviousClose,regularMarketOpen,regularMarketDayHigh,regularMarketDayLow,fiftyTwoWeekHigh,fiftyTwoWeekLow,fiftyDayAverage,twoHundredDayAverage,trailingPE,dividendYield,trailingAnnualDividendYield,epsTrailingTwelveMonths`;

    const response = await fetchWithRetry(url);
    const data = await response.json();
    const quotes: Record<string, any> = {};

    for (const q of data.quoteResponse?.result || []) {
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

    return new Response(JSON.stringify({ quotes }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quotes error:', error);
    return new Response(JSON.stringify({ quotes: {}, error: 'Quotes failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
