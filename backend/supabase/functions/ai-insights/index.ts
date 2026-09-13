import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

// CORS — restrict to allowed origins via env (ALLOWED_ORIGINS=comma-separated). Falls back to '*' only when not configured.
const ALLOWED = (Deno.env.get('ALLOWED_ORIGINS') || '*')
  .split(',').map(s => s.trim()).filter(Boolean);
function buildCors(origin: string | null) {
  const allowAll = ALLOWED.includes('*');
  const allowed = allowAll || (origin && ALLOWED.includes(origin));
  return {
    'Access-Control-Allow-Origin': allowAll ? '*' : (allowed ? origin! : ALLOWED[0] || ''),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  } as Record<string, string>;
}

// Validation helpers — reject hallucinated/garbage tool args before any DB write.
function validSymbol(s: unknown): boolean {
  return typeof s === 'string' && /^[A-Z0-9.\-^=]{1,20}$/.test(s.toUpperCase());
}
function validatePositiveNum(v: unknown, max = 1e12): boolean {
  return typeof v === 'number' && isFinite(v) && v > 0 && v <= max;
}

async function fetchFinnhubQuote(symbol: string): Promise<Record<string, unknown> | null> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const j = await res.json() as { c?: number; d?: number; dp?: number; h?: number; l?: number; o?: number; pc?: number };
    if (typeof j.c !== 'number' || j.c === 0) return null;
    return { symbol, name: symbol, price: j.c, change: j.d ?? 0, changePercent: j.dp ?? 0, high: j.h, low: j.l, open: j.o, prevClose: j.pc };
  } catch { return null; }
}

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
  {
    type: 'function',
    function: {
      name: 'add_holding',
      description: 'Add a stock/asset to the user\'s portfolio. Use this when the user asks to add something to their portfolio.',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Ticker symbol e.g. AAPL' },
          name: { type: 'string', description: 'Asset name e.g. Apple Inc.' },
          shares: { type: 'number', description: 'Number of shares/units' },
          cost_basis: { type: 'number', description: 'Price per share at purchase' },
          type: { type: 'string', description: 'Asset type: stock, cryptocurrency, etf, bond, commodity', enum: ['stock', 'cryptocurrency', 'etf', 'bond', 'commodity'] },
        },
        required: ['symbol', 'name', 'shares', 'cost_basis'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_holding',
      description: 'Remove a holding from the user\'s portfolio by symbol',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Ticker symbol to remove' } },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'add_to_watchlist',
      description: 'Add a symbol to the user\'s watchlist',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Ticker symbol to watch' } },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'remove_from_watchlist',
      description: 'Remove a symbol from the user\'s watchlist',
      parameters: {
        type: 'object',
        properties: { symbol: { type: 'string', description: 'Ticker symbol to remove from watchlist' } },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_portfolio_summary',
      description: 'Get the user\'s complete portfolio holdings from the database',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_chart_data',
      description: 'Fetch historical chart data for a symbol',
      parameters: {
        type: 'object',
        properties: {
          symbol: { type: 'string', description: 'Ticker symbol' },
          range: { type: 'string', description: 'Time range: 1d, 5d, 1mo, 3mo, 6mo, 1y, 5y', enum: ['1d', '5d', '1mo', '3mo', '6mo', '1y', '5y'] },
        },
        required: ['symbol'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'compare_stocks',
      description: 'Compare multiple stocks side by side with current quotes',
      parameters: {
        type: 'object',
        properties: { symbols: { type: 'array', items: { type: 'string' }, description: 'Array of ticker symbols to compare' } },
        required: ['symbols'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_trending',
      description: 'Get currently trending tickers on Yahoo Finance',
      parameters: { type: 'object', properties: {}, required: [] },
    },
  },
];

// Helper: get user ID from auth token — uses the correct supabase-js v2 API.
async function getUserId(authHeader: string | null): Promise<string | null> {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) return null;
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
    );
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

// Service role client for DB operations
function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );
}

async function executeTool(name: string, args: Record<string, any>, userId: string | null): Promise<string> {
  try {
    if (name === 'get_stock_quote') {
      const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(args.symbol)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketVolume,marketCap,shortName,currency,fiftyTwoWeekHigh,fiftyTwoWeekLow,trailingPE,epsTrailingTwelveMonths,dividendYield`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        const q = data.quoteResponse?.result?.[0];
        if (q) {
          return JSON.stringify({
            symbol: q.symbol, name: q.shortName, price: q.regularMarketPrice,
            change: q.regularMarketChange, changePercent: q.regularMarketChangePercent,
            volume: q.regularMarketVolume, marketCap: q.marketCap, currency: q.currency,
            high52w: q.fiftyTwoWeekHigh, low52w: q.fiftyTwoWeekLow,
            pe: q.trailingPE, eps: q.epsTrailingTwelveMonths, dividendYield: q.dividendYield,
          });
        }
      }
      const fb = await fetchFinnhubQuote(args.symbol);
      if (fb) return JSON.stringify(fb);
      return JSON.stringify({ error: `No data found for ${args.symbol}` });
    }

    if (name === 'get_market_news') {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(args.query)}&quotesCount=0&newsCount=8`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        const news = (data.news || []).slice(0, 5).map((n: { title:string; publisher:string; link:string; providerPublishTime?:number }) => ({
          title: n.title, publisher: n.publisher, link: n.link,
          date: n.providerPublishTime ? new Date(n.providerPublishTime * 1000).toISOString().split('T')[0] : '',
        }));
        if (news.length > 0) return JSON.stringify({ news });
      }
      // Fallback Finnhub general news
      const key = Deno.env.get('FINNHUB_KEY');
      if (key) {
        try {
          const fbRes = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`);
          if (fbRes.ok) {
            const j = await fbRes.json() as Array<{ headline:string; source:string; url:string; datetime:number }>;
            const news = j.slice(0,5).map(n => ({ title: n.headline, publisher: n.source, link: n.url, date: n.datetime ? new Date(n.datetime*1000).toISOString().split('T')[0] : '' }));
            return JSON.stringify({ news });
          }
        } catch { /* ignore */ }
      }
      return JSON.stringify({ error: 'News fetch failed' });
    }

    if (name === 'search_assets') {
      const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(args.query)}&quotesCount=15&newsCount=0`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.ok) {
        const data = await res.json();
        const results = (data.quotes || []).map((q: { symbol:string; shortname?:string; longname?:string; exchDisp?:string; exchange?:string; quoteType?:string; sector?:string; industry?:string }) => ({
          symbol: q.symbol, name: q.shortname || q.longname || q.symbol,
          exchange: q.exchDisp || q.exchange, type: q.quoteType,
          sector: q.sector || '', industry: q.industry || '',
        }));
        if (results.length > 0) return JSON.stringify({ results });
      }
      const fbKey = Deno.env.get('FINNHUB_KEY');
      if (fbKey) {
        try {
          const fbRes = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(args.query)}&token=${fbKey}`);
          if (fbRes.ok) {
            const j = await fbRes.json() as { result?: Array<{ symbol:string; description:string; type:string; displaySymbol?:string }> };
            const results = (j.result || []).slice(0,15).map(r => ({ symbol: r.symbol, name: r.description || r.symbol, exchange: r.displaySymbol || '', type: r.type, sector: '', industry: '' }));
            return JSON.stringify({ results });
          }
        } catch { /* ignore */ }
      }
      return JSON.stringify({ error: 'Search failed' });
    }

    if (name === 'add_holding') {
      if (!userId) return JSON.stringify({ error: 'User not authenticated. Please log in first.' });
      if (!validSymbol(args.symbol)) return JSON.stringify({ error: 'Invalid symbol format' });
      if (!validatePositiveNum(args.shares, 1e9)) return JSON.stringify({ error: 'Shares must be a positive number' });
      if (!validatePositiveNum(args.cost_basis)) return JSON.stringify({ error: 'Cost basis must be a positive number' });
      if (typeof args.name !== 'string' || args.name.length === 0 || args.name.length > 200) return JSON.stringify({ error: 'Invalid name' });
      const allowedTypes = ['stock', 'cryptocurrency', 'etf', 'bond', 'commodity'];
      const type = allowedTypes.includes(args.type) ? args.type : 'stock';
      const db = getServiceClient();
      const { error } = await db.from('holdings').insert({
        user_id: userId,
        symbol: args.symbol.toUpperCase(),
        name: args.name.slice(0, 200),
        shares: args.shares,
        cost_basis: args.cost_basis,
        type,
        country: 'US',
      });
      if (error) return JSON.stringify({ error: `Failed to add holding: ${error.message}` });
      return JSON.stringify({ success: true, message: `Added ${args.shares} shares of ${args.symbol} to portfolio at $${args.cost_basis}/share.`, action: 'portfolio_changed' });
    }

    if (name === 'remove_holding') {
      if (!userId) return JSON.stringify({ error: 'User not authenticated. Please log in first.' });
      if (!validSymbol(args.symbol)) return JSON.stringify({ error: 'Invalid symbol format' });
      const db = getServiceClient();
      const { error } = await db.from('holdings').delete().eq('user_id', userId).eq('symbol', args.symbol.toUpperCase());
      if (error) return JSON.stringify({ error: `Failed to remove: ${error.message}` });
      return JSON.stringify({ success: true, message: `Removed ${args.symbol} from portfolio.`, action: 'portfolio_changed' });
    }

    if (name === 'add_to_watchlist') {
      if (!userId) return JSON.stringify({ error: 'User not authenticated. Please log in first.' });
      if (!validSymbol(args.symbol)) return JSON.stringify({ error: 'Invalid symbol format' });
      const db = getServiceClient();
      const { error } = await db.from('watchlist_items').upsert({ user_id: userId, symbol: args.symbol.toUpperCase() }, { onConflict: 'user_id,symbol' });
      if (error) return JSON.stringify({ error: `Failed to add to watchlist: ${error.message}` });
      return JSON.stringify({ success: true, message: `Added ${args.symbol} to watchlist.`, action: 'watchlist_changed' });
    }

    if (name === 'remove_from_watchlist') {
      if (!userId) return JSON.stringify({ error: 'User not authenticated. Please log in first.' });
      if (!validSymbol(args.symbol)) return JSON.stringify({ error: 'Invalid symbol format' });
      const db = getServiceClient();
      const { error } = await db.from('watchlist_items').delete().eq('user_id', userId).eq('symbol', args.symbol.toUpperCase());
      if (error) return JSON.stringify({ error: `Failed to remove from watchlist: ${error.message}` });
      return JSON.stringify({ success: true, message: `Removed ${args.symbol} from watchlist.`, action: 'watchlist_changed' });
    }


    if (name === 'get_portfolio_summary') {
      if (!userId) return JSON.stringify({ error: 'User not authenticated. Please log in first.' });
      const db = getServiceClient();
      const { data, error } = await db.from('holdings').select('*').eq('user_id', userId);
      if (error) return JSON.stringify({ error: `Failed to fetch portfolio: ${error.message}` });
      if (!data || data.length === 0) return JSON.stringify({ holdings: [], message: 'Portfolio is empty.' });
      // Fetch live prices for holdings
      const symbols = data.map((h: any) => h.symbol);
      let liveQuotes: Record<string, any> = {};
      try {
        const qUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent`;
        const qRes = await fetch(qUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (qRes.ok) {
          const qData = await qRes.json();
          for (const q of qData.quoteResponse?.result || []) {
            liveQuotes[q.symbol] = { price: q.regularMarketPrice, change: q.regularMarketChange, changePct: q.regularMarketChangePercent };
          }
        }
      } catch {}
      const holdings = data.map((h: any) => {
        const live = liveQuotes[h.symbol];
        const currentPrice = live?.price || h.cost_basis;
        const value = h.shares * currentPrice;
        const costTotal = h.shares * h.cost_basis;
        return {
          symbol: h.symbol, name: h.name, type: h.type, shares: h.shares,
          costBasis: h.cost_basis, currentPrice, value, pnl: value - costTotal,
          pnlPct: ((value - costTotal) / costTotal * 100).toFixed(2) + '%',
        };
      });
      const totalValue = holdings.reduce((s: number, h: any) => s + h.value, 0);
      const totalCost = holdings.reduce((s: number, h: any) => s + h.shares * h.costBasis, 0);
      return JSON.stringify({ holdings, totalValue, totalCost, totalPnl: totalValue - totalCost, count: holdings.length });
    }

    if (name === 'get_chart_data') {
      const range = args.range || '1mo';
      const interval = range === '1d' ? '5m' : range === '5d' ? '15m' : '1d';
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(args.symbol)}?range=${range}&interval=${interval}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'Chart data fetch failed' });
      const data = await res.json();
      const result = data.chart?.result?.[0];
      if (!result) return JSON.stringify({ error: 'No chart data' });
      const ts = result.timestamp || [];
      const closes = result.indicators?.quote?.[0]?.close || [];
      const points = ts.slice(-30).map((t: number, i: number) => ({
        date: new Date(t * 1000).toLocaleDateString(),
        close: closes[ts.length - 30 + i]?.toFixed(2),
      })).filter((p: any) => p.close);
      return JSON.stringify({ symbol: args.symbol, range, points, currency: result.meta?.currency || 'USD' });
    }

    if (name === 'compare_stocks') {
      const symbols = (args.symbols || []).slice(0, 10);
      const url = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${symbols.join(',')}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,marketCap,shortName,trailingPE,dividendYield`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'Comparison failed' });
      const data = await res.json();
      const comparison = (data.quoteResponse?.result || []).map((q: any) => ({
        symbol: q.symbol, name: q.shortName, price: q.regularMarketPrice,
        change: q.regularMarketChange, changePct: q.regularMarketChangePercent,
        marketCap: q.marketCap, pe: q.trailingPE, dividendYield: q.dividendYield,
      }));
      return JSON.stringify({ comparison });
    }

    if (name === 'get_trending') {
      const res = await fetch('https://query2.finance.yahoo.com/v1/finance/trending/US?count=15', { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!res.ok) return JSON.stringify({ error: 'Trending fetch failed' });
      const data = await res.json();
      const tickers = (data.finance?.result?.[0]?.quotes || []).map((q: any) => q.symbol).slice(0, 15);
      // Get quotes for trending
      const qUrl = `https://query2.finance.yahoo.com/v7/finance/quote?symbols=${tickers.join(',')}&fields=regularMarketPrice,regularMarketChangePercent,shortName`;
      const qRes = await fetch(qUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      let trending = tickers.map((t: string) => ({ symbol: t }));
      if (qRes.ok) {
        const qData = await qRes.json();
        trending = (qData.quoteResponse?.result || []).map((q: any) => ({
          symbol: q.symbol, name: q.shortName, price: q.regularMarketPrice, changePct: q.regularMarketChangePercent,
        }));
      }
      return JSON.stringify({ trending });
    }

    return JSON.stringify({ error: 'Unknown tool' });
  } catch (e) {
    return JSON.stringify({ error: String(e) });
  }
}

// In-memory sliding-window rate limiter (per user/IP). Per-instance only.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 20; // 20 requests / minute / subject
const rlMap = new Map<string, number[]>();
function rateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (rlMap.get(key) || []).filter(t => now - t < RL_WINDOW_MS);
  arr.push(now);
  rlMap.set(key, arr);
  return arr.length > RL_MAX;
}

// Resolve AI provider — priority: Gemini > OpenAI > OpenRouter > Lovable (legacy).
function getAiConfig(): { url: string; headers: Record<string, string>; model: string; provider: string } | null {
  const gemini = Deno.env.get('GEMINI_API_KEY');
  if (gemini) {
    return {
      url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${gemini}` },
      model: Deno.env.get('GEMINI_MODEL') || 'gemini-2.0-flash',
      provider: 'gemini',
    };
  }
  const openai = Deno.env.get('OPENAI_API_KEY');
  if (openai) {
    return {
      url: 'https://api.openai.com/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openai}` },
      model: Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini',
      provider: 'openai',
    };
  }
  const openrouter = Deno.env.get('OPENROUTER_API_KEY');
  if (openrouter) {
    return {
      url: 'https://openrouter.ai/api/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openrouter}`, 'HTTP-Referer': Deno.env.get('APP_URL') || 'https://mevest.africa', 'X-Title': 'MEVEST Africa Vault' },
      model: Deno.env.get('OPENROUTER_MODEL') || 'google/gemini-flash-1.5',
      provider: 'openrouter',
    };
  }
  const lovable = Deno.env.get('LOVABLE_API_KEY');
  if (lovable) {
    return {
      url: 'https://ai.gateway.lovable.dev/v1/chat/completions',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${lovable}` },
      model: 'google/gemini-3-flash-preview',
      provider: 'lovable',
    };
  }
  return null;
}

Deno.serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = buildCors(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const aiConfig = getAiConfig();
    if (!aiConfig) {
      return new Response(JSON.stringify({ error: 'AI not configured. Set GEMINI_API_KEY, OPENAI_API_KEY or OPENROUTER_API_KEY.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const authHeader = req.headers.get('Authorization');
    const userId = await getUserId(authHeader);

    // Rate limit by userId when present, else by IP
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const rlKey = userId || `ip:${ip}`;
    if (rateLimited(rlKey)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please slow down.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { mode, portfolio, messages, question } = await req.json();


    const CITATION_POLICY = `
CITATION & HONESTY POLICY (non-negotiable):
- When you state a fact that came from a tool result (a price, a news claim, a metric), attach its source and "as of" timestamp inline, e.g. "KCB is up 2.1% today (Finnhub, 14:32 EAT)."
- If a tool call failed or returned no data, say so explicitly — never fill the gap with a plausible-sounding number.
- If asked about a symbol with no live data (e.g. most NSE tickers today), say the price shown is indicative/manually-updated, not live.
- Every AI claim must be traceable to a tool output; no hallucinations.`;

    const systemPrompt = `You are MEVEST AI, an expert agentic financial assistant embedded in the MEVEST wealth management platform.

KEY CAPABILITIES:
- Look up real-time stock/crypto/ETF quotes using get_stock_quote
- Search for any asset globally using search_assets  
- Fetch latest financial news using get_market_news
- ADD holdings to the user's portfolio using add_holding
- REMOVE holdings from the user's portfolio using remove_holding
- ADD symbols to the user's watchlist using add_to_watchlist
- REMOVE symbols from the user's watchlist using remove_from_watchlist
- GET the user's complete portfolio summary using get_portfolio_summary
- FETCH chart data for any symbol using get_chart_data
- COMPARE multiple stocks side by side using compare_stocks
- GET trending tickers using get_trending

RULES:
- Be concise, data-driven, and actionable. Format responses with markdown (bold, lists, tables).
- When users ask about a stock, ALWAYS use tools to get real-time data before responding.
- When users ask to add/remove holdings or watchlist items, execute the operation immediately.
- When executing portfolio/watchlist changes, confirm what you did clearly.
- If the user's portfolio data is provided, reference specific holdings.
- Always include a brief disclaimer that this is not financial advice.
- For comparisons, present data in a markdown table.
${CITATION_POLICY}`;

    if (mode === 'chat') {
      const chatMessages: any[] = [
        { role: 'system', content: systemPrompt },
        ...(portfolio ? [{ role: 'system', content: `User's current portfolio: ${JSON.stringify(portfolio)}` }] : []),
        ...(messages || [{ role: 'user', content: question || 'Hello' }]),
      ];

      // Tool-calling loop (max 5 iterations)
      let currentMessages = chatMessages;
      for (let i = 0; i < 5; i++) {
        const response = await fetch(aiConfig.url, {
          method: 'POST',
          headers: aiConfig.headers,
          body: JSON.stringify({
            model: aiConfig.model,
            messages: currentMessages,
            tools,
            stream: false,
          }),
        });

        if (!response.ok) {
          const status = response.status;
          if (status === 429) return new Response(JSON.stringify({ error: 'Rate limit exceeded.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (status === 402) return new Response(JSON.stringify({ error: 'AI credits exhausted.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          throw new Error(`AI gateway error: ${status}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const msg = choice?.message;

        if (msg?.tool_calls && msg.tool_calls.length > 0) {
          currentMessages = [...currentMessages, msg];
          for (const tc of msg.tool_calls) {
            const args = typeof tc.function.arguments === 'string' ? JSON.parse(tc.function.arguments) : tc.function.arguments;
            const result = await executeTool(tc.function.name, args, userId);
            currentMessages.push({ role: 'tool', tool_call_id: tc.id, content: result } as any);
          }
          continue;
        }

        // No more tool calls — if we have content already, use it; otherwise stream
        if (msg?.content) {
          // Convert to SSE format for the client
          const content = msg.content;
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller) {
              // Send content in chunks for streaming feel
              const chunkSize = 20;
              for (let j = 0; j < content.length; j += chunkSize) {
                const chunk = content.slice(j, j + chunkSize);
                const sseData = JSON.stringify({ choices: [{ delta: { content: chunk } }] });
                controller.enqueue(encoder.encode(`data: ${sseData}\n\n`));
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return new Response(stream, {
            headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
          });
        }

        // Fallback: stream a new request without tools
        const streamResp = await fetch(aiConfig.url, {
          method: 'POST',
          headers: aiConfig.headers,
          body: JSON.stringify({
            model: aiConfig.model,
            messages: currentMessages.filter((m: any) => m.role !== 'tool' && !m.tool_calls),
            stream: true,
          }),
        });

        if (!streamResp.ok) throw new Error(`Stream error: ${streamResp.status}`);

        return new Response(streamResp.body, {
          headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
        });
      }

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

    const response = await fetch(aiConfig.url, {
      method: 'POST',
      headers: aiConfig.headers,
      body: JSON.stringify({
        model: aiConfig.model,
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
