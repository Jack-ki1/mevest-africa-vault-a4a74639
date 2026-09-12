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

async function searchFinnhub(query: string): Promise<Array<{ symbol:string; name:string; exchange:string; exchangeDisplay:string; type:string; sector:string; industry:string; score:number }>> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return [];
  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${key}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const j = await res.json() as { count?: number; result?: Array<{ symbol:string; description:string; displaySymbol?:string; type:string }> };
    return (j.result || []).slice(0, 40).map(r => ({
      symbol: r.symbol,
      name: r.description || r.symbol,
      exchange: r.displaySymbol?.split('.')[1] || '',
      exchangeDisplay: r.displaySymbol || r.symbol,
      type: r.type || 'EQUITY',
      sector: '',
      industry: '',
      score: 0,
    }));
  } catch { return []; }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, type } = await req.json();
    if (!query || query.length < 1) {
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=40&newsCount=0&enableFuzzyQuery=true&quotesQueryId=tss_match_phrase_query`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });

    let results: Array<{ symbol:string; name:string; exchange:string; exchangeDisplay:string; type:string; sector:string; industry:string; score:number }> = [];
    let yahooOk = false;
    if (response.ok) {
      const data = await response.json();
      results = (data.quotes || []).map((q: { symbol:string; shortname?:string; longname?:string; exchange?:string; exchDisp?:string; quoteType?:string; sector?:string; industry?:string; score?:number }) => ({
        symbol: q.symbol,
        name: q.shortname || q.longname || q.symbol,
        exchange: q.exchange || q.exchDisp || '',
        exchangeDisplay: q.exchDisp || q.exchange || '',
        type: q.quoteType || 'EQUITY',
        sector: q.sector || '',
        industry: q.industry || '',
        score: q.score || 0,
      }));
      yahooOk = results.length > 0;
    } else {
      console.error('Yahoo search failed:', response.status);
    }

    if (!yahooOk) {
      const fb = await searchFinnhub(query);
      if (fb.length > 0) results = fb;
    }
    if (results.length === 0 && !yahooOk) {
      // still return empty but don't error
      return new Response(JSON.stringify({ results: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Filter by type if specified
    if (type && type !== 'all') {
      const typeMap: Record<string, string[]> = {
        stock: ['EQUITY'],
        etf: ['ETF'],
        crypto: ['CRYPTOCURRENCY'],
        fund: ['MUTUALFUND'],
        index: ['INDEX'],
        forex: ['CURRENCY'],
        commodity: ['FUTURE'],
      };
      const allowed = typeMap[type.toLowerCase()] || [];
      if (allowed.length > 0) {
        results = results.filter((r: any) => allowed.includes(r.type));
      }
    }

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Search error:', error);
    return new Response(JSON.stringify({ results: [], error: 'Search failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
