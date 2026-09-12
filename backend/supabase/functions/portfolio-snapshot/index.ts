// Daily portfolio snapshot job. Iterates all users with holdings,
// computes total value at current prices, writes one row per user per day.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') || '*').split(',').map(o => o.trim()).filter(Boolean);
function buildCors(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowAll = ALLOWED_ORIGINS.includes('*');
  const ok = allowAll || (origin && ALLOWED_ORIGINS.includes(origin));
  return {
    'Access-Control-Allow-Origin': allowAll ? '*' : (ok ? origin! : ALLOWED_ORIGINS[0] || ''),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    'Vary': 'Origin',
  };
}

// Per-invocation rate limiting (in-memory, per isolate) — lightweight DoS protection.
// For distributed limiting, configure Upstash Redis or a Supabase table limiter.
const SNAPSHOT_RL_WINDOW = 60_000;
const SNAPSHOT_RL_MAX = 10;
const snapshotRl = new Map<string, number[]>();
function isSnapshotRateLimited(key: string): boolean {
  const now = Date.now();
  const arr = (snapshotRl.get(key) || []).filter(t => now - t < SNAPSHOT_RL_WINDOW);
  arr.push(now);
  snapshotRl.set(key, arr);
  return arr.length > SNAPSHOT_RL_MAX;
}

const UA = 'Mozilla/5.0 (compatible; MevestSnapshot/1.0)';

async function fetchFinnhubQuote(symbol: string): Promise<number | null> {
  const key = Deno.env.get('FINNHUB_KEY');
  if (!key) return null;
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    if (typeof j.c === 'number' && j.c > 0) return j.c;
    return null;
  } catch { return null; }
}

async function getQuote(symbol: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (r.ok) {
      const j = await r.json();
      const meta = j?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? meta?.previousClose ?? null;
      if (price != null) return price;
    }
  } catch { /* fallback below */ }
  // Fallback to Finnhub (free 60/min, no card required)
  return await fetchFinnhubQuote(symbol);
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  // Require shared secret — fail closed if not configured
  const cronSecret = req.headers.get('x-cron-secret');
  const expected = Deno.env.get('CRON_SECRET');
  if (!expected || cronSecret !== expected) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Rate limit by cron secret / IP
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'cron';
  if (isSnapshotRateLimited(ip)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: holdings, error } = await supabase
      .from('holdings')
      .select('user_id, symbol, shares, cost_basis');
    if (error) throw error;

    // Group by user
    const byUser = new Map<string, Array<{ symbol: string; shares: number; cost_basis: number }>>();
    for (const h of holdings || []) {
      const arr = byUser.get(h.user_id) || [];
      arr.push({ symbol: h.symbol, shares: Number(h.shares), cost_basis: Number(h.cost_basis) });
      byUser.set(h.user_id, arr);
    }

    // Cache quotes across users
    const symbols = [...new Set((holdings || []).map((h: any) => h.symbol))];
    const priceMap = new Map<string, number>();
    await Promise.all(symbols.map(async (s) => {
      const p = await getQuote(s);
      if (p != null) priceMap.set(s, p);
    }));

    const today = new Date().toISOString().slice(0, 10);
    const rows: any[] = [];
    for (const [user_id, hs] of byUser) {
      let total = 0, cost = 0;
      const holdings_json: any[] = [];
      for (const h of hs) {
        const px = priceMap.get(h.symbol) ?? h.cost_basis;
        const value = px * h.shares;
        total += value;
        cost += h.cost_basis * h.shares;
        holdings_json.push({ symbol: h.symbol, shares: h.shares, price: px, value });
      }
      rows.push({
        user_id, snapshot_date: today,
        total_value: total, cost_basis: cost, cash_balance: 0,
        currency: 'USD', holdings_json,
      });
    }

    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from('portfolio_snapshots')
        .upsert(rows, { onConflict: 'user_id,snapshot_date' });
      if (upErr) throw upErr;
    }

    return new Response(JSON.stringify({ ok: true, users: rows.length, symbols: symbols.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('snapshot error', e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
