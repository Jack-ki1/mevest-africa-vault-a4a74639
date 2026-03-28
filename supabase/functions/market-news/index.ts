const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category } = await req.json().catch(() => ({ category: 'general' }));

    // Use Yahoo Finance RSS/news API (free)
    const url = `https://query2.finance.yahoo.com/v1/finance/trending/US?count=20`;
    const newsUrl = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(category === 'crypto' ? 'cryptocurrency' : category === 'africa' ? 'african markets' : 'stock market')}&quotesCount=0&newsCount=15`;

    const [trendingRes, newsRes] = await Promise.all([
      fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
      fetch(newsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }),
    ]);

    const trending = trendingRes.ok ? await trendingRes.json() : { finance: { result: [] } };
    const newsData = newsRes.ok ? await newsRes.json() : { news: [] };

    const trendingSymbols = (trending.finance?.result?.[0]?.quotes || [])
      .map((q: any) => q.symbol)
      .slice(0, 10);

    const news = (newsData.news || []).map((n: any) => ({
      title: n.title || '',
      publisher: n.publisher || '',
      link: n.link || '',
      publishedAt: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString() : '',
      thumbnail: n.thumbnail?.resolutions?.[0]?.url || '',
      relatedTickers: n.relatedTickers || [],
    }));

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
