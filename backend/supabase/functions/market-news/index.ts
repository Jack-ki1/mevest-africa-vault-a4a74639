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

const sentimentWords = {
  positive: ['surge', 'gain', 'rally', 'rise', 'jump', 'soar', 'boost', 'profit', 'bullish', 'record', 'growth', 'up', 'high', 'beat', 'strong'],
  negative: ['crash', 'fall', 'drop', 'plunge', 'decline', 'loss', 'bearish', 'sell', 'down', 'low', 'miss', 'weak', 'cut', 'slump', 'fear'],
};

function getSentiment(title: string): 'positive' | 'negative' | 'neutral' {
  const lower = title.toLowerCase();
  const pos = sentimentWords.positive.filter(w => lower.includes(w)).length;
  const neg = sentimentWords.negative.filter(w => lower.includes(w)).length;
  if (pos > neg) return 'positive';
  if (neg > pos) return 'negative';
  return 'neutral';
}

async function fetchFinnhubNews(category: string, tickers?: string[]): Promise<{ trending: string[]; news: Array<{ title:string; publisher:string; link:string; publishedAt:string; thumbnail:string; relatedTickers:string[]; sentiment:string; readTime:number }> }> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return { trending: [], news: [] };
  try {
    let url = '';
    if (tickers && tickers.length > 0) {
      const sym = tickers[0];
      const from = new Date(Date.now() - 7*24*3600*1000).toISOString().slice(0,10);
      const to = new Date().toISOString().slice(0,10);
      url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(sym)}&from=${from}&to=${to}&token=${key}`;
    } else {
      const catMap: Record<string,string> = { general:'general', technology:'technology', business:'business', crypto:'crypto', forex:'forex' };
      const cat = catMap[category] || 'general';
      url = `https://finnhub.io/api/v1/news?category=${cat}&token=${key}`;
    }
    const res = await fetch(url);
    if (!res.ok) return { trending: [], news: [] };
    const j = await res.json() as Array<{ headline?:string; source?:string; url?:string; datetime?:number; image?:string; related?:string; summary?:string }>;
    const news = (j || []).slice(0,20).map(n => {
      const title = n.headline || '';
      const wc = title.split(/\s+/).length;
      return {
        title,
        publisher: n.source || '',
        link: n.url || '',
        publishedAt: n.datetime ? new Date(n.datetime*1000).toISOString() : '',
        thumbnail: n.image || '',
        relatedTickers: n.related ? n.related.split(',') : [],
        sentiment: getSentiment(title),
        readTime: Math.max(1, Math.ceil(wc/200)),
      };
    });
    return { trending: [], news };
  } catch { return { trending: [], news: [] }; }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, tickers } = await req.json().catch(() => ({ category: 'general', tickers: [] }));

    let searchQuery = 'stock market';
    if (category === 'crypto') searchQuery = 'cryptocurrency bitcoin';
    else if (category === 'africa') searchQuery = 'african markets kenya nigeria';
    else if (category === 'technology') searchQuery = 'tech stocks AI';
    else if (category === 'forex') searchQuery = 'forex currency exchange';
    else if (category === 'earnings') searchQuery = 'earnings report quarterly';
    else if (category === 'business') searchQuery = 'business economy finance';

    // If specific tickers, search for those
    if (tickers && tickers.length > 0) {
      searchQuery = tickers.slice(0, 5).join(' ') + ' stock news';
    }

    const [trendingRes, newsRes] = await Promise.all([
      fetch('https://query2.finance.yahoo.com/v1/finance/trending/US?count=20', { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(`https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(searchQuery)}&quotesCount=0&newsCount=20`, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ]);

    const trending = trendingRes.ok ? await trendingRes.json() : { finance: { result: [] } };
    const newsData = newsRes.ok ? await newsRes.json() : { news: [] };

    const trendingSymbols = (trending.finance?.result?.[0]?.quotes || [])
      .map((q: { symbol:string }) => q.symbol).slice(0, 10);

    let news = (newsData.news || []).map((n: { title?:string; publisher?:string; link?:string; providerPublishTime?:number; thumbnail?:{ resolutions?:Array<{url:string}> }; relatedTickers?:string[] }) => {
      const title = n.title || '';
      const wordCount = title.split(/\s+/).length;
      return {
        title,
        publisher: n.publisher || '',
        link: n.link || '',
        publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
        thumbnail: n.thumbnail?.resolutions?.[0]?.url || '',
        relatedTickers: n.relatedTickers || [],
        sentiment: getSentiment(title),
        readTime: Math.max(1, Math.ceil(wordCount / 200)),
      };
    });

    // Fallback to Finnhub if Yahoo returned no news
    if (news.length === 0) {
      const fb = await fetchFinnhubNews(category as string, tickers as string[]);
      if (fb.news.length > 0) {
        news = fb.news;
      }
    }

    return new Response(JSON.stringify({ trending: trendingSymbols, news }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('News error:', error);
    return new Response(JSON.stringify({ trending: [], news: [], error: 'News failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
