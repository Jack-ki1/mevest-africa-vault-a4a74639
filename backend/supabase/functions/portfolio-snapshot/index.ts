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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Vary': 'Origin',
  };
}

const UA = 'Mozilla/5.0 (compatible; MevestSnapshot/1.0)';

async function getQuote(symbol: string): Promise<number | null> {
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
    const r = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!r.ok) return null;
    const j = await r.json();
    const meta = j?.chart?.result?.[0]?.meta;
    return meta?.regularMarketPrice ?? meta?.previousClose ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  const corsHeaders = buildCors(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

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
