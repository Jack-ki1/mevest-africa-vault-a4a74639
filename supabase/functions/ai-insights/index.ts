const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Tool definitions for agentic capabilities
const tools = [
  {
    type: 'function',
    function: {
      name: 'get_stock_quote',
      description: 'Get real-time stock/crypto/ETF quote data for any symbol worldwide',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Ticker symbol e.g. AAPL, BTC-USD, 005930.KS' } },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_market_news',
      description: 'Fetch latest financial news for a topic or symbol',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query e.g. "Apple earnings" or "cryptocurrency"' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_assets',
      description: 'Search for stocks, ETFs, crypto, bonds across global markets',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'Search query e.g. "Samsung" or "Kenya bonds"' } },
        required: ['query'],
      },
    },
  },
];

// Execute tool calls
async function executeTool(name: string, args: Record<string, string>): Promise<string> {
  try {
    if (name === 'get_stock_quote') {
      const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(args.symbol)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,marketCap,shortName,currency,fiftyTwoWeekHigh,fiftyTwoWeekLow`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'Quote lookup failed' });
      const data = await res.json();
      const q = data.quoteResponse?.result?.[0];
      if (!q) return JSON.stringify({ error: `No data found for ${args.symbol}` });
      return JSON.stringify({
        symbol: q.symbol, name: q.shortName, price: q.regularMarketPrice,
        change: q.regularMarketChange, changePercent: q.regularMarketChangePercent,
        volume: q.regularMarketVolume, marketCap: q.marketCap, currency: q.currency,
        high52w: q.fiftyTwoWeekHigh, low52w: q.fiftyTwoWeekLow,
      });
    }

    if (name === 'get_market_news') {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(args.query)}&quotesCount=0&newsCount=8`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'News fetch failed' });
      const data = await res.json();
      const news = (data.news || []).slice(0, 5).map((n: any) => ({
        title: n.title, publisher: n.publisher, link: n.link,
        date: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString().split('T')[0] : '',
      }));
      return JSON.stringify({ news });
    }

    if (name === 'search_assets') {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(args.query)}&quotesCount=10&newsCount=0`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'Search failed' });
      const data = await res.json();
      const results = (data.quotes || []).map((q: any) => ({
        symbol: q.symbol, name: q.shortname || q.longname || q.symbol,
        exchange: q.exchDisp || q.exchange, type: q.quoteType,
      }));
      return JSON.stringify({ results });
    }

    return JSON.stringify({ error: 'Unknown tool' });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, portfolio, messages, question } = await req.json();

    const systemPrompt = `You are MEVEST AI, an expert financial advisor assistant embedded in the MEVEST wealth management platform. You help investors analyze their portfolio, understand market trends, and make informed decisions.

Key capabilities:
- Look up real-time stock/crypto/ETF quotes using get_stock_quote
- Search for any asset globally using search_assets
- Fetch latest financial news using get_market_news

Be concise, data-driven, and actionable. Format responses with markdown (bold, lists, tables).
If the user's portfolio data is provided, reference specific holdings.
Always include a brief disclaimer that this is not financial advice.
When users ask about a stock, ALWAYS use the tools to get real-time data before responding.`;

    if (mode === 'chat') {
      const chatMessages = [
        { role: 'system', content: systemPrompt },
        ...(portfolio ? [{ role: 'system', content: `User's current portfolio: ${JSON.stringify(portfolio)}` }] : []),
        ...(messages || [{ role: 'user', content: question || 'Hello' }]),
      ];

      // Tool-calling loop (max 3 iterations)
      let currentMessages = chatMessages;
      for (let i = 0; i < 3; i++) {
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: currentMessages,
            tools,
            stream: false,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again shortly.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add funds.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const msg = choice?.message;

        if (msg?.tool_calls && msg.tool_calls.length > 0) {
          // Execute tools and add results
          currentMessages = [...currentMessages, msg];
          for (const tc of msg.tool_calls) {
            const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
            const result = await executeTool(tc.function.name, args);
            currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: result } as any);
          }
          continue; // Loop back for AI to process tool results
        }

        // No more tool calls — stream the final response
        const streamResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'google/gemini-3-flash-preview',
            messages: currentMessages,
            stream: true,
          }),
        });

        if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

        return new Response(streamResp.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }

      // Fallback if loop exhausted
      return new Response(JSON.stringify({ error: 'AI processing took too long' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insights mode (non-chat)
    const insightPrompt = `You are MEVEST AI, analyzing an investor's portfolio. Provide a JSON response with:
    {"healthScore": 0-100, "riskLevel": "Low"|"Medium"|"High", "summary": "brief overall assessment", "recommendations": ["action1","action2","action3"], "warnings": ["warning1"], "diversificationScore": 0-100}
    Be specific about the holdings provided.`;

    const userContent = portfolio
      ? `Analyze this portfolio: ${JSON.stringify(portfolio)}`
      : 'The user has no holdings yet. Provide general investment advice for a new investor.';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [{ role: 'system', content: insightPrompt }, { role: 'user', content: userContent }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      throw new Error(`AI error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    let insights;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      insights = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: content };
    } catch {
      insights = { summary: content, healthScore: 50, riskLevel: 'Medium', recommendations: [], warnings: [], diversificationScore: 50 };
    }

    return new Response(JSON.stringify(insights), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI insights error:', error);
    return new Response(JSON.stringify({ error: 'AI analysis failed' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
