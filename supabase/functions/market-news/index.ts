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
      .map((q: any) => q.symbol).slice(0, 10);

    const news = (newsData.news || []).map((n: any) => {
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
